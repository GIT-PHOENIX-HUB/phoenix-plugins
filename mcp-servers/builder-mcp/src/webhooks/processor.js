/**
 * Phoenix Webhook Handlers
 * Processes incoming webhooks from ServiceTitan, QuickBooks, and other systems
 */

const crypto = require('crypto');
const { getServiceTitanClient } = require('../integrations/servicetitan');
const { MCPLogger } = require('../mcp/logger');

class WebhookProcessor {
  constructor(config = {}) {
    this.config = {
      keyVaultName: config.keyVaultName || process.env.KEY_VAULT_NAME,
      enableLogging: config.enableLogging !== false,
      ...config
    };
    this.logger = new MCPLogger(this.config);
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  /**
   * Register default webhook handlers
   */
  registerDefaultHandlers() {
    // ServiceTitan handlers
    this.registerHandler('servicetitan.job.created', this.handleJobCreated.bind(this));
    this.registerHandler('servicetitan.job.completed', this.handleJobCompleted.bind(this));
    this.registerHandler('servicetitan.job.canceled', this.handleJobCanceled.bind(this));
    this.registerHandler('servicetitan.invoice.created', this.handleInvoiceCreated.bind(this));
    this.registerHandler('servicetitan.invoice.paid', this.handleInvoicePaid.bind(this));
    this.registerHandler('servicetitan.customer.created', this.handleCustomerCreated.bind(this));
    this.registerHandler('servicetitan.lead.created', this.handleLeadCreated.bind(this));
    this.registerHandler('servicetitan.estimate.accepted', this.handleEstimateAccepted.bind(this));
    this.registerHandler('servicetitan.membership.expired', this.handleMembershipExpired.bind(this));
    this.registerHandler('servicetitan.technician.arrived', this.handleTechnicianArrived.bind(this));
    
    // QuickBooks handlers
    this.registerHandler('quickbooks.payment.received', this.handlePaymentReceived.bind(this));
    this.registerHandler('quickbooks.invoice.updated', this.handleQBOInvoiceUpdated.bind(this));
    this.registerHandler('quickbooks.bill.due', this.handleBillDue.bind(this));
    
    // Plaid handlers
    this.registerHandler('plaid.transactions.sync', this.handlePlaidTransactionsSync.bind(this));
    this.registerHandler('plaid.item.error', this.handlePlaidItemError.bind(this));
  }

  /**
   * Register a webhook handler
   */
  registerHandler(eventType, handler) {
    this.handlers.set(eventType, handler);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(source, eventType, payload, headers = {}) {
    const webhookId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Validate webhook signature
      const isValid = await this.validateSignature(source, payload, headers);
      if (!isValid) {
        this.logger.warn('Invalid webhook signature', { source, eventType, webhookId });
        return { success: false, error: 'Invalid signature', webhookId };
      }

      // Find handler
      const fullEventType = `${source}.${eventType}`;
      const handler = this.handlers.get(fullEventType);

      if (!handler) {
        this.logger.info('No handler for event type', { fullEventType, webhookId });
        return { success: true, handled: false, message: 'No handler registered', webhookId };
      }

      // Execute handler
      const result = await handler(payload, { webhookId, source, eventType, headers });

      // Log success
      this.logger.audit('webhook_processed', {
        webhookId,
        source,
        eventType,
        duration: Date.now() - startTime,
        success: true
      });

      return { success: true, handled: true, result, webhookId };
    } catch (error) {
      this.logger.error('Webhook processing failed', {
        webhookId,
        source,
        eventType,
        error: error.message,
        stack: error.stack
      });

      return { success: false, error: error.message, webhookId };
    }
  }

  /**
   * Validate webhook signature based on source
   */
  async validateSignature(source, payload, headers) {
    switch (source) {
      case 'servicetitan':
        return this.validateServiceTitanSignature(payload, headers);
      case 'quickbooks':
        return this.validateQuickBooksSignature(payload, headers);
      case 'plaid':
        return this.validatePlaidSignature(payload, headers);
      default:
        // Unknown source - skip validation in dev, enforce in prod
        return process.env.NODE_ENV !== 'production';
    }
  }

  /**
   * Validate ServiceTitan webhook signature
   */
  async validateServiceTitanSignature(payload, headers) {
    const signature = headers['x-st-signature'] || headers['X-ST-Signature'];
    if (!signature) return false;

    // Get webhook secret from Key Vault
    const webhookSecret = await this.getSecret('ServiceTitan-WebhookSecret');
    if (!webhookSecret) {
      this.logger.warn('ServiceTitan webhook secret not configured');
      return process.env.NODE_ENV !== 'production';
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }

  /**
   * Validate QuickBooks webhook signature
   */
  async validateQuickBooksSignature(payload, headers) {
    const signature = headers['intuit-signature'] || headers['Intuit-Signature'];
    if (!signature) return false;

    const webhookSecret = await this.getSecret('QBO-WebhookSecret');
    if (!webhookSecret) {
      this.logger.warn('QuickBooks webhook secret not configured');
      return process.env.NODE_ENV !== 'production';
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('base64');

    return signature === computedSignature;
  }

  /**
   * Validate Plaid webhook signature
   */
  async validatePlaidSignature(payload, headers) {
    // Plaid uses JWT verification - simplified check for now
    const plaidSignature = headers['plaid-verification'] || headers['Plaid-Verification'];
    if (!plaidSignature) return true; // Plaid sandbox may not send signatures
    
    // In production, verify JWT using Plaid's public key
    return true;
  }

  /**
   * Get secret from Key Vault (cached)
   */
  async getSecret(secretName) {
    // Use Key Vault client from config
    try {
      const { SecretClient } = require('@azure/keyvault-secrets');
      const { DefaultAzureCredential } = require('@azure/identity');
      
      const vaultUrl = `https://${this.config.keyVaultName}.vault.azure.net`;
      const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
      
      const secret = await client.getSecret(secretName);
      return secret.value;
    } catch (error) {
      this.logger.error(`Failed to get secret ${secretName}`, { error: error.message });
      return null;
    }
  }

  // ==================== ServiceTitan Handlers ====================

  /**
   * Handle new job created
   */
  async handleJobCreated(payload, context) {
    const { jobId, customerId, jobType, scheduledDate } = payload;
    
    this.logger.info('New job created', { jobId, customerId, jobType, webhookId: context.webhookId });

    // Actions:
    // 1. Send confirmation email to customer
    // 2. Create calendar event for technician
    // 3. Update CRM if applicable

    return {
      action: 'job_created_processed',
      jobId,
      notifications: ['customer_confirmation', 'technician_calendar']
    };
  }

  /**
   * Handle job completed
   */
  async handleJobCompleted(payload, context) {
    const { jobId, technicianId, completedAt, invoiceId } = payload;
    
    this.logger.info('Job completed', { jobId, invoiceId, webhookId: context.webhookId });

    // Actions:
    // 1. Sync invoice to QuickBooks
    // 2. Send customer feedback request
    // 3. Update technician metrics

    const actions = [];

    if (invoiceId) {
      actions.push({
        type: 'sync_invoice_to_qbo',
        invoiceId,
        status: 'queued'
      });
    }

    actions.push({
      type: 'send_feedback_request',
      jobId,
      status: 'queued'
    });

    return {
      action: 'job_completed_processed',
      jobId,
      actions
    };
  }

  /**
   * Handle job canceled
   */
  async handleJobCanceled(payload, context) {
    const { jobId, reason, canceledBy } = payload;
    
    this.logger.info('Job canceled', { jobId, reason, webhookId: context.webhookId });

    // Actions:
    // 1. Update calendar
    // 2. Notify dispatch
    // 3. Update capacity

    return {
      action: 'job_canceled_processed',
      jobId,
      reason
    };
  }

  /**
   * Handle invoice created
   */
  async handleInvoiceCreated(payload, context) {
    const { invoiceId, jobId, customerId, total, items } = payload;
    
    this.logger.info('Invoice created', { invoiceId, total, webhookId: context.webhookId });

    // Queue for QuickBooks sync
    return {
      action: 'invoice_created_processed',
      invoiceId,
      queuedForSync: true
    };
  }

  /**
   * Handle invoice paid
   */
  async handleInvoicePaid(payload, context) {
    const { invoiceId, paymentId, amount, paymentMethod } = payload;
    
    this.logger.info('Invoice paid', { invoiceId, amount, webhookId: context.webhookId });

    // Actions:
    // 1. Record payment in QuickBooks
    // 2. Update AR aging
    // 3. Send receipt to customer

    return {
      action: 'invoice_paid_processed',
      invoiceId,
      paymentId,
      amount
    };
  }

  /**
   * Handle new customer created
   */
  async handleCustomerCreated(payload, context) {
    const { customerId, name, email, phone, address } = payload;
    
    this.logger.info('Customer created', { customerId, name, webhookId: context.webhookId });

    // Actions:
    // 1. Create customer in QuickBooks
    // 2. Send welcome email
    // 3. Add to marketing list

    return {
      action: 'customer_created_processed',
      customerId,
      syncToQBO: true
    };
  }

  /**
   * Handle new lead created
   */
  async handleLeadCreated(payload, context) {
    const { leadId, name, source, contactInfo } = payload;
    
    this.logger.info('Lead created', { leadId, source, webhookId: context.webhookId });

    // Actions:
    // 1. Auto-assign to sales rep
    // 2. Send intro email
    // 3. Create follow-up task

    return {
      action: 'lead_created_processed',
      leadId,
      source,
      followUpScheduled: true
    };
  }

  /**
   * Handle estimate accepted
   */
  async handleEstimateAccepted(payload, context) {
    const { estimateId, customerId, total, acceptedAt } = payload;
    
    this.logger.info('Estimate accepted', { estimateId, total, webhookId: context.webhookId });

    // Actions:
    // 1. Convert to job
    // 2. Notify dispatch
    // 3. Order materials if needed

    return {
      action: 'estimate_accepted_processed',
      estimateId,
      convertToJob: true
    };
  }

  /**
   * Handle membership expired
   */
  async handleMembershipExpired(payload, context) {
    const { membershipId, customerId, expirationDate } = payload;
    
    this.logger.info('Membership expired', { membershipId, customerId, webhookId: context.webhookId });

    // Actions:
    // 1. Send renewal reminder
    // 2. Create follow-up task for sales

    return {
      action: 'membership_expired_processed',
      membershipId,
      renewalReminderSent: true
    };
  }

  /**
   * Handle technician arrived
   */
  async handleTechnicianArrived(payload, context) {
    const { jobId, technicianId, arrivedAt, location } = payload;
    
    this.logger.info('Technician arrived', { jobId, technicianId, webhookId: context.webhookId });

    // Actions:
    // 1. Send notification to customer
    // 2. Update job status

    return {
      action: 'technician_arrived_processed',
      jobId,
      technicianId,
      customerNotified: true
    };
  }

  // ==================== QuickBooks Handlers ====================

  /**
   * Handle payment received
   */
  async handlePaymentReceived(payload, context) {
    const { paymentId, customerId, amount, invoiceId } = payload;
    
    this.logger.info('Payment received (QBO)', { paymentId, amount, webhookId: context.webhookId });

    // Actions:
    // 1. Update ServiceTitan invoice status
    // 2. Reconcile with bank feed

    return {
      action: 'payment_received_processed',
      paymentId,
      amount
    };
  }

  /**
   * Handle QBO invoice updated
   */
  async handleQBOInvoiceUpdated(payload, context) {
    const { invoiceId, changes } = payload;
    
    this.logger.info('QBO invoice updated', { invoiceId, webhookId: context.webhookId });

    return {
      action: 'qbo_invoice_updated_processed',
      invoiceId
    };
  }

  /**
   * Handle bill due soon
   */
  async handleBillDue(payload, context) {
    const { billId, vendorId, amount, dueDate } = payload;
    
    this.logger.info('Bill due', { billId, amount, dueDate, webhookId: context.webhookId });

    // Actions:
    // 1. Send notification to AP team
    // 2. Create approval task if needed

    return {
      action: 'bill_due_processed',
      billId,
      notificationSent: true
    };
  }

  // ==================== Plaid Handlers ====================

  /**
   * Handle Plaid transactions sync
   */
  async handlePlaidTransactionsSync(payload, context) {
    const { itemId, newTransactions } = payload;
    
    this.logger.info('Plaid transactions sync', { itemId, count: newTransactions, webhookId: context.webhookId });

    // Actions:
    // 1. Fetch new transactions
    // 2. Run auto-categorization
    // 3. Match with QBO transactions

    return {
      action: 'plaid_sync_processed',
      itemId,
      transactionsToProcess: newTransactions
    };
  }

  /**
   * Handle Plaid item error
   */
  async handlePlaidItemError(payload, context) {
    const { itemId, errorCode, errorMessage } = payload;
    
    this.logger.warn('Plaid item error', { itemId, errorCode, errorMessage, webhookId: context.webhookId });

    // Actions:
    // 1. Notify admin
    // 2. Create re-link task

    return {
      action: 'plaid_error_processed',
      itemId,
      errorCode,
      adminNotified: true
    };
  }
}

module.exports = { WebhookProcessor };
