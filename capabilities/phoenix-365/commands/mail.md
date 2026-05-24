---
name: "mail"
description: "Email operations — list, read, send, search messages via Microsoft Graph for Phoenix Electric"
---

# /mail — Email Operations

## Instructions

When the user invokes `/mail`, parse the sub-command and execute the appropriate operation using Microsoft Graph API via the phoenix-365 MCP tools.

### Sub-Commands

#### `/mail` (no arguments) or `/mail list`

List the most recent inbox messages. Default: 10 messages.

**Graph endpoint:** `GET /me/messages?$top=10&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,bodyPreview`

**Display format:**
```
Inbox (10 most recent)
======================
[unread marker] [time] — From: [sender name] — [subject]
                         Preview: [first 80 chars of body preview]
```

- Mark unread messages with a `*` prefix
- Show relative time ("2h ago", "yesterday", "Mon 3/17")
- Group by today / yesterday / earlier if helpful

#### `/mail read [message-id or number]`

Read a specific email by its ID or by the number shown in the list.

**Graph endpoint:** `GET /me/messages/{id}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments,attachments`

**Display format:**
```
From:    [sender name] <[email]>
To:      [recipients]
CC:      [cc recipients]
Date:    [formatted date/time]
Subject: [subject]
Attach:  [attachment names if any]
─────────────────────────────────
[body content — converted from HTML to readable text]
```

If the message has attachments, list them with names and sizes.

#### `/mail send`

Compose and send an email. Walk the user through:

1. **To:** Ask for recipient(s). Accept names, email addresses, or both. If a name is given without an email, search contacts via Graph: `GET /me/contacts?$filter=startswith(displayName,'[name]')&$select=displayName,emailAddresses`
2. **Subject:** Ask for subject line
3. **Body:** Ask for message body. Accept plain text — convert to HTML for Graph API.
4. **CC/BCC:** Ask if they want to CC/BCC anyone (optional)
5. **Review:** Show the complete message for review before sending
6. **Send:** On confirmation, send via `POST /me/sendMail`

**Request body structure:**
```json
{
  "message": {
    "subject": "[subject]",
    "body": { "contentType": "HTML", "content": "[body]" },
    "toRecipients": [{ "emailAddress": { "address": "[email]", "name": "[name]" } }],
    "ccRecipients": [...],
    "bccRecipients": [...]
  }
}
```

ALWAYS confirm before sending. Never auto-send without explicit user approval.

#### `/mail search [query]`

Search emails by keyword, sender, date range, or combination.

**Graph endpoint:** `GET /me/messages?$search="[query]"&$top=15&$select=id,subject,from,receivedDateTime,bodyPreview`

**Additional filters the user might request:**
- By sender: `$filter=from/emailAddress/address eq '[email]'`
- By date: `$filter=receivedDateTime ge [date]`
- By unread: `$filter=isRead eq false`
- By has attachments: `$filter=hasAttachments eq true`

**Display:** Same format as `/mail list` but with search context highlighted.

### Phoenix Electric Context

Shane receives emails from:
- **Customers** — service requests, questions about estimates, scheduling
- **Suppliers/Distributors** — order confirmations, pricing, availability (e.g., Rexel, Graybar, CED, Titan)
- **General Contractors** — bid invitations, RFIs, submittals, change orders
- **Inspectors/AHJs** — inspection results, permit status
- **Internal** — crew communications, scheduling updates

When summarizing emails, highlight anything that looks time-sensitive or revenue-impacting:
- New bid requests or RFPs
- Customer complaints or urgent service calls
- Material delivery issues
- Inspection failures
- Payment/invoice related messages

### Error Handling

- If Graph API returns 401: Report "M365 token expired or invalid. Re-authentication needed."
- If Graph API returns 403: Report "Insufficient permissions. The app may need Mail.Read or Mail.Send consent."
- If no results: Suggest alternative search terms or filters.
