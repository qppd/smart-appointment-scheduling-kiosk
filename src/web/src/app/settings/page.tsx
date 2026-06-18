'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthChange, getUserData } from '@/lib/auth';
import { subscribeKioskStatus, subscribeKioskCommands, sendKioskCommand } from '@/lib/rtdb';
import type { KioskStatus, KioskCommand } from '@/types';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle,
  Save, Send, Bell, Lock, Settings as SettingsIcon, Monitor,
  Activity, Fingerprint, Zap,
} from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ADMIN_EMAIL = 'quezon.province.pd@gmail.com';

/* ------------------------------------------------------------------ */
/*  Kiosk Management                                                   */
/* ------------------------------------------------------------------ */
function KioskManagement() {
  const [status, setStatus] = useState<KioskStatus | null>(null);
  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');

  useEffect(() => {
    const unsub = subscribeKioskStatus('default', (s) => setStatus(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeKioskCommands((cmds) => setCommands(cmds.slice(0, 10)));
    return () => unsub();
  }, []);

  const handleSendCommand = async (type: string) => {
    setSending(true);
    setSendMsg('');
    try {
      await sendKioskCommand({ type });
      setSendMsg(`${type} command sent successfully.`);
      setTimeout(() => setSendMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setSendMsg('Failed to send command.');
    } finally {
      setSending(false);
    }
  };

  const isOnline = status?.online ?? false;
  const isEspConnected = status?.esp32_connected ?? false;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Kiosk Status</h3>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
            <Activity className={`h-6 w-6 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{isOnline ? 'Online' : 'Offline'}</p>
            <p className="text-xs text-gray-500">Connection</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${isEspConnected ? 'bg-green-100' : 'bg-red-100'}`}>
            <Fingerprint className={`h-6 w-6 ${isEspConnected ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{isEspConnected ? 'Connected' : 'Disconnected'}</p>
            <p className="text-xs text-gray-500">ESP32</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-lg">
            <Fingerprint className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{status?.template_count ?? 0}</p>
            <p className="text-xs text-gray-500">Templates</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {status?.last_heartbeat ? new Date(status.last_heartbeat).toLocaleTimeString() : '—'}
            </p>
            <p className="text-xs text-gray-500">Last Heartbeat</p>
          </div>
        </div>
      </div>

      {/* Commands */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Send Kiosk Command</h4>
        <div className="flex flex-wrap gap-3">
          {['verify', 'enroll', 'delete'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleSendCommand(cmd)}
              disabled={sending || !isOnline}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" /> {cmd.charAt(0).toUpperCase() + cmd.slice(1)}
            </button>
          ))}
        </div>
        {sendMsg && (
          <p className={`mt-3 text-sm ${sendMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {sendMsg}
          </p>
        )}
      </div>

      {/* Recent Commands */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Commands</h4>
        {commands.length === 0 ? (
          <p className="text-sm text-gray-500">No commands sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Result</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd) => (
                  <tr key={cmd.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2 font-medium text-gray-900 capitalize">{cmd.type}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        cmd.status === 'completed' ? 'bg-green-100 text-green-800' :
                        cmd.status === 'failed' ? 'bg-red-100 text-red-800' :
                        cmd.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {cmd.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{cmd.result?.message || '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {cmd.created_at ? new Date(cmd.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Notifications                                                       */
/* ------------------------------------------------------------------ */
function Notifications() {
  const [prefs, setPrefs] = useState({
    new_appointment_alerts: true,
    kiosk_offline_alerts: true,
    new_registration_alerts: false,
  });

  useEffect(() => {
    const raw = localStorage.getItem('notification_prefs');
    if (raw) setPrefs(JSON.parse(raw));
  }, []);

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('notification_prefs', JSON.stringify(next));
      return next;
    });
  };

  const items = [
    { key: 'new_appointment_alerts' as const, label: 'New Appointment Alerts', desc: 'Receive alerts when a resident books a new appointment' },
    { key: 'kiosk_offline_alerts' as const, label: 'Kiosk Offline Alerts', desc: 'Get notified when the kiosk goes offline or loses ESP32 connection' },
    { key: 'new_registration_alerts' as const, label: 'New Registration Alerts', desc: 'Alert when a new resident registers and requires activation' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`relative h-6 w-11 rounded-full transition-colors ${prefs[item.key] ? 'bg-teal-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[item.key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">Preferences are saved locally in this browser.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Security                                                            */
/* ------------------------------------------------------------------ */
function Security() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { setError('Not authenticated.'); return; }
      await updatePassword(user, newPassword);
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Security</h3>
      <div className="max-w-lg">
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{message}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" /> {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App Preferences                                                     */
/* ------------------------------------------------------------------ */
function AppPreferences() {
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const raw = localStorage.getItem('app_preferences');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.rowsPerPage) setRowsPerPage(parsed.rowsPerPage);
    }
  }, []);

  const updatePref = (key: string, value: number) => {
    const raw = localStorage.getItem('app_preferences');
    const current = raw ? JSON.parse(raw) : {};
    const next = { ...current, [key]: value };
    localStorage.setItem('app_preferences', JSON.stringify(next));
    setRowsPerPage(value);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Application Preferences</h3>
      <div className="max-w-md space-y-5">
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Default Rows Per Page</p>
            <p className="text-xs text-gray-500 mt-1">Applies to all data tables in the admin dashboard</p>
          </div>
          <select
            value={rowsPerPage}
            onChange={(e) => updatePref('rowsPerPage', Number(e.target.value))}
            className="outline-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            {[5, 10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-400">Preferences are saved locally in this browser.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Settings Page                                                  */
/* ------------------------------------------------------------------ */
export default function Settings() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('kiosk');

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setAuthUser(u);
      getUserData(u.uid).then((data) => {
        const admin = data?.role === 'admin' || u.email === ADMIN_EMAIL;
        setIsAdmin(admin);
        setChecking(false);
        if (!admin && activeTab === 'kiosk') {
          setActiveTab('notifications');
        }
      });
    });
    return () => unsub();
  }, [router, activeTab]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  const tabs: { key: string; label: string; icon: React.ReactNode }[] = [
    ...(isAdmin ? [{ key: 'kiosk', label: 'Kiosk Management', icon: <Monitor className="h-4 w-4" /> }] : []),
    { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { key: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
    { key: 'preferences', label: 'App Preferences', icon: <SettingsIcon className="h-4 w-4" /> },
  ];

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
            <span className="text-xl font-bold text-teal-700 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" /> Settings
            </span>
            <div className="w-20" />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
                    activeTab === tab.key
                      ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'kiosk' && isAdmin && <KioskManagement />}
            {activeTab === 'notifications' && <Notifications />}
            {activeTab === 'security' && <Security />}
            {activeTab === 'preferences' && <AppPreferences />}
          </div>
        </div>
      </div>
    </div>
  );
}