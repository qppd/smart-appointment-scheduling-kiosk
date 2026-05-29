import React, { useState, useEffect } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { Appointment } from '../types';
import { Calendar, Clock, XCircle } from 'lucide-react';
import { formatDate, formatTime, getStatusColor, getStatusLabel } from '../utils/formatters';

export default function MyAppointments() {
  const { getMyAppointments, cancelAppointment, loading } = useAppointments();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    const items = await getMyAppointments(filter || undefined);
    setAppointments(items);
  };

  const handleCancel = async (id: string) => {
    if (confirm('Cancel this appointment?')) {
      const ok = await cancelAppointment(id);
      if (ok) loadAppointments();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Appointments</h1>

      <div className="flex gap-2 mb-6">
        {['', 'scheduled', 'checked_in', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? getStatusLabel(s) : 'All'}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-center py-8">Loading...</p>}

      {!loading && appointments.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No appointments found.</p>
        </div>
      )}

      <div className="space-y-4">
        {appointments.map(apt => (
          <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{apt.service_name || 'Appointment'}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(apt.appointment_date)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(apt.start_time)}</span>
                  {apt.queue_number && <span className="text-teal-600 font-medium">Queue #{apt.queue_number}</span>}
                </div>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(apt.status)}`}>
                  {getStatusLabel(apt.status)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                <button
                  onClick={() => handleCancel(apt.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm px-3 py-2 hover:bg-red-50 rounded-lg transition"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
