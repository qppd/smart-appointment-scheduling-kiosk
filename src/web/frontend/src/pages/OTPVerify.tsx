import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Smartphone, ArrowLeft, AlertCircle } from 'lucide-react';

export default function OTPVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contact = searchParams.get('contact') || '';
  const { requestOTP, verifyOTP, loading, error } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (contact) {
      setStep('verify');
    }
  }, [contact]);

  const handleRequestOTP = async () => {
    await requestOTP(contact);
    setStep('verify');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    try {
      await verifyOTP(contact, code);
      navigate('/login', { state: { message: 'OTP verified! You can now log in. Please visit the barangay hall to activate your account.' } });
    } catch {
      // error handled by hook
    }
  };

  if (!contact) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Contact Number</h2>
        <p className="text-gray-500 mb-4">Please register first to receive an OTP.</p>
        <button onClick={() => navigate('/register')} className="text-teal-600 font-medium">
          Go to Registration
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Smartphone className="h-8 w-8 text-teal-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Number</h1>
        <p className="text-gray-500 mb-6">
          We'll send a 6-digit code to <strong>{contact}</strong>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' ? (
          <button
            onClick={handleRequestOTP}
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        ) : (
          <div>
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              onClick={handleRequestOTP}
              disabled={loading}
              className="mt-4 text-sm text-teal-600 hover:text-teal-700"
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
