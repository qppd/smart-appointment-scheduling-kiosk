import React, { useState, useEffect } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import api from '../services/api';
import { QueueResponse, StatsResponse } from '../types';
import { Fingerprint, CheckCircle, X, Clock, Users } from 'lucide-react';
import { formatTime } from '../utils/formatters';

export default function KioskPortal() {
  const { getTodayQueue, getStats } = useAppointments();
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      const q = await getTodayQueue();
      setQueue(q);
      const s = await getStats();
      if (s) setStats(s);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Kiosk Header */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-700 text-white py-12 text-center">
        <Fingerprint className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">Kiosk Portal</h1>
        <p className="text-teal-100 text-lg">Barangay Dolores — Fingerprint Check-in System</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-teal-100 rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{queue?.total || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Today's Appointments</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-green-700">{stats?.checked_in_today || 0}</p>
            <p className="text-sm text-green-600 mt-1">Checked In</p>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-yellow-700">{stats?.pending_activation || 0}</p>
            <p className="text-sm text-yellow-600 mt-1">Pending Activation</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats?.active_services || 0}</p>
            <p className="text-sm text-blue-600 mt-1">Active Services</p>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fingerprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue?.items.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${
                  item.status === 'checked_in' ? 'bg-green-50' : ''
                }`}>
                  <td className="px-6 py-4 font-bold text-2xl text-gray-900">#{item.queue_number}</td>
                  <td className="px-6 py-4 text-lg text-gray-900">{item.resident_name}</td>
                  <td className="px-6 py-4 text-gray-600">{item.service_name}</td>
                  <td className="px-6 py-4 text-gray-600">{formatTime(item.start_time)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      item.status === 'checked_in' ? 'bg-green-100 text-green-700 border border-green-200' :
                      item.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      item.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.verified_by_fingerprint ? (
                      <span className="flex items-center text-green-600 font-medium">
                        <CheckCircle className="h-5 w-5 mr-1" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-400">
                        <X className="h-5 w-5 mr-1" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(!queue || queue.items.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg">No appointments scheduled for today.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
