'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ref, get, child } from 'firebase/database';
import { onAuthChange, getUserData } from '@/lib/auth';
import { subscribeServices, createAppointment, regenerateEnrollmentOTP } from '@/lib/rtdb';
import { db } from '@/lib/firebase';
import type { Service } from '@/types';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function Booking() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState<'service' | 'date' | 'time' | 'confirm' | 'done'>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState('');
  const [enrollmentOtp, setEnrollmentOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setAuthChecking(false);
      if (!u) { router.push('/login'); return; }
      setUser(u);
      getUserData(u.uid).then((data) => {
        if (data?.role === 'admin') {
          router.push('https://smart-appointment-scheduling-kiosk.vercel.app/dolores-taytay-admin');
        }
      });
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;
    const unsub = subscribeServices((s) => setServices(s));
    return () => unsub();
  }, [authChecking]);

  const slots = selectedService ? generateSlots(selectedService.duration_minutes) : [];
  const availableSlots = slots.filter(s => !bookedSlots.has(s));

  const checkAvailability = async (date: string, serviceId: string) => {
    setCheckingAvailability(true);
    try {
      const snap = await get(ref(db, 'appointments'));
      const data = snap.val() || {};
      const booked = new Set<string>();
      (Object.entries(data) as [string, any][]).forEach(([, a]) => {
        if (a.appointment_date === date && a.service_id === serviceId && a.status !== 'cancelled') {
          booked.add(`${a.start_time} - ${a.end_time}`);
        }
      });
      setBookedSlots(booked);
    } catch (err) {
      console.error('Availability check error:', err);
      setBookedSlots(new Set());
    } finally {
      setCheckingAvailability(false);
    }
  };

  const book = async () => {
    if (!selectedService || !selectedDate || !selectedSlot || !user) return;
    setLoading(true); setError('');
    try {
      const snap = await get(ref(db, 'appointments'));
      const data = snap.val() || {};
      const existing = Object.entries(data).filter(([, a]: [string, any]) => a.appointment_date === selectedDate && a.service_id === selectedService.id && a.status !== 'cancelled');
      if (existing.length >= selectedService.slot_capacity_per_day) { setError('No slots available for this date.'); setLoading(false); return; }
      const slotTaken = existing.some(([, a]: [string, any]) => `${a.start_time} - ${a.end_time}` === selectedSlot);
      if (slotTaken) { setError('This time slot was just booked by another user. Please select a different time.'); setLoading(false); return; }
      const [start, end] = selectedSlot.split(' - ');
      const result = await createAppointment({
        resident_id: user.uid, service_id: selectedService.id, service_name: selectedService.name,
        appointment_date: selectedDate, start_time: start, end_time: end,
        status: 'scheduled', queue_number: existing.length + 1, verified_by_fingerprint: false,
      });

      let id = result?.id || '';
      let otp = result?.otp || '';

      if ((!otp || !id) && id) {
        try {
          const remote = await get(child(ref(db, 'appointments'), id));
          const v = remote.val();
          if (v) { otp = otp || v.enrollment_otp || ''; setOtpExpiresAt(v.otp_expires_at || null); }
        } catch {}
      }

      setAppointmentId(id || '');
      setEnrollmentOtp(otp || '');
      setStep('done');
    } catch (err) { console.error('Booking error:', err); setError('Failed to book. Try again.'); }
    finally { setLoading(false); }
  };

  const regenerateCode = async () => {
    if (!appointmentId) return;
    setRegenerating(true);
    try {
      const { otp, expires_at } = await regenerateEnrollmentOTP(appointmentId);
      setEnrollmentOtp(otp);
      setOtpExpiresAt(expires_at);
    } catch (err) {
      console.error('Regenerate error:', err);
      alert('Failed to regenerate code. Please try again.');
    } finally { setRegenerating(false); }
  };

  if (authChecking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  if (!user) { return null; }

  if (step === 'done') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="h-10 w-10 text-green-600" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
        <p className="text-gray-500 mb-6">Your appointment has been confirmed.</p>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-6 max-w-md mx bookmarkable">
          <p className="text-amber-800 font-medium mb-2">Your Enrollment Code</p>
          <p className="text-4xl font-bold text-amber-900 tracking-widest">{enrollmentOtp || '------'}</p>
          <p className="text-amber-700 text-sm mt-2">Present this code at the kiosk to enroll your fingerprint.</p>
          {otpExpiresAt && (
            <p className="text-amber-600 text-xs mt-2">Expires: {new Date(otpExpiresAt).toLocaleString()}</p>
          )}
          <button onClick={regenerateCode} disabled={regenerating}
            className="mt-3 inline-flex items-center gap-1 text-sm text-amber-800 hover:text-amber-900 underline disabled:opacity-50">
            <RefreshCw className={regenerating ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
            {regenerating ? 'Generating...' : 'I lost my code — generate a new one'}
          </button>
        </div>

        <Link href="/my-appointments" className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700">View My Appointments</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Book Appointment</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5"/>{error}</div>}

      {step === 'service' && (
        <div className="grid gap-4">
          {services.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800 font-medium">No services available</p>
              <p className="text-yellow-700 text-sm mt-1">Please ask an admin to add services in the Firebase Console RTDB.</p>
            </div>
          )}
          {services.map(s => (
            <button key={s.id} onClick={() => { setSelectedService(s); setStep('date'); }} className="text-left p-5 border border-gray-200 rounded-xl hover:border-teal-500 transition bg-white">
              <h3 className="text-lg font-semibold text-gray-900">{s.name}</h3>
              <p className="text-gray-500 text-sm mt-1">{s.description}</p>
              <p className="text-gray-400 text-sm mt-2">{s.duration_minutes} min | {s.slot_capacity_per_day}/day</p>
            </button>
          ))}
        </div>
      )}

      {step === 'date' && selectedService && (
        <div>
          <button onClick={() => setStep('service')} className="flex items-center text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="h-4 w-4 mr-1"/>Back</button>
          <h2 className="text-xl font-bold mb-4">Select Date</h2>
          <input type="date" min={new Date().toISOString().split('T')[0]} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          <button onClick={async () => { if (selectedDate) { await checkAvailability(selectedDate, selectedService.id); setStep('time'); } }} className="mt-4 w-full bg-teal-600 text-white py-3 rounded-lg font-semibold" disabled={!selectedDate}>Continue</button>
        </div>
      )}

      {step === 'time' && selectedService && (
        <div>
          <button onClick={() => setStep('date')} className="flex items-center text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="h-4 w-4 mr-1"/>Back</button>
          <h2 className="text-xl font-bold mb-4">Select Time</h2>
          {checkingAvailability ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" /><p className="text-gray-500 mt-4">Checking availability...</p></div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-yellow-800 font-medium">No time slots available</p>
              <p className="text-yellow-700 text-sm mt-1">All time slots for this date are fully booked. Please select a different date.</p>
              <button onClick={() => setStep('date')} className="mt-4 text-yellow-800 underline text-sm">Go back to date selection</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">{availableSlots.map(s => <button key={s} onClick={() => { setSelectedSlot(s); setStep('confirm'); }} className={`p-3 rounded-lg text-center border text-sm font-medium ${selectedSlot === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-200 hover:border-teal-500'}`}>{s}</button>)}</div>
          )}
        </div>
      )}

      {step === 'confirm' && selectedService && (
        <div>
          <h2 className="text-xl font-bold mb-4">Confirm Booking</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
            <p><strong>Service:</strong> {selectedService.name}</p>
            <p><strong>Date:</strong> {selectedDate}</p>
            <p><strong>Time:</strong> {selectedSlot}</p>
          </div>
          <button onClick={book} disabled={loading} className="mt-6 w-full bg-teal-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Booking...' : 'Confirm'}</button>
        </div>
      )}
    </div>
  );
}

function to12HourStr(h: number, m: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
}

function generateSlots(duration: number): string[] {
  const slots: string[] = [];
  for (let t = 8 * 60; t + duration <= 17 * 60; t += duration) {
    const sH = Math.floor(t / 60), sM = t % 60;
    const eH = Math.floor((t + duration) / 60), eM = (t + duration) % 60;
    slots.push(`${to12HourStr(sH, sM)} - ${to12HourStr(eH, eM)}`);
  }
  return slots;
}
