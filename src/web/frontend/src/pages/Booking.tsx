import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../hooks/useAppointments';
import api from '../services/api';
import { Service, TimeSlot, Appointment } from '../types';
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { formatTime } from '../utils/formatters';

type Step = 'service' | 'datetime' | 'confirm' | 'done';

export default function Booking() {
  const { user } = useAuth();
  const { getAvailableSlots, bookAppointment, loading } = useAppointments();
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.get('/services').then(res => setServices(res.data)).catch(() => {});
  }, []);

  const handleSelectService = (svc: Service) => {
    if (svc) setSelectedService(svc);
    if (!user?.fingerprint_enrolled) {
      setError('Please enroll your fingerprint at the barangay hall kiosk before booking.');
      return;
    }
    if (user?.status !== 'active') {
      setError('Your account has not been activated yet. Please visit the barangay hall.');
      return;
    }
    setSelectedService(svc);
    setStep('datetime');
    setError(null);
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (selectedService && date) {
      setLoadingSlots(true);
      const availableSlots = await getAvailableSlots(selectedService.id, date);
      setSlots(availableSlots);
      setLoadingSlots(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setError(null);
    const result = await bookAppointment({
      service_id: selectedService.id,
      appointment_date: selectedDate,
      start_time: selectedSlot.start_time,
    });
    if (result) {
      setAppointment(result);
      setStep('done');
    } else {
      setError('Failed to book. The slot may have been taken.');
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-8 space-x-2">
        {['service', 'datetime', 'confirm', 'done'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-teal-600 text-white' : 
              ['done'].includes(step) && ['service', 'datetime', 'confirm'].includes(s) ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {['done'].includes(step) && ['service', 'datetime', 'confirm'].includes(s) ? '✓' : i + 1}
            </div>
            {i < 3 && <div className="w-12 h-0.5 bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Service */}
      {step === 'service' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Service</h2>
          <div className="grid gap-4">
            {services.map(svc => (
              <button
                key={svc.id}
                onClick={() => handleSelectService(svc)}
                className="text-left p-5 border border-gray-200 rounded-xl hover:border-teal-500 hover:shadow-sm transition bg-white"
              >
                <h3 className="text-lg font-semibold text-gray-900">{svc.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{svc.description}</p>
                <div className="flex gap-4 mt-3 text-sm text-gray-400">
                  <span>⏱ {svc.duration_minutes} min</span>
                  <span>📋 {svc.slot_capacity_per_day} slots/day</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Pick Date & Time */}
      {step === 'datetime' && selectedService && (
        <div>
          <button onClick={() => setStep('service')} className="flex items-center text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to services
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pick a Date & Time</h2>
          <p className="text-gray-500 mb-6">{selectedService.name}</p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {loadingSlots && <p className="text-gray-500 text-center py-4">Loading available slots...</p>}

          {!loadingSlots && selectedDate && slots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available Time Slots</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => slot.is_available && setSelectedSlot(slot)}
                    disabled={!slot.is_available}
                    className={`p-3 rounded-lg text-center border text-sm font-medium transition ${
                      selectedSlot?.id === slot.id
                        ? 'bg-teal-600 text-white border-teal-600'
                        : slot.is_available
                        ? 'bg-white text-gray-700 border-gray-200 hover:border-teal-500 hover:bg-teal-50'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingSlots && selectedDate && slots.length === 0 && (
            <p className="text-gray-500 text-center py-4">No available slots for this date.</p>
          )}

          <button
            onClick={() => setStep('confirm')}
            disabled={!selectedSlot}
            className="mt-6 w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Continue to Confirm
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedService && selectedSlot && (
        <div>
          <button onClick={() => setStep('datetime')} className="flex items-center text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to slots
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Appointment</h2>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-teal-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="font-semibold text-gray-900">{selectedService.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-teal-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-semibold text-gray-900">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-teal-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-semibold text-gray-900">{formatTime(selectedSlot.start_time)} — {formatTime(selectedSlot.end_time)}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="mt-6 w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && appointment && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
          <p className="text-gray-500 mb-6">Your reference details:</p>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-left max-w-md mx-auto space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reference No.</span>
              <span className="font-mono font-bold text-gray-900">{appointment.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Queue Number</span>
              <span className="font-bold text-teal-600">#{appointment.queue_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-900">{appointment.service_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-medium text-gray-900">{appointment.appointment_date} {formatTime(appointment.start_time)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
