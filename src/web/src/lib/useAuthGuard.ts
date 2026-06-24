'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

const PUBLIC_ROUTES = new Set(['/login', '/register', '/', '/kiosk']);

export function useAuthGuard() {
  const { user, loading, hasCachedSession, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.has(pathname);

    if (!user && !isPublic) {
      if (hasCachedSession) {
        return;
      }
      router.replace('/login');
      return;
    }

    if (user && (pathname === '/login' || pathname === '/register')) {
      const target = isAdmin ? '/dolores-taytay-admin' : '/booking';
      router.replace(target);
    }
  }, [user, loading, hasCachedSession, isAdmin, pathname, router]);

  return { user, loading, hasCachedSession, isAdmin };
}
