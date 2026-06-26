interface OtpSession {
  phone: string;
  otp: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  verified: boolean;
}

const store = new Map<string, OtpSession>();

function cleanup(): void {
  const now = Date.now();
  for (const [id, session] of store.entries()) {
    if (now > session.expiresAt) {
      store.delete(id);
    }
  }
}

export function createOtpSession(phone: string, otp: string): string {
  cleanup();
  const id = crypto.randomUUID();
  store.set(id, {
    phone,
    otp,
    attempts: 0,
    maxAttempts: 3,
    expiresAt: Date.now() + 5 * 60 * 1000,
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
