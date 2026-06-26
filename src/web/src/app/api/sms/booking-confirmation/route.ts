import { NextRequest } from 'next/server';
import { sendSms } from '@/lib/semaphore';
import { SemaphoreError } from '@/lib/semaphore/types';
import { jsonError, jsonOk } from '@/lib/semaphore/route-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sms/booking-confirmation
 * Send a booking confirmation SMS.
 * Body: {
 *   phone: string;
 *   serviceName: string;
 *   appointmentDate: string;
 *   startTime: string;
 *   endTime?: string;
 *   enrollmentCode?: string;
 *   queueNumber?: number;
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
      enrollmentCode?: unknown;
      queueNumber?: unknown;
    };
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    const { phone, serviceName, appointmentDate, startTime } = body;

    if (
      typeof phone !== 'string' ||
      typeof serviceName !== 'string' ||
      typeof appointmentDate !== 'string' ||
      typeof startTime !== 'string'
    ) {
      return jsonError(400, 'Missing required fields');
    }

    const enrollmentCode =
      typeof body.enrollmentCode === 'string' ? body.enrollmentCode : undefined;
    const queueNumber =
      typeof body.queueNumber === 'number' ? body.queueNumber : undefined;

    let message =
      `Barangay Dolores Appointment Confirmed!\n` +
      `Service: ${serviceName}\n` +
      `Date: ${appointmentDate}\n` +
      `Time: ${startTime}${typeof body.endTime === 'string' ? ` - ${body.endTime}` : ''}\n`;

    if (typeof queueNumber === 'number') {
      message += `Queue #: ${queueNumber}\n`;
    }
    if (enrollmentCode) {
      message += `Enrollment Code: ${enrollmentCode}\n`;
    }

    message += `\nPresent your enrollment code at the kiosk to enroll your fingerprint.`;

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
    console.error('[api/sms/booking-confirmation] unexpected error:', err);
    return jsonError(500, 'Internal server error');
  }
}
