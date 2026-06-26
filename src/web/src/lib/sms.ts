/**
 * Client-side SMS service.
 * These functions call the Next.js API routes — never call Semaphore directly from the browser.
 */

interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  sessionId?: string;
}

interface SmsSendOtpResult {
  success: boolean;
  sessionId?: string;
  message: string;
}

interface SmsVerifyOtpResult {
  success: boolean;
  message: string;
}

interface SmsGenericResult {
  success: boolean;
  message: string;
}

interface BookingConfirmationPayload {
  phone: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  enrollmentCode?: string;
  queueNumber?: number;
}

interface ReminderPayload {
  phone: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
}

async function postApi<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: ApiResponse = await res.json();

  if (!res.ok) {
    return { success: false, message: data.error || 'Request failed' } as unknown as T;
  }

  return { ...data } as unknown as T;
}

/**
 * Send an OTP to the given phone number.
 * Returns a sessionId that must be retained for verification.
 */
export async function sendOTP(phone: string): Promise<SmsSendOtpResult> {
  const data = await postApi<ApiResponse>('/api/sms/send-otp', { phone });
  return {
    success: data.success,
    sessionId: data.sessionId,
    message: data.message || (data.success ? 'OTP sent.' : 'Failed to send OTP'),
  };
}

/**
 * Verify an OTP using the session ID.
 */
export async function verifyOTP(sessionId: string, otp: string): Promise<SmsVerifyOtpResult> {
  const data = await postApi<ApiResponse>('/api/sms/verify-otp', { sessionId, otp });
  return {
    success: data.success,
    message: data.message || (data.success ? 'OTP verified.' : 'OTP verification failed'),
  };
}

/**
 * Send a booking confirmation SMS.
 */
export async function sendBookingConfirmation(payload: BookingConfirmationPayload): Promise<SmsGenericResult> {
  const data = await postApi<ApiResponse>('/api/sms/booking-confirmation', payload);
  return {
    success: data.success,
    message: data.message || (data.success ? 'Booking confirmation sent.' : 'Failed to send confirmation SMS'),
  };
}

/**
 * Send a generic SMS (manual trigger from admin).
 */
export async function sendSMS(phone: string, message: string): Promise<SmsGenericResult> {
  const data = await postApi<ApiResponse>('/api/sms/send', { phone, message });
  return {
    success: data.success,
    message: data.message || (data.success ? 'SMS sent.' : 'Failed to send SMS'),
  };
}

/**
 * Send a reminder SMS.
 */
export async function sendReminderSMS(payload: ReminderPayload): Promise<SmsGenericResult> {
  const data = await postApi<ApiResponse>('/api/sms/reminder', payload);
  return {
    success: data.success,
    message: data.message || (data.success ? 'Reminder sent.' : 'Failed to send reminder'),
  };
}
