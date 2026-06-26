import { NextRequest } from 'next/server';
import { verifyOtp } from '../otp-store';
import { jsonError, jsonOk } from '@/lib/semaphore/route-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sms/verify-otp
 * Verify an OTP code against a session.
 * Body: { sessionId: string; otp: string }
 */
export async function POST(request: NextRequest) {
  try {
    let body: { sessionId?: unknown; otp?: unknown };
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    const { sessionId, otp } = body;

    if (typeof sessionId !== 'string' || typeof otp !== 'string') {
      return jsonError(400, 'Session ID and OTP are required');
    }

    if (!sessionId.trim() || !otp.trim()) {
      return jsonError(400, 'Session ID and OTP must not be empty');
    }

    const result = await verifyOtp(sessionId, otp.trim());

    if (!result.success) {
      return jsonError(400, result.message);
    }

    return jsonOk({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error('[api/sms/verify-otp] unexpected error:', err);
    return jsonError(500, 'Internal server error');
  }
}
