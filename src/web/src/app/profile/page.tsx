'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthChange, getUserData } from '@/lib/auth';
import { subscribeMyAppointments, updateUser } from '@/lib/rtdb';
import type { User as UserType, Appointment } from '@/types';
import {
  ArrowLeft, Loader2, AlertCircle, User, Phone, Mail,
  MapPin, Calendar as CalendarIcon, Shield, CheckCircle, X, Pencil, Save,
  Fingerprint, Briefcase,
} from 'lucide-react';

export default function Profile() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    address: '',
    birth_date: '',
  });

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setAuthUser(u);

      getUserData(u.uid).then((data) => {
        if (data) {
          setUserData(data as UserType);
          setForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            middle_name: data.middle_name || '',
            phone: data.phone || '',
            address: data.address || '',
            birth_date: data.birth_date || '',
          });
        }
        setLoading(false);
      });
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authUser) return;
    const unsub = subscribeMyAppointments(authUser.uid, (appts) => {
      setAppointments(appts);
    });
    return () => unsub();
  }, [authUser]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true);
    setError('');
    try {
      await updateUser(authUser.uid, form);
      setUserData((prev) => (prev ? { ...prev, ...form } as UserType : null));
      setSuccess('Profile updated successfully.');
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  const statusColor =
    userData?.status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';

  const roleColor =
    userData?.role === 'admin'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-teal-600">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
            <span className="text-xl font-bold text-teal-700">My Profile</span>
            <div className="w-20" />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    <Pencil className="h-4 w-4" /> Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setForm({
                          first_name: userData?.first_name || '',
                          last_name: userData?.last_name || '',
                          middle_name: userData?.middle_name || '',
                          phone: userData?.phone || '',
                          address: userData?.address || '',
                          birth_date: userData?.birth_date || '',
                        });
                        setError('');
                      }}
                      className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      value={form.middle_name}
                      onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="text-sm font-medium text-gray-900">{userData?.first_name} {userData?.middle_name} {userData?.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{userData?.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{userData?.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Birth Date</p>
                      <p className="text-sm font-medium text-gray-900">{userData?.birth_date || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm font-medium text-gray-900">{userData?.address || '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">My Appointments</h2>
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No appointments yet.</p>
                  <Link href="/booking" className="text-teal-600 hover:text-teal-700 text-sm font-medium mt-1 inline-block">
                    Book an appointment
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => {
                    const statusColors: Record<string, string> = {
                      checked_in: 'bg-green-100 text-green-800',
                      completed: 'bg-blue-100 text-blue-800',
                      scheduled: 'bg-yellow-100 text-yellow-800',
                      cancelled: 'bg-red-100 text-red-800',
                    };
                    return (
                      <div key={appt.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <CalendarIcon className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{appt.service_name}</p>
                            <p className="text-xs text-gray-500">{appt.appointment_date} - {appt.start_time}-{appt.end_time} - Queue #{appt.queue_number}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[appt.status] || 'bg-gray-100 text-gray-600'}`}>
                          {appt.status}
                        </span>
                        {appt.verified_by_fingerprint && <Fingerprint className="h-4 w-4 text-green-600" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Account Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    {userData?.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
                    {userData?.role}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fingerprint Enrolled</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Fingerprint className={`h-4 w-4 ${userData?.fingerprint_enrolled ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="text-sm text-gray-900">{userData?.fingerprint_enrolled ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}