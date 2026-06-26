/**
 * OTP Session Store — Firebase Realtime Database via REST API.
 *
 * Serverless-safe: persists across Vercel instances.
 * No Firebase SDK needed — uses fetch() against the REST API.
 * Falls back to in-memory if FIREBASE_DATABASE_URL isn't set.
 */
import 'server-only';

interface OtpSession {
  phone: string;
  otp: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  verified: boolean;
  createdAt: number;
}

const MAX_ATTEMPTS = 3;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---- In-memory fallback ----
const memoryStore = new Map<string, OtpSession>();

function cleanupMemory(): void {
  const now = Date.now();
  memoryStore.forEach((session, id) => {
    if (now > session.expiresAt) memoryStore.delete(id);
  });
}

// ---- Firebase REST helpers ----
function getDbUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  return url?.trim() || null;
}

async function fbGet(path: string): Promise<Record<string, unknown> | null> {
  const base = getDbUrl();
  if (!base) return null;
  const res = await fetch(`${base}/${path}.json`, { method: 'GET' });
  if (!res.ok) return null;
  return res.json() as Record<string, unknown>;
}

async function fbPut(path: string, data: unknown): Promise<boolean> {
  const base = getDbUrl();
  if (!base) return false;
  const res = await fetch(`${base}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function fbDelete(path: string): Promise<boolean> {
  const base = getDbUrl();
  if (!base) return false;
  const res = await fetch(`${base}/${path}.json`, { method: 'DELETE' });
  return res.ok;
}

// ---- Helpers ----
function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Unified API ----
export async function createOtpSession(phone: string, otp: string): Promise<string> {
  const id = generateId();
  const session: OtpSession = {
    phone,
    otp,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt: Date.now() + TTL_MS,
    verified: false,
    createdAt: Date.now(),
  };

  const ok = await fbPut(`otp_sessions/${id}`, session);
  if (!ok) {
    // Fallback to in-memory
    cleanupMemory();
    memoryStore.set(id, session);
  }

  return id;
}

export async function verifyOtp(id: string, code: string): Promise<{ success: boolean; message: string }> {
  // Try Firebase first
  const data = await fbGet(`otp_sessions/${id}`);
  if (data && data.otp) {
    const session = data as unknown as OtpSession;
    if (Date.now() > session.expiresAt) {
      await fbDelete(`otp_sessions/${id}`);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }
    if (session.verified) {
      return { success: false, message: 'This OTP has already been used.' };
    }
    const attempts = session.attempts + 1;
    if (attempts >= session.maxAttempts) {
      await fbDelete(`otp_sessions/${id}`);
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }
    await fbPut(`otp_sessions/${id}`, { ...session, attempts });
    if (session.otp !== code) {
      return { success: false, message: `Invalid OTP. ${MAX_ATTEMPTS - attempts} attempts remaining.` };
    }
    await fbPut(`otp_sessions/${id}`, { ...session, attempts, verified: true });
    return { success: true, message: 'OTP verified successfully.' };
  }

  // Fallback to in-memory
  cleanupMemory();
  const session = memoryStore.get(id);
  if (!session) {
    return { success: false, message: 'Session expired or invalid. Please request a new OTP.' };
  }
  if (Date.now() > session.expiresAt) {
    memoryStore.delete(id);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }
  if (session.verified) {
    return { success: false, message: 'This OTP has already been used.' };
  }
  if (session.attempts >= session.maxAttempts) {
    memoryStore.delete(id);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  session.attempts += 1;
  if (session.otp !== code) {
    return { success: false, message: `Invalid OTP. ${session.maxAttempts - session.attempts} attempts remaining.` };
  }
  session.verified = true;
  memoryStore.set(id, session);
  return { success: true, message: 'OTP verified successfully.' };
}

export function isVerified(id: string): boolean {
  const session = memoryStore.get(id);
  return session ? session.verified : false;
}

export function getSessionPhone(id: string): string | null {
  const session = memoryStore.get(id);
  return session ? session.phone : null;
}
