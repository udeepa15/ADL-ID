import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import {
  createOrganizationSheet,
  saveOrganizationConfig,
  getAllOrganizationConfigs,
  getOrganizationConfig,
  isValidOrgId,
  validateCustomFields,
} from '@/lib/googleSheets';
import { requireSession, authErrorResponse } from '@/lib/serverAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
const PASSWORD_LENGTH = 16;

/** Cryptographically secure random password (crypto.randomInt, not Math.random). */
function generatePassword(): string {
  let password = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  }
  return password;
}

type AccountResult =
  | { status: 'created'; password: string }
  | { status: 'exists' }
  | { status: 'error'; message: string };

/** Creates the client's Firebase Auth account via the Identity Toolkit REST API. */
async function createFirebaseAccount(email: string): Promise<AccountResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return { status: 'error', message: 'Firebase is not configured on the server' };

  const password = generatePassword();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // returnSecureToken is required by the API; the returned token is discarded.
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (res.ok) return { status: 'created', password };

  const data = await res.json().catch(() => null);
  const code: string = data?.error?.message || `HTTP ${res.status}`;
  if (code === 'EMAIL_EXISTS') return { status: 'exists' };
  console.error('Firebase account creation failed:', code);
  return { status: 'error', message: `Could not create the client login (${code})` };
}

/** Shop admins only: create (or update) an organization and its client login. */
export async function POST(request: Request) {
  try {
    await requireSession(request, ['shop']);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
    const clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim().toLowerCase() : '';

    if (!isValidOrgId(orgId)) {
      return NextResponse.json({
        error: 'Organization ID must be 2–40 characters: letters, numbers, "-" or "_", starting with a letter or number',
      }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(clientEmail) || clientEmail.length > 254) {
      return NextResponse.json({ error: 'A valid client email is required' }, { status: 400 });
    }

    const fieldsResult = validateCustomFields(body.customFields);
    if ('error' in fieldsResult) {
      return NextResponse.json({ error: fieldsResult.error }, { status: 400 });
    }
    const customFields = fieldsResult.fields;

    // One email maps to exactly one organization, and shop admins can't be client admins.
    const shopAdmins = (process.env.SHOP_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
    if (shopAdmins.includes(clientEmail)) {
      return NextResponse.json({ error: 'That email belongs to a shop admin' }, { status: 409 });
    }
    const existingOrgs = await getAllOrganizationConfigs();
    const emailOwner = existingOrgs.find((o) => o.clientEmail.toLowerCase() === clientEmail);
    if (emailOwner && emailOwner.orgId.toLowerCase() !== orgId.toLowerCase()) {
      return NextResponse.json({ error: `That email is already assigned to ${emailOwner.orgId}` }, { status: 409 });
    }
    const existingOrg = existingOrgs.find((o) => o.orgId.toLowerCase() === orgId.toLowerCase());
    const canonicalOrgId = existingOrg?.orgId || orgId;

    const account = await createFirebaseAccount(clientEmail);
    if (account.status === 'error') {
      return NextResponse.json({ error: account.message }, { status: 502 });
    }

    await createOrganizationSheet(canonicalOrgId, customFields);
    await saveOrganizationConfig({
      orgId: canonicalOrgId,
      clientEmail,
      customFields,
      createdAt: existingOrg?.createdAt || new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      orgId: canonicalOrgId,
      clientEmail,
      customFields,
      // Only returned when a new account was created. An existing account keeps its password.
      generatedPassword: account.status === 'created' ? account.password : null,
      accountExisted: account.status === 'exists',
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}

/**
 * GET ?orgId=X: public, used by the apply form. Returns only the form schema (no client email).
 * GET (no orgId): shop admins only, returns the full list.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId')?.trim();

    if (orgId) {
      const config = await getOrganizationConfig(orgId);
      return NextResponse.json({
        organization: config ? { orgId: config.orgId, customFields: config.customFields } : null,
      });
    }

    await requireSession(request, ['shop']);
    const configs = await getAllOrganizationConfigs();
    return NextResponse.json({ organizations: configs });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching organization configs:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
