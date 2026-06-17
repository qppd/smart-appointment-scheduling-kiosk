import {
  ref, onValue, push, set, update, get, query, orderByChild, equalTo,
} from 'firebase/database';
import { db } from './firebase';
import type { Service, Appointment, User, KioskStatus } from '@/types';

export function subscribeServices(callback: (services: Service[]) => void) {
  return onValue(ref(db, 'services'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data)
      .filter(([, s]: [string, any]) => s.is_active)
      .map(([id, s]: [string, any]) => ({ id, ...s }) as Service));
  });
}

export function subscribeMyAppointments(residentId: string, callback: (appointments: Appointment[]) => void) {
  return onValue(ref(db, 'appointments'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data)
      .filter(([, a]: [string, any]) => a.resident_id === residentId)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.created_at?.localeCompare(a.created_at))
      .map(([id, a]: [string, any]) => ({ id, ...a }) as Appointment));
  });
}

export async function createAppointment(data: Omit<Appointment, 'id' | 'created_at'>): Promise<string> {
  const newRef = push(ref(db, 'appointments'));
  await set(newRef, { ...data, created_at: new Date().toISOString() });
  return newRef.key!;
}

export async function cancelAppointment(appointmentId: string) {
  await update(ref(db, `appointments/${appointmentId}`), { status: 'cancelled' });
}

export function subscribeTodayAppointments(callback: (appointments: Appointment[]) => void) {
  const today = new Date().toISOString().split('T')[0];
  return onValue(query(ref(db, 'appointments'), orderByChild('appointment_date'), equalTo(today)), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, a]: [string, any]) => ({ id, ...a }) as Appointment));
  });
}

export function subscribeUsers(callback: (users: User[]) => void) {
  return onValue(ref(db, 'users'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([uid, u]: [string, any]) => ({ uid, ...u }) as User));
  });
}

export function subscribeKioskStatus(kioskId: string, callback: (status: KioskStatus | null) => void) {
  return onValue(ref(db, `kiosk_status/${kioskId}`), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as KioskStatus) : null);
  });
}

export async function sendKioskCommand(data: { type: string; target_uid?: string; slot?: number }) {
  await push(ref(db, 'kiosk_commands'), { ...data, status: 'pending', created_at: new Date().toISOString() });
}
