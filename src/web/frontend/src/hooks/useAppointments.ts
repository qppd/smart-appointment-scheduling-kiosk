import { useState } from 'react';
import api from '../services/api';
import {
  Appointment,
  AppointmentListResponse,
  TimeSlot,
  QueueResponse,
  StatsResponse,
} from '../types';

export function useAppointments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvailableSlots = async (serviceId: string, date: string): Promise<TimeSlot[]> => {
    setLoading(true);
    try {
      const res = await api.get(`/appointments/slots?service_id=${serviceId}&appointment_date=${date}`);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load slots');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async (data: {
    service_id: string;
    appointment_date: string;
    start_time: string;
  }): Promise<Appointment | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<Appointment>('/appointments/', data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to book appointment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getMyAppointments = async (statusFilter?: string): Promise<Appointment[]> => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/appointments/my?status_filter=${statusFilter}`
        : '/appointments/my';
      const res = await api.get<AppointmentListResponse>(url);
      return res.data.items;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load appointments');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      await api.patch(`/appointments/${id}/cancel`);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getTodayQueue = async (date?: string): Promise<QueueResponse> => {
    setLoading(true);
    try {
      const url = date ? `/admin/queue?date_filter=${date}` : '/admin/queue';
      const res = await api.get<QueueResponse>(url);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load queue');
      return { date: '', items: [], total: 0 };
    } finally {
      setLoading(false);
    }
  };

  const getStats = async (): Promise<StatsResponse | null> => {
    setLoading(true);
    try {
      const res = await api.get<StatsResponse>('/admin/stats');
      return res.data;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getAvailableSlots,
    bookAppointment,
    getMyAppointments,
    cancelAppointment,
    getTodayQueue,
    getStats,
    loading,
    error,
  };
}
