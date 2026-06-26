/**
 * Send an OTP to the given phone number.
 * Returns a sessionId that must be retained for verification.
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; sessionId?: string; message: string }> {
  const res = await fetch('/api/sms/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Send OTP error:', data);
    return { success: false, message: data.error || 'Failed to send OTP' };
  }

  return { success: true, sessionId: data.sessionId, message: data.message };
}

/**
 * Verify an OTP using the session ID.
 */
export async function verifyOTP(sessionId: string, otp: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/sms/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, otp }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Verify OTP error:', data);
    return { success: false, message: data.error || 'OTP verification failed' };
  }

  return { success: data.success, message: data.message };
}

/**
 * Send a booking confirmation SMS.
 */
export async function sendBookingConfirmation(payload: {
  phone: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  enrollmentCode?: string;
  queueNumber?: number;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/sms/booking-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Booking confirmation SMS error:', data);
    return { success: false, message: data.error || 'Failed to send confirmation SMS' };
  }

  return { success: true, message: 'Booking confirmation sent.' };
}

/**
 * Send a generic SMS (manual trigger from admin).
 */
export async function sendSMS(phone: string, message: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Send SMS error:', data);
    return { success: false, message: data.error || 'Failed to send SMS' };
  }

  return { success: true, message: 'SMS sent successfully.' };
}

/**
 * Send a reminder SMS.
 */
export async function sendReminderSMS(payload: {
  phone: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/sms/reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Send reminder error:', data);
    return { success: false, message: data.error || 'Failed to send reminder' };
  }

  return { success: true, message: 'Reminder sent.' };
}
