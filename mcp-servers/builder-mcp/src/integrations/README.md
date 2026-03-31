# ServiceTitan & Graph Integrations

This directory contains API clients for external service integrations.

## Files

| File | Purpose | Status |
|------|---------|--------|
| `servicetitan.js` | Basic ServiceTitan client with authentication | ✅ Complete |
| `servicetitan-extended.js` | Full ServiceTitan API coverage (200+ endpoints) | ✅ Complete |
| `graph.js` | Microsoft Graph client (Email, Calendar, Teams, SharePoint) | ✅ Complete |

## ServiceTitan Client

### Basic Client (`servicetitan.js`)

Handles authentication and provides core job/invoice operations:

```javascript
const { getServiceTitanClient } = require('./servicetitan');

const client = await getServiceTitanClient();

// Core operations
const jobs = await client.getJobsByDate('2025-01-01', '2025-01-31');
const customer = await client.getCustomer(12345);
const invoice = await client.getInvoices({ startDate: '2025-01-01' });
```

### Extended Client (`servicetitan-extended.js`)

Full API coverage with 200+ endpoints:

```javascript
const { getExtendedClient } = require('./servicetitan-extended');

const client = await getExtendedClient();

// CRM
const lead = await client.createLead({ name: 'John Doe', phone: '555-1234' });
const customers = await client.searchCustomers('Phoenix');

// Dispatch
const capacity = await client.getCapacity('2025-01-15', ['zone1', 'zone2']);
const gps = await client.getTechnicianGPS(techId);

// Inventory
const vendors = await client.getVendors();
const po = await client.createPurchaseOrder(poData);

// Payroll
const timesheets = await client.getTimesheetCodes();
await client.submitTimesheet(techId, timesheetData);

// Marketing
const campaigns = await client.getCampaigns();
const performance = await client.getCampaignPerformance(campaignId);

// And 150+ more...
```

### API Categories

| Category | Methods | Description |
|----------|---------|-------------|
| **CRM** | `createLead`, `searchLeads`, `createCustomer`, `createLocation`, `getBookings` | Lead and customer management |
| **Jobs** | `getJobsByDate`, `getJobDetails`, `addJobNote`, `updateJobStatus` | Job lifecycle |
| **Dispatch** | `getCapacity`, `getAvailableSlots`, `getTechnicianGPS`, `getTechnicianShifts` | Scheduling and routing |
| **Accounting** | `getInvoices`, `getOpenEstimates` | Financial records |
| **Inventory** | `getVendors`, `createVendor`, `getPurchaseOrders`, `createPurchaseOrder` | Vendor and inventory |
| **Payroll** | `getTimesheetCodes`, `getActivityCodes`, `submitTimesheet`, `getGrossPayItems` | Payroll management |
| **Marketing** | `getCampaigns`, `getCampaignPerformance` | Marketing analytics |
| **Equipment** | `getInstalledEquipment`, `createEquipment` | Equipment tracking |
| **Memberships** | `getMembershipTypes`, `createMembership`, `getRecurringServices` | Service agreements |
| **Sales** | `getEstimateItems`, `updateEstimateStatus`, `convertEstimateToJob` | Sales pipeline |
| **Settings** | `getEmployees`, `getBusinessUnits`, `getTags`, `getUserRoles` | Configuration |
| **Tasks** | `getTasks`, `createTask`, `completeTask` | Task management |
| **Telecom** | `getCalls`, `getCallRecording` | Call tracking |

## Microsoft Graph Client

### Usage

```javascript
const { getGraphClient } = require('./graph');

const graph = await getGraphClient();

// Email operations
const messages = await graph.getMessages(userEmail, { top: 50 });
const message = await graph.getMessage(userEmail, messageId);
await graph.createDraft(userEmail, draftData);

// Calendar
const events = await graph.getCalendarEvents(userEmail, startDate, endDate);
await graph.createEvent(userEmail, eventData);

// Teams
await graph.sendTeamsMessage(channelId, message);

// SharePoint/OneDrive
await graph.uploadFile(driveId, filePath, content);
const files = await graph.listFiles(driveId, folderId);
```

### Supported Operations

| Category | Operations |
|----------|------------|
| **Mail** | Get messages, send, create drafts, move, delete |
| **Calendar** | Get events, create, update, delete |
| **Teams** | Send messages, get channels, create chats |
| **SharePoint** | Upload/download files, list folders, search |
| **Users** | Get user info, list users, get manager |

## Configuration

All clients use Azure Key Vault for credentials:

**ServiceTitan:**
- `ServiceTitan-ClientId`
- `ServiceTitan-ClientSecret-2025-11`
- `ServiceTitan-AppKey`
- `ServiceTitan-TenantId`

**Microsoft Graph:**
- `Graph-ClientId`
- `Graph-ClientSecret`
- `Graph-TenantId`

**Local Development:**
```json
// local.settings.json
{
  "Values": {
    "KEY_VAULT_NAME": "<KEY_VAULT_NAME>",
    "SERVICETITAN_TENANT_ID": "<SERVICETITAN_TENANT_ID>",
    "AZURE_TENANT_ID": "<AZURE_TENANT_ID>"
  }
}
```

## Error Handling

Both clients implement retry logic and comprehensive error handling:

```javascript
try {
  const result = await client.getJobDetails(jobId);
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - client auto-refreshes
  } else if (error.response?.status === 429) {
    // Rate limited - client implements backoff
  }
  throw error;
}
```

## Testing

```bash
# Test ServiceTitan connection
curl -X POST http://localhost:7071/api/servicetitan/test

# Test Graph connection  
curl -X POST http://localhost:7071/api/graph/test
```
