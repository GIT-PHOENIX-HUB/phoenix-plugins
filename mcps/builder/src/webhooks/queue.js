/**
 * Webhook Queue Manager
 * Handles queuing and processing of webhook-triggered tasks
 */

const crypto = require('crypto');

class WebhookQueue {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelays: config.retryDelays || [1000, 5000, 30000], // 1s, 5s, 30s
      concurrency: config.concurrency || 5,
      ...config
    };
    
    // In-memory queue (production would use Azure Service Bus)
    this.queue = [];
    this.processing = new Set();
    this.deadLetter = [];
    this.handlers = new Map();
    this.isProcessing = false;
  }

  /**
   * Register a task handler
   */
  registerHandler(taskType, handler) {
    this.handlers.set(taskType, handler);
  }

  /**
   * Add task to queue
   */
  async enqueue(task) {
    const queuedTask = {
      id: task.id || crypto.randomUUID(),
      type: task.type,
      payload: task.payload,
      priority: task.priority || 'normal', // high, normal, low
      webhookId: task.webhookId,
      createdAt: new Date().toISOString(),
      retries: 0,
      status: 'queued'
    };

    // Insert based on priority
    if (queuedTask.priority === 'high') {
      this.queue.unshift(queuedTask);
    } else {
      this.queue.push(queuedTask);
    }

    // Start processing if not already
    this.startProcessing();

    return {
      taskId: queuedTask.id,
      position: this.queue.indexOf(queuedTask) + 1,
      status: 'queued'
    };
  }

  /**
   * Enqueue multiple tasks
   */
  async enqueueBatch(tasks) {
    const results = [];
    for (const task of tasks) {
      const result = await this.enqueue(task);
      results.push(result);
    }
    return results;
  }

  /**
   * Start queue processing
   */
  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processLoop();
  }

  /**
   * Process queue loop
   */
  async processLoop() {
    while (this.queue.length > 0 || this.processing.size > 0) {
      // Process up to concurrency limit
      while (this.queue.length > 0 && this.processing.size < this.config.concurrency) {
        const task = this.queue.shift();
        if (task) {
          this.processing.add(task.id);
          this.processTask(task).finally(() => {
            this.processing.delete(task.id);
          });
        }
      }

      // Wait a bit before checking again
      await this.sleep(100);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single task
   */
  async processTask(task) {
    const handler = this.handlers.get(task.type);
    
    if (!handler) {
      console.warn(`No handler for task type: ${task.type}`);
      await this.moveToDeadLetter(task, 'No handler registered');
      return;
    }

    try {
      task.status = 'processing';
      task.startedAt = new Date().toISOString();

      const result = await handler(task.payload, {
        taskId: task.id,
        webhookId: task.webhookId,
        retryCount: task.retries
      });

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;

      return result;
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error.message);

      task.retries++;
      task.lastError = error.message;

      if (task.retries < this.config.maxRetries) {
        // Re-queue with delay
        const delay = this.config.retryDelays[task.retries - 1] || 30000;
        setTimeout(() => {
          task.status = 'queued';
          this.queue.push(task);
          this.startProcessing();
        }, delay);
      } else {
        // Max retries reached - move to dead letter queue
        await this.moveToDeadLetter(task, error.message);
      }
    }
  }

  /**
   * Move failed task to dead letter queue
   */
  async moveToDeadLetter(task, reason) {
    task.status = 'dead_letter';
    task.deadLetterReason = reason;
    task.deadLetteredAt = new Date().toISOString();
    
    this.deadLetter.push(task);

    // In production, would send alert
    console.error(`Task ${task.id} moved to dead letter queue: ${reason}`);
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      deadLetter: this.deadLetter.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetter(limit = 100) {
    return this.deadLetter.slice(0, limit);
  }

  /**
   * Retry dead letter task
   */
  async retryDeadLetter(taskId) {
    const index = this.deadLetter.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found in dead letter queue`);
    }

    const task = this.deadLetter.splice(index, 1)[0];
    task.retries = 0;
    task.status = 'queued';
    delete task.deadLetterReason;
    delete task.deadLetteredAt;

    return this.enqueue(task);
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetter() {
    const count = this.deadLetter.length;
    this.deadLetter = [];
    return { cleared: count };
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Common task types for webhook processing
 */
const TaskTypes = {
  // ServiceTitan sync tasks
  SYNC_INVOICE_TO_QBO: 'sync_invoice_to_qbo',
  SYNC_CUSTOMER_TO_QBO: 'sync_customer_to_qbo',
  SYNC_PAYMENT_TO_ST: 'sync_payment_to_st',
  
  // Notification tasks
  SEND_CUSTOMER_EMAIL: 'send_customer_email',
  SEND_TEAMS_NOTIFICATION: 'send_teams_notification',
  SEND_SMS: 'send_sms',
  
  // Calendar tasks
  CREATE_CALENDAR_EVENT: 'create_calendar_event',
  UPDATE_CALENDAR_EVENT: 'update_calendar_event',
  DELETE_CALENDAR_EVENT: 'delete_calendar_event',
  
  // Document tasks
  SAVE_TO_SHAREPOINT: 'save_to_sharepoint',
  GENERATE_REPORT: 'generate_report',
  
  // Finance tasks
  CATEGORIZE_TRANSACTION: 'categorize_transaction',
  MATCH_BANK_TRANSACTION: 'match_bank_transaction',
  CREATE_AP_TASK: 'create_ap_task'
};

module.exports = { WebhookQueue, TaskTypes };
