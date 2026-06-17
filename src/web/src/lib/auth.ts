import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from './firebase';

export interface SignUpData {
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
}

export async function signUp(email: string, password: string, data: SignUpData) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await set(ref(db, `users/${user.uid}`), {
    uid: user.uid,
    first_name: data.first_name,
    last_name: data.last_name,
    middle_name: data.middle_name || '',
    email: data.email || email,
    phone: data.phone,
    birth_date: data.birth_date,
    address: data.address,
    role: 'resident',
    status: 'pending',
    fingerprint_enrolled: false,
    created_at: new Date().toISOString(),
  });

  return user;
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserData(uid: string) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export { auth };
