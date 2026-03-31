/**
 * Bank Aggregator Integration
 * 
 * Connects to bank accounts via Plaid or similar aggregator services
 * for real-time balance and transaction data.
 */

const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// Plaid API Configuration
const PLAID_CONFIG = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com'
};

class BankAggregator {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'plaid',
      clientId: config.clientId || process.env.PLAID_CLIENT_ID,
      secret: config.secret || process.env.PLAID_SECRET,
      environment: config.environment || process.env.PLAID_ENV || 'sandbox',
      keyVaultName: config.keyVaultName || process.env.KEY_VAULT_NAME,
      ...config
    };

    this.baseUrl = PLAID_CONFIG[this.config.environment] || PLAID_CONFIG.sandbox;
    this.httpClient = null;
    this.accessTokens = new Map(); // itemId -> accessToken
  }

  async connect() {
    // Load secrets from Key Vault if configured
    if (this.config.keyVaultName) {
      await this.loadSecretsFromKeyVault();
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Bank Aggregator connected (${this.config.provider} - ${this.config.environment})`);
  }

  async loadSecretsFromKeyVault() {
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${this.config.keyVaultName}.vault.azure.net`;
    const secretClient = new SecretClient(vaultUrl, credential);

    const [clientId, secret] = await Promise.all([
      secretClient.getSecret('Plaid-ClientId'),
      secretClient.getSecret('Plaid-Secret')
    ]);

    this.config.clientId = clientId.value;
    this.config.secret = secret.value;

    // Load stored access tokens
    try {
      const accessTokensSecret = await secretClient.getSecret('Plaid-AccessTokens');
      const tokens = JSON.parse(accessTokensSecret.value);
      Object.entries(tokens).forEach(([itemId, token]) => {
        this.accessTokens.set(itemId, token);
      });
    } catch (error) {
      // No stored tokens yet
      console.log('No stored Plaid access tokens found');
    }
  }

  // ========================================
  // LINK TOKEN (for Plaid Link initialization)
  // ========================================

  /**
   * Create a link token for initializing Plaid Link
   */
  async createLinkToken(userId, products = ['transactions']) {
    const response = await this.httpClient.post('/link/token/create', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      user: {
        client_user_id: userId
      },
      client_name: 'Phoenix AI',
      products,
      country_codes: ['US'],
      language: 'en'
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration
    };
  }

  /**
   * Exchange public token for access token after Link flow
   */
  async exchangePublicToken(publicToken) {
    const response = await this.httpClient.post('/item/public_token/exchange', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      public_token: publicToken
    });

    const { access_token, item_id } = response.data;
    this.accessTokens.set(item_id, access_token);

    return {
      accessToken: access_token,
      itemId: item_id
    };
  }

  // ========================================
  // ACCOUNTS
  // ========================================

  /**
   * Get all linked accounts
   */
  async getAccounts(itemId = null) {
    const accounts = [];

    const itemIds = itemId ? [itemId] : Array.from(this.accessTokens.keys());

    for (const id of itemIds) {
      const accessToken = this.accessTokens.get(id);
      if (!accessToken) continue;

      try {
        const response = await this.httpClient.post('/accounts/get', {
          client_id: this.config.clientId,
          secret: this.config.secret,
          access_token: accessToken
        });

        accounts.push(...response.data.accounts.map(acct => ({
          ...acct,
          itemId: id
        })));
      } catch (error) {
        console.error(`Error fetching accounts for item ${id}:`, error.message);
      }
    }

    return accounts;
  }

  /**
   * Get current balances for all accounts
   */
  async getBalances(itemId = null) {
    const balances = [];

    const itemIds = itemId ? [itemId] : Array.from(this.accessTokens.keys());

    for (const id of itemIds) {
      const accessToken = this.accessTokens.get(id);
      if (!accessToken) continue;

      try {
        const response = await this.httpClient.post('/accounts/balance/get', {
          client_id: this.config.clientId,
          secret: this.config.secret,
          access_token: accessToken
        });

        balances.push(...response.data.accounts.map(acct => ({
          accountId: acct.account_id,
          itemId: id,
          name: acct.name,
          officialName: acct.official_name,
          type: acct.type,
          subtype: acct.subtype,
          mask: acct.mask,
          balance: acct.balances.current,
          available: acct.balances.available,
          limit: acct.balances.limit,
          currency: acct.balances.iso_currency_code
        })));
      } catch (error) {
        console.error(`Error fetching balances for item ${id}:`, error.message);
      }
    }

    return balances;
  }

  // ========================================
  // TRANSACTIONS
  // ========================================

  /**
   * Get transactions for an account
   */
  async getTransactions(accountId, dateRange) {
    const { startDate, endDate } = dateRange;
    
    // Find item containing this account
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.account_id === accountId);
    
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const accessToken = this.accessTokens.get(account.itemId);

    const response = await this.httpClient.post('/transactions/get', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        account_ids: [accountId],
        count: 500,
        offset: 0
      }
    });

    return response.data.transactions.map(txn => ({
      id: txn.transaction_id,
      accountId: txn.account_id,
      date: txn.date,
      amount: txn.amount, // Negative for outflows
      name: txn.name,
      merchantName: txn.merchant_name,
      category: txn.category,
      categoryId: txn.category_id,
      pending: txn.pending,
      paymentChannel: txn.payment_channel,
      location: txn.location,
      isoCurrencyCode: txn.iso_currency_code
    }));
  }

  /**
   * Sync transactions (get new/updated since last sync)
   */
  async syncTransactions(itemId, cursor = null) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    const payload = {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken
    };

    if (cursor) {
      payload.cursor = cursor;
    }

    const response = await this.httpClient.post('/transactions/sync', payload);

    return {
      added: response.data.added,
      modified: response.data.modified,
      removed: response.data.removed,
      nextCursor: response.data.next_cursor,
      hasMore: response.data.has_more
    };
  }

  // ========================================
  // INSTITUTION INFO
  // ========================================

  /**
   * Get institution details
   */
  async getInstitution(institutionId) {
    const response = await this.httpClient.post('/institutions/get_by_id', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      institution_id: institutionId,
      country_codes: ['US'],
      options: {
        include_optional_metadata: true
      }
    });

    return response.data.institution;
  }

  /**
   * Search for institutions
   */
  async searchInstitutions(query, products = ['transactions']) {
    const response = await this.httpClient.post('/institutions/search', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      query,
      products,
      country_codes: ['US']
    });

    return response.data.institutions;
  }

  // ========================================
  // ITEM MANAGEMENT
  // ========================================

  /**
   * Get item details (connection status)
   */
  async getItem(itemId) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    const response = await this.httpClient.post('/item/get', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken
    });

    return {
      itemId: response.data.item.item_id,
      institutionId: response.data.item.institution_id,
      consentExpirationTime: response.data.item.consent_expiration_time,
      updateType: response.data.item.update_type,
      status: response.data.status
    };
  }

  /**
   * Remove item (disconnect bank)
   */
  async removeItem(itemId) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    await this.httpClient.post('/item/remove', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken
    });

    this.accessTokens.delete(itemId);
    return { success: true };
  }

  /**
   * Create link token to update existing connection
   */
  async createUpdateLinkToken(itemId) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    const response = await this.httpClient.post('/link/token/create', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken,
      user: {
        client_user_id: 'phoenix-user'
      },
      client_name: 'Phoenix AI',
      country_codes: ['US'],
      language: 'en'
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration
    };
  }

  // ========================================
  // WEBHOOKS
  // ========================================

  /**
   * Update webhook URL for an item
   */
  async updateWebhook(itemId, webhookUrl) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    const response = await this.httpClient.post('/item/webhook/update', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken,
      webhook: webhookUrl
    });

    return response.data;
  }

  /**
   * Verify webhook
   */
  async verifyWebhook(webhookBody, headers) {
    // Plaid webhooks include a Plaid-Verification header
    // In production, verify using JWT public key
    const verificationHeader = headers['plaid-verification'];
    
    // Basic validation - production should use proper JWT verification
    if (!verificationHeader) {
      return { valid: false, reason: 'Missing verification header' };
    }

    return {
      valid: true,
      webhookType: webhookBody.webhook_type,
      webhookCode: webhookBody.webhook_code,
      itemId: webhookBody.item_id
    };
  }

  // ========================================
  // IDENTITY (optional product)
  // ========================================

  /**
   * Get identity information for accounts
   */
  async getIdentity(itemId) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    const response = await this.httpClient.post('/identity/get', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken
    });

    return response.data.accounts.map(acct => ({
      accountId: acct.account_id,
      owners: acct.owners.map(owner => ({
        names: owner.names,
        addresses: owner.addresses,
        emails: owner.emails,
        phoneNumbers: owner.phone_numbers
      }))
    }));
  }

  // ========================================
  // LIABILITIES (optional product)
  // ========================================

  /**
   * Get liability information (credit cards, loans)
   */
  async getLiabilities(itemId) {
    const accessToken = this.accessTokens.get(itemId);
    if (!accessToken) {
      throw new Error(`No access token for item ${itemId}`);
    }

    const response = await this.httpClient.post('/liabilities/get', {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken
    });

    return {
      credit: response.data.liabilities.credit || [],
      mortgage: response.data.liabilities.mortgage || [],
      student: response.data.liabilities.student || []
    };
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Get summary of all connected accounts
   */
  async getAccountsSummary() {
    const accounts = await this.getAccounts();
    const balances = await this.getBalances();

    const summary = {
      totalAccounts: accounts.length,
      totalBalance: 0,
      byType: {},
      accounts: []
    };

    for (const balance of balances) {
      summary.totalBalance += balance.balance || 0;
      
      const type = balance.type;
      if (!summary.byType[type]) {
        summary.byType[type] = { count: 0, balance: 0 };
      }
      summary.byType[type].count++;
      summary.byType[type].balance += balance.balance || 0;

      summary.accounts.push({
        id: balance.accountId,
        name: balance.name,
        type: balance.type,
        subtype: balance.subtype,
        balance: balance.balance,
        mask: balance.mask
      });
    }

    return summary;
  }

  /**
   * Store access token (for persistence)
   */
  storeAccessToken(itemId, accessToken) {
    this.accessTokens.set(itemId, accessToken);
  }

  /**
   * Get all stored item IDs
   */
  getLinkedItems() {
    return Array.from(this.accessTokens.keys());
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      // Try to get institution list as a connection test
      const response = await this.httpClient.post('/institutions/get', {
        client_id: this.config.clientId,
        secret: this.config.secret,
        count: 1,
        offset: 0,
        country_codes: ['US']
      });

      return {
        connected: true,
        environment: this.config.environment,
        linkedItems: this.accessTokens.size
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = { BankAggregator };
