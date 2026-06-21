import { GoogleAuthService } from '../utils/googleAuth';

interface EventInput {
  tip: string;
  estimatedSavingsKg: number;
}

/**
 * Service to sync carbon saving tips to the user's Google Calendar.
 * Schedules the action challenge for tomorrow morning.
 *
 * @param eventData The custom challenge tip and savings to add
 * @returns A promise resolving to the created event link
 */
export async function scheduleCalendarEvent(eventData: EventInput): Promise<string> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format start and end date (e.g. tomorrow at 9 AM and 10 AM)
  const startDateTime = new Date(tomorrow);
  startDateTime.setHours(9, 0, 0, 0);
  const endDateTime = new Date(tomorrow);
  endDateTime.setHours(10, 0, 0, 0);

  const event = {
    summary: '🌱 CarbonSense Challenge: Eco Action',
    description: `Challenge details:\n${eventData.tip}\n\nEstimated Savings: ${eventData.estimatedSavingsKg} kg CO2.\nCreated via CarbonSense application.`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: true,
    },
  };

  const response = await GoogleAuthService.fetchWithAuth(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      body: JSON.stringify(event),
    },
  );

  const data = await response.json();
  return data.htmlLink || 'https://calendar.google.com';
}
