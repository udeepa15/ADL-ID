import { google } from "googleapis";

export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

export const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

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

/**
 * Ensures the `_Organizations_` config tab exists in the Google Sheet.
 */
export async function ensureOrganizationsConfigTab() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetList = spreadsheet.data.sheets || [];
  const exists = sheetList.some(s => s.properties?.title === '_Organizations_');

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: '_Organizations_' },
            },
          },
        ],
      },
    });

    // Set header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: '_Organizations_!A1:D1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Org_ID', 'Client_Email', 'Custom_Fields_JSON', 'Created_At']],
      },
    });
  }
}

/**
 * Creates a new dedicated worksheet tab for an Organization and sets up custom headers.
 */
export async function createOrganizationSheet(orgId: string, customFields: string[]) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetList = spreadsheet.data.sheets || [];
  const exists = sheetList.some(s => s.properties?.title === orgId);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: orgId },
            },
          },
        ],
      },
    });
  }

  // Set standard + custom headers
  const headers = [...STANDARD_HEADERS, ...customFields];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${orgId}'!A1:${String.fromCharCode(64 + headers.length)}1`,
    valueInputOption: 'USER_ENTERED',
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

  // Check if org already exists in config
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '_Organizations_!A2:D',
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
      range: `_Organizations_!A${rowNum}:D${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '_Organizations_!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });
  }
}

/**
 * Retrieves all Organization configs.
 */
export async function getAllOrganizationConfigs(): Promise<OrgConfig[]> {
  try {
    await ensureOrganizationsConfigTab();
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '_Organizations_!A2:D',
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      orgId: row[0] || '',
      clientEmail: row[1] || '',
      customFields: row[2] ? JSON.parse(row[2]) : [],
      createdAt: row[3] || '',
    }));
  } catch (error) {
    console.error('Failed to read organization configs:', error);
    return [];
  }
}

/**
 * Retrieves a single Organization config by Org ID.
 */
export async function getOrganizationConfig(orgId: string): Promise<OrgConfig | null> {
  const configs = await getAllOrganizationConfigs();
  return configs.find(c => c.orgId.toLowerCase() === orgId.toLowerCase()) || null;
}
