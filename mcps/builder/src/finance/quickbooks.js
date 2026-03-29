/**
 * QuickBooks Online Integration Client
 * 
 * OAuth 2.0 integration with QBO API for accounting operations.
 * Supports invoices, bills, payments, reports, and bank transactions.
 */

const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// QuickBooks API Configuration
const QBO_CONFIG = {
  authUrl: 'https://appcenter.intuit.com/connect/oauth2',
  tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  apiBaseUrl: 'https://quickbooks.api.intuit.com/v3/company',
  sandboxApiUrl: 'https://sandbox-quickbooks.api.intuit.com/v3/company',
  scopes: [
    'com.intuit.quickbooks.accounting',
    'com.intuit.quickbooks.payment'
  ]
};

class QuickBooksClient {
  constructor(config = {}) {
    this.config = {
      clientId: config.clientId || process.env.QBO_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.QBO_CLIENT_SECRET,
      realmId: config.realmId || process.env.QBO_REALM_ID,
      refreshToken: config.refreshToken || process.env.QBO_REFRESH_TOKEN,
      sandbox: config.sandbox || process.env.QBO_SANDBOX === 'true',
      keyVaultName: config.keyVaultName || process.env.KEY_VAULT_NAME,
      ...config
    };

    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = this.config.sandbox ? QBO_CONFIG.sandboxApiUrl : QBO_CONFIG.apiBaseUrl;
    this.httpClient = null;
  }

  /**
   * Connect to QuickBooks and establish authenticated session
   */
  async connect() {
    // Load secrets from Key Vault if configured
    if (this.config.keyVaultName) {
      await this.loadSecretsFromKeyVault();
    }

    // Get initial access token
    await this.refreshAccessToken();

    // Create authenticated HTTP client
    this.httpClient = axios.create({
      baseURL: `${this.baseUrl}/${this.config.realmId}`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add auth interceptor
    this.httpClient.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });

    console.log('QuickBooks client connected');
  }

  async loadSecretsFromKeyVault() {
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${this.config.keyVaultName}.vault.azure.net`;
    const secretClient = new SecretClient(vaultUrl, credential);

    const [clientId, clientSecret, realmId, refreshToken] = await Promise.all([
      secretClient.getSecret('QBO-ClientId'),
      secretClient.getSecret('QBO-ClientSecret'),
      secretClient.getSecret('QBO-RealmId'),
      secretClient.getSecret('QBO-RefreshToken')
    ]);

    this.config.clientId = clientId.value;
    this.config.clientSecret = clientSecret.value;
    this.config.realmId = realmId.value;
    this.config.refreshToken = refreshToken.value;
  }

  async refreshAccessToken() {
    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const response = await axios.post(
      QBO_CONFIG.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer

    // Update refresh token if returned
    if (response.data.refresh_token) {
      this.config.refreshToken = response.data.refresh_token;
      // TODO: Store new refresh token in Key Vault
    }
  }

  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  // ========================================
  // COMPANY INFO
  // ========================================

  async getCompanyInfo() {
    const response = await this.httpClient.get('/companyinfo/' + this.config.realmId);
    return response.data.CompanyInfo;
  }

  // ========================================
  // INVOICES (Accounts Receivable)
  // ========================================

  async createInvoice(invoiceData) {
    const response = await this.httpClient.post('/invoice', invoiceData);
    return response.data.Invoice;
  }

  async getInvoice(invoiceId) {
    const response = await this.httpClient.get(`/invoice/${invoiceId}`);
    return response.data.Invoice;
  }

  async updateInvoice(invoiceId, invoiceData) {
    // QBO requires full object with SyncToken for updates
    const current = await this.getInvoice(invoiceId);
    const updated = { ...current, ...invoiceData };
    const response = await this.httpClient.post('/invoice', updated);
    return response.data.Invoice;
  }

  async deleteInvoice(invoiceId) {
    const current = await this.getInvoice(invoiceId);
    const response = await this.httpClient.post('/invoice', {
      Id: invoiceId,
      SyncToken: current.SyncToken
    }, { params: { operation: 'delete' } });
    return response.data;
  }

  async getOpenInvoices() {
    const query = `SELECT * FROM Invoice WHERE Balance > '0' ORDER BY DueDate`;
    return this.query(query);
  }

  async findInvoiceByDocNumber(docNumber) {
    const query = `SELECT * FROM Invoice WHERE DocNumber = '${docNumber}'`;
    const results = await this.query(query);
    return results.length > 0 ? results[0] : null;
  }

  async getInvoicesByCustomer(customerId) {
    const query = `SELECT * FROM Invoice WHERE CustomerRef = '${customerId}'`;
    return this.query(query);
  }

  async getInvoicesByDateRange(startDate, endDate) {
    const query = `SELECT * FROM Invoice WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
    return this.query(query);
  }

  // ========================================
  // BILLS (Accounts Payable)
  // ========================================

  async createBill(billData) {
    const response = await this.httpClient.post('/bill', billData);
    return response.data.Bill;
  }

  async getBill(billId) {
    const response = await this.httpClient.get(`/bill/${billId}`);
    return response.data.Bill;
  }

  async updateBill(billId, billData) {
    const current = await this.getBill(billId);
    const updated = { ...current, ...billData };
    const response = await this.httpClient.post('/bill', updated);
    return response.data.Bill;
  }

  async getBills(filters = {}) {
    let query = 'SELECT * FROM Bill';
    const conditions = [];

    if (filters.status === 'pending') {
      conditions.push(`Balance > '0'`);
    }
    if (filters.vendorId) {
      conditions.push(`VendorRef = '${filters.vendorId}'`);
    }
    if (filters.dueBefore) {
      conditions.push(`DueDate <= '${filters.dueBefore}'`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY DueDate';
    return this.query(query);
  }

  async getUnpaidBills() {
    const query = `SELECT * FROM Bill WHERE Balance > '0' ORDER BY DueDate`;
    return this.query(query);
  }

  // ========================================
  // BILL PAYMENTS
  // ========================================

  async createBillPayment(paymentData) {
    const response = await this.httpClient.post('/billpayment', paymentData);
    return response.data.BillPayment;
  }

  async getBillPayment(paymentId) {
    const response = await this.httpClient.get(`/billpayment/${paymentId}`);
    return response.data.BillPayment;
  }

  // ========================================
  // CUSTOMER PAYMENTS
  // ========================================

  async createPayment(paymentData) {
    const response = await this.httpClient.post('/payment', paymentData);
    return response.data.Payment;
  }

  async getPayment(paymentId) {
    const response = await this.httpClient.get(`/payment/${paymentId}`);
    return response.data.Payment;
  }

  async getPaymentsByDateRange(startDate, endDate) {
    const query = `SELECT * FROM Payment WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
    return this.query(query);
  }

  // ========================================
  // CUSTOMERS
  // ========================================

  async createCustomer(customerData) {
    const response = await this.httpClient.post('/customer', customerData);
    return response.data.Customer;
  }

  async getCustomer(customerId) {
    const response = await this.httpClient.get(`/customer/${customerId}`);
    return response.data.Customer;
  }

  async findCustomerByName(displayName) {
    const query = `SELECT * FROM Customer WHERE DisplayName = '${displayName}'`;
    const results = await this.query(query);
    return results.length > 0 ? results[0] : null;
  }

  async searchCustomers(searchTerm) {
    const query = `SELECT * FROM Customer WHERE DisplayName LIKE '%${searchTerm}%'`;
    return this.query(query);
  }

  // ========================================
  // VENDORS
  // ========================================

  async createVendor(vendorData) {
    const response = await this.httpClient.post('/vendor', vendorData);
    return response.data.Vendor;
  }

  async getVendor(vendorId) {
    const response = await this.httpClient.get(`/vendor/${vendorId}`);
    return response.data.Vendor;
  }

  async findVendorByName(displayName) {
    const query = `SELECT * FROM Vendor WHERE DisplayName = '${displayName}'`;
    const results = await this.query(query);
    return results.length > 0 ? results[0] : null;
  }

  async getVendors() {
    const query = 'SELECT * FROM Vendor MAXRESULTS 1000';
    return this.query(query);
  }

  // ========================================
  // ACCOUNTS
  // ========================================

  async getAccounts(accountType = null) {
    let query = 'SELECT * FROM Account';
    if (accountType) {
      query += ` WHERE AccountType = '${accountType}'`;
    }
    return this.query(query);
  }

  async getBankAccounts() {
    return this.getAccounts('Bank');
  }

  async getExpenseAccounts() {
    return this.getAccounts('Expense');
  }

  // ========================================
  // ITEMS (Products/Services)
  // ========================================

  async getItems() {
    const query = 'SELECT * FROM Item MAXRESULTS 1000';
    return this.query(query);
  }

  async getItem(itemId) {
    const response = await this.httpClient.get(`/item/${itemId}`);
    return response.data.Item;
  }

  async findItemByName(name) {
    const query = `SELECT * FROM Item WHERE Name = '${name}'`;
    const results = await this.query(query);
    return results.length > 0 ? results[0] : null;
  }

  // ========================================
  // JOURNAL ENTRIES
  // ========================================

  async createJournalEntry(entryData) {
    const response = await this.httpClient.post('/journalentry', entryData);
    return response.data.JournalEntry;
  }

  async getJournalEntry(entryId) {
    const response = await this.httpClient.get(`/journalentry/${entryId}`);
    return response.data.JournalEntry;
  }

  // ========================================
  // RECURRING TRANSACTIONS
  // ========================================

  async getRecurringTransactions() {
    // Note: RecurringTransaction requires specific API access
    try {
      const response = await this.httpClient.get('/query', {
        params: {
          query: 'SELECT * FROM RecurringTransaction'
        }
      });
      return response.data.QueryResponse.RecurringTransaction || [];
    } catch (error) {
      // Fall back to empty if not available
      console.warn('Recurring transactions not available:', error.message);
      return [];
    }
  }

  // ========================================
  // REPORTS
  // ========================================

  async getProfitAndLossReport(dateRange) {
    const { startDate, endDate } = dateRange;
    const response = await this.httpClient.get('/reports/ProfitAndLoss', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    return this.parseReport(response.data);
  }

  async getBalanceSheetReport(asOfDate) {
    const response = await this.httpClient.get('/reports/BalanceSheet', {
      params: {
        as_of: asOfDate
      }
    });
    return this.parseReport(response.data);
  }

  async getAgingReport(reportType = 'Accounts Receivable') {
    const endpoint = reportType === 'Accounts Receivable' 
      ? '/reports/AgedReceivables' 
      : '/reports/AgedPayables';
    
    const response = await this.httpClient.get(endpoint);
    return this.parseAgingReport(response.data);
  }

  async getCashFlowReport(dateRange) {
    const { startDate, endDate } = dateRange;
    const response = await this.httpClient.get('/reports/CashFlow', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    return this.parseReport(response.data);
  }

  async getExpensesByCategory(dateRange) {
    const { startDate, endDate } = dateRange;
    const response = await this.httpClient.get('/reports/ProfitAndLoss', {
      params: {
        start_date: startDate,
        end_date: endDate,
        summarize_column_by: 'Total'
      }
    });
    
    return this.extractExpenseCategories(response.data);
  }

  // ========================================
  // BANK TRANSACTIONS (Bank Feeds)
  // ========================================

  async getBankTransactions(accountId, dateRange) {
    // QBO Bank Feeds API
    const query = `SELECT * FROM Purchase WHERE AccountRef = '${accountId}'`;
    return this.query(query);
  }

  // ========================================
  // QUERY HELPER
  // ========================================

  async query(queryString) {
    const response = await this.httpClient.get('/query', {
      params: { query: queryString }
    });
    
    // Extract the entity array from response
    const queryResponse = response.data.QueryResponse;
    const entityName = Object.keys(queryResponse).find(k => 
      k !== 'startPosition' && k !== 'maxResults' && k !== 'totalCount'
    );
    
    return queryResponse[entityName] || [];
  }

  // ========================================
  // REPORT PARSING HELPERS
  // ========================================

  parseReport(reportData) {
    const report = {
      header: reportData.Header,
      rows: [],
      totalRevenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      totalExpenses: 0,
      netIncome: 0
    };

    if (reportData.Rows && reportData.Rows.Row) {
      report.rows = this.parseReportRows(reportData.Rows.Row);
      
      // Extract summary values
      report.rows.forEach(row => {
        if (row.group === 'Income') report.totalRevenue = row.total || 0;
        if (row.group === 'COGS') report.costOfGoodsSold = row.total || 0;
        if (row.group === 'Gross Profit') report.grossProfit = row.total || 0;
        if (row.group === 'Expenses') report.totalExpenses = row.total || 0;
        if (row.group === 'Net Income') report.netIncome = row.total || 0;
      });
    }

    return report;
  }

  parseReportRows(rows, depth = 0) {
    const result = [];
    
    for (const row of rows) {
      if (row.type === 'Section' && row.Header) {
        const section = {
          group: row.Header.ColData?.[0]?.value,
          depth,
          children: []
        };
        
        if (row.Rows?.Row) {
          section.children = this.parseReportRows(row.Rows.Row, depth + 1);
        }
        
        if (row.Summary?.ColData) {
          section.total = parseFloat(row.Summary.ColData[1]?.value || 0);
        }
        
        result.push(section);
      } else if (row.type === 'Data' && row.ColData) {
        result.push({
          name: row.ColData[0]?.value,
          amount: parseFloat(row.ColData[1]?.value || 0),
          depth
        });
      }
    }
    
    return result;
  }

  parseAgingReport(reportData) {
    const result = {
      rows: [],
      totalAmount: 0
    };

    if (reportData.Rows?.Row) {
      for (const row of reportData.Rows.Row) {
        if (row.type === 'Data' && row.ColData) {
          const aging = {
            customerOrVendor: row.ColData[0]?.value,
            current: parseFloat(row.ColData[1]?.value || 0),
            days1to30: parseFloat(row.ColData[2]?.value || 0),
            days31to60: parseFloat(row.ColData[3]?.value || 0),
            days61to90: parseFloat(row.ColData[4]?.value || 0),
            over90: parseFloat(row.ColData[5]?.value || 0),
            total: parseFloat(row.ColData[6]?.value || 0)
          };
          result.rows.push(aging);
          result.totalAmount += aging.total;
        }
      }
    }

    return result;
  }

  extractExpenseCategories(reportData) {
    const expenses = [];
    
    const findExpenseSection = (rows) => {
      for (const row of rows) {
        if (row.type === 'Section' && row.Header?.ColData?.[0]?.value === 'Expenses') {
          return row.Rows?.Row || [];
        }
        if (row.Rows?.Row) {
          const found = findExpenseSection(row.Rows.Row);
          if (found.length > 0) return found;
        }
      }
      return [];
    };

    if (reportData.Rows?.Row) {
      const expenseRows = findExpenseSection(reportData.Rows.Row);
      
      for (const row of expenseRows) {
        if (row.type === 'Data' && row.ColData) {
          expenses.push({
            category: row.ColData[0]?.value,
            amount: parseFloat(row.ColData[1]?.value || 0)
          });
        }
      }
    }

    return expenses;
  }

  /**
   * Test connection to QuickBooks
   */
  async testConnection() {
    try {
      const company = await this.getCompanyInfo();
      return {
        connected: true,
        companyName: company.CompanyName,
        realmId: this.config.realmId
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = { QuickBooksClient };
