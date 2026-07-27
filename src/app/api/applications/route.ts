import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_ID, STANDARD_HEADERS, getAllOrganizationConfigs, createOrganizationSheet } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, orgId, timestamp, name, role, bloodGroup, photoUrl, status, customData = {} } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const cleanOrgId = orgId.trim();
    const sheets = await getGoogleSheetsClient();
    
    // Check sheet tabs to find if cleanOrgId tab exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetList = spreadsheet.data.sheets || [];
    let targetTab = sheetList.some(s => s.properties?.title === cleanOrgId) ? cleanOrgId : 'Sheet1';

    // If targetTab is not created yet, create it dynamically
    if (targetTab === 'Sheet1' && cleanOrgId !== 'Sheet1') {
      await createOrganizationSheet(cleanOrgId, Object.keys(customData));
      targetTab = cleanOrgId;
    }

    // Fetch Header Row from the target sheet tab
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${targetTab}'!1:1`,
    });

    const headers: string[] = headerResponse.data.values?.[0] || STANDARD_HEADERS;

    // Map fields dynamically based on header titles
    const rowValues = headers.map((header) => {
      switch (header) {
        case 'Application_ID': return id;
        case 'Org_ID': return cleanOrgId;
        case 'Timestamp': return timestamp;
        case 'Employee_Name': return name;
        case 'Role': return role;
        case 'Blood_Group': return bloodGroup;
        case 'Photo_URL': return photoUrl;
        case 'Status': return status;
        default:
          return customData[header] || '';
      }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${targetTab}'!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    return NextResponse.json({ success: true, id, orgId: cleanOrgId });
  } catch (error) {
    console.error('Error adding application:', error);
    return NextResponse.json({ error: 'Failed to add application' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    const sheets = await getGoogleSheetsClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const availableSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title || '').filter(Boolean);

    let tabsToRead: string[] = [];

    if (orgId) {
      const cleanOrgId = orgId.trim();
      if (availableSheets.includes(cleanOrgId)) {
        tabsToRead = [cleanOrgId];
      } else {
        tabsToRead = ['Sheet1'];
      }
    } else {
      // Read all org tabs + Sheet1
      tabsToRead = availableSheets.filter(title => !title.startsWith('_'));
      if (tabsToRead.length === 0) tabsToRead = ['Sheet1'];
    }

    const allApplications: any[] = [];

    for (const tabTitle of tabsToRead) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${tabTitle}'!A1:Z`,
        });

        const rows = response.data.values || [];
        if (rows.length < 2) continue; // Skip if only headers or empty

        const headers: string[] = rows[0];
        const dataRows = rows.slice(1);

        dataRows.forEach((row) => {
          if (!row[0]) return; // Skip empty rows

          const appRecord: any = {
            id: row[0],
            orgId: row[1] || tabTitle,
            timestamp: row[2] || '',
            name: row[3] || '',
            role: row[4] || '',
            bloodGroup: row[5] || '',
            photoUrl: row[6] || '',
            status: row[7] || 'Pending',
            customData: {},
          };

          // Capture custom fields (indices >= 8)
          for (let i = 8; i < headers.length; i++) {
            const customHeader = headers[i];
            if (customHeader) {
              appRecord.customData[customHeader] = row[i] || '';
            }
          }

          allApplications.push(appRecord);
        });
      } catch (err) {
        console.warn(`Could not read tab ${tabTitle}:`, err);
      }
    }

    const filteredApplications = orgId 
      ? allApplications.filter(app => app.orgId.toLowerCase() === orgId.trim().toLowerCase())
      : allApplications;

    return NextResponse.json({ applications: filteredApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, orgId } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and Status are required' }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const availableSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title || '').filter(Boolean);

    let tabsToSearch = orgId && availableSheets.includes(orgId.trim()) 
      ? [orgId.trim()] 
      : availableSheets.filter(title => !title.startsWith('_'));

    if (tabsToSearch.length === 0) tabsToSearch = ['Sheet1'];

    for (const tabTitle of tabsToSearch) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabTitle}'!A:H`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex !== -1) {
        const sheetRowNumber = rowIndex + 1;
        // Status is in column H (column 8)
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${tabTitle}'!H${sheetRowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[status]],
          },
        });

        return NextResponse.json({ success: true, id, status, tab: tabTitle });
      }
    }

    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Failed to update application status' }, { status: 500 });
  }
}
