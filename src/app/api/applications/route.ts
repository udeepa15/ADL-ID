import { NextResponse } from 'next/server';
import {
  getGoogleSheetsClient,
  SPREADSHEET_ID,
  STANDARD_HEADERS,
  APPLICATION_STATUSES,
  LEGACY_TAB,
  getOrganizationConfig,
  createOrganizationSheet,
  getSheetTitles,
  readApplicationsFromTab,
  tabRange,
  columnLetter,
  type ApplicationRecord,
} from '@/lib/googleSheets';
import { requireSession, authErrorResponse } from '@/lib/serverAuth';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MAX_TEXT_LENGTH = 100;
const MAX_CUSTOM_VALUE_LENGTH = 200;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

/** Only accept photo URLs that point at our Vercel Blob storage. */
function isAllowedPhotoUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Public endpoint used by the employee apply form.
 * The server decides the ID, timestamp and initial status; the client only supplies form fields.
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON body');
    }

    const requestedOrgId = cleanText(body.orgId, 40);
    if (!requestedOrgId) return badRequest('Organization ID is required');

    const name = cleanText(body.name, MAX_TEXT_LENGTH);
    if (!name) return badRequest(`Name is required (max ${MAX_TEXT_LENGTH} characters)`);

    const role = cleanText(body.role, MAX_TEXT_LENGTH);
    if (!role) return badRequest(`Role is required (max ${MAX_TEXT_LENGTH} characters)`);

    if (typeof body.bloodGroup !== 'string' || !BLOOD_GROUPS.includes(body.bloodGroup)) {
      return badRequest('A valid blood group is required');
    }
    const bloodGroup = body.bloodGroup;

    if (!isAllowedPhotoUrl(body.photoUrl)) return badRequest('A valid uploaded photo is required');
    const photoUrl = body.photoUrl;

    // The org must have been set up by the shop (or exist as a pre-existing tab).
    // Unknown org IDs are rejected, so the public form can't create arbitrary sheet tabs.
    const titles = await getSheetTitles();
    const org = await getOrganizationConfig(requestedOrgId);
    let targetTab: string;
    let allowedCustomFields: string[];

    if (org) {
      targetTab = org.orgId;
      allowedCustomFields = org.customFields;
      if (!titles.includes(targetTab)) {
        await createOrganizationSheet(targetTab, allowedCustomFields);
      }
    } else if (titles.includes(requestedOrgId) && !requestedOrgId.startsWith('_') && requestedOrgId !== LEGACY_TAB) {
      targetTab = requestedOrgId;
      allowedCustomFields = [];
    } else {
      return NextResponse.json({ error: 'Unknown organization' }, { status: 404 });
    }

    // Only accept custom fields the organization actually defined.
    const rawCustom = (body.customData && typeof body.customData === 'object') ? body.customData as Record<string, unknown> : {};
    const customData: Record<string, string> = {};
    for (const field of allowedCustomFields) {
      const value = rawCustom[field];
      if (value === undefined || value === '') continue;
      if (typeof value !== 'string' || value.length > MAX_CUSTOM_VALUE_LENGTH) {
        return badRequest(`"${field}" must be text of at most ${MAX_CUSTOM_VALUE_LENGTH} characters`);
      }
      customData[field] = value.trim();
    }

    const sheets = await getGoogleSheetsClient();
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: tabRange(targetTab, '1:1'),
    });
    const headers: string[] = headerResponse.data.values?.[0] || STANDARD_HEADERS;

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const status = 'Pending';

    const rowValues = headers.map((header) => {
      switch (header) {
        case 'Application_ID': return id;
        case 'Org_ID': return targetTab;
        case 'Timestamp': return timestamp;
        case 'Employee_Name': return name;
        case 'Role': return role;
        case 'Blood_Group': return bloodGroup;
        case 'Photo_URL': return photoUrl;
        case 'Status': return status;
        default: return customData[header] || '';
      }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: tabRange(targetTab, `A:${columnLetter(Math.max(headers.length, 1))}`),
      // RAW stores text exactly as typed, so input like "=IMPORTXML(...)" is never evaluated as a formula.
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });

    return NextResponse.json({ success: true, id, orgId: targetTab });
  } catch (error) {
    console.error('Error adding application:', error);
    return NextResponse.json({ error: 'Failed to add application' }, { status: 500 });
  }
}

/**
 * Shop admins: all applications (optionally filtered by ?orgId=).
 * Client admins: only their own organization's applications, whatever ?orgId= says.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['shop', 'client']);
    const { searchParams } = new URL(request.url);

    const orgFilter = session.role === 'client'
      ? session.orgId
      : (searchParams.get('orgId')?.trim() || null);

    const titles = await getSheetTitles();
    let tabsToRead: string[];

    if (orgFilter) {
      const orgTab = titles.find((t) => t.toLowerCase() === orgFilter.toLowerCase());
      // Fall back to the legacy single-tab layout for orgs created before per-org tabs.
      tabsToRead = orgTab ? [orgTab] : titles.filter((t) => t === LEGACY_TAB);
    } else {
      tabsToRead = titles.filter((t) => !t.startsWith('_'));
    }

    const allApplications: ApplicationRecord[] = [];
    for (const tab of tabsToRead) {
      try {
        allApplications.push(...await readApplicationsFromTab(tab));
      } catch (err) {
        console.warn(`Could not read tab ${tab}:`, err);
      }
    }

    const applications = orgFilter
      ? allApplications.filter(app => app.orgId.toLowerCase() === orgFilter.toLowerCase())
      : allApplications;

    return NextResponse.json({ applications });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

/** Shop admins only: update an application's status. */
export async function PATCH(request: Request) {
  try {
    await requireSession(request, ['shop']);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON body');
    }
    const { id, status, orgId } = body;

    if (typeof id !== 'string' || !id) return badRequest('Application ID is required');
    if (typeof status !== 'string' || !(APPLICATION_STATUSES as readonly string[]).includes(status)) {
      return badRequest(`Status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
    }

    const titles = await getSheetTitles();
    const orgTab = typeof orgId === 'string' ? titles.find((t) => t === orgId.trim()) : undefined;
    const tabsToSearch = orgTab ? [orgTab] : titles.filter((t) => !t.startsWith('_'));

    const sheets = await getGoogleSheetsClient();
    for (const tab of tabsToSearch) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: tabRange(tab),
      });

      const rows = response.data.values || [];
      if (rows.length === 0) continue;

      const headers: string[] = rows[0];
      const idCol = Math.max(headers.indexOf('Application_ID'), 0);
      const statusIdx = headers.indexOf('Status');
      const statusCol = statusIdx >= 0 ? statusIdx : 7;

      const rowIndex = rows.findIndex((row, i) => i > 0 && row[idCol] === id);
      if (rowIndex === -1) continue;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: tabRange(tab, `${columnLetter(statusCol + 1)}${rowIndex + 1}`),
        valueInputOption: 'RAW',
        requestBody: {
          values: [[status]],
        },
      });

      return NextResponse.json({ success: true, id, status, tab });
    }

    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Failed to update application status' }, { status: 500 });
  }
}
