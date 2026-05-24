# Phoenix Webhooks

Webhook handlers for processing events from ServiceTitan, QuickBooks, Plaid, and other integrated systems.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Systems                              │
│  (ServiceTitan, QuickBooks, Plaid, etc.)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Azure Functions (HTTP)                          │
│               /webhooks/{source}/{eventType}                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WebhookProcessor                                │
│  • Signature validation                                          │
│  • Event routing                                                 │
│  • Handler execution                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WebhookQueue                                  │
│  • Task queuing                                                  │
│  • Retry logic                                                   │
│  • Dead letter handling                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ Finance │        │ Courier │        │  Graph  │
   │  Module │        │  Module │        │  Client │
   └─────────┘        └─────────┘        └─────────┘
```

## Files

| File | Purpose |
|------|---------|
| `processor.js` | Main webhook processor and event handlers |
| `queue.js` | Task queue with retry logic |
| `../functions/webhooks.js` | Azure Function HTTP endpoints |

## Webhook Endpoints

### ServiceTitan

| Endpoint | Events |
|----------|--------|
| `POST /webhooks/servicetitan/job` | job.created, job.completed, job.canceled |
| `POST /webhooks/servicetitan/invoice` | invoice.created, invoice.paid |
| `POST /webhooks/servicetitan/customer` | customer.created |
| `POST /webhooks/servicetitan/lead` | lead.created |

### QuickBooks

| Endpoint | Events |
|----------|--------|
| `POST /webhooks/quickbooks` | payment.received, invoice.updated, bill.due |

### Plaid

| Endpoint | Events |
|----------|--------|
| `POST /webhooks/plaid` | transactions.sync, item.error |

### Generic

| Endpoint | Description |
|----------|-------------|
| `POST /webhooks/{source}/{eventType}` | Handle any webhook source |

## Quick Start

### Configure Webhook URL

Register these URLs in the external system's webhook settings:

```
https://phoenix-ai-functions.azurewebsites.net/api/webhooks/servicetitan/job?code={FUNCTION_KEY}
https://phoenix-ai-functions.azurewebsites.net/api/webhooks/quickbooks?code={FUNCTION_KEY}
https://phoenix-ai-functions.azurewebsites.net/api/webhooks/plaid?code={FUNCTION_KEY}
```

### Local Development

```bash
# Start Azure Functions
npm start

# Test webhook
curl -X POST http://localhost:7071/api/webhooks/servicetitan/job \
  -H "Content-Type: application/json" \
  -d '{"eventType": "job.completed", "jobId": "12345", "invoiceId": "INV-001"}'
```

## Event Handlers

### ServiceTitan Events

| Event | Handler | Actions |
|-------|---------|---------|
| `job.created` | `handleJobCreated` | Send confirmation email, create calendar event |
| `job.completed` | `handleJobCompleted` | Sync invoice to QBO, send feedback request |
| `job.canceled` | `handleJobCanceled` | Update calendar, notify dispatch |
| `invoice.created` | `handleInvoiceCreated` | Queue QBO sync |
| `invoice.paid` | `handleInvoicePaid` | Record payment in QBO, update AR |
| `customer.created` | `handleCustomerCreated` | Create QBO customer, send welcome email |
| `lead.created` | `handleLeadCreated` | Auto-assign, schedule follow-up |
| `estimate.accepted` | `handleEstimateAccepted` | Convert to job, order materials |
| `membership.expired` | `handleMembershipExpired` | Send renewal reminder |
| `technician.arrived` | `handleTechnicianArrived` | Notify customer |

### QuickBooks Events

| Event | Handler | Actions |
|-------|---------|---------|
| `payment.received` | `handlePaymentReceived` | Update ST invoice, reconcile |
| `invoice.updated` | `handleQBOInvoiceUpdated` | Log change |
| `bill.due` | `handleBillDue` | Notify AP team |

### Plaid Events

| Event | Handler | Actions |
|-------|---------|---------|
| `transactions.sync` | `handlePlaidTransactionsSync` | Fetch and categorize transactions |
| `item.error` | `handlePlaidItemError` | Notify admin, create re-link task |

## Task Queue

### Task Types

```javascript
const TaskTypes = {
  // Sync tasks
  SYNC_INVOICE_TO_QBO: 'sync_invoice_to_qbo',
  SYNC_CUSTOMER_TO_QBO: 'sync_customer_to_qbo',
  SYNC_PAYMENT_TO_ST: 'sync_payment_to_st',
  
  // Notifications
  SEND_CUSTOMER_EMAIL: 'send_customer_email',
  SEND_TEAMS_NOTIFICATION: 'send_teams_notification',
  SEND_SMS: 'send_sms',
  
  // Calendar
  CREATE_CALENDAR_EVENT: 'create_calendar_event',
  UPDATE_CALENDAR_EVENT: 'update_calendar_event',
  
  // Finance
  CATEGORIZE_TRANSACTION: 'categorize_transaction',
  MATCH_BANK_TRANSACTION: 'match_bank_transaction',
  CREATE_AP_TASK: 'create_ap_task'
};
```

### Queue Configuration

```javascript
const queue = new WebhookQueue({
  maxRetries: 3,
  retryDelays: [1000, 5000, 30000], // 1s, 5s, 30s
  concurrency: 5
});
```

### Registering Custom Handlers

```javascript
queue.registerHandler('my_custom_task', async (payload, context) => {
  // Handle the task
  console.log('Processing:', payload);
  return { success: true };
});

// Enqueue a task
await queue.enqueue({
  type: 'my_custom_task',
  payload: { data: 'value' },
  priority: 'high'
});
```

## Signature Validation

### ServiceTitan

```javascript
// Headers
X-ST-Signature: <HMAC-SHA256 signature>

// Validation
const signature = crypto.createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### QuickBooks

```javascript
// Headers
Intuit-Signature: <Base64 HMAC-SHA256>

// Validation
const signature = crypto.createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('base64');
```

### Plaid

```javascript
// Plaid uses JWT verification in production
// Sandbox may not include signatures
```

## Queue Management Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhooks/queue/status` | GET | Queue status (queued, processing, dead letter counts) |
| `/webhooks/queue/dead-letter` | GET | View dead letter queue |
| `/webhooks/queue/retry/{taskId}` | POST | Retry failed task |

## Key Vault Secrets

| Secret | Purpose |
|--------|---------|
| `ServiceTitan-WebhookSecret` | ServiceTitan signature validation |
| `QBO-WebhookSecret` | QuickBooks signature validation |

## Testing

### Simulate ServiceTitan Job Completed

```bash
curl -X POST http://localhost:7071/api/webhooks/servicetitan/job \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "completed",
    "jobId": "12345",
    "technicianId": "tech-001",
    "completedAt": "2025-01-15T14:30:00Z",
    "invoiceId": "INV-12345"
  }'
```

### Simulate QuickBooks Payment

```bash
curl -X POST http://localhost:7071/api/webhooks/quickbooks \
  -H "Content-Type: application/json" \
  -d '{
    "eventNotifications": [{
      "realmId": "123456789",
      "dataChangeEvent": {
        "entities": [{
          "name": "Payment",
          "id": "PAY-001",
          "operation": "Create",
          "lastUpdated": "2025-01-15T14:30:00Z"
        }]
      }
    }]
  }'
```

### Check Queue Status

```bash
curl http://localhost:7071/api/webhooks/queue/status
```

## Error Handling

### Retry Logic

1. First retry: 1 second delay
2. Second retry: 5 second delay
3. Third retry: 30 second delay
4. After 3 failures: Move to dead letter queue

### Dead Letter Queue

Failed tasks are moved to dead letter queue with:
- Original payload
- Error message
- Retry count
- Timestamp

### Recovery

```bash
# View dead letter tasks
curl http://localhost:7071/api/webhooks/queue/dead-letter

# Retry specific task
curl -X POST http://localhost:7071/api/webhooks/queue/retry/{taskId}
```

## Production Considerations

### Azure Service Bus

In production, replace in-memory queue with Azure Service Bus:

```javascript
const { ServiceBusClient } = require('@azure/service-bus');

// Send to queue
await sender.sendMessages({ body: task });

// Process from queue
const receiver = client.createReceiver('webhook-tasks');
receiver.subscribe({
  processMessage: async (message) => {
    await processTask(message.body);
  },
  processError: async (err) => {
    console.error('Queue error:', err);
  }
});
```

### Webhook URL Security

1. Use Azure Function keys for authentication
2. Validate signatures from all sources
3. Use HTTPS only
4. IP whitelist if possible

### Monitoring

- Enable Application Insights for all webhook functions
- Set up alerts for:
  - High dead letter count
  - Failed signature validations
  - High latency
