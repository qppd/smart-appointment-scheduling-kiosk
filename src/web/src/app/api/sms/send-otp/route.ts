import { NextRequest } from 'next/server';
import { sendOtp, normalizePhilippinePhone } from '@/lib/semaphore';
import { SemaphoreError } from '@/lib/semaphore/types';
import { jsonError, jsonOk } from '@/lib/semaphore/route-helpers';
import { createOtpSession } from '../otp-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/sms/send-otp
 * Generates and sends a 6-digit OTP via Semaphore SMS.
 * Body: { phone: string }
 */
export async function POST(request: NextRequest) {
  try {
    let body: { phone?: unknown };
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    const { phone } = body;

    if (typeof phone !== 'string') {
      return jsonError(400, 'Phone number is required');
    }

    const normalizedPhone = normalizePhilippinePhone(phone);
    const otp = generateOtp();
    const sessionId = await createOtpSession(normalizedPhone, otp);

    try {
      await sendOtp(normalizedPhone, otp);
    } catch (err) {
      if (err instanceof SemaphoreError) {
        return jsonError(err.httpStatus ?? 500, err.message, {
          code: err.code,
          sessionId,
        });
      }
      throw err;
    }

    return jsonOk({
      sessionId,
      message: 'OTP sent successfully.',
    });
  } catch (err) {
    if (err instanceof SemaphoreError) {
      return jsonError(err.httpStatus ?? 500, err.message, { code: err.code });
    }
    console.error('[api/sms/send-otp] unexpected error:', err);
    return jsonError(500, 'Internal server error');
  }
}
