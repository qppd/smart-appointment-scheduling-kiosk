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

    console.log('🔑 SEMAPHORE_API_KEY loaded:', SEMAPHORE_API_KEY ? 'yes (hidden)' : 'MISSING');
    console.log('📱 Normalized phone:', normalizedPhone);
    console.log('🏷️ Sender name:', SENDER_NAME);

    const message = `Your Barangay Dolores verification code is: ${otp}. This code expires in 5 minutes.`;

    const body = new URLSearchParams();
    body.append('apikey', SEMAPHORE_API_KEY);
    body.append('number', normalizedPhone);
    body.append('message', message);
    body.append('sendername', SENDER_NAME);
    body.append('code', otp);

    console.log('📤 Sending request to Semaphore OTP endpoint with body:', body.toString());

    const response = await fetch('https://semaphore.co/api/v4/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log('📥 Semaphore raw response:', { status: response.status, data });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to send OTP', details: data, sessionId }, { status: 500 });
    }

    const firstResult = Array.isArray(data) ? data[0] : data;

    if (firstResult?.status === 'Failed' || firstResult?.error) {
      return NextResponse.json(
        { error: firstResult?.error || firstResult?.message || 'Failed to send OTP', details: firstResult, sessionId },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, sessionId, message: 'OTP sent successfully.' });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
