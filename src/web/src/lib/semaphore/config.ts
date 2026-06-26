import 'server-only';
import { SemaphoreError } from './types';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

interface ResolvedConfig {
  readonly apiKey: string;
  readonly senderName: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

let cachedConfig: ResolvedConfig | null = null;

export function getSemaphoreConfig(): ResolvedConfig {
  if (cachedConfig) return cachedConfig;

  const apiKey = readEnv('SEMAPHORE_API_KEY');
  if (!apiKey) {
    throw new SemaphoreError(
      'missing_env',
      'SEMAPHORE_API_KEY is not configured.',
      { httpStatus: 500 },
    );
  }
  if (!/^[A-Za-z0-9_-]{8,}$/.test(apiKey)) {
    throw new SemaphoreError(
      'missing_env',
      'SEMAPHORE_API_KEY is not in a recognizable format. Verify the Vercel/env value.',
      { httpStatus: 500 },
    );
  }

  const senderName = readEnv('SEMAPHORE_SENDER_NAME') ?? 'SEMAFOR';
  const verifiedSender = /^[A-Za-z0-9 ]{1,11}$/.test(senderName)
    ? senderName
    : 'SEMAFOR';

  const timeoutMsRaw = parseInt(readEnv('SEMAPHORE_TIMEOUT_MS') ?? '12000', 10);
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 12000;

  const retriesRaw = parseInt(readEnv('SEMAPHORE_MAX_RETRIES') ?? '2', 10);
  const maxRetries = Number.isFinite(retriesRaw) && retriesRaw >= 0 && retriesRaw <= 5 ? retriesRaw : 2;

  const baseUrl = (readEnv('SEMAPHORE_BASE_URL') ?? 'https://api.semaphore.co/api/v4').replace(/\/+$/, '');

  cachedConfig = {
    apiKey,
    senderName: verifiedSender,
    baseUrl,
    timeoutMs,
    maxRetries,
  };
  return cachedConfig;
}

/**
 * Test only — drops the cached config so test harnesses can re-read env vars.
 * Not exported via the index.
 */
export function __resetSemaphoreConfigForTests(): void {
  cachedConfig = null;
}
