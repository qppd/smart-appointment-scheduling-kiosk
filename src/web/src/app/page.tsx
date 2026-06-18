'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthChange, getUserData, signOut } from '@/lib/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { Calendar, Fingerprint, Bell, ClipboardList, UserCircle, ChevronDown, LogOut } from 'lucide-react';

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, handler]);
}

const features = [
  { icon: Calendar, title: 'Online Booking', desc: 'Schedule appointments from home or mobile' },
  { icon: Fingerprint, title: 'Fingerprint Kiosk', desc: 'Secure biometric check-in at the barangay hall' },
  { icon: Bell, title: 'SMS Reminders', desc: 'Get notified before your appointment' },
  { icon: ClipboardList, title: 'Queue Management', desc: 'Real-time queue board for efficient service' },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      if (u) {
        getUserData(u.uid).then((data) => {
          if (data?.role === 'admin') {
            router.push('https://smart-appointment-scheduling-kiosk.vercel.app/dolores-taytay-admin');
          }
        });
      }
    });
  }, [router]);

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
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-white" />
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.email || 'User'}</p>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <UserCircle className="h-4 w-4 text-gray-400" /> Profile
                        </Link>
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={() => { setDropdownOpen(false); signOut(); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                        >
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </div>
                    )}
                  </div>
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
            {['Register Online', 'Book Online', 'Visit the Hall', 'Check-in at Kiosk'].map((title, i) => (
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
