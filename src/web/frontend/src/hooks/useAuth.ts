import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { AuthResponse, Resident } from '../types';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth, user } = useAuthStore();

  const login = async (email?: string, contactNumber?: string, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        email,
        contact_number: contactNumber,
        password,
      });
      setAuth(res.data.access_token, res.data.user);
      return res.data.user;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    email?: string;
    contact_number: string;
    birth_date: string;
    address: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<Resident>('/auth/register', data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestOTP = async (contactNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/request-otp', { contact_number: contactNumber });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (contactNumber: string, otpCode: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify-otp', { contact_number: contactNumber, otp_code: otpCode });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await api.get<Resident>('/auth/me');
      useAuthStore.getState().updateUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  };

  const logout = () => {
    useAuthStore.getState().logout();
  };

  return { login, register, requestOTP, verifyOTP, fetchMe, logout, loading, error, user: user || undefined };
}
