import { NextResponse } from 'next/server';
import { requireSession, authErrorResponse } from '@/lib/serverAuth';

/** Returns the signed-in user's role (and org, for client admins) as decided by the server. */
export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['shop', 'client']);
    return NextResponse.json(
      session.role === 'client'
        ? { email: session.email, role: session.role, orgId: session.orgId }
        : { email: session.email, role: session.role },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error resolving session:', error);
    return NextResponse.json({ error: 'Failed to resolve session' }, { status: 500 });
  }
}
