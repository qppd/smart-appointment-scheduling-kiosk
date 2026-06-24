'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getUserData } from '@/lib/auth';
import { MobileBackButton } from '@/components/MobileBackButton';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      getUserData(user.uid).then((data) => {
        const target = data?.role === 'admin' ? '/dolores-taytay-admin' : '/booking';
        router.replace(target);
      });
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password);
    } catch {
      setError('Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <MobileBackButton />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg" required />
            </div>
          </div>
          <button type="submit" disabled={submitting || loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <Link href="/register" className="text-teal-600 hover:text-teal-700 font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
