export type PhilippinePhoneNumber = string;

export type SemaphoreMessageResult = {
  readonly messageId: string;
  readonly recipient: string;
  readonly status: 'Sent' | 'Queued' | 'Failed' | 'Unknown';
  readonly network?: string;
  readonly raw: unknown;
};

export type SemaphoreErrorCode =
  | 'invalid_phone'
  | 'empty_message'
  | 'missing_env'
  | 'auth_error'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'server_error'
  | 'timeout'
  | 'network'
  | 'unknown';

export class SemaphoreError extends Error {
  readonly code: SemaphoreErrorCode;
  readonly httpStatus: number | null;
  readonly providerStatus: string | null;
  readonly retryable: boolean;

  constructor(
    code: SemaphoreErrorCode,
    message: string,
    options: {
      httpStatus?: number | null;
      providerStatus?: string | null;
      retryable?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'SemaphoreError';
    this.code = code;
    this.httpStatus = options.httpStatus ?? null;
    this.providerStatus = options.providerStatus ?? null;
    this.retryable = options.retryable ?? false;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface SendSmsOptions {
  readonly senderName?: string;
  readonly signal?: AbortSignal;
  readonly forcePlainMessagesEndpoint?: boolean;
}

export interface CheckAccountResult {
  readonly accountId: string;
  readonly status: string;
  readonly credits: number | null;
  readonly raw: unknown;
}

export interface CheckBalanceResult {
  readonly credits: number;
  readonly raw: unknown;
}
