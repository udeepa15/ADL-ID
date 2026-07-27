import { NextResponse } from 'next/server';
import { createOrganizationSheet, saveOrganizationConfig, getAllOrganizationConfigs, getOrganizationConfig } from '@/lib/googleSheets';

// Helper to generate a random 10-character password
function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = 'Pass#';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, clientEmail, customFields = [] } = body;

    if (!orgId || !clientEmail) {
      return NextResponse.json({ error: 'Organization ID and Client Email are required' }, { status: 400 });
    }

    const cleanOrgId = orgId.trim();
    const cleanEmail = clientEmail.trim();

    // 1. Generate Client Password
    const generatedPassword = generateRandomPassword();

    // 2. Create user in Firebase Authentication via Identity Toolkit REST API
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (apiKey) {
      try {
        const firebaseRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: generatedPassword,
              returnSecureToken: true,
            }),
          }
        );

        const firebaseData = await firebaseRes.json();
        if (firebaseRes.ok) {
          console.log(`Successfully created client account in Firebase Auth: ${cleanEmail}`);
        } else if (firebaseData?.error?.message === 'EMAIL_EXISTS') {
          console.log(`Account ${cleanEmail} already exists in Firebase Auth.`);
        } else {
          console.warn('Firebase user creation response warning:', firebaseData);
        }
      } catch (fbError) {
        console.error('Error creating user in Firebase:', fbError);
      }
    }

    // 3. Create Google Sheet Tab for the Organization & set headers
    await createOrganizationSheet(cleanOrgId, customFields);

    // 4. Save Organization config to `_Organizations_` sheet tab
    const orgConfig = {
      orgId: cleanOrgId,
      clientEmail: cleanEmail,
      customFields,
      createdAt: new Date().toISOString(),
    };

    await saveOrganizationConfig(orgConfig);

    return NextResponse.json({
      success: true,
      orgId: cleanOrgId,
      clientEmail: cleanEmail,
      generatedPassword,
      customFields,
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (orgId) {
      const config = await getOrganizationConfig(orgId);
      return NextResponse.json({ organization: config });
    }

    const configs = await getAllOrganizationConfigs();
    return NextResponse.json({ organizations: configs });
  } catch (error) {
    console.error('Error fetching organization configs:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
