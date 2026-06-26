/**
 * OTP Session Store — stateless HMAC-signed tokens using Node.js crypto.
 * 
 * The sessionId IS the OTP check: it's an HMAC-SHA256 signed payload
 * containing { phone, otp_hash, expiresAt }.
 * verify-otp decodes and validates — no server-side storage needed.
 * Works on ANY Vercel instance, survives cold starts.
 */
import 'server-only';
import crypto from 'node:crypto';

const MAX_ATTEMPTS = 3;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  const secret = process.env.SEMAPHORE_API_KEY;
  if (!secret) {
    throw new Error('SEMAPHORE_API_KEY is required for OTP signing');
  }
  return secret;
}

function hmacSign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create an OTP session. Returns a signed token as the sessionId.
 * The OTP value is embedded inside — no server storage needed.
 */
export function createOtpSession(phone: string, otp: string): string {
  const payload = JSON.stringify({
    phone,
    otp,
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  });
  const encoded = base64UrlEncode(payload);
  const sig = hmacSign(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Verify an OTP against a signed sessionId (HMAC token).
 * Validates signature, expiry, OTP match, and attempt count.
 */
export function verifyOtp(token: string, code: string): { success: boolean; message: string } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { success: false, message: 'Invalid session format.' };
  }

  const [encoded, sig] = parts;

  // Verify HMAC signature
  const expectedSig = hmacSign(encoded);
  if (sig !== expectedSig) {
    return { success: false, message: 'Invalid session. Please request a new OTP.' };
  }

  // Decode payload
  let payload: { phone: string; otp: string; expiresAt: number; attempts: number };
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return { success: false, message: 'Invalid session data. Please request a new OTP.' };
  }

  // Check expiry
  if (Date.now() > payload.expiresAt) {
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check attempts
  if (payload.attempts >= MAX_ATTEMPTS) {
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (payload.otp !== code) {
    const remaining = MAX_ATTEMPTS - payload.attempts - 1;
    return { success: false, message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  return { success: true, message: 'OTP verified successfully.' };
}
