/**
 * ServiceTitan Webhook Handler
 * Processes incoming webhooks from ServiceTitan and triggers appropriate actions
 */

const { getGraphClient } = require('../integrations/graph');
const { getServiceTitanClient } = require('../integrations/servicetitan');
const { getLogger } = require('../utils/logger');

class WebhookHandler {
    constructor() {
        this.graphClient = getGraphClient();
        this.stClient = getServiceTitanClient();
        this.logger = getLogger();
        
        // Event handlers mapped by event type
        this.eventHandlers = {
            'job.created': this.handleJobCreated.bind(this),
            'job.completed': this.handleJobCompleted.bind(this),
            'job.canceled': this.handleJobCanceled.bind(this),
            'invoice.created': this.handleInvoiceCreated.bind(this),
            'invoice.paid': this.handleInvoicePaid.bind(this),
            'estimate.approved': this.handleEstimateApproved.bind(this),
            'appointment.scheduled': this.handleAppointmentScheduled.bind(this),
            'timesheet.created': this.handleTimesheetCreated.bind(this)
        };
    }

    /**
     * Verify webhook signature (if ServiceTitan provides one)
     */
    verifySignature(payload, signature, secret) {
        // ServiceTitan may use HMAC signature verification
        // Implement according to their documentation
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        return signature === expectedSignature;
    }

    /**
     * Process incoming webhook
     */
    async processWebhook(eventType, payload, headers = {}) {
        const startTime = Date.now();
        
        try {
            // Log the incoming webhook
            await this.logger.log('webhook_received', {
                eventType,
                payloadId: payload.id || payload.entityId,
                timestamp: new Date().toISOString()
            });

            // Find and execute the appropriate handler
            const handler = this.eventHandlers[eventType];
            
            if (!handler) {
                console.warn(`No handler for event type: ${eventType}`);
                return { handled: false, message: `Unknown event type: ${eventType}` };
            }

            const result = await handler(payload);

            // Log successful processing
            await this.logger.log('webhook_processed', {
                eventType,
                payloadId: payload.id || payload.entityId,
                duration: Date.now() - startTime,
                success: true
            });

            return { handled: true, result };

        } catch (error) {
            console.error(`Webhook processing error (${eventType}):`, error);
            
            // Log the error
            await this.logger.log('webhook_error', {
                eventType,
                payloadId: payload.id || payload.entityId,
                error: error.message,
                duration: Date.now() - startTime
            });

            throw error;
        }
    }

    // ==================== JOB HANDLERS ====================

    /**
     * Handle new job created
     */
    async handleJobCreated(payload) {
        const jobId = payload.id || payload.jobId;
        
        // Fetch full job details
        let jobDetails;
        try {
            jobDetails = await this.stClient.getJobDetails(jobId);
        } catch (e) {
            jobDetails = payload; // Use payload if fetch fails
        }

        // Post notification to Teams
        await this.graphClient.notifyNewJob({
            id: jobId,
            number: jobDetails.number || jobDetails.jobNumber,
            customerName: jobDetails.customer?.name || payload.customerName,
            type: jobDetails.type || jobDetails.jobType,
            scheduledDate: jobDetails.scheduledOn || payload.scheduledDate,
            technicianName: jobDetails.technician?.name || payload.technicianName,
            serviceTitanUrl: `https://go.servicetitan.com/Job/Index/${jobId}`
        });

        return { notified: true, jobId };
    }

    /**
     * Handle job completed
     */
    async handleJobCompleted(payload) {
        const jobId = payload.id || payload.jobId;
        
        // Fetch job details for the notification
        let jobDetails;
        try {
            jobDetails = await this.stClient.getJobDetails(jobId);
        } catch (e) {
            jobDetails = payload;
        }

        // Calculate job value if available
        const jobTotal = jobDetails.total || jobDetails.invoiceTotal || 'N/A';

        // Post completion notification to Teams
        await this.graphClient.postToTeams(
            `✅ **Job Completed**\n\n` +
            `**Job #:** ${jobDetails.number || jobId}\n` +
            `**Customer:** ${jobDetails.customer?.name || payload.customerName || 'N/A'}\n` +
            `**Technician:** ${jobDetails.technician?.name || payload.technicianName || 'N/A'}\n` +
            `**Total:** $${jobTotal}\n\n` +
            `[View in ServiceTitan](https://go.servicetitan.com/Job/Index/${jobId})`,
            'Job Completed'
        );

        return { notified: true, jobId };
    }

    /**
     * Handle job canceled
     */
    async handleJobCanceled(payload) {
        const jobId = payload.id || payload.jobId;

        await this.graphClient.postToTeams(
            `❌ **Job Canceled**\n\n` +
            `**Job #:** ${payload.jobNumber || jobId}\n` +
            `**Customer:** ${payload.customerName || 'N/A'}\n` +
            `**Reason:** ${payload.cancelReason || 'Not specified'}`,
            'Job Canceled'
        );

        return { notified: true, jobId };
    }

    // ==================== INVOICE HANDLERS ====================

    /**
     * Handle invoice created
     */
    async handleInvoiceCreated(payload) {
        const invoiceId = payload.id || payload.invoiceId;
        
        await this.graphClient.postToTeams(
            `📄 **New Invoice Created**\n\n` +
            `**Invoice #:** ${payload.invoiceNumber || invoiceId}\n` +
            `**Customer:** ${payload.customerName || 'N/A'}\n` +
            `**Amount:** $${payload.total || payload.amount || '0.00'}\n` +
            `**Job #:** ${payload.jobNumber || 'N/A'}`,
            'Invoice Created'
        );

        return { notified: true, invoiceId };
    }

    /**
     * Handle invoice paid
     */
    async handleInvoicePaid(payload) {
        const invoiceId = payload.id || payload.invoiceId;

        await this.graphClient.postToTeams(
            `💵 **Invoice Paid**\n\n` +
            `**Invoice #:** ${payload.invoiceNumber || invoiceId}\n` +
            `**Customer:** ${payload.customerName || 'N/A'}\n` +
            `**Amount:** $${payload.amount || payload.total || '0.00'}\n` +
            `**Payment Method:** ${payload.paymentMethod || 'N/A'}`,
            'Payment Received'
        );

        return { notified: true, invoiceId };
    }

    // ==================== ESTIMATE HANDLERS ====================

    /**
     * Handle estimate approved
     */
    async handleEstimateApproved(payload) {
        const estimateId = payload.id || payload.estimateId;

        await this.graphClient.postToTeams(
            `🎉 **Estimate Approved!**\n\n` +
            `**Estimate #:** ${payload.estimateNumber || estimateId}\n` +
            `**Customer:** ${payload.customerName || 'N/A'}\n` +
            `**Amount:** $${payload.total || '0.00'}\n\n` +
            `Time to schedule the work!`,
            'Estimate Approved'
        );

        // Optionally create a task to follow up
        await this.graphClient.createTask(
            `Follow up on approved estimate #${payload.estimateNumber || estimateId}`,
            null,
            `Customer: ${payload.customerName || 'N/A'}\nAmount: $${payload.total || '0.00'}`
        );

        return { notified: true, taskCreated: true, estimateId };
    }

    // ==================== SCHEDULE HANDLERS ====================

    /**
     * Handle appointment scheduled
     */
    async handleAppointmentScheduled(payload) {
        const appointmentId = payload.id || payload.appointmentId;

        await this.graphClient.postToTeams(
            `📅 **Appointment Scheduled**\n\n` +
            `**Customer:** ${payload.customerName || 'N/A'}\n` +
            `**Date:** ${payload.scheduledDate || payload.start || 'N/A'}\n` +
            `**Technician:** ${payload.technicianName || 'TBD'}\n` +
            `**Type:** ${payload.appointmentType || payload.jobType || 'N/A'}`,
            'Appointment Scheduled'
        );

        return { notified: true, appointmentId };
    }

    // ==================== TIMESHEET HANDLERS ====================

    /**
     * Handle timesheet entry created
     */
    async handleTimesheetCreated(payload) {
        // This might be too noisy for Teams, log it instead
        await this.logger.log('timesheet_entry', {
            technicianId: payload.technicianId,
            technicianName: payload.technicianName,
            type: payload.type, // clock-in, clock-out, etc.
            timestamp: payload.timestamp || new Date().toISOString()
        });

        return { logged: true };
    }
}

// Create singleton instance
let instance = null;

function getWebhookHandler() {
    if (!instance) {
        instance = new WebhookHandler();
    }
    return instance;
}

module.exports = { WebhookHandler, getWebhookHandler };
