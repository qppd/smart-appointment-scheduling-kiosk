/**
 * OTP Session Store with automatic fallback.
 *
 * **Firebase RTDB** — used on Vercel (persistent across cold starts).
 * **In-memory Map** — fallback for local dev when Firebase isn't configured.
 *
 * The Firebase SDK is lazy-loaded so it never initializes during build.
 */
import 'server-only';
import { ref, get, set, update } from 'firebase/database';
import type { Database } from 'firebase/database';

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

// ---- In-memory fallback store (local dev) ----
const memoryStore = new Map<string, OtpSession>();

function cleanupMemory(): void {
  const now = Date.now();
  memoryStore.forEach((session, id) => {
    if (now > session.expiresAt) {
      memoryStore.delete(id);
    }
  });
}

function createMemorySession(phone: string, otp: string): string {
  cleanupMemory();
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const id = crypto.randomUUID();
  memoryStore.set(id, {
    phone,
    otp,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt: Date.now() + TTL_MS,
    verified: false,
    createdAt: Date.now(),
  });
  return id;
}

function verifyMemoryOtp(id: string, code: string): { success: boolean; message: string } {
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
    const remaining = session.maxAttempts - session.attempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  session.verified = true;
  memoryStore.set(id, session);
  return { success: true, message: 'OTP verified successfully.' };
}

function getMemoryPhone(id: string): string | null {
  const session = memoryStore.get(id);
  return session ? session.phone : null;
}

function isMemoryVerified(id: string): boolean {
  const session = memoryStore.get(id);
  return session ? session.verified : false;
}

// ---- Firebase-backed store (production/Vercel) ----
let _db: Database | null = null;
let _useFirebase: boolean | null = null;

async function getDbOrNull(): Promise<Database | null> {
  if (_useFirebase !== null) return _useFirebase ? _db : null;
  try {
    const { db } = await import('@/lib/firebase');
    _db = db;
    _useFirebase = true;
    return db;
  } catch {
    _useFirebase = false;
    return null;
  }
}

// ---- Unified API ----

export async function createOtpSession(phone: string, otp: string): Promise<string> {
  const database = await getDbOrNull();
  const crypto = await import('node:crypto');
  const id = crypto.randomUUID();

  if (database) {
    await set(ref(database, `otp_sessions/${id}`), {
      phone,
      otp,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt: Date.now() + TTL_MS,
      verified: false,
      createdAt: Date.now(),
    });
  } else {
    createMemorySession(phone, otp);
  }
  return id;
}

export async function verifyOtp(id: string, code: string): Promise<{ success: boolean; message: string }> {
  const database = await getDbOrNull();

  if (database) {
    const snap = await get(ref(database, `otp_sessions/${id}`));
    if (!snap.exists()) {
      return { success: false, message: 'Session expired or invalid. Please request a new OTP.' };
    }

    const session = snap.val() as OtpSession;

    if (Date.now() > session.expiresAt) {
      await set(ref(database, `otp_sessions/${id}`), null);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (session.verified) {
      return { success: false, message: 'This OTP has already been used.' };
    }

    const attempts = session.attempts + 1;

    if (attempts >= session.maxAttempts) {
      await set(ref(database, `otp_sessions/${id}`), null);
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    await update(ref(database, `otp_sessions/${id}`), { attempts });

    if (session.otp !== code) {
      const remaining = session.maxAttempts - attempts;
      return { success: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
    }

    await update(ref(database, `otp_sessions/${id}`), { verified: true });
    return { success: true, message: 'OTP verified successfully.' };
  }

  // Fallback to in-memory
  return verifyMemoryOtp(id, code);
}

export function isVerified(id: string): boolean {
  return isMemoryVerified(id);
}

export function getSessionPhone(id: string): string | null {
  return getMemoryPhone(id);
}
