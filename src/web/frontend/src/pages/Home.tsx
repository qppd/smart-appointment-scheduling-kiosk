import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Fingerprint, Bell, ClipboardList, Shield, Smartphone } from 'lucide-react';

const features = [
  { icon: Calendar, title: 'Online Booking', desc: 'Schedule appointments from home or mobile' },
  { icon: Fingerprint, title: 'Fingerprint Kiosk', desc: 'Secure biometric check-in at the barangay hall' },
  { icon: Bell, title: 'SMS Reminders', desc: 'Get notified before your appointment' },
  { icon: ClipboardList, title: 'Queue Management', desc: 'Real-time queue board for efficient service' },
  { icon: Shield, title: 'Secure System', desc: 'Your data is protected and encrypted' },
  { icon: Smartphone, title: 'Mobile Friendly', desc: 'Works on any device with internet access' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-600 to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Barangay Dolores Appointment System
          </h1>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Skip the long queues. Book your barangay appointments online and check in securely
            using our fingerprint kiosk at the hall.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Register Online', desc: 'Create your account and verify via OTP' },
              { step: '2', title: 'Visit the Hall', desc: 'Activate your account and enroll your fingerprint' },
              { step: '3', title: 'Book Online', desc: 'Schedule your appointment from anywhere' },
              { step: '4', title: 'Check-in at Kiosk', desc: 'Scan your fingerprint upon arrival' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-teal-600">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-500 mt-2 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Features</h2>
          <div className="grid md:grid-rows-2 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <Icon className="h-10 w-10 text-teal-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-500 mt-2 text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
