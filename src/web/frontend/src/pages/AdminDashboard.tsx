import React, { useState, useEffect } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import api from '../services/api';
import { StatsResponse, QueueResponse, QueueItem, ResidentListResponse, Service } from '../types';
import { BarChart3, Users, Calendar, Fingerprint, Search, CheckCircle, X, Activity } from 'lucide-react';
import { formatTime } from '../utils/formatters';

type Tab = 'queue' | 'services' | 'residents' | 'stats';

export default function AdminDashboard() {
  const { getTodayQueue, getStats } = useAppointments();
  const [tab, setTab] = useState<Tab>('queue');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [residents, setResidents] = useState<ResidentListResponse | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const s = await getStats();
    if (s) setStats(s);
    const q = await getTodayQueue();
    setQueue(q);
    try {
      const r = await api.get('/residents?per_page=50');
      setResidents(r.data);
      const sv = await api.get('/services?include_inactive=true');
      setServices(sv.data);
    } catch {}
  };

  const activateResident = async (id: string) => {
    try {
      await api.patch(`/residents/${id}/activate`);
      loadData();
    } catch {}
  };

  const statsCards = [
    { label: 'Today's Appointments', value: stats?.today_appointments || 0, icon: Calendar, color: 'bg-blue-500' },
    { label: 'Checked In', value: stats?.checked_in_today || 0, icon: Fingerprint, color: 'bg-green-500' },
    { label: 'Pending Activation', value: stats?.pending_activation || 0, icon: Users, color: 'bg-yellow-500' },
    { label: 'Active Services', value: stats?.active_services || 0, icon: Activity, color: 'bg-teal-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8">
        {(['queue', 'services', 'residents', 'stats'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'queue' ? '📋 Queue Board' : t === 'services' ? '⚙️ Services' : t === 'residents' ? '👥 Residents' : '📊 Statistics'}
          </button>
        ))}
      </div>

      {/* Queue Board */}
      {tab === 'queue' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statsCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-500">{card.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Queue</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fingerprint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue?.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">#{item.queue_number}</td>
                    <td className="px-4 py-3 text-gray-900">{item.resident_name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.service_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(item.start_time)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'checked_in' ? 'bg-green-100 text-green-700' :
                        item.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.verified_by_fingerprint ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300" />
                      )}
                    </td>
                  </tr>
                ))}
                {(!queue || queue.items.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No appointments today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Services */}
      {tab === 'services' && (
        <div className="space-y-4">
          {services.map(svc => (
            <div key={svc.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{svc.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{svc.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>⏱ {svc.duration_minutes} min</span>
                    <span>📋 {svc.slot_capacity_per_day} slots/day</span>
                    {svc.department && <span>🏢 {svc.department}</span>}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  svc.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {svc.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Residents */}
      {tab === 'residents' && (
        <div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search residents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fingerprint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {residents?.items.filter(r =>
                  !search || r.first_name.toLowerCase().includes(search.toLowerCase()) ||
                  r.last_name.toLowerCase().includes(search.toLowerCase()) ||
                  r.contact_number.includes(search)
                ).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{r.last_name}, {r.first_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.contact_number}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.status === 'active' ? 'bg-green-100 text-green-700' :
                        r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.fingerprint_enrolled ? (
                        <span className="text-green-600 text-xs font-medium">Enrolled</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not enrolled</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => activateResident(r.id)}
                          className="bg-teal-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-teal-700 transition"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Total Residents', value: stats.total_residents, icon: Users, color: 'blue' },
            { label: 'Today's Appointments', value: stats.today_appointments, icon: Calendar, color: 'teal' },
            { label: 'Checked In Today', value: stats.checked_in_today, icon: Fingerprint, color: 'green' },
            { label: 'Pending Activation', value: stats.pending_activation, icon: Users, color: 'yellow' },
            { label: 'Active Services', value: stats.active_services, icon: Activity, color: 'purple' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
