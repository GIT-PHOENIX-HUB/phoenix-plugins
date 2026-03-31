/**
 * Phoenix Mail Courier - Email Triage Processor
 * 
 * Core engine for processing emails across multiple mailboxes.
 * Handles reading, filtering, and orchestrating the triage workflow.
 */

const { getGraphClient } = require('../integrations/graph');
const { courierConfig, getEnabledMailboxes, isSpamSender, shouldFlagEmail, getAttachmentPath } = require('./config');
const { CourierLogger } = require('./logger');
const { DraftGenerator } = require('./draftGenerator');
const { AttachmentHandler } = require('./attachmentHandler');

class EmailTriageProcessor {
    constructor() {
        this.graphClient = getGraphClient();
        this.logger = new CourierLogger();
        this.draftGenerator = new DraftGenerator();
        this.attachmentHandler = new AttachmentHandler();
        
        // Processing statistics for this run
        this.stats = {
            startTime: null,
            endTime: null,
            mailboxesProcessed: 0,
            totalEmailsProcessed: 0,
            draftsCreated: 0,
            attachmentsSaved: 0,
            emailsFlagged: 0,
            spamFiltered: 0,
            errors: []
        };
    }

    /**
     * Main entry point - process all enabled mailboxes
     */
    async processAllMailboxes(options = {}) {
        this.stats.startTime = new Date();
        const runId = `run_${Date.now()}`;
        
        await this.logger.startRun(runId);
        await this.logger.log('info', `Starting email triage run: ${runId}`);

        const mailboxes = getEnabledMailboxes();
        await this.logger.log('info', `Processing ${mailboxes.length} mailboxes`);

        for (const mailbox of mailboxes) {
            try {
                await this.processMailbox(mailbox, runId);
                this.stats.mailboxesProcessed++;
                
                // Delay between mailboxes to avoid throttling
                if (courierConfig.limits.mailboxDelayMs > 0) {
                    await this.delay(courierConfig.limits.mailboxDelayMs);
                }
            } catch (error) {
                const errorMsg = `Failed to process mailbox ${mailbox.id}: ${error.message}`;
                await this.logger.log('error', errorMsg);
                this.stats.errors.push({ mailbox: mailbox.id, error: error.message });
            }
        }

        this.stats.endTime = new Date();
        
        // Generate and return summary
        const summary = await this.generateRunSummary(runId);
        await this.logger.endRun(runId, summary);
        
        return summary;
    }

    /**
     * Process a single mailbox
     */
    async processMailbox(mailbox, runId) {
        await this.logger.log('info', `Processing mailbox: ${mailbox.name} (${mailbox.email})`);
        
        try {
            // Get unread emails
            const emails = await this.getUnreadEmails(mailbox.email);
            await this.logger.log('info', `Found ${emails.length} unread emails in ${mailbox.name}'s inbox`);

            if (emails.length === 0) {
                return;
            }

            // Process each email
            let processed = 0;
            for (const email of emails) {
                if (processed >= courierConfig.limits.maxEmailsPerRun) {
                    await this.logger.log('warn', `Reached max emails limit (${courierConfig.limits.maxEmailsPerRun}) for ${mailbox.name}`);
                    break;
                }

                await this.processEmail(mailbox, email, runId);
                processed++;
                this.stats.totalEmailsProcessed++;

                // Delay between emails
                if (courierConfig.limits.processingDelayMs > 0) {
                    await this.delay(courierConfig.limits.processingDelayMs);
                }
            }
        } catch (error) {
            throw new Error(`Mailbox processing error: ${error.message}`);
        }
    }

    /**
     * Get unread emails from a mailbox
     */
    async getUnreadEmails(mailboxEmail) {
        const client = await this.graphClient.getClient();
        
        try {
            const messages = await client
                .api(`/users/${mailboxEmail}/messages`)
                .filter('isRead eq false')
                .top(courierConfig.limits.maxEmailsPerRun)
                .select('id,subject,from,receivedDateTime,bodyPreview,body,hasAttachments,importance,flag')
                .orderby('receivedDateTime desc')
                .get();

            return messages.value || [];
        } catch (error) {
            throw new Error(`Failed to fetch emails for ${mailboxEmail}: ${error.message}`);
        }
    }

    /**
     * Process a single email
     */
    async processEmail(mailbox, email, runId) {
        const senderEmail = email.from?.emailAddress?.address || 'unknown';
        const senderName = email.from?.emailAddress?.name || senderEmail;
        const subject = email.subject || '(No Subject)';

        await this.logger.log('info', `Processing email from ${senderName}: "${subject}"`);

        // Step 1: Check spam filter
        if (isSpamSender(senderEmail, subject)) {
            await this.logger.log('info', `Filtered as spam/newsletter: ${senderEmail}`);
            await this.markAsRead(mailbox.email, email.id);
            this.stats.spamFiltered++;
            return;
        }

        // Step 2: Save attachments if present
        if (email.hasAttachments) {
            try {
                const savedAttachments = await this.attachmentHandler.saveEmailAttachments(
                    mailbox.email,
                    email.id,
                    mailbox.id,
                    senderEmail
                );
                this.stats.attachmentsSaved += savedAttachments.length;
                
                for (const att of savedAttachments) {
                    await this.logger.log('info', `Saved attachment: ${att.name} to ${att.path}`);
                }
            } catch (error) {
                await this.logger.log('error', `Failed to save attachments: ${error.message}`);
            }
        }

        // Step 3: Generate draft reply
        if (courierConfig.draftGeneration.enabled) {
            try {
                const draftResult = await this.draftGenerator.generateAndSaveDraft(
                    mailbox.email,
                    email
                );
                
                if (draftResult.success) {
                    this.stats.draftsCreated++;
                    await this.logger.log('info', `Draft reply created for: "${subject}"`);
                }
            } catch (error) {
                await this.logger.log('error', `Failed to create draft: ${error.message}`);
            }
        }

        // Step 4: Flag if needed
        const flagResult = shouldFlagEmail(subject, email.bodyPreview || '');
        if (flagResult.flag) {
            try {
                await this.flagEmail(mailbox.email, email.id, flagResult.reason);
                this.stats.emailsFlagged++;
                await this.logger.log('info', `Flagged email for: ${flagResult.reason}`);
            } catch (error) {
                await this.logger.log('error', `Failed to flag email: ${error.message}`);
            }
        }

        // Step 5: Mark as read (email has been triaged)
        await this.markAsRead(mailbox.email, email.id);
    }

    /**
     * Mark an email as read
     */
    async markAsRead(mailboxEmail, messageId) {
        const client = await this.graphClient.getClient();
        
        try {
            await client
                .api(`/users/${mailboxEmail}/messages/${messageId}`)
                .patch({ isRead: true });
        } catch (error) {
            await this.logger.log('error', `Failed to mark email as read: ${error.message}`);
        }
    }

    /**
     * Flag an email for follow-up
     */
    async flagEmail(mailboxEmail, messageId, reason) {
        const client = await this.graphClient.getClient();
        
        try {
            await client
                .api(`/users/${mailboxEmail}/messages/${messageId}`)
                .patch({
                    flag: {
                        flagStatus: 'flagged'
                    },
                    // Add category based on reason
                    categories: [reason === 'urgent' ? 'Urgent' : 'Follow-up']
                });
        } catch (error) {
            throw new Error(`Flag failed: ${error.message}`);
        }
    }

    /**
     * Move email to Junk folder (for spam that passed initial filters)
     */
    async moveToJunk(mailboxEmail, messageId) {
        const client = await this.graphClient.getClient();
        
        try {
            // Get Junk folder ID
            const folders = await client
                .api(`/users/${mailboxEmail}/mailFolders`)
                .filter("displayName eq 'Junk Email'")
                .get();

            if (folders.value && folders.value.length > 0) {
                await client
                    .api(`/users/${mailboxEmail}/messages/${messageId}/move`)
                    .post({ destinationId: folders.value[0].id });
            }
        } catch (error) {
            await this.logger.log('error', `Failed to move to junk: ${error.message}`);
        }
    }

    /**
     * Generate run summary
     */
    async generateRunSummary(runId) {
        const duration = this.stats.endTime - this.stats.startTime;
        const durationSeconds = Math.round(duration / 1000);

        return {
            runId,
            timestamp: this.stats.startTime.toISOString(),
            duration: `${durationSeconds} seconds`,
            mailboxesProcessed: this.stats.mailboxesProcessed,
            totalEmailsProcessed: this.stats.totalEmailsProcessed,
            draftsCreated: this.stats.draftsCreated,
            attachmentsSaved: this.stats.attachmentsSaved,
            emailsFlagged: this.stats.emailsFlagged,
            spamFiltered: this.stats.spamFiltered,
            errors: this.stats.errors,
            success: this.stats.errors.length === 0
        };
    }

    /**
     * Utility: delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Reset statistics for a new run
     */
    resetStats() {
        this.stats = {
            startTime: null,
            endTime: null,
            mailboxesProcessed: 0,
            totalEmailsProcessed: 0,
            draftsCreated: 0,
            attachmentsSaved: 0,
            emailsFlagged: 0,
            spamFiltered: 0,
            errors: []
        };
    }

    /**
     * Scan for urgent emails across all mailboxes (quick check)
     */
    async scanForUrgent() {
        const urgentEmails = [];
        const mailboxes = getEnabledMailboxes();
        const client = await this.graphClient.getClient();

        for (const mailbox of mailboxes) {
            try {
                // Look for high importance unread emails
                const messages = await client
                    .api(`/users/${mailbox.email}/messages`)
                    .filter("isRead eq false and importance eq 'high'")
                    .top(10)
                    .select('id,subject,from,receivedDateTime,bodyPreview,importance')
                    .get();

                if (messages.value && messages.value.length > 0) {
                    for (const msg of messages.value) {
                        urgentEmails.push({
                            mailbox: mailbox.id,
                            mailboxEmail: mailbox.email,
                            id: msg.id,
                            subject: msg.subject,
                            from: msg.from?.emailAddress?.address,
                            receivedAt: msg.receivedDateTime,
                            preview: msg.bodyPreview?.substring(0, 200)
                        });
                    }
                }

                // Also check for urgent keywords in subject
                const urgentKeywords = courierConfig.flagging?.urgentKeywords || 
                    ['urgent', 'emergency', 'asap', 'critical', 'immediately'];
                
                for (const keyword of urgentKeywords) {
                    const keywordMessages = await client
                        .api(`/users/${mailbox.email}/messages`)
                        .filter(`isRead eq false and contains(subject, '${keyword}')`)
                        .top(5)
                        .select('id,subject,from,receivedDateTime,bodyPreview')
                        .get();

                    if (keywordMessages.value) {
                        for (const msg of keywordMessages.value) {
                            // Avoid duplicates
                            if (!urgentEmails.find(e => e.id === msg.id)) {
                                urgentEmails.push({
                                    mailbox: mailbox.id,
                                    mailboxEmail: mailbox.email,
                                    id: msg.id,
                                    subject: msg.subject,
                                    from: msg.from?.emailAddress?.address,
                                    receivedAt: msg.receivedDateTime,
                                    preview: msg.bodyPreview?.substring(0, 200),
                                    matchedKeyword: keyword
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning ${mailbox.id} for urgent emails:`, error.message);
            }
        }

        return urgentEmails;
    }
}

// Factory function
function createEmailTriageProcessor() {
    return new EmailTriageProcessor();
}

module.exports = { EmailTriageProcessor, createEmailTriageProcessor };
