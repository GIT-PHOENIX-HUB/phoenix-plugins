# Phoenix Courier - Email Automation

Email triage and automation system that processes mailboxes, generates draft replies using GPT-4, and saves attachments to SharePoint.

## Architecture

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  Timer Trigger  │────▶│  Phoenix Courier  │────▶│  Microsoft 365  │
│  (3x/day)       │     │   Orchestrator    │     │  (Email/Files)  │
└─────────────────┘     └─────────┬─────────┘     └─────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌───────────┐ ┌────────────┐
              │  Triage  │ │   Draft   │ │ Attachment │
              │Processor │ │ Generator │ │  Handler   │
              └──────────┘ └───────────┘ └────────────┘
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────┐ ┌───────────┐ ┌────────────┐
              │ Classify │ │  OpenAI   │ │ SharePoint │
              │  Email   │ │   GPT-4   │ │   Upload   │
              └──────────┘ └───────────┘ └────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main orchestrator - coordinates all modules |
| `emailTriageProcessor.js` | Email classification and prioritization |
| `draftGenerator.js` | GPT-4 powered reply generation |
| `attachmentHandler.js` | Saves attachments to SharePoint |
| `teamsNotifier.js` | Teams notifications for urgent items |
| `config.js` | Mailbox configuration and settings |
| `rules.js` | Email classification rules engine |

## Usage

### As Azure Function (Timer Triggered)

```javascript
// Runs automatically 3x/day weekdays, 1x weekends
// Schedule defined in src/functions/courier.js
```

### Manual Invocation

```javascript
const { PhoenixCourier } = require('./courier');

const courier = new PhoenixCourier({
  keyVaultName: '<KEY_VAULT_NAME>',
  mailboxes: ['shane@phoenixelectric.life', 'stephanie@phoenixelectric.life']
});

await courier.initialize();

// Process all configured mailboxes
const results = await courier.processAllMailboxes();

// Or process a specific mailbox
const result = await courier.processMailbox('shane@phoenixelectric.life');
```

## Email Classification

The triage processor classifies emails into categories:

| Category | Priority | Action |
|----------|----------|--------|
| `urgent_customer` | 🔴 High | Teams notification + priority draft |
| `vendor_invoice` | 🟡 Medium | Save attachment, create AP task |
| `service_request` | 🟡 Medium | Generate draft reply |
| `internal` | 🟢 Low | Summarize only |
| `marketing` | ⚪ None | Skip (unless from known vendor) |
| `spam` | ⚫ None | Mark as junk |

### Classification Rules

```javascript
// Custom rules in rules.js
const rules = [
  {
    name: 'Urgent Customer',
    conditions: {
      from: { contains: ['@customer.com'] },
      subject: { contains: ['urgent', 'emergency', 'asap'] }
    },
    category: 'urgent_customer',
    priority: 'high'
  },
  {
    name: 'Vendor Invoice',
    conditions: {
      from: { contains: ['@ferguson.com', '@lennox.com'] },
      hasAttachment: true,
      attachmentType: ['pdf', 'xlsx']
    },
    category: 'vendor_invoice',
    actions: ['save_attachment', 'create_ap_task']
  }
];
```

## Draft Generation

Uses GPT-4 to generate contextual reply drafts:

```javascript
const { DraftGenerator } = require('./draftGenerator');

const generator = new DraftGenerator({
  openAiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

const draft = await generator.generateDraft({
  originalEmail: emailContent,
  context: {
    customerHistory: await getCustomerHistory(email.from),
    serviceHistory: await getServiceTitanJobs(customerId)
  },
  tone: 'professional',
  maxLength: 500
});
```

### Draft Templates

The generator uses templates based on email category:

- **Service Request**: Acknowledges request, provides estimate timeframe
- **Invoice Query**: References specific invoice, provides payment info
- **Complaint**: Apologizes, offers resolution, escalates if needed
- **General Inquiry**: Professional response with relevant information

## Attachment Handling

Automatically saves attachments to SharePoint:

```javascript
const { AttachmentHandler } = require('./attachmentHandler');

const handler = new AttachmentHandler({
  driveId: process.env.SHAREPOINT_DRIVE_ID,
  basePath: 'Phoenix Electric/AI_Input'
});

// Save with auto-categorization
const savedPath = await handler.saveAttachment(attachment, {
  category: 'vendor_invoice',
  vendor: 'Ferguson',
  date: '2025-01-15'
});
// Saved to: Phoenix Electric/AI_Input/Invoices/Ferguson/2025-01/invoice_123.pdf
```

### Folder Structure

```
Phoenix Electric/
├── AI_Input/
│   ├── Invoices/
│   │   ├── Ferguson/
│   │   ├── Lennox/
│   │   └── Other/
│   ├── Contracts/
│   ├── CustomerDocs/
│   └── Unsorted/
└── AI_Output/
    ├── Reports/
    └── Drafts/
```

## Teams Notifications

Sends alerts for urgent items:

```javascript
const { TeamsNotifier } = require('./teamsNotifier');

const notifier = new TeamsNotifier({
  webhookUrl: process.env.TEAMS_WEBHOOK_URL
});

await notifier.sendUrgentAlert({
  type: 'urgent_customer_email',
  from: 'john@customer.com',
  subject: 'Emergency Service Needed',
  summary: 'Customer reports heating system failure',
  actions: [
    { label: 'View Email', url: 'https://outlook.office.com/...' },
    { label: 'Create Job', url: 'https://go.servicetitan.com/...' }
  ]
});
```

## Configuration

### Mailboxes

```javascript
// config.js
module.exports = {
  mailboxes: [
    {
      email: 'shane@phoenixelectric.life',
      type: 'personal',
      processUnread: true,
      generateDrafts: true
    },
    {
      email: 'contact@phoenixelectric.life',
      type: 'shared',
      processUnread: true,
      generateDrafts: true,
      notifyTeams: true
    }
  ],
  schedule: {
    weekdays: ['09:00', '13:00', '17:00'], // MT
    weekends: ['10:00']
  },
  rules: {
    maxEmailsPerRun: 50,
    skipOlderThan: 7, // days
    autoArchiveAfter: 30 // days
  }
};
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `KEY_VAULT_NAME` | Azure Key Vault name |
| `GRAPH_USER_EMAIL` | Default mailbox to process |
| `SHAREPOINT_DRIVE_ID` | SharePoint drive for attachments |
| `TEAMS_WEBHOOK_URL` | Teams channel webhook |
| `OPENAI_API_KEY` | OpenAI API key (via Key Vault) |

## Golden Rule

**⚠️ NEVER auto-send external emails**

Courier creates drafts only. All external emails must be manually reviewed and sent by a human.

```javascript
// This is enforced in the code
if (email.isExternal && action === 'send') {
  throw new Error('AUTO_SEND_BLOCKED: External emails must be manually sent');
}
```

## Testing

```bash
# Test email processing (dry run)
curl -X POST http://localhost:7071/api/courier/test \
  -H "Content-Type: application/json" \
  -d '{"mailbox": "shane@phoenixelectric.life", "dryRun": true}'

# Process a specific mailbox
curl -X POST http://localhost:7071/api/courier/process \
  -H "Content-Type: application/json" \
  -d '{"mailbox": "contact@phoenixelectric.life"}'
```
