import { google, sheets_v4 } from "googleapis";

let sheetsClient: sheets_v4.Sheets | null = null;

export async function getGoogleSheetsClient() {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

export const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

export const ORGANIZATIONS_TAB = '_Organizations_';
export const LEGACY_TAB = 'Sheet1';

export interface OrgConfig {
  orgId: string;
  clientEmail: string;
  customFields: string[];
  createdAt: string;
}

// Default standard headers
export const STANDARD_HEADERS = [
  'Application_ID',
  'Org_ID',
  'Timestamp',
  'Employee_Name',
  'Role',
  'Blood_Group',
  'Photo_URL',
  'Status'
];

export const APPLICATION_STATUSES = ['Pending', 'Printing', 'Ready', 'Rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

const ORG_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/;

/** Org IDs double as sheet tab names, so keep them to a safe character set. */
export function isValidOrgId(orgId: string): boolean {
  return ORG_ID_PATTERN.test(orgId) && orgId.toLowerCase() !== LEGACY_TAB.toLowerCase();
}

export const MAX_CUSTOM_FIELDS = 15;
export const MAX_CUSTOM_FIELD_NAME_LENGTH = 50;

/** Returns cleaned custom field names, or an error message. */
export function validateCustomFields(input: unknown): { fields: string[] } | { error: string } {
  if (input === undefined || input === null) return { fields: [] };
  if (!Array.isArray(input)) return { error: 'customFields must be an array of strings' };
  if (input.length > MAX_CUSTOM_FIELDS) return { error: `At most ${MAX_CUSTOM_FIELDS} custom fields are allowed` };

  const reserved = new Set(STANDARD_HEADERS.map((h) => h.toLowerCase()));
  const seen = new Set<string>();
  const fields: string[] = [];

  for (const raw of input) {
    if (typeof raw !== 'string') return { error: 'customFields must be an array of strings' };
    const field = raw.trim();
    if (!field) continue;
    if (field.length > MAX_CUSTOM_FIELD_NAME_LENGTH) {
      return { error: `Custom field names must be ${MAX_CUSTOM_FIELD_NAME_LENGTH} characters or fewer` };
    }
    const key = field.toLowerCase();
    if (reserved.has(key)) return { error: `"${field}" is a built-in column name` };
    if (seen.has(key)) return { error: `Duplicate custom field "${field}"` };
    seen.add(key);
    fields.push(field);
  }
  return { fields };
}

/** Converts a 1-based column number to its A1 letter(s): 1 → A, 27 → AA. */
export function columnLetter(columnNumber: number): string {
  let n = columnNumber;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Quotes a tab name for use in an A1 range. */
export function tabRange(tab: string, range = ''): string {
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  return range ? `${quoted}!${range}` : quoted;
}

/* ------------------------------------------------------------------ */
/* Sheet metadata (cached to reduce Sheets API quota usage)            */
/* ------------------------------------------------------------------ */

const TITLES_TTL_MS = 30_000;
let titlesCache: { titles: string[]; expiresAt: number } | null = null;

export async function getSheetTitles(): Promise<string[]> {
  if (titlesCache && Date.now() < titlesCache.expiresAt) return titlesCache.titles;

  const sheets = await getGoogleSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  });
  const titles = (spreadsheet.data.sheets || [])
    .map((s) => s.properties?.title || '')
    .filter(Boolean);

  titlesCache = { titles, expiresAt: Date.now() + TITLES_TTL_MS };
  return titles;
}

function invalidateSheetTitles() {
  titlesCache = null;
}

async function addTabIfMissing(title: string): Promise<boolean> {
  const titles = await getSheetTitles();
  if (titles.includes(title)) return false;

  const sheets = await getGoogleSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  invalidateSheetTitles();
  return true;
}

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

/**
 * Ensures the `_Organizations_` config tab exists in the Google Sheet.
 */
export async function ensureOrganizationsConfigTab() {
  const created = await addTabIfMissing(ORGANIZATIONS_TAB);
  if (created) {
    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: tabRange(ORGANIZATIONS_TAB, 'A1:D1'),
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Org_ID', 'Client_Email', 'Custom_Fields_JSON', 'Created_At']],
      },
    });
  }
}

/**
 * Creates a dedicated worksheet tab for an Organization and sets its header row.
 * Existing headers are only extended, never reordered, so existing rows stay aligned.
 */
export async function createOrganizationSheet(orgId: string, customFields: string[]) {
  await addTabIfMissing(orgId);
  const sheets = await getGoogleSheetsClient();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange(orgId, '1:1'),
  });
  const currentHeaders: string[] = existing.data.values?.[0] || [];

  const baseHeaders = currentHeaders.length > 0 ? currentHeaders : STANDARD_HEADERS;
  const headers = [...baseHeaders];
  for (const field of [...STANDARD_HEADERS, ...customFields]) {
    if (!headers.includes(field)) headers.push(field);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange(orgId, `A1:${columnLetter(headers.length)}1`),
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers],
    },
  });
}

/**
 * Saves Organization configuration metadata to the `_Organizations_` tab.
 */
export async function saveOrganizationConfig(orgConfig: OrgConfig) {
  await ensureOrganizationsConfigTab();
  const sheets = await getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange(ORGANIZATIONS_TAB, 'A2:D'),
  });

  const rows = response.data.values || [];
  const existingIndex = rows.findIndex(row => row[0] === orgConfig.orgId);

  const rowValues = [
    orgConfig.orgId,
    orgConfig.clientEmail,
    JSON.stringify(orgConfig.customFields),
    orgConfig.createdAt,
  ];

  if (existingIndex >= 0) {
    const rowNum = existingIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: tabRange(ORGANIZATIONS_TAB, `A${rowNum}:D${rowNum}`),
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowValues],
      },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: tabRange(ORGANIZATIONS_TAB, 'A:D'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });
  }
}

function parseCustomFields(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Retrieves all Organization configs.
 * Throws on Sheets errors so callers don't mistake an outage for "no orgs".
 */
export async function getAllOrganizationConfigs(): Promise<OrgConfig[]> {
  const titles = await getSheetTitles();
  if (!titles.includes(ORGANIZATIONS_TAB)) return [];

  const sheets = await getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange(ORGANIZATIONS_TAB, 'A2:D'),
  });

  const rows = response.data.values || [];
  return rows
    .filter(row => row[0])
    .map(row => ({
      orgId: row[0] || '',
      clientEmail: row[1] || '',
      customFields: parseCustomFields(row[2]),
      createdAt: row[3] || '',
    }));
}

/**
 * Retrieves a single Organization config by Org ID (case-insensitive).
 */
export async function getOrganizationConfig(orgId: string): Promise<OrgConfig | null> {
  const configs = await getAllOrganizationConfigs();
  return configs.find(c => c.orgId.toLowerCase() === orgId.toLowerCase()) || null;
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

export interface ApplicationRecord {
  id: string;
  orgId: string;
  timestamp: string;
  name: string;
  role: string;
  bloodGroup: string;
  photoUrl: string;
  status: string;
  customData: Record<string, string>;
}

/** Reads a whole tab (no fixed column limit) and maps rows by header name. */
export async function readApplicationsFromTab(tab: string): Promise<ApplicationRecord[]> {
  const sheets = await getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange(tab),
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers: string[] = rows[0];
  const col = (name: string, fallback: number) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? idx : fallback;
  };
  const idx = {
    id: col('Application_ID', 0),
    orgId: col('Org_ID', 1),
    timestamp: col('Timestamp', 2),
    name: col('Employee_Name', 3),
    role: col('Role', 4),
    bloodGroup: col('Blood_Group', 5),
    photoUrl: col('Photo_URL', 6),
    status: col('Status', 7),
  };
  const standardIndexes = new Set(Object.values(idx));

  const records: ApplicationRecord[] = [];
  for (const row of rows.slice(1)) {
    if (!row[idx.id]) continue; // Skip empty rows

    const customData: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header && !standardIndexes.has(i) && !STANDARD_HEADERS.includes(header)) {
        customData[header] = row[i] || '';
      }
    });

    records.push({
      id: row[idx.id],
      orgId: row[idx.orgId] || tab,
      timestamp: row[idx.timestamp] || '',
      name: row[idx.name] || '',
      role: row[idx.role] || '',
      bloodGroup: row[idx.bloodGroup] || '',
      photoUrl: row[idx.photoUrl] || '',
      status: row[idx.status] || 'Pending',
      customData,
    });
  }
  return records;
}
