import {
  ref, onValue, push, set, update, get, query, orderByChild, equalTo,
} from 'firebase/database';
import { db } from './firebase';
import type { Service, Appointment, User, KioskStatus, KioskCommand } from '@/types';

export function subscribeServices(callback: (services: Service[]) => void) {
  return onValue(ref(db, 'services'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data)
      .filter(([, s]: [string, any]) => s.is_active)
      .map(([id, s]: [string, any]) => ({ id, ...s }) as Service));
  });
}

export function subscribeAllServices(callback: (services: Service[]) => void) {
  return onValue(ref(db, 'services'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, s]: [string, any]) => ({ id, ...s }) as Service));
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

export function generateEnrollmentOTP(): { otp: string; expires_at: string } {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h expiry
  return { otp, expires_at: expiresAt };
}

export async function createAppointment(
  data: Omit<Appointment, 'id' | 'created_at' | 'enrollment_otp' | 'enrollment_otp_expires_at' | 'enrollment_otp_consumed_at'>
): Promise<{ id: string; otp: string }> {
  const { otp, expires_at } = generateEnrollmentOTP();
  const newRef = push(ref(db, 'appointments'));
  await set(newRef, {
    ...data,
    enrollment_otp: otp,
    enrollment_otp_expires_at: expires_at,
    created_at: new Date().toISOString(),
  });
  return { id: newRef.key!, otp };
}

export async function cancelAppointment(appointmentId: string) {
  await update(ref(db, `appointments/${appointmentId}`), { status: 'cancelled' });
}

export async function regenerateEnrollmentOTP(
  appointmentId: string
): Promise<{ otp: string; expires_at: string }> {
  // Guard: refuse if user already has fingerprint enrolled
  const aptSnap = await get(ref(db, `appointments/${appointmentId}`));
  if (aptSnap.exists()) {
    const apt = aptSnap.val();
    if (apt.resident_id) {
      const userSnap = await get(ref(db, `users/${apt.resident_id}`));
      if (userSnap.exists() && userSnap.val().fingerprint_enrolled) {
        throw new Error('Fingerprint already enrolled. No new code is needed.');
      }
    }
  }

  const { otp, expires_at } = generateEnrollmentOTP();
  await update(ref(db, `appointments/${appointmentId}`), {
    enrollment_otp: otp,
    enrollment_otp_expires_at: expires_at,
    enrollment_otp_consumed_at: null,
  });
  return { otp, expires_at };
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

export function subscribeAllAppointments(callback: (appointments: Appointment[]) => void) {
  return onValue(ref(db, 'appointments'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, a]: [string, any]) => ({ id, ...a }) as Appointment));
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

// Service CRUD
export async function createService(data: Omit<Service, 'id' | 'created_at'>) {
  const newRef = push(ref(db, 'services'));
  await set(newRef, { ...data, created_at: new Date().toISOString() });
  return newRef.key!;
}

export async function updateService(serviceId: string, data: Partial<Omit<Service, 'id' | 'created_at'>>) {
  await update(ref(db, `services/${serviceId}`), data);
}

export async function deleteService(serviceId: string) {
  await update(ref(db, `services/${serviceId}`), { is_active: false });
}

export async function permanentlyDeleteService(serviceId: string) {
  await set(ref(db, `services/${serviceId}`), null);
}

export async function updateUser(uid: string, data: Partial<Pick<User, 'first_name' | 'last_name' | 'middle_name' | 'phone' | 'address' | 'birth_date'>>) {
  await update(ref(db, `users/${uid}`), data);
}

export function subscribeKioskCommands(callback: (commands: KioskCommand[]) => void) {
  return onValue(ref(db, 'kiosk_commands'), (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data)
      .map(([id, c]: [string, any]) => ({ id, ...c }) as KioskCommand)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')));
  });
}
