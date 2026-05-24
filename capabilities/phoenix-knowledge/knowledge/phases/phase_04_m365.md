# Phase 4: M365 Integration -- Complete Knowledge Reference

**Company:** Phoenix Electric (ELECTRICAL company -- never HVAC)
**Owner:** Shane Warehime
**Status:** PRIORITY ("would love to have m365 last week")
**Date:** 2026-03-10
**Author:** Echo Pro (Opus 4.6)
**Scope:** Outlook Email, Calendar, Teams Chat, SharePoint Documents
**NOT in scope:** Service Fusion through Teams (that is Phase 3)

---

## 1. ARCHITECTURE OVERVIEW

### System Context

Phase 4 connects Phoenix Echo to Microsoft 365 via Microsoft Graph API and the M365 Agents SDK. All four services (Email, Calendar, Teams, SharePoint) go through a single Azure Entra ID app registration and authenticate via OAuth 2.0 client credentials.

### Architecture Diagram

```
Microsoft 365 Tenant (phoenixelectric.life)
  |-- Outlook (email)
  |-- Calendar
  |-- Teams
  |-- SharePoint
      |
      v
Microsoft Graph API (graph.microsoft.com)
      |
      | OAuth 2.0 + Bearer Token
      v
Azure Entra ID App Registration ("Phoenix Echo Bot")
  |-- Client ID + Client Secret (stored in Azure Key Vault)
      |
      +---> Gateway (VPS) -- Graph Client for email + calendar
      |       |-- /api/mail/*
      |       |-- /api/calendar/*
      |       |-- /api/sharepoint/*
      |
      +---> Teams Bot (M365 Agents SDK on VPS)
      |       |-- /api/messages
      |
      +---> Gateway Dashboard (browser UI)
              |-- Email panel
              |-- Calendar view
              |-- SharePoint browser
              |-- M365 health status
```

### Key Decision

Microsoft Graph API is the SINGLE entry point for all M365 data. Teams bot uses the M365 Agents SDK (`@microsoft/agents-hosting`) which handles its own auth and messaging channel, but also calls Graph for data.

### Priority Order (Shane's directive)

1. **Email and Calendar FIRST** (can be live in a single day)
2. Teams bot second
3. SharePoint third

---

## 2. TECHNOLOGY STACK

### Languages & Frameworks

| Component | Technology | Version/Notes |
|-----------|-----------|---------------|
| Graph Client | `@microsoft/microsoft-graph-client` | npm package |
| Azure Auth | `@azure/identity` | ClientSecretCredential |
| MSAL | `@azure/msal-node` | Token management |
| Teams Bot | `@microsoft/agents-hosting` | M365 Agents SDK (replaces Bot Framework) |
| Teams Express | `@microsoft/agents-hosting-express` | Express adapter for Agents SDK |
| Date Handling | `luxon` | Timezone-aware date operations |
| Gateway | Express.js | HTTP framework |
| Runtime | Node.js | 22+ |

### npm Dependencies

```bash
# Microsoft Graph SDK
npm install @microsoft/microsoft-graph-client @azure/identity @azure/msal-node

# Microsoft 365 Agents SDK (Teams bot)
npm install @microsoft/agents-hosting @microsoft/agents-hosting-express

# Date handling for calendar
npm install luxon
```

### Important: M365 Agents SDK

- Bot Framework SDK was **archived December 31, 2025**
- Replacement is Microsoft 365 Agents SDK
- Released May 2025 (~10 months old as of March 2026)
- Expect rough edges -- Shane accepted this
- Pin exact package versions

---

## 3. PREREQUISITES

### Azure / M365 Requirements

| Requirement | Details | Status |
|-------------|---------|--------|
| Microsoft 365 Business license | Must include Exchange Online + Teams | VERIFY |
| Azure subscription | For App Registration and Bot resource | VERIFY |
| Azure Entra ID (formerly Azure AD) | For OAuth app registration | VERIFY |
| Global Admin or Application Admin role | Required for admin consent | VERIFY |
| Azure Key Vault | `PhoenixaAiVault` | EXISTS |
| VPS accessible at echo.phoenixelectric.life | For Teams messaging endpoint | EXISTS |
| Gateway running on VPS | Port 18790 | EXISTS |

### M365 Tenant

- **Domain:** `phoenixelectric.life`
- **Primary user:** `shane@phoenixelectric.life`
- **Timezone:** `America/Chicago` (Central Time)

---

## 4. AUTHENTICATION & CREDENTIALS

### Azure Entra ID App Registration

**App Name:** `Phoenix Echo Bot`
**Account Type:** Single tenant (this organization only)
**Redirect URI:** None (client credentials flow)

#### Required Values

| Value | Key Vault Secret Name | Description |
|-------|----------------------|-------------|
| Application (client) ID | `M365-Client-Id` | Azure app client ID |
| Directory (tenant) ID | `M365-Tenant-Id` | Azure tenant ID |
| Client Secret | `M365-Client-Secret` | 24-month expiry, set reminder at 22 months |

#### API Permissions (Application -- app-only, no user sign-in)

| Permission | Purpose | Type |
|------------|---------|------|
| `Mail.Read` | Read emails from Shane's mailbox | Application |
| `Mail.Send` | Send emails as Shane | Application |
| `Mail.ReadWrite` | Move, flag, categorize emails | Application |
| `Calendars.Read` | Read calendar events | Application |
| `Calendars.ReadWrite` | Create/modify calendar events | Application |
| `User.Read.All` | Read user profiles (Teams bot context) | Application |
| `Chat.Read.All` | Read Teams chat messages | Application |
| `ChannelMessage.Read.All` | Read Teams channel messages | Application |
| `Sites.Read.All` | Read SharePoint sites and documents | Application |
| `Files.Read.All` | Read files across SharePoint/OneDrive | Application |

**After adding all permissions:** Click "Grant admin consent for Phoenix Electric" -- all must show green checkmarks.

#### Application Access Policy (Mailbox Restriction)

Application permissions grant access to ALL mailboxes. Restrict to Shane's only:

```powershell
# Exchange Online PowerShell
New-DistributionGroup -Name "Phoenix Echo Mailbox Access" -Type Security
Add-DistributionGroupMember -Identity "Phoenix Echo Mailbox Access" -Member "shane@phoenixelectric.life"

New-ApplicationAccessPolicy `
  -AppId "<AZURE_CLIENT_ID>" `
  -PolicyScopeGroupId "Phoenix Echo Mailbox Access" `
  -AccessRight RestrictAccess `
  -Description "Restrict Phoenix Echo to Shane's mailbox only"

# Verify
Test-ApplicationAccessPolicy `
  -Identity "shane@phoenixelectric.life" `
  -AppId "<AZURE_CLIENT_ID>"
# Expected: "Granted"
```

### OAuth 2.0 Flow

**Grant Type:** `client_credentials`
**Scope:** `https://graph.microsoft.com/.default`
**Token management:** Handled by `@azure/identity` `ClientSecretCredential` (auto caching + refresh)

### Environment Variables

```env
# Azure Entra ID App Registration
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>

# Microsoft Graph
GRAPH_USER_EMAIL=shane@phoenixelectric.life

# Teams Bot
TEAMS_BOT_APP_ID=<same-as-AZURE_CLIENT_ID-or-separate>
TEAMS_BOT_APP_SECRET=<same-as-AZURE_CLIENT_SECRET-or-separate>

# Internal
ECHO_INTERNAL_TOKEN=<token-for-gateway-to-gateway-calls>
```

### Key Vault Secret Storage

```bash
az keyvault secret set --vault-name PhoenixaAiVault --name "M365-Tenant-Id" --value "<tenant-id>"
az keyvault secret set --vault-name PhoenixaAiVault --name "M365-Client-Id" --value "<client-id>"
az keyvault secret set --vault-name PhoenixaAiVault --name "M365-Client-Secret" --value "<client-secret>"
```

**HARD RULE:** No secrets in code, no secrets in .env files committed to git. Azure Key Vault only.

---

## 5. GRAPH CLIENT

### File Location

`/opt/phoenix-echo-gateway/integrations/graph-client.js`

### GraphClient Class

```javascript
class GraphClient {
  constructor(config) {
    // config: { tenantId, clientId, clientSecret, userEmail }
  }

  async initialize()    // Creates ClientSecretCredential + Graph client, verifies connectivity
  getClient()           // Returns initialized Graph client instance
}
```

### Initialization

```javascript
const graphClient = new GraphClient({
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  userEmail: process.env.GRAPH_USER_EMAIL || 'shane@phoenixelectric.life'
});

await graphClient.initialize();
// Logs: "[Graph] Connected. User: Shane Warehime"
```

### Authentication Provider

Uses `TokenCredentialAuthenticationProvider` from `@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials`:

```javascript
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default']
});
const client = Client.initWithMiddleware({ authProvider, defaultVersion: 'v1.0' });
```

---

## 6. API ENDPOINTS -- EMAIL (Sub-Phase 4B)

### Service File

`/opt/phoenix-echo-gateway/integrations/mail-service.js`

### MailService Class Methods

| Method | Graph API Call | Description |
|--------|---------------|-------------|
| `getRecentEmails(count, folder)` | `GET /users/{email}/mailFolders/{folder}/messages` | Recent emails from inbox |
| `getEmail(messageId)` | `GET /users/{email}/messages/{id}` | Full email body + attachments |
| `searchEmails(query, count)` | `GET /users/{email}/messages?$filter=contains(subject,'...')` | Search by subject |
| `getUnreadCount()` | `GET /users/{email}/mailFolders/inbox` | Unread + total count |
| `sendEmail({to, cc, subject, body, bodyType, importance})` | `POST /users/{email}/sendMail` | Send email |
| `replyToEmail(messageId, comment)` | `POST /users/{email}/messages/{id}/reply` | Reply to email |
| `markAsRead(messageId, isRead)` | `PATCH /users/{email}/messages/{id}` | Mark read/unread |
| `flagEmail(messageId, flagStatus)` | `PATCH /users/{email}/messages/{id}` | Flag for follow-up |

### Gateway Routes (mail-routes.js)

| Method | Gateway Endpoint | Graph Operation |
|--------|-----------------|-----------------|
| GET | `/api/mail/inbox?count=25` | Get recent inbox emails |
| GET | `/api/mail/unread` | Get unread count |
| GET | `/api/mail/:id` | Get full email body |
| GET | `/api/mail/search?q=invoice` | Search emails |
| POST | `/api/mail/send` | Send email |
| POST | `/api/mail/:id/reply` | Reply to email |
| PATCH | `/api/mail/:id/read` | Mark read/unread |

### Send Email Request Body

```json
{
  "to": "mike@abcgeneral.com",
  "cc": "stephanie@phoenixelectric.life",
  "subject": "RE: Panel Upgrade Quote",
  "body": "<p>HTML body content</p>",
  "bodyType": "HTML",
  "importance": "normal"
}
```

### Email Response Format

```json
{
  "id": "AAMkAGI...",
  "subject": "RE: 1423 Elm St - Panel Upgrade Quote",
  "from": "mike@abcgeneral.com",
  "fromName": "Mike Johnson",
  "to": ["shane@phoenixelectric.life"],
  "received": "2026-03-10T14:14:00Z",
  "isRead": false,
  "importance": "normal",
  "preview": "Thanks Shane, the quote looks good...",
  "hasAttachments": false
}
```

---

## 7. API ENDPOINTS -- CALENDAR (Sub-Phase 4C)

### Service File

`/opt/phoenix-echo-gateway/integrations/calendar-service.js`

### CalendarService Class Methods

| Method | Graph API Call | Description |
|--------|---------------|-------------|
| `getTodayEvents()` | `GET /users/{email}/calendarView?startDateTime=...&endDateTime=...` | Today's events |
| `getWeekEvents()` | Same, with week range | This week's events |
| `getEventsInRange(start, end)` | `GET /users/{email}/calendarView` | Events in date range |
| `getEvent(eventId)` | `GET /users/{email}/events/{id}` | Single event detail |
| `createEvent({subject, start, end, location, attendees, body, isOnlineMeeting})` | `POST /users/{email}/events` | Create event |
| `updateEvent(eventId, updates)` | `PATCH /users/{email}/events/{id}` | Modify event |
| `deleteEvent(eventId)` | `DELETE /users/{email}/events/{id}` | Cancel event |
| `getAvailability(start, end)` | `POST /users/{email}/calendar/getSchedule` | Free/busy schedule |

### Gateway Routes (calendar-routes.js)

| Method | Gateway Endpoint | Description |
|--------|-----------------|-------------|
| GET | `/api/calendar/today` | Today's events |
| GET | `/api/calendar/week` | This week's events |
| GET | `/api/calendar/range?start=...&end=...` | Date range events |
| GET | `/api/calendar/:id` | Single event details |
| POST | `/api/calendar` | Create event |
| PATCH | `/api/calendar/:id` | Update event |
| DELETE | `/api/calendar/:id` | Delete event |

### Create Event Request Body

```json
{
  "subject": "Panel Upgrade - 1423 Elm St",
  "start": "2026-03-14T08:00:00",
  "end": "2026-03-14T12:00:00",
  "location": "1423 Elm St, Austin TX",
  "attendees": ["chris@phoenixelectric.life"],
  "body": "<p>200A panel upgrade. Permits pulled.</p>",
  "isOnlineMeeting": false
}
```

### Event Response Format

```json
{
  "id": "AAMkAGI...",
  "subject": "Panel Upgrade - 1423 Elm St",
  "start": { "dateTime": "2026-03-14T08:00:00", "timeZone": "America/Chicago" },
  "end": { "dateTime": "2026-03-14T12:00:00", "timeZone": "America/Chicago" },
  "location": "1423 Elm St, Austin TX",
  "organizer": { "name": "Shane Warehime", "address": "shane@phoenixelectric.life" },
  "attendees": [{ "name": "Chris Wallace", "email": "chris@phoenixelectric.life", "status": "none" }],
  "isAllDay": false,
  "teamsLink": null,
  "showAs": "busy"
}
```

### Timezone

All calendar operations use `America/Chicago` (Central Time). This is hardcoded in the CalendarService.

---

## 8. TEAMS BOT -- ECHO IN TEAMS (Sub-Phase 4D)

### Framework

Microsoft 365 Agents SDK (`@microsoft/agents-hosting` + `@microsoft/agents-hosting-express`)

### Azure Bot Registration

1. Create Azure Bot resource: `phoenix-echo-bot`
2. Use same Application (client) ID from App Registration
3. App type: Single Tenant
4. Enable Teams channel: Bot resource > Channels > Microsoft Teams > Save
5. Messaging endpoint: `https://echo.phoenixelectric.life/api/messages`

### Teams App Manifest

**File:** `/opt/phoenix-echo-gateway/teams/manifest.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.19/MicrosoftTeams.schema.json",
  "manifestVersion": "1.19",
  "version": "1.0.0",
  "id": "<AZURE_CLIENT_ID>",
  "developer": {
    "name": "Phoenix Electric",
    "websiteUrl": "https://phoenixelectric.life",
    "privacyUrl": "https://phoenixelectric.life/privacy",
    "termsOfUseUrl": "https://phoenixelectric.life/terms"
  },
  "name": { "short": "Phoenix Echo", "full": "Phoenix Echo - AI Operations Assistant" },
  "description": {
    "short": "AI assistant for Phoenix Electric operations",
    "full": "Phoenix Echo is Phoenix Electric's AI-powered operations assistant."
  },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#d97757",
  "bots": [{
    "botId": "<AZURE_CLIENT_ID>",
    "scopes": ["personal", "team", "groupChat"],
    "commandLists": [{
      "scopes": ["personal"],
      "commands": [
        { "title": "help", "description": "Show available commands" },
        { "title": "schedule", "description": "Show today's schedule" },
        { "title": "email", "description": "Check recent emails" },
        { "title": "calendar", "description": "View today's calendar" }
      ]
    }]
  }],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["echo.phoenixelectric.life"]
}
```

**Icon files:**
- `color.png` -- 192x192, Phoenix Echo logo on colored background
- `outline.png` -- 32x32, transparent background outline

**Package:**
```bash
cd /opt/phoenix-echo-gateway/teams
zip manifest.zip manifest.json color.png outline.png
```

**Upload:** Teams Admin Center > Manage apps > Upload custom app

### PhoenixEchoAgent Class

**File:** `/opt/phoenix-echo-gateway/integrations/teams-agent.js`

Extends `AgentApplication` from `@microsoft/agents-hosting`.

**Command Handlers:**

| Command | Handler | Behavior |
|---------|---------|----------|
| `help` / `/help` | `_help` | Shows command table |
| `email` / `/email` | `_emailSummary` | Shows unread count + last 5 emails |
| `calendar` / `/calendar` | `_calendarToday` | Shows today's events |
| `schedule` / `/schedule` | `_calendarToday` | Same as calendar |
| (any other text) | `_handleGeneral` | Forwards to Gateway `/api/chat` for AI processing |
| (member added) | `_welcome` | Welcome message introducing Phoenix Echo |

### Bot Server Options

**Option A (recommended):** Separate Express app on port 3978 for Teams
```javascript
startServer(echoAgent, { port: 3978 });
```

**Option B:** Mount on existing Gateway Express app
```javascript
app.post('/api/messages', echoAgent.requestHandler());
```

### Nginx Reverse Proxy (if using port 3978)

```nginx
location /api/messages {
    proxy_pass http://localhost:3978;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Error Handling Philosophy

Shane's directive: "MISTAKES BY THE BOT WILL BE EXPECTED AND COMMUNICATED."

- When errors occur, explain WHY clearly
- Include specific error message
- Always suggest an alternative action
- Never say "Something went wrong" -- say what actually failed
- One acknowledgment is enough when corrected (no excessive apologies)

---

## 9. SHAREPOINT INTEGRATION (Sub-Phase 4E)

### Service File

`/opt/phoenix-echo-gateway/integrations/sharepoint-service.js`

### SharePointService Class Methods

| Method | Graph API Call | Description |
|--------|---------------|-------------|
| `findSite(siteName)` | `GET /sites?search={name}` | Find site ID (one-time setup) |
| `listLibraries()` | `GET /sites/{siteId}/drives` | List document libraries |
| `listFiles(driveId, folderId)` | `GET /drives/{driveId}/items/{folderId}/children` | Browse files in folder |
| `searchDocuments(query)` | `GET /sites/{siteId}/drive/root/search(q='...')` | Search documents |
| `getDownloadUrl(driveId, itemId)` | `GET /drives/{driveId}/items/{itemId}` | Get download link |
| `listLists()` | `GET /sites/{siteId}/lists` | List SharePoint lists |
| `createListItem(listId, fields)` | `POST /sites/{siteId}/lists/{listId}/items` | Create list item |

### Gateway Routes (sharepoint-routes.js)

| Method | Gateway Endpoint | Description |
|--------|-----------------|-------------|
| GET | `/api/sharepoint/libraries` | List document libraries |
| GET | `/api/sharepoint/files/:driveId/:folderId?` | Browse files |
| GET | `/api/sharepoint/search?q=...` | Search documents |
| GET | `/api/sharepoint/download/:driveId/:itemId` | Get download URL |

### SharePoint Site

- **Site Name:** Phoenix Ops
- **Site ID format:** `phoenixelectric.sharepoint.com,<guid>,<guid>`
- Use `findSite('Phoenix Ops')` once to get ID, then hardcode it

---

## 10. ECHO IDENTITY TRAINING (Sub-Phase 4F)

### Identity Document Files

**Location:** `/opt/phoenix-echo-gateway/identity/`

### ECHO_IDENTITY.md

Core identity document defining who Echo is:
- **Name:** Phoenix Echo (short: Echo), she/her
- **Owner:** Shane Warehime (address as Shane, never "user" or "sir")
- **Company:** Phoenix Electric is ELECTRICAL (never HVAC)
- **Personality:** Professional but warm, direct, honest about limitations
- **Boundaries:** No financial commitments, no sharing customer PII, no deleting data, ask when uncertain

### ECHO_TEAMS_BEHAVIOR.md

Teams-specific behavior rules:
- Keep messages concise for chat format
- Use Markdown formatting
- Lead with the answer, then context
- Error handling: explain WHY, include specific error, suggest alternative
- Learning protocol: mistakes expected, one acknowledgment when corrected

### ECHO_VOCABULARY.md

Domain-specific vocabulary:
- **Job** (not "task" or "ticket")
- **Technician/Tech** (not "worker" or "employee")
- **Service Fusion/SF** (not "ServiceTitan" -- that is a competitor)
- **Phoenix Ops** -- the SharePoint site
- **Gateway** -- the Phoenix Echo Gateway
- **Never say:** "HVAC", "ServiceTitan", "Ticket", "Agent" (to non-technical staff)

### Loading Identity Into Bot

```javascript
const IDENTITY_DIR = '/opt/phoenix-echo-gateway/identity';
const files = ['ECHO_IDENTITY.md', 'ECHO_TEAMS_BEHAVIOR.md', 'ECHO_VOCABULARY.md'];
const ECHO_SYSTEM_PROMPT = files.map(f => readFileSync(join(IDENTITY_DIR, f), 'utf-8')).join('\n\n---\n\n');
```

---

## 11. COMPLETE API ENDPOINT REFERENCE

### Email Endpoints

| Method | Endpoint | Purpose | Request Body |
|--------|----------|---------|-------------|
| GET | `/api/mail/inbox?count=25` | Recent inbox emails | -- |
| GET | `/api/mail/unread` | Unread count | -- |
| GET | `/api/mail/:id` | Full email body | -- |
| GET | `/api/mail/search?q=...` | Search emails | -- |
| POST | `/api/mail/send` | Send email | `{ to, cc, subject, body, bodyType, importance }` |
| POST | `/api/mail/:id/reply` | Reply to email | `{ comment }` |
| PATCH | `/api/mail/:id/read` | Mark read/unread | `{ isRead: boolean }` |

### Calendar Endpoints

| Method | Endpoint | Purpose | Request Body |
|--------|----------|---------|-------------|
| GET | `/api/calendar/today` | Today's events | -- |
| GET | `/api/calendar/week` | This week's events | -- |
| GET | `/api/calendar/range?start=...&end=...` | Date range events | -- |
| GET | `/api/calendar/:id` | Single event | -- |
| POST | `/api/calendar` | Create event | `{ subject, start, end, location, attendees, body, isOnlineMeeting }` |
| PATCH | `/api/calendar/:id` | Update event | `{ subject?, start?, end?, location? }` |
| DELETE | `/api/calendar/:id` | Delete event | -- |

### SharePoint Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sharepoint/libraries` | List document libraries |
| GET | `/api/sharepoint/files/:driveId/:folderId?` | Browse files |
| GET | `/api/sharepoint/search?q=...` | Search documents |
| GET | `/api/sharepoint/download/:driveId/:itemId` | Get download URL |

### Teams Bot Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/messages` | Teams bot messaging endpoint |

### Health Check

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/integrations/m365/health` | Health check all M365 services |

### Health Check Response Format

```json
{
  "healthy": true,
  "services": {
    "graph": { "status": "connected", "user": "Shane Warehime" },
    "mail": { "status": "connected", "unread": 3, "total": 47 },
    "calendar": { "status": "connected", "todayEventCount": 5 },
    "teams": { "status": "running", "note": "Verify by sending test message" },
    "sharepoint": { "status": "connected", "libraryCount": 4 }
  }
}
```

---

## 12. GATEWAY DASHBOARD -- M365 PANELS

### Integration Health Dashboard

Four service cards visible at a glance:
- **Outlook Email:** Connected status, unread count, total count
- **Calendar:** Connected status, today event count, week count
- **Teams Bot:** Running status, message count, last activity
- **SharePoint:** Connected status, library count, document count

Each card is live. Green dot = connected. Red dot = error (with specific error on hover).

### Inbox View Panel

- Shows emails with sender, subject, time, preview
- Unread marked with [NEW]
- Click to see full body
- Compose/Search/Refresh buttons
- API: `GET /api/mail/inbox?count=25`

### Calendar View Panel

- Today's schedule as timeline
- Shows times, subjects, locations, attendees
- Teams meeting links clickable
- Free time gaps shown explicitly
- Create event button
- Today/Week/Month navigation
- API: `GET /api/calendar/today`

### SharePoint Browser Panel

- Document library selector
- Breadcrumb navigation
- File list with name, size, modified date
- Folder navigation
- Search across all libraries
- Click file for download link
- API: `GET /api/sharepoint/files/:driveId/:folderId?`

---

## 13. INFRASTRUCTURE REQUIREMENTS

### Ports

| Port | Service | Location |
|------|---------|----------|
| 18790 | Phoenix Echo Gateway | VPS |
| 3978 | Teams Bot (Agents SDK) | VPS (behind nginx reverse proxy) |
| 443 | Microsoft Graph API | External |

### Network Requirements

- HTTPS to `graph.microsoft.com`
- HTTPS to `login.microsoftonline.com` (Azure AD auth)
- HTTPS to `phoenixaaivault.vault.azure.net` (Key Vault)
- VPS must be publicly accessible at `echo.phoenixelectric.life` (for Teams messaging endpoint)
- SSL/TLS required for Teams bot endpoint

### VPS Configuration

- Gateway runs on VPS at `echo.phoenixelectric.life`
- Nginx reverse proxy for `/api/messages` -> `localhost:3978`
- All other routes -> `localhost:18790`

---

## 14. SECURITY CONSIDERATIONS

### Mailbox Access Restriction

Application permissions grant access to ALL mailboxes in the tenant. Application Access Policy restricts to Shane's mailbox only.

### Secret Management

- All credentials in Azure Key Vault
- Client secret has 24-month expiry -- set calendar reminder at 22 months
- Consider certificate auth for production (more secure than client secret)
- `@azure/identity` handles token caching and refresh automatically

### JWT Authentication

All Gateway API routes require JWT authentication. No unauthenticated access.

### Graph API Rate Limits

- 10,000 requests per 10 minutes per app
- Implement token bucket rate limiter
- Cache responses where appropriate
- Monitor for 429 responses

---

## 15. TESTING REQUIREMENTS

### Smoke Tests

| Test | Command | Expected Result |
|------|---------|-----------------|
| Graph auth | `node -e "await graphClient.initialize()"` | "Connected. User: Shane Warehime" |
| Read inbox | `curl /api/mail/inbox?count=3` | JSON with 3 email objects |
| Unread count | `curl /api/mail/unread` | `{ unread: N, total: M }` |
| Send test email | `curl -X POST /api/mail/send` | Email arrives in Shane's inbox |
| Today's calendar | `curl /api/calendar/today` | JSON with today's events |
| Create event | `curl -X POST /api/calendar` | Event appears in Outlook |
| Teams bot help | Send "help" in Teams | Command table response |
| Teams bot email | Send "email" in Teams | Inbox summary |
| Teams bot calendar | Send "calendar" in Teams | Today's schedule |
| SharePoint libraries | `curl /api/sharepoint/libraries` | List of doc libraries |
| SharePoint search | `curl /api/sharepoint/search?q=invoice` | Matching documents |

### Integration Test Sequence

1. Send email through Gateway API
2. Verify it appears in Outlook
3. Ask Echo in Teams "do I have any new email?"
4. Echo should report the email
5. Create calendar event through Gateway API
6. Ask Echo in Teams "what's on my calendar today?"
7. Echo should show the new event

### Gauntlet Checklist

**4A: Azure Setup**
- [ ] App Registration created
- [ ] Client ID, Tenant ID recorded
- [ ] Client secret in Key Vault (NOT .env)
- [ ] API permissions with admin consent
- [ ] Application Access Policy configured
- [ ] Test-ApplicationAccessPolicy returns "Granted"

**4B: Email**
- [ ] Graph client connects and authenticates
- [ ] GET /api/mail/inbox returns real emails
- [ ] GET /api/mail/unread returns correct count
- [ ] GET /api/mail/:id returns full email with body
- [ ] POST /api/mail/send sends (verified in Outlook)
- [ ] POST /api/mail/:id/reply sends reply
- [ ] Error handling returns meaningful messages
- [ ] All routes require JWT auth

**4C: Calendar**
- [ ] GET /api/calendar/today returns today's events
- [ ] GET /api/calendar/week returns this week's
- [ ] POST /api/calendar creates event (verified in Outlook)
- [ ] PATCH /api/calendar/:id modifies event
- [ ] DELETE /api/calendar/:id removes event
- [ ] Timezone is America/Chicago
- [ ] Teams meeting links included when present

**4D: Teams Bot**
- [ ] Azure Bot resource created, Teams channel enabled
- [ ] Messaging endpoint: https://echo.phoenixelectric.life/api/messages
- [ ] Teams manifest uploaded
- [ ] help command works
- [ ] email command shows inbox summary
- [ ] calendar command shows today's events
- [ ] General messages forwarded or graceful fallback
- [ ] Bot identifies as Phoenix Echo (not "Bot" or "Assistant")
- [ ] Identity training documents loaded

**4E: SharePoint**
- [ ] Phoenix Ops site ID identified
- [ ] GET /api/sharepoint/libraries returns libraries
- [ ] GET /api/sharepoint/files returns files
- [ ] GET /api/sharepoint/search returns documents
- [ ] Download URLs work

**4F: Identity**
- [ ] ECHO_IDENTITY.md written and loaded
- [ ] ECHO_TEAMS_BEHAVIOR.md written and loaded
- [ ] ECHO_VOCABULARY.md written and loaded
- [ ] Bot uses "Phoenix Electric" not "HVAC"
- [ ] Bot uses "job" not "ticket"
- [ ] Bot introduces as "Phoenix Echo" or "Echo"

---

## 16. DEPLOYMENT PROCEDURES

### Build Order

| Day | What Gets Built | What You Can Test |
|-----|-----------------|-------------------|
| Day 1 AM | Azure App Registration (30 min) | Graph client connects, returns user profile |
| Day 1 PM | Email service + routes (3-4 hrs) | Read inbox, send email, search from Gateway |
| Day 1 PM | Calendar service + routes (2-3 hrs) | View today/week, create events from Gateway |
| Day 2 AM | Teams bot setup (2 hrs) | Azure Bot resource, manifest, bot responds to ping |
| Day 2 PM | Teams bot commands (2-3 hrs) | help, email, calendar commands work in Teams |
| Day 2 PM | Identity training docs (1 hr) | Bot introduces as Phoenix Echo |
| Day 3 | SharePoint service (3-4 hrs) | Browse files, search documents from Gateway |
| Day 3 | Health dashboard (1-2 hrs) | All four services show connected status |

**Email and calendar can be live by end of Day 1.**

### Gateway Wiring

```javascript
// In gateway index.js
import { GraphClient } from './integrations/graph-client.js';
import { MailService } from './integrations/mail-service.js';
import { CalendarService } from './integrations/calendar-service.js';
import { SharePointService } from './integrations/sharepoint-service.js';
import { createMailRoutes } from './routes/mail-routes.js';
import { createCalendarRoutes } from './routes/calendar-routes.js';
import { createSharePointRoutes } from './routes/sharepoint-routes.js';

const graphClient = new GraphClient({ tenantId, clientId, clientSecret, userEmail });
await graphClient.initialize();

const mailService = new MailService(graphClient, userEmail);
const calendarService = new CalendarService(graphClient, userEmail);
const spService = new SharePointService(graphClient, siteId);

app.use('/api/mail', createMailRoutes(mailService));
app.use('/api/calendar', createCalendarRoutes(calendarService));
app.use('/api/sharepoint', createSharePointRoutes(spService));
```

---

## 17. ROLLBACK PLAN

Each sub-phase is independently deployable and reversible.

| Sub-Phase | Rollback Action |
|-----------|-----------------|
| 4A: App Registration | Delete app registration in Azure Portal |
| 4B: Email | Comment out `app.use('/api/mail', ...)`, restart Gateway |
| 4C: Calendar | Comment out `app.use('/api/calendar', ...)`, restart |
| 4D: Teams Bot | Stop bot process, remove app from Teams Admin Center |
| 4E: SharePoint | Comment out sharepoint routes, restart |
| 4F: Identity | Delete or edit .md files (no code rollback needed) |

**Nuclear rollback:**
1. Stop Teams bot process
2. Remove App Registration from Azure Entra ID (revokes all tokens instantly)
3. Comment out all M365 routes in Gateway
4. Restart Gateway
5. M365 fully disconnected, Gateway continues running

---

## 18. KNOWN RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|------|----------|------------|
| M365 Agents SDK is very new (~10 months old) | MAJOR | Shane accepted. Pin exact versions. Test in Teams Playground first. |
| Application permissions read ALL mailboxes | HIGH | Application Access Policy restricts to Shane's mailbox only |
| Client secret expires | MEDIUM | 24-month expiry. Calendar reminder at 22 months. Consider certificate auth. |
| VPS messaging endpoint must be HTTPS | LOW | Already using HTTPS via echo.phoenixelectric.life |
| Graph API rate limits (10,000 req/10 min) | LOW | Token bucket rate limiter. Cache responses. |
| Bot errors visible to team | LOW | Feature, not bug. Build graceful error messages per Shane's directive. |
| OAuth token refresh failures | MEDIUM | @azure/identity handles auto. Monitor auth errors in logs. |
| SharePoint site structure changes | LOW | Use site ID (immutable), not URL. Library IDs are stable. |

---

## 19. SHANE'S SPECIFIC DECISIONS

- "would love to have m365 last week" -- top priority
- "MISTAKES BY THE BOT WILL BE EXPECTED AND COMMUNICATED" -- build for imperfection
- "NEED STRUCTURED TRAINING AND VERBOSE MD. WITH CLARITY OF IDENTITY" -- identity docs are not optional
- "WE OFFER A SUCCESSFUL ENVIRONMENT THEN WE WILL GET A BETTER RESPONSE" -- set Echo up for success
- Email and Calendar FIRST, Teams second, SharePoint third
- Phoenix Electric is ELECTRICAL -- never HVAC
- Bot Framework SDK is archived; M365 Agents SDK is the path forward despite being young
- "never been used" but acceptable

---

## 20. INTEGRATION POINTS WITH OTHER PHASES

- **Phase 3 (Service Fusion):** Teams bot can trigger SF operations (job lookup, customer search) from chat. Future endgame: natural language like "Did Mike reply about the Elm Street job?" triggers email lookup + SF job correlation.
- **Gateway:** M365 panels coexist with SF panels on same Gateway dashboard
- **Identity Training:** Loaded into all AI interactions, not just Teams -- applies to any Echo instance
- **Key Vault:** Shared `PhoenixaAiVault` across all phases for credential management

---

## 21. FILE REFERENCE

| File | Path | Purpose |
|------|------|---------|
| Graph Client | `/opt/phoenix-echo-gateway/integrations/graph-client.js` | MS Graph API client |
| Mail Service | `/opt/phoenix-echo-gateway/integrations/mail-service.js` | Email operations |
| Calendar Service | `/opt/phoenix-echo-gateway/integrations/calendar-service.js` | Calendar operations |
| SharePoint Service | `/opt/phoenix-echo-gateway/integrations/sharepoint-service.js` | Document operations |
| Teams Agent | `/opt/phoenix-echo-gateway/integrations/teams-agent.js` | Echo Teams bot |
| Mail Routes | `/opt/phoenix-echo-gateway/routes/mail-routes.js` | Express routes for email |
| Calendar Routes | `/opt/phoenix-echo-gateway/routes/calendar-routes.js` | Express routes for calendar |
| SharePoint Routes | `/opt/phoenix-echo-gateway/routes/sharepoint-routes.js` | Express routes for SharePoint |
| Teams Manifest | `/opt/phoenix-echo-gateway/teams/manifest.json` | Teams app definition |
| Echo Identity | `/opt/phoenix-echo-gateway/identity/ECHO_IDENTITY.md` | Who Echo is |
| Echo Behavior | `/opt/phoenix-echo-gateway/identity/ECHO_TEAMS_BEHAVIOR.md` | How Echo behaves in Teams |
| Echo Vocabulary | `/opt/phoenix-echo-gateway/identity/ECHO_VOCABULARY.md` | Domain vocabulary |

---

## 22. REFERENCE LINKS

### Microsoft 365 Agents SDK
- SDK Overview: `https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/agents-sdk-overview`
- Node.js Quickstart: `https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/quickstart-nodejs`
- Bot Framework Migration: `https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/bf-migration-nodejs`
- npm @microsoft/agents-hosting: `https://www.npmjs.com/package/@microsoft/agents-hosting`
- npm @microsoft/agents-hosting-express: `https://www.npmjs.com/package/@microsoft/agents-hosting-express`
- GitHub Samples: `https://github.com/microsoft/Agents`

### Microsoft Graph API
- Overview: `https://learn.microsoft.com/en-us/graph/overview`
- Permissions Reference: `https://learn.microsoft.com/en-us/graph/permissions-reference`
- Mail API: `https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview`
- Calendar API: `https://learn.microsoft.com/en-us/graph/api/resources/calendar`
- SharePoint via Graph: `https://learn.microsoft.com/en-us/graph/api/resources/sharepoint`
- npm @microsoft/microsoft-graph-client: `https://www.npmjs.com/package/@microsoft/microsoft-graph-client`

### Azure
- Entra ID App Registration: `https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app`
- Key Vault with Node.js: `https://learn.microsoft.com/en-us/azure/key-vault/general/overview`
- Application Access Policy: `https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access`
