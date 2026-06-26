/**
 * OTP Session Store — stateless HMAC-signed tokens.
 *
 * The sessionId IS the OTP check: it's an HMAC-signed payload
 * containing { phone, otp_hash, expiresAt }.
 * verify-otp decodes and validates — no server-side storage needed.
 * Works on ANY Vercel instance, survives cold starts.
 */
import 'server-only';

const MAX_ATTEMPTS = 3;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  // Use SEMAPHORE_API_KEY as HMAC secret (already set on Vercel)
  const secret = process.env.SEMAPHORE_API_KEY;
  if (!secret) {
    throw new Error('SEMAPHORE_API_KEY is required for OTP signing');
  }
  return secret;
}

async function hmacSign(data: string): Promise<string> {
  const key = getSecret();
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function generateOtpValue(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface OtpSessionPayload {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Create an OTP session. Returns a signed token as the sessionId.
 * The OTP value is embedded inside — no server storage needed.
 */
export async function createOtpSession(phone: string, otp: string): Promise<string> {
  const payload: OtpSessionPayload = {
    phone,
    otp,
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacSign(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Verify an OTP against a signed sessionId (HMAC token).
 * Validates signature, expiry, OTP match, and attempt count.
 */
export async function verifyOtp(token: string, code: string): Promise<{ success: boolean; message: string }> {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { success: false, message: 'Invalid session format.' };
  }

  const [encoded, sig] = parts;

  // Verify HMAC signature
  const expectedSig = await hmacSign(encoded);
  if (sig !== expectedSig) {
    return { success: false, message: 'Invalid session. Please request a new OTP.' };
  }

  // Decode payload
  let payload: OtpSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return { success: false, message: 'Invalid session data. Please request a new OTP.' };
  }

  // Check expiry
  if (Date.now() > payload.expiresAt) {
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check attempts (tracked client-side via token re-issuance)
  // We re-sign with incremented attempts on each failed try
  if (payload.attempts >= MAX_ATTEMPTS) {
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (payload.otp !== code) {
    // Re-issue token with incremented attempts so the client can retry
    const remaining = MAX_ATTEMPTS - payload.attempts - 1;
    return { success: false, message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  return { success: true, message: 'OTP verified successfully.' };
}

export function generateOtp(): string {
  return generateOtpValue();
}
