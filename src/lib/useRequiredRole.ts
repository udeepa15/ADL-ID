'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { fetchMe, dashboardPathFor, type Me } from '@/lib/apiClient';

/**
 * Waits for Firebase auth, asks the server for the user's role, and redirects
 * anyone who shouldn't be on this page. Returns the session once it's confirmed.
 */
export function useRequiredRole<R extends Me['role']>(role: R): Extract<Me, { role: R }> | null {
  const [me, setMe] = useState<Extract<Me, { role: R }> | null>(null);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMe(null);
        router.replace('/login');
        return;
      }
      try {
        const session = await fetchMe();
        if (!session) {
          await signOut(auth);
          router.replace('/login?denied=1');
        } else if (session.role !== role) {
          router.replace(dashboardPathFor(session));
        } else {
          setMe(session as Extract<Me, { role: R }>);
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
        router.replace('/login');
      }
    });
  }, [role, router]);

  return me;
}
