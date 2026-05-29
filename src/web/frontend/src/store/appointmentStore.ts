import { create } from 'zustand';
import { Appointment } from '../types';

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  setAppointments: (appointments: Appointment[]) => void;
  setLoading: (loading: boolean) => void;
  addAppointment: (appointment: Appointment) => void;
  removeAppointment: (id: string) => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  loading: false,
  setAppointments: (appointments) => set({ appointments }),
  setLoading: (loading) => set({ loading }),
  addAppointment: (appointment) =>
    set((state) => ({ appointments: [appointment, ...state.appointments] })),
  removeAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    })),
}));
