import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_ID } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, orgId, timestamp, name, role, bloodGroup, photoUrl, status } = body;

    const sheets = await getGoogleSheetsClient();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[id, orgId, timestamp, name, role, bloodGroup, photoUrl, status]],
      },
    });

    return NextResponse.json({ success: true, id });
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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:H',
    });

    const rows = response.data.values || [];
    
    const applications = rows.map((row) => ({
      id: row[0],
      orgId: row[1],
      timestamp: row[2],
      name: row[3],
      role: row[4],
      bloodGroup: row[5],
      photoUrl: row[6],
      status: row[7],
    }));

    const filteredApplications = orgId 
      ? applications.filter(app => app.orgId === orgId)
      : applications;

    return NextResponse.json({ applications: filteredApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and Status are required' }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    
    // First, find the row with the given ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:H',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const sheetRowNumber = rowIndex + 1;
    
    // Status is in column H (which is index 7)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!H${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status]],
      },
    });

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Failed to update application status' }, { status: 500 });
  }
}
