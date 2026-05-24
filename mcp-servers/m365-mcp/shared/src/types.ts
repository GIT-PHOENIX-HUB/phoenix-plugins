// Phoenix 365 — Shared Types

export interface M365User {
  displayName: string;
  mail: string;
  id: string;
}

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
}

export interface SharePointList {
  id: string;
  displayName: string;
  itemCount: number;
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  organizer: string;
}

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModifiedDateTime: string;
}
