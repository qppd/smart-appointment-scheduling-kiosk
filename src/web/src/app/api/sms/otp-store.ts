/**
 * OTP Session Store — in-memory only.
 *
 * OTP sessions are ephemeral (5-min TTL). In-memory is appropriate:
 * - send-otp returns sessionId to the client
 * - verify-otp receives sessionId back from the client
 * - If a cold start or different instance receives verify-otp,
 *   the user simply requests a new OTP (rare in practice since
 *   registration flow is seconds-long).
 *
 * No Firebase dependency — eliminates Vercel serverless issues.
 */
import 'server-only';

interface OtpSession {
  phone: string;
  otp: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  verified: boolean;
}

const MAX_ATTEMPTS = 3;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map<string, OtpSession>();

function cleanup(): void {
  const now = Date.now();
  store.forEach((session, id) => {
    if (now > session.expiresAt) {
      store.delete(id);
    }
  });
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createOtpSession(phone: string, otp: string): string {
  cleanup();
  const id = generateId();
  store.set(id, {
    phone,
    otp,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt: Date.now() + TTL_MS,
    verified: false,
  });
  return id;
}

export function verifyOtp(id: string, code: string): { success: boolean; message: string } {
  cleanup();
  const session = store.get(id);
  if (!session) {
    return { success: false, message: 'Session expired or invalid. Please request a new OTP.' };
  }

  if (Date.now() > session.expiresAt) {
    store.delete(id);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (session.verified) {
    return { success: false, message: 'This OTP has already been used.' };
  }

  if (session.attempts >= session.maxAttempts) {
    store.delete(id);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  session.attempts += 1;

  if (session.otp !== code) {
    const remaining = session.maxAttempts - session.attempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  session.verified = true;
  store.set(id, session);
  return { success: true, message: 'OTP verified successfully.' };
}

export function isVerified(id: string): boolean {
  const session = store.get(id);
  return session ? session.verified : false;
}

export function getSessionPhone(id: string): string | null {
  const session = store.get(id);
  return session ? session.phone : null;
}
