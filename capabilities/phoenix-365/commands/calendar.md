---
name: "calendar"
description: "Calendar operations — view today/week schedule, create events for Phoenix Electric"
---

# /calendar — Calendar Operations

## Instructions

When the user invokes `/calendar`, parse the sub-command and execute the appropriate operation using Microsoft Graph API via the phoenix-365 MCP tools.

### Sub-Commands

#### `/calendar` (no arguments) or `/calendar today`

Show today's schedule.

**Graph endpoint:** `GET /me/calendarView?startDateTime=[today 00:00 UTC]&endDateTime=[today 23:59 UTC]&$orderby=start/dateTime&$select=id,subject,start,end,location,organizer,isAllDay,body,attendees,showAs`

**Display format:**
```
Today's Schedule — [Day of Week, Month Day, Year]
==================================================
[time range]  [subject]
              Location: [location]
              With: [attendees if any]
              Status: [free/busy/tentative/oof]

[time range]  [subject]
              Location: [location]

---
[count] events today | Next: [next upcoming event and time until]
Free blocks: [list gaps > 30 min between events]
```

Key formatting rules:
- Use 12-hour time format (8:00 AM, not 08:00)
- Show duration for events > 1 hour ("8:00 AM - 12:00 PM (4 hrs)")
- All-day events shown at the top, separated from timed events
- Highlight the current/next event based on current time
- Show free time blocks so Shane can see availability at a glance

#### `/calendar week`

Show this week's schedule (Monday through Friday, or through Sunday if weekend events exist).

**Graph endpoint:** `GET /me/calendarView?startDateTime=[monday 00:00]&endDateTime=[sunday 23:59]&$orderby=start/dateTime&$select=id,subject,start,end,location,isAllDay,showAs`

**Display format:**
```
Week of [Month Day] - [Month Day, Year]
========================================

MONDAY [date]
  [time]  [event]
  [time]  [event]

TUESDAY [date]
  [time]  [event]
  — No events —

...

Summary: [total events] events this week
Busiest day: [day] ([count] events)
```

#### `/calendar create`

Create a new calendar event. Walk the user through:

1. **Subject/Title:** What is this event? (e.g., "Service call - Smith residence", "Bid walk - Downtown office build")
2. **Date:** When? Accept natural language ("tomorrow", "next Tuesday", "March 25")
3. **Start Time:** What time? Accept natural language ("8am", "noon", "2:30 PM")
4. **Duration or End Time:** How long? ("1 hour", "until 3pm", "all day")
5. **Location:** Where? (Address, site name, "office", "virtual/Teams")
6. **Attendees:** Invite anyone? (Optional — accept names or emails)
7. **Notes/Body:** Any notes to include? (Optional — job details, access codes, customer phone)
8. **Reminder:** Set reminder? Default: 15 minutes before
9. **Review:** Show the complete event for confirmation

**Graph endpoint:** `POST /me/events`

**Request body:**
```json
{
  "subject": "[subject]",
  "start": {
    "dateTime": "[ISO 8601]",
    "timeZone": "America/Chicago"
  },
  "end": {
    "dateTime": "[ISO 8601]",
    "timeZone": "America/Chicago"
  },
  "location": {
    "displayName": "[location]"
  },
  "body": {
    "contentType": "HTML",
    "content": "[notes]"
  },
  "attendees": [
    {
      "emailAddress": { "address": "[email]", "name": "[name]" },
      "type": "required"
    }
  ],
  "reminderMinutesBeforeStart": 15,
  "isOnlineMeeting": false
}
```

ALWAYS confirm before creating. Show the full event details and ask for explicit approval.

**Time zone:** Default to America/Chicago (Central Time) unless Shane specifies otherwise. Phoenix Electric operates in this time zone.

#### `/calendar delete [event-id or number]`

Delete/cancel a calendar event.

1. Show the event details
2. Ask if attendees should be notified of cancellation
3. Confirm before deleting

**Graph endpoint:** `DELETE /me/events/{id}`

#### `/calendar move [event-id] [new-date] [new-time]`

Reschedule an event.

1. Show current event details
2. Show proposed new date/time
3. Confirm before updating
4. If attendees exist, note that they will be notified of the change

**Graph endpoint:** `PATCH /me/events/{id}`

### Phoenix Electric Context

Shane's calendar typically includes:
- **Service Calls** — Scheduled electrical work at customer sites (residential and commercial)
- **Bid Walks/Site Visits** — Walking job sites with GCs or customers for estimates
- **Inspections** — Rough-in, final, or re-inspections with city/county inspectors
- **Supplier Meetings** — Meetings with distributors (Rexel, Titan, CED, Graybar)
- **Office/Admin Time** — Billing, estimates, permit applications
- **Personal** — Doctor appointments, family events (respect privacy, don't over-analyze)

When showing the schedule, add practical context:
- If an event has a street address, it's probably a job site
- Morning events (6-7 AM) are likely early starts for commercial jobs
- Events with "inspection" suggest permit-related deadlines
- Back-to-back events at different locations need travel time flagged

### Error Handling

- 401: "Token expired. Re-authentication needed."
- 403: "Insufficient permissions. The app may need Calendars.Read or Calendars.ReadWrite consent."
- Conflict detection: If creating an event that overlaps an existing one, warn the user
- Past dates: If user tries to create an event in the past, confirm they meant to ("That date has passed. Did you mean [future equivalent]?")
