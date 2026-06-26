import { NextRequest } from 'next/server';
import { sendSms } from '@/lib/semaphore';
import { SemaphoreError } from '@/lib/semaphore/types';
import { jsonError, jsonOk } from '@/lib/semaphore/route-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sms/reminder
 * Send a reminder SMS for an upcoming appointment.
 * Body: {
 *   phone: string;
 *   serviceName: string;
 *   appointmentDate: string;
 *   startTime: string;
 *   endTime?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    let body: {
      phone?: unknown;
      serviceName?: unknown;
      appointmentDate?: unknown;
      startTime?: unknown;
      endTime?: unknown;
    };
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    const { phone, serviceName, appointmentDate, startTime, endTime } = body;

    if (
      typeof phone !== 'string' ||
      typeof serviceName !== 'string' ||
      typeof appointmentDate !== 'string' ||
      typeof startTime !== 'string'
    ) {
      return jsonError(400, 'Missing required fields');
    }

    const message =
      `Reminder: Your appointment at Barangay Dolores is in 30 minutes!\n` +
      `Service: ${serviceName}\n` +
      `Date: ${appointmentDate}\n` +
      `Time: ${startTime}${typeof endTime === 'string' ? ` - ${endTime}` : ''}\n` +
      `Check-in at the kiosk 1 minute before or during your scheduled time.`;

    const result = await sendSms(phone, message);

    return jsonOk({
      message: 'Reminder sent.',
    });
  } catch (err) {
    if (err instanceof SemaphoreError) {
      return jsonError(err.httpStatus ?? 500, err.message, { code: err.code });
    }
    console.error('[api/sms/reminder] unexpected error:', err);
    return jsonError(500, 'Internal server error');
  }
}
