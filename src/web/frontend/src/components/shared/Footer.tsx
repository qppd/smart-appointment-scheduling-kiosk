import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Barangay Dolores</p>
          <p className="text-sm mt-1">Taytay, Rizal — Appointment Scheduling System</p>
          <div className="mt-4 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Barangay Dolores. All rights reserved.</p>
            <p className="mt-1">For inquiries, visit the Barangay Hall or contact us at (02) 1234-5678</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
