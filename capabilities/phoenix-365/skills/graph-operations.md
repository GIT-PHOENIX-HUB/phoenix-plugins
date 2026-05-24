---
name: "graph-operations"
description: "Triggers when user asks about Microsoft 365 data — check email, calendar, files, SharePoint, contacts, or any M365 resource"
---

# Microsoft Graph Operations Skill

## Trigger Patterns

Activate this skill when the user says anything like:
- "check my email" / "any new messages" / "what emails do I have"
- "what's on my calendar" / "what do I have today" / "am I free at 2"
- "find that file" / "where's the proposal for [customer]"
- "check SharePoint" / "look up [something] in the list"
- "who emailed me" / "did [name] reply"
- "what's my schedule look like"
- "pull up my contacts" / "what's [name]'s email"
- Any natural language request that implies reading from or writing to Microsoft 365

## Instructions

### Step 1: Identify the M365 Resource

Map the user's request to the correct Microsoft Graph resource:

| User Intent | Graph Resource | Endpoint Pattern |
|---|---|---|
| Email/messages | Mail | `/me/messages` |
| Calendar/schedule | Calendar | `/me/calendarView` or `/me/events` |
| SharePoint lists/items | SharePoint | `/sites/{id}/lists/{id}/items` |
| Files/documents | OneDrive or SharePoint Drives | `/me/drive` or `/sites/{id}/drives` |
| Contacts/people | Contacts | `/me/contacts` or `/me/people` |
| Teams messages | Teams | `/me/chats` |

### Step 2: Use Phoenix-365 MCP Tools

Execute the request using the available MCP tools from the phoenix-365 server. The tools follow the naming pattern `mcp__phoenix-365__[operation]`.

Available tool categories:
- **Mail tools:** list messages, read message, send mail, search mail
- **Calendar tools:** list events, create event, update event, delete event
- **SharePoint tools:** list sites, list lists, get items, create item, update item
- **Drive tools:** list files, read file, upload file, search files
- **Contacts tools:** list contacts, search people

### Step 3: Format the Response

Present results in a business-practical format for an electrical company owner:

**For email:**
- Lead with unread count and any flagged/important messages
- Highlight messages from known business contacts (customers, suppliers, GCs)
- Flag anything with "urgent", "ASAP", "inspection", "permit", "payment", "invoice" in subject

**For calendar:**
- Show time blocks with locations
- Flag scheduling conflicts
- Note travel time between locations if addresses are present
- Highlight early morning starts (before 7 AM) and late events

**For SharePoint:**
- Present list data as clean tables
- Summarize totals, counts, and status breakdowns
- Flag items that look overdue or incomplete

**For files:**
- Show file name, location, last modified date, and size
- Provide direct links when available

### Step 4: Offer Follow-Up Actions

After presenting data, suggest relevant next steps:
- After showing emails: "Want me to reply to any of these?"
- After showing calendar: "Need to reschedule anything or add a new event?"
- After showing SharePoint items: "Want to update any of these or create a new entry?"
- After showing files: "Want me to open this or upload something?"

### Error Handling

If M365 tools are not available or authentication fails:
1. Check if the phoenix-365 MCP server is running
2. Verify environment variables (AZURE_KEY_VAULT_URI, M365_CLIENT_ID, M365_TENANT_ID)
3. Report the specific error and suggest: "Run `/365` to check connection status"

### Important Rules

- NEVER fabricate M365 data. If a tool call fails, say so clearly.
- NEVER send emails or modify data without explicit user confirmation.
- For read operations, proceed without asking. For write operations, always confirm first.
- Default time zone: America/Chicago (Central Time).
- Shane is the owner. Present data from his perspective (his inbox, his calendar, his sites).
