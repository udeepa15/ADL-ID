import { NextResponse } from 'next/server';
import { getAllOrganizationConfigs } from '@/lib/googleSheets';

/**
 * Server-side authentication for API routes.
 *
 * The browser sends its Firebase ID token as `Authorization: Bearer <token>`.
 * We verify the token's RS256 signature against Google's published Firebase
 * signing keys and check its claims (per Firebase's "verify ID tokens using a
 * third-party JWT library" guidance), so no extra service-account credentials
 * are needed.
 *
 * Roles are NOT derived from the email text:
 *  - Shop admins are listed explicitly in the SHOP_ADMIN_EMAILS env var.
 *  - Client admins are the `Client_Email` assigned to an org in `_Organizations_`.
 *  - Any other signed-in account has no access.
 */

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_SECONDS = 300;

export type Session =
  | { uid: string; email: string; role: 'shop' }
  | { uid: string; email: string; role: 'client'; orgId: string };

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

let keyCache: { keys: Map<string, CryptoKey>; expiresAt: number } | null = null;

async function getSigningKey(kid: string): Promise<CryptoKey | undefined> {
  const cacheValid = keyCache && Date.now() < keyCache.expiresAt;
  if (!cacheValid || !keyCache!.keys.has(kid)) {
    const res = await fetch(FIREBASE_JWKS_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch Firebase signing keys (${res.status})`);

    const maxAgeMatch = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
    const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

    const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
    const imported = new Map<string, CryptoKey>();
    for (const jwk of keys) {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      imported.set(jwk.kid, key);
    }
    keyCache = { keys: imported, expiresAt: Date.now() + maxAgeSeconds * 1000 };
  }
  return keyCache!.keys.get(kid);
}

function decodeSegment(segment: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(segment, 'base64url'));
}

function parseSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

/** Verifies a Firebase ID token and returns its uid and (lower-cased) email. */
export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string; email: string }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = parseSegment(headerB64);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Unexpected token header');

  const key = await getSigningKey(header.kid);
  if (!key) throw new Error('Unknown signing key');

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeSegment(signatureB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  if (!valid) throw new Error('Invalid token signature');

  const payload = parseSegment(payloadB64);
  const now = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) throw new Error('Token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Token issuer mismatch');
  if (typeof payload.exp !== 'number' || payload.exp < now - CLOCK_SKEW_SECONDS) throw new Error('Token expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + CLOCK_SKEW_SECONDS) throw new Error('Token issued in the future');
  if (typeof payload.auth_time === 'number' && payload.auth_time > now + CLOCK_SKEW_SECONDS) {
    throw new Error('Invalid auth_time');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('Token has no subject');
  if (typeof payload.email !== 'string' || payload.email.length === 0) throw new Error('Token has no email');

  return { uid: payload.sub, email: payload.email.toLowerCase() };
}

function shopAdminEmails(): string[] {
  return (process.env.SHOP_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Resolves the caller's session from the Authorization header, or null if unauthenticated. */
export async function getSession(request: Request): Promise<Session | null> {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;

  let identity: { uid: string; email: string };
  try {
    identity = await verifyFirebaseIdToken(header.slice('Bearer '.length).trim());
  } catch (err) {
    console.warn('Rejected ID token:', err instanceof Error ? err.message : err);
    return null;
  }

  if (shopAdminEmails().includes(identity.email)) {
    return { ...identity, role: 'shop' };
  }

  const orgs = await getAllOrganizationConfigs();
  const org = orgs.find((o) => o.clientEmail.toLowerCase() === identity.email);
  if (org) {
    return { ...identity, role: 'client', orgId: org.orgId };
  }

  // Authenticated, but no role. Represented as a 403 by requireSession.
  throw new AuthError(403, 'This account has not been granted access');
}

/** Requires an authenticated session with one of the given roles; throws AuthError otherwise. */
export async function requireSession(request: Request, allowedRoles: Session['role'][]): Promise<Session> {
  const session = await getSession(request);
  if (!session) throw new AuthError(401, 'Authentication required');
  if (!allowedRoles.includes(session.role)) throw new AuthError(403, 'You do not have permission to do this');
  return session;
}

/** Converts an AuthError into a JSON response; returns null for other errors. */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
