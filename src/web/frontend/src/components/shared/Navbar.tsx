import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Calendar, User, LogOut, Shield, QrCode } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-teal-600" />
              <span className="text-xl font-bold text-gray-900">Barangay Kiosk</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/booking" className="text-gray-600 hover:text-teal-600 px-3 py-2 text-sm font-medium">
              Book Appointment
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/my-appointments" className="text-gray-600 hover:text-teal-600 px-3 py-2 text-sm font-medium">
                  My Appointments
                </Link>
                {user?.role !== 'resident' && (
                  <>
                    <Link to="/admin" className="text-gray-600 hover:text-teal-600 px-3 py-2 text-sm font-medium flex items-center gap-1">
                      <Shield className="h-4 w-4" /> Admin
                    </Link>
                    <Link to="/kiosk" className="text-gray-600 hover:text-teal-600 px-3 py-2 text-sm font-medium flex items-center gap-1">
                      <QrCode className="h-4 w-4" /> Kiosk
                    </Link>
                  </>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>{user?.first_name} {user?.last_name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-500 hover:text-red-600 px-3 py-2 text-sm"
                >
                  <LogOut className="h-4 w-4 mr-1" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-teal-600 px-3 py-2 text-sm font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
