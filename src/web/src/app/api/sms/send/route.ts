import { NextRequest } from 'next/server';
import { sendSms } from '@/lib/semaphore';
import { SemaphoreError } from '@/lib/semaphore/types';
import { jsonError, jsonOk } from '@/lib/semaphore/route-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sms/send
 * Send an arbitrary SMS to a phone number.
 * Body: { phone: string; message: string }
 */
export async function POST(request: NextRequest) {
  try {
    let body: { phone?: unknown; message?: unknown };
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    const { phone, message } = body;

    if (typeof phone !== 'string' || typeof message !== 'string') {
      return jsonError(400, 'Phone and message are required');
    }

    const result = await sendSms(phone, message);

    return jsonOk({
      data: {
        messageId: result.messageId,
        recipient: result.recipient,
        status: result.status,
      },
    });
  } catch (err) {
    if (err instanceof SemaphoreError) {
      return jsonError(err.httpStatus ?? 500, err.message, { code: err.code });
    }
    console.error('[api/sms/send] unexpected error:', err);
    return jsonError(500, 'Internal server error');
  }
}
