/**
 * Phoenix Mail Courier - Teams Notifier
 * 
 * Sends notifications to Teams after triage runs.
 * Provides visibility into what the Courier has processed.
 */

const axios = require('axios');
const { courierConfig } = require('./config');

class TeamsNotifier {
    constructor() {
        this.webhookUrl = courierConfig.notifications.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL;
        this.enabled = courierConfig.notifications.teamsEnabled && !!this.webhookUrl;
    }

    /**
     * Send a summary notification after a triage run
     */
    async sendRunSummary(summary) {
        if (!this.enabled) {
            console.log('Teams notifications disabled or webhook not configured');
            return;
        }

        const card = this.buildSummaryCard(summary);
        
        try {
            await axios.post(this.webhookUrl, card);
            console.log('Teams notification sent successfully');
        } catch (error) {
            console.error(`Failed to send Teams notification: ${error.message}`);
        }
    }

    /**
     * Build a summary message card
     */
    buildSummaryCard(summary) {
        const statusEmoji = summary.success ? '✅' : '⚠️';
        const timestamp = new Date().toLocaleString('en-US', { 
            timeZone: 'America/Denver',
            dateStyle: 'short',
            timeStyle: 'short'
        });

        // Determine summary style based on format config
        const isDetailed = courierConfig.notifications.summaryFormat === 'detailed';

        if (isDetailed) {
            return this.buildDetailedCard(summary, statusEmoji, timestamp);
        } else {
            return this.buildBriefCard(summary, statusEmoji, timestamp);
        }
    }

    /**
     * Build a detailed message card
     */
    buildDetailedCard(summary, statusEmoji, timestamp) {
        const facts = [
            { name: 'Mailboxes', value: `${summary.mailboxesProcessed}` },
            { name: 'Emails Processed', value: `${summary.totalEmailsProcessed}` },
            { name: 'Drafts Created', value: `${summary.draftsCreated}` },
            { name: 'Attachments Saved', value: `${summary.attachmentsSaved}` },
            { name: 'Flagged', value: `${summary.emailsFlagged}` },
            { name: 'Spam Filtered', value: `${summary.spamFiltered}` },
            { name: 'Duration', value: summary.duration }
        ];

        const sections = [
            {
                activityTitle: `${statusEmoji} Phoenix Mail Courier - Triage Complete`,
                activitySubtitle: timestamp,
                facts: facts,
                markdown: true
            }
        ];

        // Add errors section if any
        if (summary.errors && summary.errors.length > 0) {
            sections.push({
                activityTitle: '⚠️ Errors Encountered',
                text: summary.errors.map(e => `- **${e.mailbox}**: ${e.error}`).join('\n'),
                markdown: true
            });
        }

        // Add action items section
        if (summary.draftsCreated > 0 || summary.emailsFlagged > 0) {
            let actionText = '';
            if (summary.draftsCreated > 0) {
                actionText += `📝 **${summary.draftsCreated} draft replies** ready for review in your Drafts folder\n`;
            }
            if (summary.emailsFlagged > 0) {
                actionText += `🚩 **${summary.emailsFlagged} emails flagged** for follow-up\n`;
            }
            sections.push({
                activityTitle: '📋 Action Items',
                text: actionText,
                markdown: true
            });
        }

        return {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: summary.success ? '00AA00' : 'FF8C00',
            summary: `Mail Courier: ${summary.totalEmailsProcessed} emails triaged`,
            sections: sections
        };
    }

    /**
     * Build a brief message card
     */
    buildBriefCard(summary, statusEmoji, timestamp) {
        let text = `${statusEmoji} Triaged **${summary.totalEmailsProcessed}** emails`;
        
        if (summary.draftsCreated > 0) {
            text += ` | 📝 ${summary.draftsCreated} drafts`;
        }
        if (summary.emailsFlagged > 0) {
            text += ` | 🚩 ${summary.emailsFlagged} flagged`;
        }
        if (summary.errors.length > 0) {
            text += ` | ⚠️ ${summary.errors.length} errors`;
        }

        return {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: summary.success ? '00AA00' : 'FF8C00',
            summary: `Mail Courier: ${summary.totalEmailsProcessed} emails triaged`,
            sections: [{
                activityTitle: 'Phoenix Mail Courier',
                activitySubtitle: timestamp,
                text: text,
                markdown: true
            }]
        };
    }

    /**
     * Send an urgent notification (for high-priority items)
     */
    async sendUrgentNotification(mailbox, email) {
        if (!this.enabled || !courierConfig.notifications.notifyOnUrgent) {
            return;
        }

        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: 'FF0000',
            summary: '🚨 Urgent Email Received',
            sections: [{
                activityTitle: '🚨 Urgent Email Detected',
                activitySubtitle: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }),
                facts: [
                    { name: 'Mailbox', value: mailbox.name },
                    { name: 'From', value: email.from?.emailAddress?.name || email.from?.emailAddress?.address },
                    { name: 'Subject', value: email.subject || '(No Subject)' }
                ],
                text: `A draft reply has been prepared in ${mailbox.name}'s Drafts folder.`,
                markdown: true
            }]
        };

        try {
            await axios.post(this.webhookUrl, card);
        } catch (error) {
            console.error(`Failed to send urgent notification: ${error.message}`);
        }
    }

    /**
     * Send alert for multiple urgent emails detected during quick scan
     */
    async sendUrgentAlert(urgentEmails) {
        if (!this.enabled || urgentEmails.length === 0) {
            return;
        }

        const emailList = urgentEmails.slice(0, 5).map(e => 
            `- **${e.from}**: ${e.subject}${e.matchedKeyword ? ` (matched: ${e.matchedKeyword})` : ''}`
        ).join('\n');

        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: 'FF0000',
            summary: `🚨 ${urgentEmails.length} Urgent Emails Detected`,
            sections: [{
                activityTitle: `🚨 ${urgentEmails.length} Urgent Email${urgentEmails.length > 1 ? 's' : ''} Detected`,
                activitySubtitle: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }),
                text: emailList + (urgentEmails.length > 5 ? `\n\n_...and ${urgentEmails.length - 5} more_` : ''),
                markdown: true
            }]
        };

        try {
            await axios.post(this.webhookUrl, card);
        } catch (error) {
            console.error(`Failed to send urgent alert: ${error.message}`);
        }
    }

    /**
     * Send a daily summary notification
     */
    async sendDailySummary(summary) {
        if (!this.enabled) {
            return;
        }

        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: '0078D4',
            summary: 'Phoenix Mail Courier - Daily Summary',
            sections: [{
                activityTitle: '📊 End of Day Email Summary',
                activitySubtitle: new Date().toLocaleDateString('en-US', { 
                    timeZone: 'America/Denver',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                facts: [
                    { name: 'Total Triage Runs', value: `${summary.totalRuns || 0}` },
                    { name: 'Emails Processed', value: `${summary.totalEmailsProcessed || 0}` },
                    { name: 'Drafts Created', value: `${summary.totalDraftsCreated || 0}` },
                    { name: 'Attachments Saved', value: `${summary.totalAttachmentsSaved || 0}` },
                    { name: 'Errors', value: `${summary.totalErrors || 0}` }
                ],
                text: summary.mailboxBreakdown ? 
                    '\n**By Mailbox:**\n' + Object.entries(summary.mailboxBreakdown)
                        .map(([mb, stats]) => `- ${mb}: ${stats.emails} emails`)
                        .join('\n') : '',
                markdown: true
            }]
        };

        try {
            await axios.post(this.webhookUrl, card);
        } catch (error) {
            console.error(`Failed to send daily summary: ${error.message}`);
        }
    }

    /**
     * Send a daily digest (optional feature for end-of-day summary)
     */
    async sendDailyDigest(dailyStats) {
        if (!this.enabled) {
            return;
        }

        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: '0078D4',
            summary: 'Phoenix Mail Courier - Daily Digest',
            sections: [{
                activityTitle: '📊 Daily Email Digest',
                activitySubtitle: new Date().toLocaleDateString('en-US', { 
                    timeZone: 'America/Denver',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                facts: [
                    { name: 'Total Runs', value: `${dailyStats.totalRuns}` },
                    { name: 'Emails Processed', value: `${dailyStats.totalEmails}` },
                    { name: 'Drafts Created', value: `${dailyStats.totalDrafts}` },
                    { name: 'Attachments Saved', value: `${dailyStats.totalAttachments}` }
                ],
                markdown: true
            }]
        };

        try {
            await axios.post(this.webhookUrl, card);
        } catch (error) {
            console.error(`Failed to send daily digest: ${error.message}`);
        }
    }

    /**
     * Send an error alert
     */
    async sendErrorAlert(error, context = {}) {
        if (!this.enabled) {
            return;
        }

        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: 'FF0000',
            summary: '❌ Phoenix Mail Courier Error',
            sections: [{
                activityTitle: '❌ Mail Courier Error',
                activitySubtitle: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }),
                facts: [
                    { name: 'Error', value: error.message || String(error) },
                    { name: 'Context', value: JSON.stringify(context) || 'None' }
                ],
                text: 'Please check the logs for more details.',
                markdown: true
            }]
        };

        try {
            await axios.post(this.webhookUrl, card);
        } catch (err) {
            console.error(`Failed to send error alert: ${err.message}`);
        }
    }

    /**
     * Build an adaptive card (for richer Teams integration)
     */
    buildAdaptiveCard(summary) {
        return {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    version: '1.4',
                    body: [
                        {
                            type: 'TextBlock',
                            text: '📬 Phoenix Mail Courier',
                            weight: 'bolder',
                            size: 'medium'
                        },
                        {
                            type: 'TextBlock',
                            text: `Triaged ${summary.totalEmailsProcessed} emails`,
                            wrap: true
                        },
                        {
                            type: 'FactSet',
                            facts: [
                                { title: 'Drafts', value: `${summary.draftsCreated}` },
                                { title: 'Flagged', value: `${summary.emailsFlagged}` },
                                { title: 'Attachments', value: `${summary.attachmentsSaved}` }
                            ]
                        }
                    ]
                }
            }]
        };
    }
}

// Factory function
function createTeamsNotifier() {
    return new TeamsNotifier();
}

module.exports = { TeamsNotifier, createTeamsNotifier };
