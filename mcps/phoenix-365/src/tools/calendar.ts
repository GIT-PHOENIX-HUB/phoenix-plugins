/**
 * Phoenix 365 — Calendar Tools
 *
 * Graph API operations for Microsoft 365 calendars and events.
 * All functions accept a Graph client as the first parameter.
 *
 * @module tools/calendar
 */

import type { Client } from '@microsoft/microsoft-graph-client';

/** Input shape for creating a calendar event */
export interface CreateEventInput {
  subject: string;
  body?: {
    contentType?: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type?: string;
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
}

/** Single event from Graph API */
interface GraphEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName?: string;
  };
  organizer?: {
    emailAddress?: {
      address?: string;
      name?: string;
    };
  };
  isAllDay?: boolean;
  isCancelled?: boolean;
  webLink?: string;
  onlineMeeting?: {
    joinUrl?: string;
  };
  attendees?: Array<{
    emailAddress?: {
      address?: string;
      name?: string;
    };
    type?: string;
    status?: {
      response?: string;
    };
  }>;
}

/** Response shape from Graph API for event collections */
interface GraphEventResponse {
  value: GraphEvent[];
}

/** Single calendar from Graph API */
interface GraphCalendar {
  id: string;
  name: string;
  color?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  owner?: {
    name?: string;
    address?: string;
  };
}

/** Response shape from Graph API for calendar collections */
interface GraphCalendarResponse {
  value: GraphCalendar[];
}

/**
 * Lists calendar events within a date range using calendarView.
 * calendarView expands recurring events into individual instances.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param startDateTime - ISO 8601 start of the date range (e.g. "2026-03-19T00:00:00Z")
 * @param endDateTime - ISO 8601 end of the date range (e.g. "2026-03-20T00:00:00Z")
 * @returns Array of calendar events within the range
 */
export async function listEvents(
  client: Client,
  userId: string,
  startDateTime: string,
  endDateTime: string,
): Promise<GraphEvent[]> {
  const response: GraphEventResponse = await client
    .api(`/users/${userId}/calendarView`)
    .query({
      startDateTime,
      endDateTime,
    })
    .select('id,subject,start,end,location,organizer,isAllDay,isCancelled,webLink,onlineMeeting,attendees')
    .orderby('start/dateTime')
    .top(100)
    .get();

  return response.value;
}

/**
 * Creates a new calendar event for a user.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param event - Event details including subject, start, end, and optional attendees
 * @returns The created event object
 */
export async function createEvent(
  client: Client,
  userId: string,
  event: CreateEventInput,
): Promise<GraphEvent> {
  const created: GraphEvent = await client
    .api(`/users/${userId}/events`)
    .post(event);

  return created;
}

/**
 * Lists all calendars for a user.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @returns Array of calendars
 */
export async function listCalendars(
  client: Client,
  userId: string,
): Promise<GraphCalendar[]> {
  const response: GraphCalendarResponse = await client
    .api(`/users/${userId}/calendars`)
    .select('id,name,color,isDefaultCalendar,canEdit,owner')
    .get();

  return response.value;
}
