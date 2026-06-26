import { SemaphoreError } from './types';

/**
 * Normalize Philippine mobile numbers to the local 09xx format Semaphore requires.
 * Accepts: 09171234567, +639171234567, 639171234567, 0917-123-4567, 0917 123 4567.
 * Returns the cleaned local number (e.g. 09171234567) or throws SemaphoreError('invalid_phone').
 */
export function normalizePhilippinePhone(rawInput: string): string {
  if (typeof rawInput !== 'string') {
    throw new SemaphoreError('invalid_phone', 'Phone number must be a string.', { httpStatus: 400 });
  }
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new SemaphoreError('invalid_phone', 'Phone number is required.', { httpStatus: 400 });
  }

  const digits = trimmed.replace(/\D/g, '');
  let candidate: string | null = null;

  if (digits.length === 11 && digits.startsWith('09')) {
    candidate = digits;
  } else if (digits.length === 12 && digits.startsWith('63')) {
    candidate = '0' + digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('639')) {
    candidate = '0' + digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith('9')) {
    // Some users omit the leading 0 (e.g. "9171234567"). Normalize by prepending 0.
    candidate = '0' + digits;
  }

  if (!candidate || !/^09\d{9}$/.test(candidate)) {
    throw new SemaphoreError(
      'invalid_phone',
      'Phone number format not recognized. Use 09XXXXXXXXX, +639XXXXXXXXX, or 639XXXXXXXXX.',
      { httpStatus: 400 },
    );
  }
  return candidate;
}

/**
 * Validate that a message is non-empty and within Semaphore's 160-char single-segment limit
 * (longer messages are still delivered but split — we only enforce a hard upper bound).
 */
export function validateMessage(rawMessage: unknown): string {
  if (typeof rawMessage !== 'string') {
    throw new SemaphoreError('empty_message', 'Message must be a string.', { httpStatus: 400 });
  }
  const trimmed = rawMessage.trim();
  if (!trimmed) {
    throw new SemaphoreError('empty_message', 'Message must not be empty.', { httpStatus: 400 });
  }
  if (trimmed.length > 800) {
    throw new SemaphoreError('empty_message', 'Message exceeds 800 characters.', { httpStatus: 400 });
  }
  return trimmed;
}

/**
 * Redact phone numbers and API keys from log payloads. Keeps the last 4 digits only.
 */
export function redactPhoneForLogs(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}
