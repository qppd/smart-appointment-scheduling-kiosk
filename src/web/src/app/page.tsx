'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthChange, signOut } from '@/lib/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { Calendar, Fingerprint, Bell, ClipboardList } from 'lucide-react';

const features = [
  { icon: Calendar, title: 'Online Booking', desc: 'Schedule appointments from home or mobile' },
  { icon: Fingerprint, title: 'Fingerprint Kiosk', desc: 'Secure biometric check-in at the barangay hall' },
  { icon: Bell, title: 'SMS Reminders', desc: 'Get notified before your appointment' },
  { icon: ClipboardList, title: 'Queue Management', desc: 'Real-time queue board for efficient service' },
];

export default function Home() {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    return onAuthChange((u) => setUser(u));
  }, []);

  return (
    <div>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold text-teal-700">Barangay Dolores</span>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/booking" className="text-gray-700 hover:text-teal-600">Book Appointment</Link>
                  <Link href="/my-appointments" className="text-gray-700 hover:text-teal-600">My Appointments</Link>
                  <Link href="/admin" className="text-gray-700 hover:text-teal-600">Admin</Link>
                  <button onClick={() => signOut()} className="text-red-600 hover:text-red-700">Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-teal-600">Sign In</Link>
                  <Link href="/register" className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-teal-600 to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Barangay Dolores Appointment System</h1>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Skip the long queues. Book your barangay appointments online and check in securely using our fingerprint kiosk.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50">Get Started</Link>
            <Link href="/login" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10">Sign In</Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {['Register Online', 'Visit the Hall', 'Book Online', 'Check-in at Kiosk'].map((title, i) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-teal-600">{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <Icon className="h-10 w-10 text-teal-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-gray-500 mt-2 text-sm">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
