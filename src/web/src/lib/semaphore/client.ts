import 'server-only';

import { getSemaphoreConfig } from './config';
import {
  SemaphoreError,
  type CheckAccountResult,
  type CheckBalanceResult,
  type SemaphoreMessageResult,
  type SendSmsOptions,
} from './types';
import { redactPhoneForLogs, normalizePhilippinePhone, validateMessage } from './phone';

declare global {
  // eslint-disable-next-line no-var
  var __semaphoreLogHooks: Set<(event: Record<string, unknown>) => void> | undefined;
}

type LogEvent = {
  readonly action:
    | 'send_message'
    | 'send_otp'
    | 'check_account'
    | 'check_balance';
  readonly outcome: 'success' | 'error' | 'retry' | 'skip';
  readonly httpStatus?: number | null;
  readonly attempt?: number;
  readonly elapsedMs?: number;
  readonly recipient?: string;
  readonly messageId?: string | null;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly retriable?: boolean;
};

function emit(event: LogEvent): void {
  const safe = {
    ...event,
    timestamp: new Date().toISOString(),
    service: 'semaphore',
  };
  if (event.outcome === 'error') {
    console.error('[semaphore]', JSON.stringify(safe));
  } else if (event.outcome === 'retry') {
    console.warn('[semaphore]', JSON.stringify(safe));
  } else {
    console.log('[semaphore]', JSON.stringify(safe));
  }
  const hooks = globalThis.__semaphoreLogHooks;
  if (hooks) {
    for (const hook of hooks) {
      try {
        hook(safe);
      } catch {
        // never let a hook break a send
      }
    }
  }
}

function classifyHttpStatus(status: number): { retryable: boolean; code: import('./types').SemaphoreErrorCode } {
  if (status === 401) return { retryable: false, code: 'auth_error' };
  if (status === 403) return { retryable: false, code: 'forbidden' };
  if (status === 404) return { retryable: false, code: 'not_found' };
  if (status === 408 || status === 429) return { retryable: true, code: 'rate_limited' };
  if (status >= 500 && status < 600) return { retryable: true, code: 'server_error' };
  return { retryable: false, code: 'unknown' };
}

interface QueueRetryOptions {
  readonly attempt: number;
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly isAborted: () => boolean;
  readonly sleeper?: () => boolean;
}

async function sleepWithBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  sleep: (ms: number) => Promise<void>,
  isAborted: () => boolean,
): Promise<void> {
  if (isAborted()) return;
  // exp backoff with jitter, capped
  const expo = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.floor(expo / 2));
  const delay = Math.min(maxMs, expo + jitter);
  await sleep(delay);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const signal = init.signal
    ? composeSignals(init.signal, controller.signal)
    : controller.signal;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

function composeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const ctrl = new AbortController();
  function onAbort() {
    ctrl.abort();
  }
  if (a.aborted || b.aborted) {
    ctrl.abort();
  }
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return ctrl.signal;
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function semaphoreRequest<T>(
  params: {
    readonly path: string;
    readonly method: 'POST' | 'GET';
    readonly body?: Record<string, string>;
    readonly expectedShape: 'array' | 'object';
    readonly isRetryable?: (provider: unknown) => boolean;
    readonly firstResult: (parsed: unknown) => T;
    readonly eventName:
      | 'send_message'
      | 'send_otp'
      | 'check_account'
      | 'check_balance';
  },
  caller: { signal?: AbortSignal },
): Promise<T> {
  const start = Date.now();
  const cfg = getSemaphoreConfig();
  const url = `${cfg.baseUrl}${params.path}`;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= cfg.maxRetries + 1; attempt += 1) {
    const attemptStart = Date.now();
    const signal = caller.signal;
    let response: Response;
    try {
      const fetchOptions: RequestInit = {
        method: params.method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        ...(params.body ? { body: new URLSearchParams(params.body).toString() } : {}),
        ...(signal ? { signal } : {}),
      };
      response = await fetchWithTimeout(url, fetchOptions, cfg.timeoutMs);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastError = err;
      const message = isAbort ? 'Request to Semaphore timed out.' : 'Network failure.';
      const code: import('./types').SemaphoreErrorCode = isAbort ? 'timeout' : 'network';
      emit({
        action: params.eventName,
        outcome: 'error',
        errorCode: code,
        errorMessage: maskErrorMessage(message),
        attempt,
        retriable: !isAbort,
      });
      // retry only if attempts left and not aborted
      if (!isAbort && attempt <= cfg.maxRetries) {
        emit({
          action: params.eventName,
          outcome: 'retry',
          attempt,
          errorCode: code,
          errorMessage: 'retrying after transient failure',
          retriable: true,
        });
        await sleepWithBackoff(attempt, 250, 2000, ms => new Promise<void>(r => setTimeout(r, ms)), () => Boolean(signal?.aborted));
        continue;
      }
      throw new SemaphoreError(code, 'Unable to reach Semaphore. Try again.', {
        httpStatus: null,
        retryable: code !== 'timeout',
        cause: err,
      });
    }

    const text = await response.text();
    const parsed = parseJsonSafe(text);
    const elapsed = Date.now() - attemptStart;

    if (response.ok) {
      const provider = params.expectedShape === 'array' && Array.isArray(parsed) ? parsed[0] : parsed;
      const resultForFirst = params.firstResult(parsed);
      void resultForFirst;
      // Provider-level failure (HTTP 200 with status: Failed) — rare but possible.
      if (params.isRetryable && params.isRetryable(provider)) {
        lastError = 'provider_failure';
        emit({
          action: params.eventName,
          outcome: 'error',
          httpStatus: response.status,
          attempt,
          elapsedMs: elapsed,
          errorCode: 'server_error',
          errorMessage: 'Semaphore provider indicated transient failure.',
          retriable: true,
        });
        if (attempt <= cfg.maxRetries) {
          emit({ action: params.eventName, outcome: 'retry', attempt });
          await sleepWithBackoff(attempt, 250, 2000, ms => new Promise<void>(r => setTimeout(r, ms)), () => Boolean(signal?.aborted));
          continue;
        }
      }
      emit({
        action: params.eventName,
        outcome: 'success',
        httpStatus: response.status,
        attempt,
        elapsedMs: elapsed,
      });
      return provider as T;
    }

    const { retryable, code } = classifyHttpStatus(response.status);
    const provider = parsed;
    const providerStatus =
      typeof provider === 'object' && provider !== null && 'status' in provider
        ? String((provider as { status?: unknown }).status ?? '')
        : null;
    const providerMessage =
      typeof provider === 'object' && provider !== null && 'message' in provider
        ? String((provider as { message?: unknown }).message ?? '')
        : null;
    const userMessage = providerMessage ?? `Semaphore returned HTTP ${response.status}`;
    lastError = { code, status: response.status, provider, providerStatus, providerMessage };

    emit({
      action: params.eventName,
      outcome: 'error',
      httpStatus: response.status,
      attempt,
      elapsedMs: elapsed,
      errorCode: code,
      errorMessage: maskErrorMessage(userMessage),
      retriable: retryable,
    });

    if (!retryable || attempt > cfg.maxRetries) {
      throw new SemaphoreError(code, userMessage, {
        httpStatus: response.status,
        providerStatus,
        retryable,
      });
    }
    emit({ action: params.eventName, outcome: 'retry', attempt, httpStatus: response.status });
    await sleepWithBackoff(attempt, 250, 2000, ms => new Promise<void>(r => setTimeout(r, ms)), () => Boolean(signal?.aborted));
  }

  // Unreachable — last loop iteration always throws/returns — but TS doesn't know.
  throw lastError instanceof SemaphoreError
    ? lastError
    : new SemaphoreError('unknown', 'Unknown Semaphore failure.', { cause: lastError });
}

function maskErrorMessage(msg: string): string {
  if (!msg) return msg;
  // strip apikey and phone-like patterns from any provider message before logging
  return msg
    .replace(/apikey=[^\s&]+/gi, 'apikey=***')
    .replace(/(?:\+?\d[\s-]?){7,}\d/g, '***PHONE***');
}

function pickMessageIdFromArray(parsed: unknown): string | null {
  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    if (first && typeof first === 'object' && 'message_id' in first) {
      const v = (first as { message_id: unknown }).message_id;
      return typeof v === 'string' || typeof v === 'number' ? String(v) : null;
    }
  }
  if (parsed && typeof parsed === 'object' && 'message_id' in parsed) {
    const v = (parsed as { message_id: unknown }).message_id;
    return typeof v === 'string' || typeof v === 'number' ? String(v) : null;
  }
  return null;
}

/**
 * Send an arbitrary SMS through Semaphore.
 * Server-only. Handles retries with exponential backoff and structured logging.
 */
export async function sendSms(
  rawPhone: string,
  rawMessage: string,
  options: SendSmsOptions = {},
): Promise<SemaphoreMessageResult> {
  const phone = normalizePhilippinePhone(rawPhone);
  const message = validateMessage(rawMessage);
  const cfg = getSemaphoreConfig();
  const sender = (options.senderName ?? cfg.senderName).slice(0, 11);

  const parsed = await semaphoreRequest<object>({
    path: '/messages',
    method: 'POST',
    body: {
      apikey: cfg.apiKey,
      number: phone,
      message,
      sendername: sender,
    },
    expectedShape: 'array',
    eventName: 'send_message',
    isRetryable: parsed => {
      if (!parsed || typeof parsed !== 'object') return false;
      const status = (parsed as { status?: unknown }).status;
      return status === 'Failed' || status === 'Failed Queued';
    },
    firstResult: parsed => parsed as object,
  }, { signal: options.signal });

  const messageId = pickMessageIdFromArray(parsed);
  const status = (() => {
    if (Array.isArray(parsed) && parsed[0]) {
      const s = (parsed[0] as { status?: unknown }).status;
      if (typeof s === 'string') {
        if (s.toLowerCase().startsWith('sent')) return 'Sent';
        if (s.toLowerCase().startsWith('queued')) return 'Queued';
        if (s.toLowerCase() === 'failed') return 'Failed';
      }
    } else if (parsed && typeof parsed === 'object') {
      const s = (parsed as { status?: unknown }).status;
      if (typeof s === 'string') {
        if (s.toLowerCase().startsWith('sent')) return 'Sent';
        if (s.toLowerCase().startsWith('queued')) return 'Queued';
        if (s.toLowerCase() === 'failed') return 'Failed';
      }
    }
    return 'Unknown' as const;
  })();

  emit({
    action: 'send_message',
    outcome: status === 'Sent' || status === 'Queued' ? 'success' : 'error',
    recipient: redactPhoneForLogs(phone),
    messageId,
    errorCode: status === 'Failed' ? 'server_error' : undefined,
    errorMessage: status === 'Failed' ? 'Semaphore reported Failed status.' : undefined,
  });

  return {
    messageId: messageId ?? 'unknown',
    recipient: phone,
    status,
    network: (() => {
      if (Array.isArray(parsed) && parsed[0]) {
        const net = (parsed[0] as { network?: unknown }).network;
        return typeof net === 'string' ? net : undefined;
      }
      if (parsed && typeof parsed === 'object') {
        const net = (parsed as { network?: unknown }).network;
        return typeof net === 'string' ? net : undefined;
      }
      return undefined;
    })(),
    raw: parsed,
  };
}

/**
 * Send an OTP SMS. The user-controlled `code` parameter is used directly so we
 * remain the source of truth for OTP generation. We send via /messages (not /otp)
 * so the human-readable barcode-style message is fully ours.
 */
export async function sendOtp(
  rawPhone: string,
  code: string,
  options: SendSmsOptions = {},
): Promise<SemaphoreMessageResult> {
  const phone = normalizePhilippinePhone(rawPhone);
  if (!/^\d{4,8}$/.test(code)) {
    throw new SemaphoreError('empty_message', 'OTP code is missing or malformed.', { httpStatus: 400 });
  }
  const cfg = getSemaphoreConfig();
  const sender = (options.senderName ?? cfg.senderName).slice(0, 11);
  const message = `Your Barangay Dolores verification code is: ${code}. This code expires in 5 minutes.`;

  const parsed = await semaphoreRequest<object>({
    path: '/messages',
    method: 'POST',
    body: {
      apikey: cfg.apiKey,
      number: phone,
      message,
      sendername: sender,
    },
    expectedShape: 'array',
    eventName: 'send_otp',
    isRetryable: parsed => {
      if (!parsed || typeof parsed !== 'object') return false;
      const status = (parsed as { status?: unknown }).status;
      return status === 'Failed' || status === 'Failed Queued';
    },
    firstResult: parsed => parsed as object,
  }, { signal: options.signal });

  const messageId = pickMessageIdFromArray(parsed);
  emit({
    action: 'send_otp',
    outcome: 'success',
    recipient: redactPhoneForLogs(phone),
    messageId,
  });

  return {
    messageId: messageId ?? 'unknown',
    recipient: phone,
    status: 'Sent',
    raw: parsed,
  };
}

/**
 * Check the current Semaphore account / credit balance. Useful for diagnostics.
 */
export async function checkAccount(options: { signal?: AbortSignal } = {}): Promise<CheckAccountResult> {
  const cfg = getSemaphoreConfig();
  const parsed = await semaphoreRequest<object>({
    path: '/account',
    method: 'GET',
    expectedShape: 'object',
    eventName: 'check_account',
    body: { apikey: cfg.apiKey },
    firstResult: parsed => parsed as object,
  }, options);

  const accountId =
    typeof (parsed as { account_id?: unknown }).account_id === 'string' ||
    typeof (parsed as { account_id?: unknown }).account_id === 'number'
      ? String((parsed as { account_id: unknown }).account_id)
      : 'unknown';
  const status = typeof (parsed as { status?: unknown }).status === 'string'
    ? String((parsed as { status: unknown }).status)
    : 'unknown';
  const creditsNum =
    typeof (parsed as { credit?: unknown }).credit === 'number'
      ? ((parsed as { credit: number }).credit)
      : null;

  return {
    accountId,
    status,
    credits: creditsNum,
    raw: parsed,
  };
}

/**
 * Return remaining credit count (helper used by admin diagnostics).
 */
export async function checkBalance(options: { signal?: AbortSignal } = {}): Promise<CheckBalanceResult> {
  const cfg = getSemaphoreConfig();
  const parsed = await semaphoreRequest<unknown>({
    path: '/account',
    method: 'GET',
    expectedShape: 'object',
    eventName: 'check_balance',
    body: { apikey: cfg.apiKey },
    firstResult: parsed => parsed,
  }, options);

  const credits =
    typeof (parsed as { credit?: unknown }).credit === 'number'
      ? ((parsed as { credit: number }).credit)
      : typeof (parsed as { credits?: unknown }).credits === 'number'
        ? ((parsed as { credits: number }).credits)
        : 0;

  return {
    credits,
    raw: parsed,
  };
}
