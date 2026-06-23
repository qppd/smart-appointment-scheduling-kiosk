'use client';

import { useState, useEffect } from 'react';
import { onAuthChange, getUserData } from '@/lib/auth';
import { subscribeMyAppointments, cancelAppointment, regenerateEnrollmentOTP } from '@/lib/rtdb';
import type { Appointment } from '@/types';
import { Calendar, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MyAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    let unsub: () => void;
    const authUnsub = onAuthChange((user) => {
      setAuthChecking(false);
      if (!user) {
        router.push('/login');
        return;
      }
      getUserData(user.uid).then((data) => {
        if (data?.role === 'admin') {
          router.push('https://smart-appointment-scheduling-kiosk.vercel.app/dolores-taytay-admin');
          return;
        }
      });
      unsub = subscribeMyAppointments(user.uid, (apts) => {
        setAppointments(apts);
        setLoading(false);
      });
    });
    return () => {
      authUnsub();
      if (unsub) unsub();
    };
  }, [router]);

  const handleCancel = async (id: string) => {
    if (confirm('Cancel this appointment?')) await cancelAppointment(id);
  };

  const handleRegenerateOTP = async (apt: Appointment) => {
    if (!apt.id) return;
    try {
      setRegenerating(apt.id);
      await regenerateEnrollmentOTP(apt.id);
    } catch (err) {
      console.error('Regenerate OTP error:', err);
      alert('Failed to regenerate code. Try again.');
    } finally {
      setRegenerating(null);
    }
  };

  if (authChecking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Appointments</h1>
      {loading && <p className="text-gray-500 text-center py-8">Loading...</p>}
      {!loading && appointments.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No appointments found.</p>
        </div>
      )}
      <div className="space-y-4">
        {appointments.map((apt) => {
          const otpExpired =
            !!apt.enrollment_otp_expires_at &&
            new Date() > new Date(apt.enrollment_otp_expires_at);
          const showOTP =
            apt.status === 'scheduled' &&
            !!apt.enrollment_otp &&
            !apt.enrollment_otp_consumed_at &&
            !otpExpired;
          const canShowRegenerate = apt.status === 'scheduled' && !apt.enrollment_otp_consumed_at;

          return (
            <div
              key={apt.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{apt.service_name || 'Appointment'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {apt.appointment_date} {apt.start_time}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    apt.status === 'scheduled'
                      ? 'bg-yellow-100 text-yellow-700'
                      : apt.status === 'checked_in'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {apt.status}
                </span>

                {showOTP && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
                    <p className="text-amber-800 text-xs font-medium">Enrollment Code</p>
                    <p className="text-xl font-bold text-amber-900 tracking-widest">
                      {apt.enrollment_otp}
                    </p>
                    <p className="text-amber-700 text-xs mt-1">
                      Present this at the kiosk to enroll your fingerprint
                    </p>
                    {apt.enrollment_otp_expires_at && (
                      <p className="text-amber-600 text-xs mt-1">
                        Expires: {new Date(apt.enrollment_otp_expires_at).toLocaleString()}
                      </p>
                    )}
                    {canShowRegenerate && (
                      <button
                        onClick={() => handleRegenerateOTP(apt)}
                        disabled={regenerating === apt.id}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${regenerating === apt.id ? 'animate-spin' : ''}`} />
                        Regenerate code
                      </button>
                    )}
                  </div>
                )}

                {!showOTP && canShowRegenerate && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleRegenerateOTP(apt)}
                      disabled={regenerating === apt.id}
                      className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${regenerating === apt.id ? 'animate-spin' : ''}`} />
                      {otpExpired
                        ? 'Code expired — generate a new one'
                        : "I don't have a code — generate one"}
                    </button>
                  </div>
                )}
              </div>

              {apt.status === 'scheduled' && (
                <button
                  onClick={() => handleCancel(apt.id!)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm px-3 py-2 hover:bg-red-50 rounded-lg"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}