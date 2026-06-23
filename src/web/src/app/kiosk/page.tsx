'use client';

import { useState, useEffect } from 'react';
import { subscribeTodayAppointments } from '@/lib/rtdb';
import type { Appointment } from '@/types';
import { Fingerprint, CheckCircle, X, Users } from 'lucide-react';
import { to12HourFormat } from '@/lib/utils';

export default function KioskPortal() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const unsub = subscribeTodayAppointments((a) => setAppointments(a));
    return () => unsub();
  }, []);

  return (
    <div>
      <div className="bg-gradient-to-r from-teal-600 to-blue-700 text-white py-12 text-center">
        <Fingerprint className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">Kiosk Portal</h1>
        <p className="text-teal-100 text-lg">Today's Schedule</p>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-teal-100 rounded-xl p-6 text-center"><p className="text-3xl font-bold text-gray-900">{appointments.length}</p><p className="text-sm text-gray-500 mt-1">Appointments</p></div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center"><p className="text-3xl font-bold text-green-700">{appointments.filter(a => a.status === 'checked_in').length}</p><p className="text-sm text-green-600 mt-1">Checked In</p></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Queue #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Service</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Time</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Fingerprint</th></tr></thead>
            <tbody>{appointments.map(a => (<tr key={a.id} className={a.status === 'checked_in' ? 'bg-green-50' : ''}><td className="px-6 py-4 font-bold text-2xl">#{a.queue_number}</td><td className="px-6 py-4">{a.service_name}</td><td className="px-6 py-4">{to12HourFormat(a.start_time)}</td><td className="px-6 py-4"><span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">{a.status}</span></td><td className="px-6 py-4">{a.verified_by_fingerprint ? <CheckCircle className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-gray-300"/>}</td></tr>))}{appointments.length === 0 && <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-500"><Users className="h-12 w-12 mx-auto mb-3 text-gray-300"/><p className="text-lg">No appointments today.</p></td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
