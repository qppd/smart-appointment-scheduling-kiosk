import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '../otp-store';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, otp } = await request.json();

    if (!sessionId || !otp) {
      return NextResponse.json({ error: 'Session ID and OTP are required' }, { status: 400 });
    }

    const result = verifyOtp(sessionId, otp);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
