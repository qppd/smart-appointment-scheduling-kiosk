import { NextRequest, NextResponse } from 'next/server';

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || 'SEMAFOR';

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('09')) {
    return '0' + digits; // 09XXXXXXXXX -> 09XXXXXXXXX
  }
  if (digits.length === 12 && digits.startsWith('63')) {
    return '0' + digits.slice(2); // 63XXXXXXXXX -> 09XXXXXXXXX
  }
  if (digits.length === 13 && digits.startsWith('639')) {
    return '0' + digits.slice(2); // 639XXXXXXXXXX -> 09XXXXXXXXX
  }
  return phone;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();
    if (!SEMAPHORE_API_KEY) {
      return NextResponse.json({ error: 'Semaphore API key not configured' }, { status: 500 });
    }
    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    const url = new URL('https://api.semaphore.co/api/v4/messages');
    url.searchParams.set('apikey', SEMAPHORE_API_KEY);
    url.searchParams.set('number', normalizedPhone);
    url.searchParams.set('message', message);
    url.searchParams.set('sendername', SENDER_NAME);
    url.searchParams.set('from', SENDER_NAME);

    const response = await fetch(url.toString(), { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
      console.error('Semaphore error:', data);
      return NextResponse.json({ error: 'Failed to send SMS', details: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('SMS send error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
