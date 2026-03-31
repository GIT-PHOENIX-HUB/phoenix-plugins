/**
 * Phoenix Finance Module
 * 
 * Orchestrates financial operations across QuickBooks, bank aggregators,
 * SFTP vendor feeds, and ServiceTitan invoice reconciliation.
 * 
 * Based on Financial Integration Runbook (ROLE.md)
 */

const { QuickBooksClient } = require('./quickbooks');
const { BankAggregator } = require('./bankAggregator');
const { InvoiceProcessor } = require('./invoiceProcessor');
const { Reconciliation } = require('./reconciliation');
const { VendorFeedProcessor } = require('./vendorFeeds');
const { MCPLogger } = require('../mcp/logger');

class PhoenixFinance {
  constructor(config = {}) {
    this.config = {
      quickbooks: config.quickbooks || {},
      plaid: config.plaid || {},
      sftp: config.sftp || {},
      serviceTitan: config.serviceTitan || {},
      ...config
    };
    
    this.logger = new MCPLogger({ appInsightsKey: config.appInsightsKey });
    this.quickbooks = null;
    this.bankAggregator = null;
    this.invoiceProcessor = null;
    this.reconciliation = null;
    this.vendorFeeds = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize QuickBooks Online (primary accounting system)
      this.quickbooks = new QuickBooksClient(this.config.quickbooks);
      await this.quickbooks.connect();

      // Initialize bank aggregator (Plaid/Yodlee)
      this.bankAggregator = new BankAggregator(this.config.plaid);
      await this.bankAggregator.connect();

      // Initialize invoice processor
      this.invoiceProcessor = new InvoiceProcessor({
        quickbooks: this.quickbooks,
        logger: this.logger
      });

      // Initialize reconciliation engine
      this.reconciliation = new Reconciliation({
        quickbooks: this.quickbooks,
        bankAggregator: this.bankAggregator,
        logger: this.logger
      });

      // Initialize vendor feed processor
      this.vendorFeeds = new VendorFeedProcessor(this.config.sftp);

      this.initialized = true;
      this.logger.info('Phoenix Finance Module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Finance Module', { error: error.message });
      throw error;
    }
  }

  // ========================================
  // ACCOUNTS PAYABLE OPERATIONS
  // ========================================

  /**
   * Process vendor invoice from email/SFTP/upload
   */
  async processVendorInvoice(invoiceData) {
    await this.ensureInitialized();

    const result = await this.invoiceProcessor.processInvoice({
      ...invoiceData,
      type: 'vendor_bill'
    });

    this.logger.audit('vendor_invoice_processed', {
      vendor: invoiceData.vendor,
      amount: invoiceData.amount,
      billId: result.billId
    });

    return result;
  }

  /**
   * Get pending bills requiring approval
   */
  async getPendingBills(filters = {}) {
    await this.ensureInitialized();

    const bills = await this.quickbooks.getBills({
      status: 'pending',
      ...filters
    });

    // Enrich with approval workflow status
    return bills.map(bill => ({
      ...bill,
      approvalStatus: this.getApprovalStatus(bill),
      daysUntilDue: this.calculateDaysToDue(bill.dueDate)
    }));
  }

  /**
   * Approve bill for payment
   */
  async approveBill(billId, approver, notes = '') {
    await this.ensureInitialized();

    const bill = await this.quickbooks.getBill(billId);
    
    // Check approval authority
    if (bill.totalAmt > 10000 && !this.hasElevatedApproval(approver)) {
      return {
        success: false,
        requiresElevation: true,
        message: 'Bills over $10,000 require controller approval'
      };
    }

    const result = await this.quickbooks.updateBill(billId, {
      customFields: {
        approvedBy: approver,
        approvedAt: new Date().toISOString(),
        approvalNotes: notes
      }
    });

    this.logger.audit('bill_approved', {
      billId,
      approver,
      amount: bill.totalAmt,
      vendor: bill.vendorRef?.name
    });

    return { success: true, bill: result };
  }

  /**
   * Schedule bill payment
   */
  async scheduleBillPayment(billId, paymentDate, paymentMethod = 'ACH') {
    await this.ensureInitialized();

    const bill = await this.quickbooks.getBill(billId);
    
    // Validate payment date
    if (new Date(paymentDate) < new Date()) {
      throw new Error('Payment date cannot be in the past');
    }

    const payment = await this.quickbooks.createBillPayment({
      vendorRef: bill.vendorRef,
      totalAmt: bill.totalAmt,
      paymentDate,
      paymentMethod,
      line: [{
        amount: bill.totalAmt,
        linkedTxn: [{ txnId: billId, txnType: 'Bill' }]
      }]
    });

    this.logger.audit('payment_scheduled', {
      billId,
      paymentId: payment.id,
      amount: bill.totalAmt,
      paymentDate,
      method: paymentMethod
    });

    return payment;
  }

  // ========================================
  // ACCOUNTS RECEIVABLE OPERATIONS
  // ========================================

  /**
   * Sync invoices from ServiceTitan to QuickBooks
   */
  async syncServiceTitanInvoices(dateRange) {
    await this.ensureInitialized();

    const { startDate, endDate } = dateRange;
    
    // Get ServiceTitan invoices
    const stInvoices = await this.config.serviceTitan.getInvoices({
      createdOnOrAfter: startDate,
      createdBefore: endDate
    });

    const results = {
      synced: [],
      skipped: [],
      errors: []
    };

    for (const stInvoice of stInvoices) {
      try {
        // Check if already synced
        const existing = await this.quickbooks.findInvoiceByDocNumber(stInvoice.number);
        
        if (existing) {
          results.skipped.push({ id: stInvoice.id, reason: 'already_exists' });
          continue;
        }

        // Create QBO invoice
        const qboInvoice = await this.invoiceProcessor.createInvoiceFromServiceTitan(stInvoice);
        results.synced.push({
          stId: stInvoice.id,
          qboId: qboInvoice.Id,
          amount: qboInvoice.TotalAmt
        });
      } catch (error) {
        results.errors.push({
          id: stInvoice.id,
          error: error.message
        });
      }
    }

    this.logger.audit('servicetitan_invoice_sync', {
      dateRange,
      synced: results.synced.length,
      skipped: results.skipped.length,
      errors: results.errors.length
    });

    return results;
  }

  /**
   * Get outstanding receivables aging report
   */
  async getReceivablesAging() {
    await this.ensureInitialized();

    const aging = await this.quickbooks.getAgingReport('Accounts Receivable');
    
    // Categorize by aging bucket
    const buckets = {
      current: [],      // 0-30 days
      overdue30: [],    // 31-60 days
      overdue60: [],    // 61-90 days
      overdue90: []     // 90+ days
    };

    aging.rows.forEach(row => {
      const daysOverdue = this.calculateDaysOverdue(row.dueDate);
      
      if (daysOverdue <= 30) buckets.current.push(row);
      else if (daysOverdue <= 60) buckets.overdue30.push(row);
      else if (daysOverdue <= 90) buckets.overdue60.push(row);
      else buckets.overdue90.push(row);
    });

    return {
      summary: {
        totalOutstanding: aging.totalAmount,
        currentAmount: this.sumBucket(buckets.current),
        overdue30Amount: this.sumBucket(buckets.overdue30),
        overdue60Amount: this.sumBucket(buckets.overdue60),
        overdue90Amount: this.sumBucket(buckets.overdue90)
      },
      buckets,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Record customer payment
   */
  async recordPayment(paymentData) {
    await this.ensureInitialized();

    const payment = await this.quickbooks.createPayment({
      customerRef: { value: paymentData.customerId },
      totalAmt: paymentData.amount,
      paymentDate: paymentData.date || new Date().toISOString(),
      paymentMethodRef: paymentData.methodId ? { value: paymentData.methodId } : null,
      depositToAccountRef: paymentData.depositAccountId ? { value: paymentData.depositAccountId } : null,
      line: paymentData.invoices.map(inv => ({
        amount: inv.amount,
        linkedTxn: [{ txnId: inv.invoiceId, txnType: 'Invoice' }]
      }))
    });

    this.logger.audit('payment_recorded', {
      paymentId: payment.Id,
      customerId: paymentData.customerId,
      amount: paymentData.amount,
      invoiceCount: paymentData.invoices.length
    });

    return payment;
  }

  // ========================================
  // BANK RECONCILIATION
  // ========================================

  /**
   * Fetch and categorize bank transactions
   */
  async fetchBankTransactions(accountId, dateRange) {
    await this.ensureInitialized();

    const transactions = await this.bankAggregator.getTransactions(accountId, dateRange);
    
    // Auto-categorize using rules engine
    const categorized = await Promise.all(
      transactions.map(txn => this.reconciliation.categorizeTransaction(txn))
    );

    return categorized;
  }

  /**
   * Run bank reconciliation
   */
  async reconcileAccount(accountId, asOfDate) {
    await this.ensureInitialized();

    const result = await this.reconciliation.reconcile({
      accountId,
      asOfDate,
      autoMatch: true
    });

    this.logger.audit('bank_reconciliation', {
      accountId,
      asOfDate,
      matched: result.matched.length,
      unmatched: result.unmatched.length,
      discrepancy: result.discrepancy
    });

    return result;
  }

  /**
   * Match bank transaction to QBO transaction
   */
  async matchTransaction(bankTxnId, qboTxnId, qboTxnType) {
    await this.ensureInitialized();

    return this.reconciliation.createMatch({
      bankTransactionId: bankTxnId,
      qboTransactionId: qboTxnId,
      qboTransactionType: qboTxnType
    });
  }

  // ========================================
  // REPORTING & ANALYTICS
  // ========================================

  /**
   * Get cash flow forecast
   */
  async getCashFlowForecast(days = 30) {
    await this.ensureInitialized();

    const [bankBalances, pendingAR, pendingAP, recurringBills] = await Promise.all([
      this.bankAggregator.getBalances(),
      this.quickbooks.getOpenInvoices(),
      this.quickbooks.getUnpaidBills(),
      this.quickbooks.getRecurringTransactions()
    ]);

    const currentCash = bankBalances.reduce((sum, acct) => sum + acct.balance, 0);
    
    // Project cash flow
    const forecast = [];
    let runningBalance = currentCash;

    for (let day = 0; day < days; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // Expected AR collections
      const arCollections = pendingAR
        .filter(inv => inv.expectedPayDate === dateStr)
        .reduce((sum, inv) => sum + inv.Balance, 0);

      // Expected AP payments
      const apPayments = pendingAP
        .filter(bill => bill.DueDate === dateStr)
        .reduce((sum, bill) => sum + bill.Balance, 0);

      // Recurring transactions
      const recurring = recurringBills
        .filter(rec => this.isRecurringDue(rec, date))
        .reduce((sum, rec) => sum + rec.amount, 0);

      runningBalance = runningBalance + arCollections - apPayments - recurring;

      forecast.push({
        date: dateStr,
        arCollections,
        apPayments,
        recurring,
        projectedBalance: runningBalance
      });
    }

    return {
      currentCash,
      forecast,
      alerts: this.generateCashAlerts(forecast)
    };
  }

  /**
   * Get profit & loss summary
   */
  async getProfitAndLoss(dateRange) {
    await this.ensureInitialized();

    const pl = await this.quickbooks.getProfitAndLossReport(dateRange);
    
    return {
      revenue: pl.totalRevenue,
      cogs: pl.costOfGoodsSold,
      grossProfit: pl.grossProfit,
      expenses: pl.totalExpenses,
      netIncome: pl.netIncome,
      margin: ((pl.netIncome / pl.totalRevenue) * 100).toFixed(2) + '%',
      details: pl.rows
    };
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseBreakdown(dateRange) {
    await this.ensureInitialized();

    const expenses = await this.quickbooks.getExpensesByCategory(dateRange);
    
    // Calculate percentages and trends
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return expenses
      .map(exp => ({
        ...exp,
        percentage: ((exp.amount / total) * 100).toFixed(1) + '%'
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // ========================================
  // VENDOR FEED PROCESSING
  // ========================================

  /**
   * Process SFTP vendor feeds
   */
  async processVendorFeeds() {
    await this.ensureInitialized();

    const feeds = await this.vendorFeeds.downloadPendingFeeds();
    const results = [];

    for (const feed of feeds) {
      try {
        const processed = await this.vendorFeeds.processFeed(feed);
        
        // Create bills in QuickBooks
        for (const item of processed.lineItems) {
          const bill = await this.processVendorInvoice({
            vendor: feed.vendor,
            invoiceNumber: item.invoiceNumber,
            amount: item.amount,
            dueDate: item.dueDate,
            lineItems: item.details
          });
          
          results.push({
            feed: feed.filename,
            vendor: feed.vendor,
            billId: bill.billId,
            amount: item.amount,
            status: 'processed'
          });
        }

        // Archive processed feed
        await this.vendorFeeds.archiveFeed(feed.filename);
      } catch (error) {
        results.push({
          feed: feed.filename,
          status: 'error',
          error: error.message
        });
      }
    }

    this.logger.audit('vendor_feeds_processed', {
      totalFeeds: feeds.length,
      successful: results.filter(r => r.status === 'processed').length,
      failed: results.filter(r => r.status === 'error').length
    });

    return results;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  getApprovalStatus(bill) {
    const customFields = bill.customFields || {};
    if (customFields.approvedBy) {
      return {
        status: 'approved',
        approvedBy: customFields.approvedBy,
        approvedAt: customFields.approvedAt
      };
    }
    return { status: 'pending_approval' };
  }

  hasElevatedApproval(approver) {
    const elevatedApprovers = ['controller', 'cfo', 'owner'];
    return elevatedApprovers.some(role => approver.toLowerCase().includes(role));
  }

  calculateDaysToDue(dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = due - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  calculateDaysOverdue(dueDate) {
    return Math.max(0, -this.calculateDaysToDue(dueDate));
  }

  sumBucket(bucket) {
    return bucket.reduce((sum, item) => sum + (item.amount || item.Balance || 0), 0);
  }

  isRecurringDue(recurring, date) {
    // Simplified check - would need full recurring logic
    const schedule = recurring.schedule;
    if (schedule.frequency === 'monthly' && date.getDate() === schedule.dayOfMonth) {
      return true;
    }
    return false;
  }

  generateCashAlerts(forecast) {
    const alerts = [];
    const minimumBalance = 50000; // Configurable threshold

    forecast.forEach((day, index) => {
      if (day.projectedBalance < minimumBalance) {
        alerts.push({
          type: 'low_cash_warning',
          date: day.date,
          projectedBalance: day.projectedBalance,
          daysFromNow: index,
          severity: day.projectedBalance < 0 ? 'critical' : 'warning'
        });
      }
    });

    return alerts;
  }

  /**
   * Get finance module health status
   */
  async getHealthStatus() {
    const status = {
      module: 'phoenix-finance',
      initialized: this.initialized,
      components: {}
    };

    if (this.quickbooks) {
      try {
        await this.quickbooks.getCompanyInfo();
        status.components.quickbooks = { status: 'connected' };
      } catch (error) {
        status.components.quickbooks = { status: 'error', message: error.message };
      }
    }

    if (this.bankAggregator) {
      try {
        await this.bankAggregator.getAccounts();
        status.components.bankAggregator = { status: 'connected' };
      } catch (error) {
        status.components.bankAggregator = { status: 'error', message: error.message };
      }
    }

    status.components.vendorFeeds = { 
      status: this.vendorFeeds ? 'configured' : 'not_configured' 
    };

    return status;
  }
}

// Singleton factory
let financeInstance = null;

function getPhoenixFinance(config) {
  if (!financeInstance) {
    financeInstance = new PhoenixFinance(config);
  }
  return financeInstance;
}

module.exports = {
  PhoenixFinance,
  getPhoenixFinance
};
