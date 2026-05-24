---
name: "email-composer"
description: "Triggers when user wants to send, draft, reply to, or forward an email — guides through composition and sends via Microsoft Graph"
---

# Email Composer Skill

## Trigger Patterns

Activate this skill when the user says anything like:
- "send an email to [name/email]"
- "draft a message to [name]"
- "reply to that email" / "reply to [name]"
- "forward that to [name]"
- "email [name] about [topic]"
- "write an email" / "compose a message"
- "let [name] know about [topic]"
- "shoot [name] a message about [topic]"
- "tell [customer] their job is done" / "notify [name] about [thing]"

## Instructions

### Step 1: Extract Known Information

Parse the user's request for any provided details:
- **Recipient:** name, email, or both
- **Subject/Topic:** what the email is about
- **Key points:** any specific content mentioned
- **Tone:** formal (new customer, GC, inspector) vs casual (known contact, crew)
- **Action type:** new message, reply, or forward

### Step 2: Resolve Recipient

If only a name is given (no email address):

1. Search contacts: `GET /me/contacts?$filter=startswith(displayName,'[name]')&$select=displayName,emailAddresses,companyName,jobTitle`
2. Search people (broader, includes recent correspondents): `GET /me/people?$search="[name]"&$select=displayName,emailAddresses,companyName`
3. If multiple matches, present options and ask which one
4. If no matches, ask for the email address directly

### Step 3: Compose the Email

**For simple/quick messages** (user gave enough detail):
Draft the email immediately and present for review.

**For complex messages** (insufficient detail):
Walk through these fields:
1. **To:** [resolved recipient]
2. **Subject:** Suggest one based on context, let user modify
3. **Body:** Draft based on user's description
4. **CC/BCC:** Ask if needed
5. **Attachments:** Ask if any files need to be attached

### Step 4: Draft with Phoenix Electric Context

Write emails appropriate for an electrical contracting business:

**Professional templates by scenario:**

**Estimate/Proposal follow-up:**
```
Subject: Electrical Estimate — [Job Description] at [Address]

Hi [Name],

Thank you for the opportunity to provide an estimate for [job description]. Please find [attached/below] our proposal for the work discussed.

[Details]

Please don't hesitate to reach out with any questions. We look forward to working with you.

Best regards,
Shane Warehime
Phoenix Electric LLC
[phone] | [email]
```

**Job completion notification:**
```
Subject: Work Complete — [Job Description] at [Address]

Hi [Name],

I wanted to let you know that we have completed the [electrical work description] at [address]. [Brief summary of what was done].

[If inspection needed: An inspection has been scheduled/will need to be scheduled for [date/TBD].]

[Invoice details if applicable]

Thank you for choosing Phoenix Electric. Please let us know if you need anything else.

Best regards,
Shane Warehime
Phoenix Electric LLC
```

**Scheduling/confirmation:**
```
Subject: Appointment Confirmation — [Date] at [Time]

Hi [Name],

This is to confirm our appointment for [job description] at [address] on [date] at [time].

[Any prep notes — "Please ensure the breaker panel is accessible", etc.]

See you then. If anything changes, just give us a call at [phone].

Best regards,
Shane Warehime
Phoenix Electric LLC
```

**Supplier/distributor inquiry:**
```
Subject: Quote Request — [Materials needed]

Hi [Name],

I need pricing and availability on the following:

- [Item 1] — Qty: [X]
- [Item 2] — Qty: [X]

Job is scheduled for [date], so I'd need delivery by [date].

Please let me know. Thanks.

Shane Warehime
Phoenix Electric LLC
Account #: [if known]
```

### Step 5: Review and Confirm

ALWAYS present the complete email for review before sending:

```
====== EMAIL REVIEW ======
To:      [recipient name] <[email]>
CC:      [cc if any]
Subject: [subject]
──────────────────────────
[full body text]
──────────────────────────
Send this email? (yes / edit / cancel)
===========================
```

Accept modifications:
- "change the subject to..."
- "add [name] to CC"
- "make it more formal / casual"
- "add a line about [topic]"
- "remove the part about [thing]"

### Step 6: Send

On explicit confirmation, send via Graph API:

**New message:** `POST /me/sendMail`
```json
{
  "message": {
    "subject": "[subject]",
    "body": { "contentType": "HTML", "content": "[body as HTML]" },
    "toRecipients": [{ "emailAddress": { "address": "[email]", "name": "[name]" } }],
    "ccRecipients": [...],
    "bccRecipients": [...]
  }
}
```

**Reply:** `POST /me/messages/{original-message-id}/reply`
```json
{
  "comment": "[reply body as HTML]"
}
```

**Forward:** `POST /me/messages/{original-message-id}/forward`
```json
{
  "comment": "[forward note]",
  "toRecipients": [{ "emailAddress": { "address": "[email]", "name": "[name]" } }]
}
```

After sending, confirm: "Email sent to [name] at [time]."

### Important Rules

- NEVER send without explicit user confirmation. This is non-negotiable.
- NEVER fabricate phone numbers, email addresses, or account numbers. Use placeholders like [phone] if not known.
- Default signature: "Shane Warehime / Phoenix Electric LLC" unless user specifies otherwise.
- Convert plain text body to basic HTML (paragraph tags, line breaks) for Graph API.
- If the user says "reply" but no previous message context exists, ask which message to reply to.
- Respect tone: messages to inspectors and GCs should be more formal than messages to regular customers or crew.
- If the user gives very brief instructions ("email John it's done"), draft a complete professional message and present for review -- do not send a one-liner.
