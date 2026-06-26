import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasValidConfig(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
  );
}

// Eager init — guarded so Next.js prerendering doesn't crash when env vars
// are absent locally. The resulting null values are cast away here because
// all consumers run in the browser where valid config is always present.
let _app: FirebaseApp | null = null;
if (hasValidConfig()) {
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export const app: FirebaseApp = _app as unknown as FirebaseApp;
export const auth: Auth = (_app ? getAuth(_app) : null) as unknown as Auth;
export const db: Database = (_app ? getDatabase(_app) : null) as unknown as Database;

export function getFirebaseAuth(): Auth {
  if (!_app) throw new Error('Firebase not configured — check env vars.');
  return auth;
}

export function getFirebaseDb(): Database {
  if (!_app) throw new Error('Firebase not configured — check env vars.');
  return db;
}

export default app;
