/**
 * Finance Azure Function
 * 
 * HTTP endpoints for financial operations:
 * - Invoice processing (AP/AR)
 * - Bank reconciliation
 * - Financial reports
 * - Vendor feed processing
 */

const { app } = require('@azure/functions');
const { getPhoenixFinance } = require('../finance');

// Initialize finance module
let finance = null;

async function getFinance() {
  if (!finance) {
    finance = getPhoenixFinance({
      keyVaultName: process.env.KEY_VAULT_NAME,
      appInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
    });
    await finance.initialize();
  }
  return finance;
}

// ========================================
// ACCOUNTS PAYABLE ENDPOINTS
// ========================================

app.http('processVendorInvoice', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/ap/invoice',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const invoiceData = await request.json();
      
      const result = await fin.processVendorInvoice(invoiceData);
      
      return {
        jsonBody: result,
        status: result.status === 'duplicate' ? 200 : 201
      };
    } catch (error) {
      context.error('Error processing vendor invoice:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('getPendingBills', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/ap/pending',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      
      const filters = {
        vendorId: request.query.get('vendorId'),
        dueBefore: request.query.get('dueBefore')
      };
      
      const bills = await fin.getPendingBills(filters);
      
      return {
        jsonBody: { bills, count: bills.length }
      };
    } catch (error) {
      context.error('Error getting pending bills:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('approveBill', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/ap/approve/{billId}',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const { billId } = request.params;
      const body = await request.json();
      
      const result = await fin.approveBill(billId, body.approver, body.notes);
      
      if (result.requiresElevation) {
        return {
          jsonBody: result,
          status: 403
        };
      }
      
      return { jsonBody: result };
    } catch (error) {
      context.error('Error approving bill:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('scheduleBillPayment', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/ap/schedule-payment/{billId}',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const { billId } = request.params;
      const body = await request.json();
      
      const payment = await fin.scheduleBillPayment(
        billId,
        body.paymentDate,
        body.paymentMethod
      );
      
      return {
        jsonBody: payment,
        status: 201
      };
    } catch (error) {
      context.error('Error scheduling payment:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

// ========================================
// ACCOUNTS RECEIVABLE ENDPOINTS
// ========================================

app.http('syncServiceTitanInvoices', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/ar/sync-servicetitan',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const body = await request.json();
      
      const results = await fin.syncServiceTitanInvoices({
        startDate: body.startDate,
        endDate: body.endDate
      });
      
      return { jsonBody: results };
    } catch (error) {
      context.error('Error syncing ServiceTitan invoices:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('getReceivablesAging', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/ar/aging',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const aging = await fin.getReceivablesAging();
      
      return { jsonBody: aging };
    } catch (error) {
      context.error('Error getting AR aging:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('recordPayment', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/ar/payment',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const paymentData = await request.json();
      
      const payment = await fin.recordPayment(paymentData);
      
      return {
        jsonBody: payment,
        status: 201
      };
    } catch (error) {
      context.error('Error recording payment:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

// ========================================
// BANK RECONCILIATION ENDPOINTS
// ========================================

app.http('fetchBankTransactions', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/bank/transactions/{accountId}',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const { accountId } = request.params;
      
      const startDate = request.query.get('startDate');
      const endDate = request.query.get('endDate') || new Date().toISOString().split('T')[0];
      
      if (!startDate) {
        return {
          jsonBody: { error: 'startDate is required' },
          status: 400
        };
      }
      
      const transactions = await fin.fetchBankTransactions(accountId, {
        startDate,
        endDate
      });
      
      return {
        jsonBody: { transactions, count: transactions.length }
      };
    } catch (error) {
      context.error('Error fetching bank transactions:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('reconcileAccount', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/bank/reconcile/{accountId}',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const { accountId } = request.params;
      const body = await request.json();
      
      const result = await fin.reconcileAccount(
        accountId,
        body.asOfDate || new Date().toISOString().split('T')[0]
      );
      
      return { jsonBody: result };
    } catch (error) {
      context.error('Error reconciling account:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('matchTransaction', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/bank/match',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const body = await request.json();
      
      const result = await fin.matchTransaction(
        body.bankTxnId,
        body.qboTxnId,
        body.qboTxnType
      );
      
      return { jsonBody: result };
    } catch (error) {
      context.error('Error matching transaction:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

// ========================================
// REPORTING ENDPOINTS
// ========================================

app.http('getCashFlowForecast', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/reports/cash-flow',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const days = parseInt(request.query.get('days') || '30');
      
      const forecast = await fin.getCashFlowForecast(days);
      
      return { jsonBody: forecast };
    } catch (error) {
      context.error('Error getting cash flow forecast:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('getProfitAndLoss', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/reports/profit-loss',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      
      const startDate = request.query.get('startDate');
      const endDate = request.query.get('endDate');
      
      if (!startDate || !endDate) {
        return {
          jsonBody: { error: 'startDate and endDate are required' },
          status: 400
        };
      }
      
      const pl = await fin.getProfitAndLoss({ startDate, endDate });
      
      return { jsonBody: pl };
    } catch (error) {
      context.error('Error getting P&L:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('getExpenseBreakdown', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/reports/expenses',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      
      const startDate = request.query.get('startDate');
      const endDate = request.query.get('endDate');
      
      if (!startDate || !endDate) {
        return {
          jsonBody: { error: 'startDate and endDate are required' },
          status: 400
        };
      }
      
      const expenses = await fin.getExpenseBreakdown({ startDate, endDate });
      
      return { jsonBody: { expenses, count: expenses.length } };
    } catch (error) {
      context.error('Error getting expense breakdown:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

// ========================================
// VENDOR FEED ENDPOINTS
// ========================================

app.http('processVendorFeeds', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/vendor-feeds/process',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const results = await fin.processVendorFeeds();
      
      return { jsonBody: results };
    } catch (error) {
      context.error('Error processing vendor feeds:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

// Timer trigger for automated feed processing
app.timer('processVendorFeedsScheduled', {
  schedule: '0 0 6,12,18 * * *', // 6am, 12pm, 6pm daily
  handler: async (timer, context) => {
    try {
      const fin = await getFinance();
      const results = await fin.processVendorFeeds();
      
      context.log('Vendor feeds processed:', JSON.stringify({
        processed: results.filter(r => r.status === 'processed').length,
        errors: results.filter(r => r.status === 'error').length
      }));
    } catch (error) {
      context.error('Scheduled vendor feed processing failed:', error);
    }
  }
});

// ========================================
// HEALTH CHECK
// ========================================

app.http('financeHealthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'finance/health',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const status = await fin.getHealthStatus();
      
      return { jsonBody: status };
    } catch (error) {
      return {
        jsonBody: {
          module: 'phoenix-finance',
          status: 'error',
          error: error.message
        },
        status: 503
      };
    }
  }
});

// ========================================
// PLAID LINK ENDPOINTS (for bank connection)
// ========================================

app.http('createPlaidLinkToken', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/plaid/link-token',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const body = await request.json();
      
      const linkToken = await fin.bankAggregator.createLinkToken(
        body.userId || 'phoenix-user',
        body.products || ['transactions']
      );
      
      return { jsonBody: linkToken };
    } catch (error) {
      context.error('Error creating link token:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('exchangePlaidPublicToken', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'finance/plaid/exchange-token',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const body = await request.json();
      
      if (!body.publicToken) {
        return {
          jsonBody: { error: 'publicToken is required' },
          status: 400
        };
      }
      
      const result = await fin.bankAggregator.exchangePublicToken(body.publicToken);
      
      return { jsonBody: { itemId: result.itemId, connected: true } };
    } catch (error) {
      context.error('Error exchanging public token:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

app.http('getLinkedAccounts', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'finance/plaid/accounts',
  handler: async (request, context) => {
    try {
      const fin = await getFinance();
      const summary = await fin.bankAggregator.getAccountsSummary();
      
      return { jsonBody: summary };
    } catch (error) {
      context.error('Error getting linked accounts:', error);
      return {
        jsonBody: { error: error.message },
        status: 500
      };
    }
  }
});

module.exports = { getFinance };
