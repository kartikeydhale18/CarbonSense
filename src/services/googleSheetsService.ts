import { GoogleAuthService } from '../utils/googleAuth';

interface DailyLogData {
  timestamp: string;
  transportKms: number;
  transportType: string;
  dietType: string;
  energyKwh: number;
  carbonSavedKg: number;
}

/**
 * Service to export daily logs subcollection to a new Google Sheet.
 *
 * @param logs The array of user daily logs
 * @returns A promise resolving to the created spreadsheet URL
 */
export async function exportLogsToSheets(logs: DailyLogData[]): Promise<string> {
  if (logs.length === 0) {
    throw new Error('No logs available to export.');
  }

  // 1. Create a new Spreadsheet
  const sheetMeta = {
    properties: {
      title: `CarbonSense Daily Logs Export - ${new Date().toLocaleDateString()}`,
    },
  };

  const createRes = await GoogleAuthService.fetchWithAuth(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      body: JSON.stringify(sheetMeta),
    },
  );

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl;

  if (!spreadsheetId) {
    throw new Error('Failed to create spreadsheet (spreadsheetId was empty).');
  }

  // 2. Prepare grid values
  const headers = [
    'Date/Timestamp',
    'Transport Kms',
    'Transport Type',
    'Diet Type',
    'Energy Kwh',
    'Carbon Saved (kg)',
  ];

  const rows = logs.map((log) => [
    new Date(log.timestamp).toLocaleString(),
    log.transportKms,
    log.transportType,
    log.dietType,
    log.energyKwh,
    log.carbonSavedKg,
  ]);

  const valueRange = {
    values: [headers, ...rows],
  };

  // Append values to Sheet1
  await GoogleAuthService.fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      body: JSON.stringify(valueRange),
    },
  );

  return spreadsheetUrl;
}
