'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { ref, get } from 'firebase/database';
import app, { db } from './firebase';

const SESSION_CACHE_KEY = 'barangay_session_v1';

type CachedSession = {
  uid: string;
  email: string | null;
  ts: number;
};

interface AuthContextValue {
  user: User | null;
  userData: any | null;
  loading: boolean;
  isAdmin: boolean;
  hasCachedSession: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readCache(): CachedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed?.uid) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      const payload: CachedSession = {
        uid: user.uid,
        email: user.email,
        ts: Date.now(),
      };
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
    } else {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // ignore quota/privacy errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCachedSession, setHasCachedSession] = useState(false);

  const lastUidRef = useRef<string | null>(null);

  useEffect(() => {
    const cached = readCache();
    setHasCachedSession(!!cached);
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      writeCache(u);
      setHasCachedSession(!!u || readCache() !== null);

      if (!u) {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
        lastUidRef.current = null;
        return;
      }

      lastUidRef.current = u.uid;
      try {
        const snap = await get(ref(db, `users/${u.uid}`));
        const data = snap.exists() ? snap.val() : null;
        setUserData(data);
        setIsAdmin(Boolean(data?.role === 'admin'));
      } catch (err) {
        console.error('Failed to load user data', err);
      } finally {
        if (lastUidRef.current === u.uid) setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!user) {
      setUserData(null);
      setIsAdmin(false);
      return;
    }
    try {
      const snap = await get(ref(db, `users/${user.uid}`));
      const data = snap.exists() ? snap.val() : null;
      setUserData(data);
      setIsAdmin(Boolean(data?.role === 'admin'));
    } catch (err) {
      console.error('Failed to refresh user data', err);
    }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getAuth(app);
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const auth = getAuth(app);
    const res = await createUserWithEmailAndPassword(auth, email, password);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    const auth = getAuth(app);
    writeCache(null);
    setHasCachedSession(false);
    await firebaseSignOut(auth);
  }, []);

  const value: AuthContextValue = {
    user,
    userData,
    loading,
    isAdmin,
    hasCachedSession,
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
