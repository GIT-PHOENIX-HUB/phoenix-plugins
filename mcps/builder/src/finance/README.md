# Phoenix Finance Module

Financial integration module connecting QuickBooks Online, bank aggregators (Plaid), and vendor SFTP feeds.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PhoenixFinance                             │
│                   (Main Orchestrator)                         │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   QuickBooks  │   │     Plaid     │   │  VendorFeeds  │
│    Client     │   │  (Bank Feeds) │   │    (SFTP)     │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ QBO REST API  │   │  Plaid API    │   │  SFTP Server  │
│   (OAuth 2)   │   │ (Transactions)│   │  (CSV/XML/EDI)│
└───────────────┘   └───────────────┘   └───────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main orchestrator (`PhoenixFinance` class) |
| `quickbooks.js` | QuickBooks Online full API client |
| `bankAggregator.js` | Plaid integration for bank feeds |
| `invoiceProcessor.js` | ServiceTitan → QBO invoice sync |
| `reconciliation.js` | Bank transaction matching engine |
| `vendorFeeds.js` | SFTP CSV/XML/EDI feed processor |

## Quick Start

```javascript
const { getPhoenixFinance } = require('./finance');

const finance = getPhoenixFinance({
  keyVaultName: '<KEY_VAULT_NAME>'
});

await finance.initialize();

// Accounts Payable
const bills = await finance.getPendingBills();
await finance.approveBill(billId, 'Shane', 'Approved for payment');
await finance.scheduleBillPayment(billId, '2025-02-01', 'ACH');

// Accounts Receivable
await finance.syncServiceTitanInvoices({ startDate: '2025-01-01', endDate: '2025-01-31' });
const aging = await finance.getReceivablesAging();

// Bank Reconciliation
const transactions = await finance.fetchBankTransactions(accountId, dateRange);
const reconciliation = await finance.reconcileAccount(accountId, '2025-01-31');

// Reports
const cashFlow = await finance.getCashFlowForecast(30); // 30 day forecast
const pl = await finance.getProfitAndLoss({ startDate: '2025-01-01', endDate: '2025-01-31' });
```

## QuickBooks Integration

### Full API Coverage

```javascript
const { QuickBooksClient } = require('./quickbooks');

const qbo = new QuickBooksClient({ keyVaultName: '<KEY_VAULT_NAME>' });
await qbo.connect();

// Invoices
const invoice = await qbo.createInvoice(invoiceData);
const openInvoices = await qbo.getOpenInvoices();

// Bills
const bill = await qbo.createBill(billData);
const unpaidBills = await qbo.getUnpaidBills();

// Payments
const payment = await qbo.createPayment(paymentData);
const billPayment = await qbo.createBillPayment(billPaymentData);

// Reports
const pl = await qbo.getProfitAndLossReport({ startDate, endDate });
const aging = await qbo.getAgingReport('Accounts Receivable');
const cashFlow = await qbo.getCashFlowReport({ startDate, endDate });

// Entities
const customers = await qbo.searchCustomers('Phoenix');
const vendors = await qbo.getVendors();
const accounts = await qbo.getBankAccounts();
```

### Supported Operations

| Category | Operations |
|----------|------------|
| **Invoices** | Create, Get, Update, Delete, Query |
| **Bills** | Create, Get, Update, Query |
| **Payments** | Customer payments, Bill payments |
| **Customers** | Create, Search, Update |
| **Vendors** | Create, Search, Update |
| **Accounts** | List by type, Get balances |
| **Items** | Products/Services management |
| **Journal Entries** | Create, Query |
| **Reports** | P&L, Balance Sheet, Cash Flow, Aging |

## Bank Aggregation (Plaid)

### Account Linking

```javascript
const { BankAggregator } = require('./bankAggregator');

const plaid = new BankAggregator({ keyVaultName: '<KEY_VAULT_NAME>' });
await plaid.connect();

// Create Link token for frontend
const { linkToken } = await plaid.createLinkToken('user-123');

// After user completes Link flow
const { itemId, accessToken } = await plaid.exchangePublicToken(publicToken);

// Get accounts
const accounts = await plaid.getAccounts();
const balances = await plaid.getBalances();

// Get transactions
const transactions = await plaid.getTransactions(accountId, {
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

### Transaction Sync

```javascript
// Incremental sync
const { added, modified, removed, nextCursor } = await plaid.syncTransactions(itemId, cursor);
```

## Vendor Feed Processing

### Supported Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| CSV | `.csv` | Comma-separated values |
| XML | `.xml` | XML invoice data |
| EDI | `.edi`, `.x12` | X12 810 Invoice format |
| JSON | `.json` | JSON invoice data |

### Pre-built Vendor Parsers

| Vendor | Format | Auto-detected By |
|--------|--------|------------------|
| Ferguson | CSV | Filename contains "ferguson" |
| Lennox | CSV | Filename contains "lennox" |
| Carrier | CSV | Filename contains "carrier" |
| Grainger | CSV | Filename contains "grainger" |
| Home Depot Pro | CSV | Filename contains "homedepot" or "hdpro" |

### Processing Feeds

```javascript
const { VendorFeedProcessor } = require('./vendorFeeds');

const feeds = new VendorFeedProcessor({
  host: 'sftp.vendor.com',
  inboxPath: '/incoming',
  archivePath: '/archive'
});

// Download and process pending feeds
const pendingFeeds = await feeds.downloadPendingFeeds();

for (const feed of pendingFeeds) {
  const processed = await feeds.processFeed(feed);
  
  // Create bills in QuickBooks
  for (const item of processed.lineItems) {
    await finance.processVendorInvoice({
      vendor: feed.vendor,
      invoiceNumber: item.invoiceNumber,
      amount: item.amount,
      lineItems: item.details
    });
  }
  
  // Archive processed feed
  await feeds.archiveFeed(feed.filename);
}
```

### Custom Vendor Parser

```javascript
feeds.registerVendorParser('customvendor', {
  transform: (data, meta) => {
    return data.map((row, index) => ({
      lineNumber: index + 1,
      invoiceNumber: row['Custom Invoice Field'],
      description: row['Item Desc'],
      quantity: parseFloat(row['Qty']),
      unitPrice: parseFloat(row['Price']),
      amount: parseFloat(row['Total'])
    }));
  }
});
```

## Bank Reconciliation

### Auto-Matching

```javascript
const { Reconciliation } = require('./reconciliation');

const recon = new Reconciliation({
  quickbooks: qboClient,
  bankAggregator: plaidClient,
  amountTolerance: 0.01, // $0.01
  dateTolerance: 3 // days
});

const result = await recon.reconcile({
  accountId: 'bank-account-123',
  asOfDate: '2025-01-31',
  autoMatch: true
});

console.log(result);
// {
//   matched: [...],      // Auto-matched transactions
//   needsReview: [...],  // Possible matches needing confirmation
//   unmatched: {
//     bank: [...],       // Bank transactions without QBO match
//     qbo: [...]         // QBO transactions without bank match
//   },
//   balances: {
//     bank: 50000.00,
//     qbo: 49987.50,
//     discrepancy: 12.50
//   }
// }
```

### Transaction Categorization

```javascript
// Auto-categorize unmatched bank transactions
const categorized = recon.categorizeTransaction(transaction);
// {
//   category: 'Payroll Expenses',
//   accountId: '62',
//   confidence: 0.9,
//   ruleName: 'Payroll'
// }

// Add custom rules
recon.addRule({
  name: 'Ferguson Purchases',
  patterns: ['ferguson', 'ferg ent'],
  category: 'Inventory',
  accountId: '54',
  confidence: 0.95
});
```

## Invoice Processing

### ServiceTitan → QuickBooks Sync

```javascript
const { InvoiceProcessor } = require('./invoiceProcessor');

const processor = new InvoiceProcessor({
  quickbooks: qboClient,
  serviceTitan: stClient
});

// Create QBO invoice from ST invoice
const qboInvoice = await processor.createInvoiceFromServiceTitan(stInvoice);

// Process vendor bill from email
const bill = await processor.processInvoice({
  type: 'vendor_bill',
  vendor: 'Ferguson',
  invoiceNumber: 'INV-12345',
  amount: 1500.00,
  dueDate: '2025-02-15',
  lineItems: [
    { description: 'PVC Pipe 2"', quantity: 100, unitPrice: 15.00 }
  ]
});
```

### Email Invoice Extraction

```javascript
// Extract invoice data from email
const invoiceData = await processor.extractInvoiceFromEmail({
  from: 'billing@ferguson.com',
  subject: 'Invoice #INV-12345',
  body: 'Total Due: $1,500.00 by Feb 15, 2025',
  attachments: [{ name: 'invoice.pdf', content: '...' }]
});
```

## HTTP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/finance/ap/invoice` | POST | Process vendor invoice |
| `/finance/ap/pending` | GET | Get pending bills |
| `/finance/ap/approve/{billId}` | POST | Approve bill |
| `/finance/ap/schedule-payment/{billId}` | POST | Schedule payment |
| `/finance/ar/sync-servicetitan` | POST | Sync ST invoices |
| `/finance/ar/aging` | GET | Get AR aging report |
| `/finance/ar/payment` | POST | Record payment |
| `/finance/bank/transactions/{accountId}` | GET | Get bank transactions |
| `/finance/bank/reconcile/{accountId}` | POST | Run reconciliation |
| `/finance/reports/cash-flow` | GET | Cash flow forecast |
| `/finance/reports/profit-loss` | GET | P&L report |
| `/finance/vendor-feeds/process` | POST | Process SFTP feeds |
| `/finance/plaid/link-token` | POST | Create Plaid Link token |
| `/finance/health` | GET | Health check |

## Scheduled Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `processVendorFeedsScheduled` | 6am, 12pm, 6pm | Process SFTP vendor feeds |

## Configuration

### Key Vault Secrets

| Secret | Purpose |
|--------|---------|
| `QBO-ClientId` | QuickBooks OAuth client ID |
| `QBO-ClientSecret` | QuickBooks OAuth client secret |
| `QBO-RealmId` | QuickBooks company ID |
| `QBO-RefreshToken` | QuickBooks OAuth refresh token |
| `Plaid-ClientId` | Plaid client ID |
| `Plaid-Secret` | Plaid API secret |
| `SFTP-Host` | Vendor SFTP hostname |
| `SFTP-Username` | SFTP username |
| `SFTP-Password` | SFTP password |

### Environment Variables

```json
{
  "KEY_VAULT_NAME": "<KEY_VAULT_NAME>",
  "QBO_SANDBOX": "false",
  "PLAID_ENV": "production"
}
```

## Bill Approval Workflow

Bills over $10,000 require elevated approval:

```javascript
const result = await finance.approveBill(billId, 'John', 'Approved');

if (result.requiresElevation) {
  // Bill is $10,000+ - needs controller/CFO/owner approval
  console.log(result.message); // "Bills over $10,000 require controller approval"
}
```

## Testing

```bash
# Test QuickBooks connection
curl http://localhost:7071/api/finance/health

# Get pending bills
curl http://localhost:7071/api/finance/ap/pending

# Get cash flow forecast
curl "http://localhost:7071/api/finance/reports/cash-flow?days=30"

# Process vendor feeds manually
curl -X POST http://localhost:7071/api/finance/vendor-feeds/process
```
