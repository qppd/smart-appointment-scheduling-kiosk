'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { onAuthChange, getUserData } from '@/lib/auth';
import { subscribeTodayAppointments, subscribeUsers } from '@/lib/rtdb';
import { db } from '@/lib/firebase';
import type { Appointment, User } from '@/types';
import { Calendar, Fingerprint, Users, Loader2, Shield, AlertOctagon } from 'lucide-react';

const ADMIN_EMAIL = 'quezon.province.pd@gmail.com';

export default function AdminDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<'queue' | 'residents' | 'stats'>('queue');
  const [authUser, setAuthUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsubAppointments: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    const authUnsub = onAuthChange((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setAuthUser(u);

      // Check admin role from RTDB
      getUserData(u.uid).then((userData) => {
        const isUserAdmin = userData?.role === 'admin' || u.email === ADMIN_EMAIL;
        setIsAdmin(isUserAdmin);
        setChecking(false);

        if (isUserAdmin) {
          // Only subscribe to data if admin
          const ua = subscribeUsers((us) => setUsers(us));
          const qa = subscribeTodayAppointments((a) => setAppointments(a));
          unsubUsers = ua;
          unsubAppointments = qa;
        }
      });
    });

    return () => {
      authUnsub();
      if (unsubUsers) unsubUsers();
      if (unsubAppointments) unsubAppointments();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
        <p className="text-gray-500 mt-4">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertOctagon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">You do not have permission to access the admin dashboard.</p>
        <button onClick={() => router.push('/')} className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700">
          Go to Home
        </button>
      </div>
    );
  }

  const todayCheckedIn = appointments.filter(a => a.status === 'checked_in').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-teal-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>
      <div className="flex gap-2 mb-8">
        {(['queue', 'residents', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t === 'queue' ? 'Queue' : t === 'residents' ? 'Residents' : 'Stats'}</button>
        ))}
      </div>
      {tab === 'queue' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Resident</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Service</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th></tr></thead>
            <tbody>{appointments.map(a => (<tr key={a.id}><td className="px-4 py-3 font-bold">#{a.queue_number}</td><td className="px-4 py-3">{a.resident_id}</td><td className="px-4 py-3">{a.service_name}</td><td className="px-4 py-3">{a.start_time}</td><td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${a.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      )}
      {tab === 'stats' && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{ label: "Today's Appointments", value: appointments.length, icon: Calendar }, { label: 'Checked In', value: todayCheckedIn, icon: Fingerprint }, { label: 'Pending Activation', value: users.filter(u => u.status === 'pending').length, icon: Users }].map(s => { const Icon = s.icon; return (<div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>); })}</div>}
      {tab === 'residents' && <div className="bg-white border border-gray-200 rounded-xl overflow-hidden"><table className="w-full"><thead className="bg-gray-50 border-b"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fingerprint</th></tr></thead><tbody>{users.map(u => (<tr key={u.uid}><td className="px-4 py-3">{u.first_name} {u.last_name}</td><td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">{u.status}</span></td><td className="px-4 py-3">{u.fingerprint_enrolled ? 'Yes' : 'No'}</td></tr>))}</tbody></table></div>}
    </div>
  );
}
