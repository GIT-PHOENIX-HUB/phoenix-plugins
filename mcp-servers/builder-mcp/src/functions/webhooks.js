/**
 * Webhook Azure Functions
 * HTTP endpoints for receiving webhooks from external systems
 */

const { app } = require('@azure/functions');
const { WebhookProcessor } = require('../webhooks/processor');
const { WebhookQueue, TaskTypes } = require('../webhooks/queue');

// Initialize processor and queue
const processor = new WebhookProcessor({
  keyVaultName: process.env.KEY_VAULT_NAME || '<KEY_VAULT_NAME>'
});

const queue = new WebhookQueue({
  maxRetries: 3,
  concurrency: 5
});

// Register queue handlers
queue.registerHandler(TaskTypes.SYNC_INVOICE_TO_QBO, async (payload, context) => {
  const { getPhoenixFinance } = require('../finance');
  const finance = getPhoenixFinance();
  await finance.initialize();
  return finance.syncServiceTitanInvoices({ invoiceId: payload.invoiceId });
});

queue.registerHandler(TaskTypes.SYNC_CUSTOMER_TO_QBO, async (payload, context) => {
  const { getPhoenixFinance } = require('../finance');
  const finance = getPhoenixFinance();
  await finance.initialize();
  return finance.createCustomerFromServiceTitan(payload.customerId);
});

queue.registerHandler(TaskTypes.SEND_TEAMS_NOTIFICATION, async (payload, context) => {
  const { TeamsNotifier } = require('../courier/teamsNotifier');
  const notifier = new TeamsNotifier();
  return notifier.sendMessage(payload);
});

// ==================== ServiceTitan Webhooks ====================

/**
 * ServiceTitan Job Events
 * POST /webhooks/servicetitan/job
 */
app.http('webhookServiceTitanJob', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/servicetitan/job',
  handler: async (request, context) => {
    try {
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);
      
      // Determine event type from payload
      const eventType = payload.eventType || 'unknown';
      
      const result = await processor.processWebhook('servicetitan', eventType, payload, headers);

      // Queue follow-up tasks based on event
      if (result.handled && result.result?.actions) {
        for (const action of result.result.actions) {
          await queue.enqueue({
            type: action.type,
            payload: { ...action, ...payload },
            webhookId: result.webhookId,
            priority: action.priority || 'normal'
          });
        }
      }

      return {
        status: result.success ? 200 : 400,
        jsonBody: result
      };
    } catch (error) {
      context.error('ServiceTitan job webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

/**
 * ServiceTitan Invoice Events
 * POST /webhooks/servicetitan/invoice
 */
app.http('webhookServiceTitanInvoice', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/servicetitan/invoice',
  handler: async (request, context) => {
    try {
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);
      
      const eventType = payload.eventType || 'created';
      
      const result = await processor.processWebhook('servicetitan', `invoice.${eventType}`, payload, headers);

      // Auto-queue invoice sync for created/paid events
      if (result.success && ['created', 'paid'].includes(eventType)) {
        await queue.enqueue({
          type: TaskTypes.SYNC_INVOICE_TO_QBO,
          payload: { invoiceId: payload.invoiceId },
          webhookId: result.webhookId,
          priority: eventType === 'paid' ? 'high' : 'normal'
        });
      }

      return {
        status: result.success ? 200 : 400,
        jsonBody: result
      };
    } catch (error) {
      context.error('ServiceTitan invoice webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

/**
 * ServiceTitan Customer Events
 * POST /webhooks/servicetitan/customer
 */
app.http('webhookServiceTitanCustomer', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/servicetitan/customer',
  handler: async (request, context) => {
    try {
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);
      
      const eventType = payload.eventType || 'created';
      
      const result = await processor.processWebhook('servicetitan', `customer.${eventType}`, payload, headers);

      // Queue customer sync for created events
      if (result.success && eventType === 'created') {
        await queue.enqueue({
          type: TaskTypes.SYNC_CUSTOMER_TO_QBO,
          payload: { customerId: payload.customerId },
          webhookId: result.webhookId
        });
      }

      return {
        status: result.success ? 200 : 400,
        jsonBody: result
      };
    } catch (error) {
      context.error('ServiceTitan customer webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

/**
 * ServiceTitan Lead Events
 * POST /webhooks/servicetitan/lead
 */
app.http('webhookServiceTitanLead', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/servicetitan/lead',
  handler: async (request, context) => {
    try {
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);
      
      const eventType = payload.eventType || 'created';
      
      const result = await processor.processWebhook('servicetitan', `lead.${eventType}`, payload, headers);

      return {
        status: result.success ? 200 : 400,
        jsonBody: result
      };
    } catch (error) {
      context.error('ServiceTitan lead webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

// ==================== QuickBooks Webhooks ====================

/**
 * QuickBooks Events
 * POST /webhooks/quickbooks
 */
app.http('webhookQuickBooks', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/quickbooks',
  handler: async (request, context) => {
    try {
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);
      
      // QuickBooks sends events in eventNotifications array
      const notifications = payload.eventNotifications || [];
      const results = [];

      for (const notification of notifications) {
        const realmId = notification.realmId;
        const dataChangeEvent = notification.dataChangeEvent;
        
        for (const entity of dataChangeEvent?.entities || []) {
          const eventType = `${entity.name.toLowerCase()}.${entity.operation.toLowerCase()}`;
          
          const result = await processor.processWebhook('quickbooks', eventType, {
            realmId,
            entity: entity.name,
            operation: entity.operation,
            entityId: entity.id,
            lastUpdated: entity.lastUpdated
          }, headers);

          results.push(result);
        }
      }

      return {
        status: 200,
        jsonBody: { processed: results.length, results }
      };
    } catch (error) {
      context.error('QuickBooks webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

// ==================== Plaid Webhooks ====================

/**
 * Plaid Events
 * POST /webhooks/plaid
 */
app.http('webhookPlaid', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/plaid',
  handler: async (request, context) => {
    try {
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);
      
      const webhookType = payload.webhook_type;
      const webhookCode = payload.webhook_code;
      
      // Map Plaid webhook codes to our event types
      let eventType;
      switch (webhookCode) {
        case 'SYNC_UPDATES_AVAILABLE':
        case 'INITIAL_UPDATE':
        case 'HISTORICAL_UPDATE':
          eventType = 'transactions.sync';
          break;
        case 'ITEM_LOGIN_REQUIRED':
        case 'PENDING_EXPIRATION':
          eventType = 'item.error';
          break;
        default:
          eventType = `${webhookType.toLowerCase()}.${webhookCode.toLowerCase()}`;
      }

      const result = await processor.processWebhook('plaid', eventType, {
        webhookType,
        webhookCode,
        itemId: payload.item_id,
        newTransactions: payload.new_transactions,
        error: payload.error
      }, headers);

      // Queue transaction categorization for sync events
      if (eventType === 'transactions.sync') {
        await queue.enqueue({
          type: TaskTypes.CATEGORIZE_TRANSACTION,
          payload: { itemId: payload.item_id },
          webhookId: result.webhookId
        });
      }

      return {
        status: 200,
        jsonBody: result
      };
    } catch (error) {
      context.error('Plaid webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

// ==================== Generic Webhook ====================

/**
 * Generic Webhook Handler
 * POST /webhooks/{source}/{eventType}
 */
app.http('webhookGeneric', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/{source}/{eventType}',
  handler: async (request, context) => {
    try {
      const { source, eventType } = request.params;
      const payload = await request.json();
      const headers = Object.fromEntries(request.headers);

      const result = await processor.processWebhook(source, eventType, payload, headers);

      return {
        status: result.success ? 200 : 400,
        jsonBody: result
      };
    } catch (error) {
      context.error('Generic webhook error:', error);
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});

// ==================== Queue Management ====================

/**
 * Get queue status
 * GET /webhooks/queue/status
 */
app.http('webhookQueueStatus', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'webhooks/queue/status',
  handler: async (request, context) => {
    const status = queue.getStatus();
    return {
      status: 200,
      jsonBody: status
    };
  }
});

/**
 * Get dead letter queue
 * GET /webhooks/queue/dead-letter
 */
app.http('webhookQueueDeadLetter', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'webhooks/queue/dead-letter',
  handler: async (request, context) => {
    const limit = parseInt(request.query.get('limit') || '100');
    const deadLetter = queue.getDeadLetter(limit);
    return {
      status: 200,
      jsonBody: { count: deadLetter.length, tasks: deadLetter }
    };
  }
});

/**
 * Retry dead letter task
 * POST /webhooks/queue/retry/{taskId}
 */
app.http('webhookQueueRetry', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhooks/queue/retry/{taskId}',
  handler: async (request, context) => {
    try {
      const { taskId } = request.params;
      const result = await queue.retryDeadLetter(taskId);
      return {
        status: 200,
        jsonBody: result
      };
    } catch (error) {
      return {
        status: 404,
        jsonBody: { error: error.message }
      };
    }
  }
});
