import { NextRequest, NextResponse } from 'next/server';
import { createOtpSession } from '../otp-store';

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || 'SEMAFOR';

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('09')) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('63')) {
    return '0' + digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith('639')) {
    return '0' + digits.slice(3);
  }
  return phone;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!SEMAPHORE_API_KEY) {
      return NextResponse.json({ error: 'Semaphore API key not configured' }, { status: 500 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const otp = generateOtp();
    const sessionId = createOtpSession(normalizedPhone, otp);

    const message = `Your Barangay Dolores verification code is: ${otp}. This code expires in 5 minutes.`;

    const url = new URL('https://api.semaphore.co/api/v4/messages');
    url.searchParams.set('apikey', SEMAPHORE_API_KEY);
    url.searchParams.set('number', normalizedPhone);
    url.searchParams.set('message', message);
    url.searchParams.set('sendername', SENDER_NAME);

    const response = await fetch(url.toString(), { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
      console.error('Semaphore error:', data);
      return NextResponse.json({ error: 'Failed to send OTP', details: data, sessionId }, { status: 500 });
    }

    return NextResponse.json({ success: true, sessionId, message: 'OTP sent successfully.' });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
