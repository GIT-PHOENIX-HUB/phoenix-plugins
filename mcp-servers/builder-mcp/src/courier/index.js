/**
 * Phoenix Mail Courier - Main Entry Point
 * 
 * Exports all Courier components and provides a unified interface
 * for running email triage operations.
 */

const { EmailTriageProcessor, createEmailTriageProcessor } = require('./emailTriageProcessor');
const { DraftGenerator, createDraftGenerator } = require('./draftGenerator');
const { AttachmentHandler, createAttachmentHandler } = require('./attachmentHandler');
const { CourierLogger, createCourierLogger } = require('./logger');
const { TeamsNotifier, createTeamsNotifier } = require('./teamsNotifier');
const { 
    courierConfig, 
    getEnabledMailboxes, 
    isSpamSender, 
    shouldFlagEmail,
    getAttachmentPath,
    getLogFilePath 
} = require('./config');

/**
 * Main Courier class - orchestrates the entire email triage process
 */
class PhoenixMailCourier {
    constructor() {
        this.processor = createEmailTriageProcessor();
        this.draftGenerator = createDraftGenerator();
        this.attachmentHandler = createAttachmentHandler();
        this.logger = createCourierLogger();
        this.notifier = createTeamsNotifier();
        this.isRunning = false;
        this.lastRunResult = null;
    }

    /**
     * Run a full email triage across all mailboxes
     * Used by: POST /api/courier/triage
     */
    async runFullTriage(options = {}) {
        if (this.isRunning) {
            console.warn('Triage already in progress, skipping...');
            return { 
                success: false, 
                skipped: true, 
                reason: 'Already running' 
            };
        }

        this.isRunning = true;
        let summary = null;

        try {
            console.log('═'.repeat(60));
            console.log('PHOENIX MAIL COURIER - Starting Triage Run');
            console.log('═'.repeat(60));

            // Run the triage
            summary = await this.processor.processAllMailboxes(options);
            this.lastRunResult = {
                timestamp: new Date().toISOString(),
                summary
            };

            // Log to SharePoint
            await this.logger.logTriageRun(summary);

            // Send Teams notification
            if (courierConfig.notifications.teamsEnabled) {
                await this.notifier.sendRunSummary(summary);
            }

            console.log('═'.repeat(60));
            console.log('PHOENIX MAIL COURIER - Triage Complete');
            console.log('═'.repeat(60));

            return {
                success: true,
                summary
            };
        } catch (error) {
            console.error('Triage run failed:', error);
            
            // Log error
            await this.logger.logError('triage_run_failed', error);

            // Try to send error notification
            try {
                await this.notifier.sendErrorAlert(error, { phase: 'triage' });
            } catch (e) {
                // Ignore notification errors
            }

            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
            this.processor.resetStats();
        }
    }

    /**
     * Run triage for a single mailbox
     * Used by: POST /api/courier/triage/:mailbox
     */
    async triageSingleMailbox(mailboxId) {
        const mailbox = courierConfig.mailboxes.find(m => m.id === mailboxId);
        
        if (!mailbox) {
            return {
                success: false,
                error: `Mailbox not found: ${mailboxId}`
            };
        }

        if (!mailbox.enabled) {
            return {
                success: false,
                error: `Mailbox is disabled: ${mailboxId}`
            };
        }

        try {
            // Create a processor for single mailbox
            const processor = createEmailTriageProcessor();
            
            // Process just this mailbox
            const result = await processor.processMailbox(mailbox);
            
            return {
                success: true,
                mailbox: mailboxId,
                ...result
            };
        } catch (error) {
            console.error(`Mailbox triage failed for ${mailboxId}:`, error);
            return {
                success: false,
                mailbox: mailboxId,
                error: error.message
            };
        }
    }

    /**
     * Generate an AI draft reply for a specific email
     * Used by: POST /api/courier/draft/:emailId
     */
    async generateDraftReply(emailId, mailbox, context = {}) {
        try {
            const mailboxConfig = courierConfig.mailboxes.find(m => m.id === mailbox);
            
            if (!mailboxConfig) {
                return {
                    success: false,
                    error: `Mailbox not found: ${mailbox}`
                };
            }

            // Fetch the email first
            const { getGraphClient } = require('../integrations/graph');
            const graphClient = getGraphClient();
            const client = await graphClient.getClient();
            
            const email = await client
                .api(`/users/${mailboxConfig.email}/messages/${emailId}`)
                .select('id,subject,from,receivedDateTime,bodyPreview,body,hasAttachments,importance,conversationId')
                .get();

            // Generate and save draft
            const result = await this.draftGenerator.generateAndSaveDraft(
                mailboxConfig.email,
                email
            );

            return {
                success: true,
                ...result
            };
        } catch (error) {
            console.error('Draft generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process attachments for a specific email
     * Used by: POST /api/courier/attachments/:emailId
     */
    async processEmailAttachments(emailId, mailbox, targetFolder = null) {
        try {
            const mailboxConfig = courierConfig.mailboxes.find(m => m.id === mailbox);
            
            if (!mailboxConfig) {
                return {
                    success: false,
                    error: `Mailbox not found: ${mailbox}`
                };
            }

            // Fetch email metadata to get sender
            const { getGraphClient } = require('../integrations/graph');
            const graphClient = getGraphClient();
            const client = await graphClient.getClient();
            
            const email = await client
                .api(`/users/${mailboxConfig.email}/messages/${emailId}`)
                .select('id,from,hasAttachments')
                .get();
                
            if (!email.hasAttachments) {
                return {
                    success: true,
                    message: 'Email has no attachments',
                    attachments: []
                };
            }

            const senderEmail = email.from?.emailAddress?.address || 'unknown';
            
            // Save attachments
            const result = await this.attachmentHandler.saveEmailAttachments(
                mailboxConfig.email,
                emailId,
                mailboxConfig.id,
                senderEmail
            );

            return {
                success: true,
                attachments: result
            };
        } catch (error) {
            console.error('Attachment processing failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get triage status and statistics
     * Used by: GET /api/courier/status
     */
    async getTriageStatus() {
        const enabledMailboxes = getEnabledMailboxes();
        
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRunResult,
            config: {
                mailboxes: enabledMailboxes.map(m => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    isShared: m.isShared || false
                })),
                schedule: courierConfig.schedule,
                draftGeneration: {
                    enabled: courierConfig.draftGeneration.enabled,
                    model: courierConfig.draftGeneration.model
                },
                notifications: {
                    teamsEnabled: courierConfig.notifications.teamsEnabled
                }
            },
            goldenRules: courierConfig.goldenRules
        };
    }

    /**
     * Get recent triage logs
     * Used by: GET /api/courier/logs
     */
    async getRecentLogs(limit = 50, mailbox = null) {
        try {
            const logs = await this.logger.getRecentLogs(limit, mailbox);
            return {
                success: true,
                logs
            };
        } catch (error) {
            console.error('Failed to get logs:', error);
            return {
                success: false,
                error: error.message,
                logs: []
            };
        }
    }

    /**
     * Quick check for urgent emails only
     * Used by: urgentEmailCheck timer
     */
    async checkUrgentEmails() {
        try {
            const processor = createEmailTriageProcessor();
            const urgentEmails = await processor.scanForUrgent();
            
            if (urgentEmails.length > 0) {
                await this.notifier.sendUrgentAlert(urgentEmails);
            }

            return {
                success: true,
                urgentCount: urgentEmails.length,
                emails: urgentEmails
            };
        } catch (error) {
            console.error('Urgent email check failed:', error);
            return {
                success: false,
                urgentCount: 0,
                error: error.message
            };
        }
    }

    /**
     * Generate daily summary
     * Used by: endOfDayTriageSummary timer
     */
    async generateDailySummary() {
        try {
            const summary = await this.logger.generateDailySummary();
            return {
                success: true,
                ...summary
            };
        } catch (error) {
            console.error('Daily summary generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send triage summary notification
     */
    async sendTriageSummaryNotification(summary) {
        try {
            await this.notifier.sendRunSummary(summary);
        } catch (error) {
            console.error('Failed to send triage summary:', error);
        }
    }

    /**
     * Send daily summary notification
     */
    async sendDailySummaryNotification(summary) {
        try {
            await this.notifier.sendDailySummary(summary);
        } catch (error) {
            console.error('Failed to send daily summary:', error);
        }
    }

    /**
     * Send error notification
     */
    async sendErrorNotification(title, error) {
        try {
            await this.notifier.sendErrorAlert(error, { title });
        } catch (e) {
            console.error('Failed to send error notification:', e);
        }
    }

    /**
     * Test connection to all required services
     */
    async testConnections() {
        const results = {
            graph: false,
            openai: false,
            sharepoint: false,
            teams: false
        };

        // Test Graph API
        try {
            const { getGraphClient } = require('../integrations/graph');
            const client = getGraphClient();
            await client.getClient();
            results.graph = true;
        } catch (e) {
            console.error('Graph connection failed:', e.message);
        }

        // Test OpenAI
        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            await openai.models.list();
            results.openai = true;
        } catch (e) {
            console.error('OpenAI connection failed:', e.message);
        }

        // Test SharePoint (via Graph)
        try {
            const { getGraphClient } = require('../integrations/graph');
            const client = getGraphClient();
            const graphClient = await client.getClient();
            // Try to access a basic endpoint
            const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
            await graphClient.api(`/users/${userEmail}/drive/root`).get();
            results.sharepoint = true;
        } catch (e) {
            console.error('SharePoint connection failed:', e.message);
        }

        // Test Teams webhook
        try {
            if (courierConfig.notifications.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL) {
                // Just verify the URL is configured, don't actually send
                results.teams = true;
            }
        } catch (e) {
            console.error('Teams configuration failed:', e.message);
        }

        return results;
    }

    /**
     * Check if it's time to run based on schedule
     */
    shouldRunNow() {
        const now = new Date();
        const day = now.getDay();
        const isWeekend = day === 0 || day === 6;
        
        const schedule = isWeekend 
            ? courierConfig.schedule.weekend 
            : courierConfig.schedule.weekday;

        const currentTime = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            timeZone: schedule.timezone
        });

        return schedule.times.some(time => {
            // Allow 5 minute window
            const [schedHour, schedMin] = time.split(':').map(Number);
            const [currHour, currMin] = currentTime.split(':').map(Number);
            
            const schedMins = schedHour * 60 + schedMin;
            const currMins = currHour * 60 + currMin;
            
            return Math.abs(schedMins - currMins) <= 5;
        });
    }
}

// Singleton instance
let courierInstance = null;

function getPhoenixMailCourier() {
    if (!courierInstance) {
        courierInstance = new PhoenixMailCourier();
    }
    return courierInstance;
}

module.exports = {
    // Main class
    PhoenixMailCourier,
    getPhoenixMailCourier,
    
    // Individual components
    EmailTriageProcessor,
    createEmailTriageProcessor,
    DraftGenerator,
    createDraftGenerator,
    AttachmentHandler,
    createAttachmentHandler,
    CourierLogger,
    createCourierLogger,
    TeamsNotifier,
    createTeamsNotifier,
    
    // Configuration utilities
    courierConfig,
    getEnabledMailboxes,
    isSpamSender,
    shouldFlagEmail,
    getAttachmentPath,
    getLogFilePath
};
