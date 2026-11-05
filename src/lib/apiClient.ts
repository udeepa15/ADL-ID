import { auth } from '@/lib/firebase';

/** fetch() that attaches the signed-in user's Firebase ID token for server-side verification. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export type Me =
  | { email: string; role: 'shop' }
  | { email: string; role: 'client'; orgId: string };

/** Asks the server what the current user is allowed to do. Returns null if they have no access. */
export async function fetchMe(): Promise<Me | null> {
  const res = await authFetch('/api/me');
  if (!res.ok) return null;
  return res.json();
}

export function dashboardPathFor(me: Me): string {
  return me.role === 'shop' ? '/shop-dashboard' : '/client-dashboard';
}
