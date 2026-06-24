'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { signUp, getUserData } from '@/lib/auth';
import { MobileBackButton } from '@/components/MobileBackButton';
import { User, Phone, Mail, Calendar, MapPin, Lock, AlertCircle } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', middle_name: '', email: '', phone: '', birth_date: '', address: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      getUserData(user.uid).then((data) => {
        const target = data?.role === 'admin' ? '/dolores-taytay-admin' : '/booking';
        router.replace(target);
      });
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name,
        email: form.email, phone: form.phone, birth_date: form.birth_date, address: form.address,
      });
      router.replace('/booking');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <MobileBackButton />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Register Your Account</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label><input type="text" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><div className="relative"><Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required /></div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><div className="relative"><Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" /></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Birth Date *</label><div className="relative"><Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required /></div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Address *</label><div className="relative"><MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required /></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label><div className="relative"><Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required /></div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label><div className="relative"><Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required /></div></div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50">{loading ? 'Registering...' : 'Register'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">Sign in</Link></p>
      </div>
    </div>
  );
}
