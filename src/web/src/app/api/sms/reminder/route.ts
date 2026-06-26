import { NextRequest, NextResponse } from 'next/server';

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || 'SEMAFOR';

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('09')) {
    return '0' + digits;
  }
  if (digits.length === 12 && digits.startsWith('63')) {
    return '0' + digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith('639')) {
    return '0' + digits.slice(2);
  }
  return phone;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, serviceName, appointmentDate, startTime, endTime } = await request.json();

    if (!SEMAPHORE_API_KEY) {
      return NextResponse.json({ error: 'Semaphore API key not configured' }, { status: 500 });
    }
    if (!phone || !serviceName || !appointmentDate || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const message = `Reminder: Your appointment at Barangay Dolores is in 30 minutes!\nService: ${serviceName}\nDate: ${appointmentDate}\nTime: ${startTime} - ${endTime}\nCheck-in at the kiosk 1 minute before or during your scheduled time.`;

    const url = new URL('https://api.semaphore.co/api/v4/messages');
    url.searchParams.set('apikey', SEMAPHORE_API_KEY);
    url.searchParams.set('number', normalizedPhone);
    url.searchParams.set('message', message);
    url.searchParams.set('sendername', SENDER_NAME);
    url.searchParams.set('from', SENDER_NAME);

    const response = await fetch(url.toString(), { method: 'POST' });

    if (!response.ok) {
      const data = await response.json();
      console.error('Semaphore error during reminder:', data);
      return NextResponse.json({ error: 'Failed to send reminder SMS', details: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reminder sent.' });
  } catch (err: any) {
    console.error('Reminder SMS error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
