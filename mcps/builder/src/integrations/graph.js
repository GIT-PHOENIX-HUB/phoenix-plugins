/**
 * Microsoft Graph API Client
 * Handles email, calendar, Teams, and SharePoint operations
 */

const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const axios = require('axios');

class GraphClient {
    constructor(config) {
        this.tenantId = config.tenantId;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.userEmail = config.userEmail;
        this.teamsWebhookUrl = config.teamsWebhookUrl;

        this.credential = null;
        this.client = null;
    }

    /**
     * Initialize the Graph client with authentication
     */
    async initialize() {
        if (this.client) return this.client;

        this.credential = new ClientSecretCredential(
            this.tenantId,
            this.clientId,
            this.clientSecret
        );

        const tokenResponse = await this.credential.getToken('https://graph.microsoft.com/.default');

        this.client = Client.init({
            authProvider: (done) => {
                done(null, tokenResponse.token);
            }
        });

        return this.client;
    }

    /**
     * Refresh token if needed
     */
    async getClient() {
        await this.initialize();
        return this.client;
    }

    // ==================== EMAIL OPERATIONS ====================

    /**
     * Get unread emails
     */
    async getUnreadEmails(count = 20) {
        const client = await this.getClient();
        
        const messages = await client
            .api(`/users/${this.userEmail}/messages`)
            .filter('isRead eq false')
            .top(count)
            .select('id,subject,from,receivedDateTime,bodyPreview,hasAttachments')
            .orderby('receivedDateTime desc')
            .get();

        return messages.value;
    }

    /**
     * Get email by ID with full body
     */
    async getEmail(messageId) {
        const client = await this.getClient();
        
        return client
            .api(`/users/${this.userEmail}/messages/${messageId}`)
            .select('id,subject,from,receivedDateTime,body,hasAttachments,importance')
            .get();
    }

    /**
     * Get emails from the last N hours
     */
    async getRecentEmails(hours = 24, count = 50) {
        const client = await this.getClient();
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        
        const messages = await client
            .api(`/users/${this.userEmail}/messages`)
            .filter(`receivedDateTime ge ${since}`)
            .top(count)
            .select('id,subject,from,receivedDateTime,bodyPreview,hasAttachments,isRead')
            .orderby('receivedDateTime desc')
            .get();

        return messages.value;
    }

    /**
     * Get email summary for triage
     */
    async getEmailSummary() {
        const emails = await this.getUnreadEmails(30);
        
        return {
            totalUnread: emails.length,
            emails: emails.map(e => ({
                id: e.id,
                subject: e.subject,
                from: e.from?.emailAddress?.address || 'Unknown',
                fromName: e.from?.emailAddress?.name || 'Unknown',
                received: e.receivedDateTime,
                preview: e.bodyPreview?.substring(0, 200),
                hasAttachments: e.hasAttachments
            }))
        };
    }

    /**
     * Move email to a folder
     */
    async moveEmail(messageId, folderName) {
        const client = await this.getClient();
        
        // First, get the folder ID
        const folders = await client
            .api(`/users/${this.userEmail}/mailFolders`)
            .filter(`displayName eq '${folderName}'`)
            .get();

        if (!folders.value || folders.value.length === 0) {
            throw new Error(`Folder '${folderName}' not found`);
        }

        const folderId = folders.value[0].id;

        // Move the email
        return client
            .api(`/users/${this.userEmail}/messages/${messageId}/move`)
            .post({ destinationId: folderId });
    }

    /**
     * Create a draft reply to an email
     */
    async createDraftReply(messageId, replyContent) {
        const client = await this.getClient();
        
        // Create reply
        const reply = await client
            .api(`/users/${this.userEmail}/messages/${messageId}/createReply`)
            .post({});

        // Update the reply content
        return client
            .api(`/users/${this.userEmail}/messages/${reply.id}`)
            .patch({
                body: {
                    contentType: 'HTML',
                    content: replyContent
                }
            });
    }

    /**
     * Send an email
     */
    async sendEmail(to, subject, body, isHtml = true) {
        const client = await this.getClient();
        
        const message = {
            subject,
            body: {
                contentType: isHtml ? 'HTML' : 'Text',
                content: body
            },
            toRecipients: Array.isArray(to) 
                ? to.map(email => ({ emailAddress: { address: email } }))
                : [{ emailAddress: { address: to } }]
        };

        return client
            .api(`/users/${this.userEmail}/sendMail`)
            .post({ message, saveToSentItems: true });
    }

    /**
     * Get email attachments
     */
    async getEmailAttachments(messageId) {
        const client = await this.getClient();
        
        const attachments = await client
            .api(`/users/${this.userEmail}/messages/${messageId}/attachments`)
            .get();

        return attachments.value;
    }

    // ==================== CALENDAR OPERATIONS ====================

    /**
     * Get calendar events for a date range
     */
    async getCalendarEvents(startDate, endDate) {
        const client = await this.getClient();
        
        const events = await client
            .api(`/users/${this.userEmail}/calendarview`)
            .query({
                startDateTime: startDate,
                endDateTime: endDate
            })
            .select('id,subject,start,end,location,attendees,isAllDay,bodyPreview')
            .orderby('start/dateTime')
            .get();

        return events.value;
    }

    /**
     * Get today's calendar events
     */
    async getTodayEvents() {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        return this.getCalendarEvents(startOfDay, endOfDay);
    }

    /**
     * Create a calendar event
     */
    async createCalendarEvent(event) {
        const client = await this.getClient();
        
        const calendarEvent = {
            subject: event.title || event.subject,
            body: {
                contentType: 'HTML',
                content: event.description || event.body || ''
            },
            start: {
                dateTime: event.startDateTime,
                timeZone: event.timeZone || 'America/Chicago'
            },
            end: {
                dateTime: event.endDateTime,
                timeZone: event.timeZone || 'America/Chicago'
            },
            location: event.location ? { displayName: event.location } : undefined,
            attendees: event.attendees?.map(email => ({
                emailAddress: { address: email },
                type: 'required'
            })) || []
        };

        return client
            .api(`/users/${this.userEmail}/events`)
            .post(calendarEvent);
    }

    /**
     * Check free/busy status
     */
    async getFreeBusy(startTime, endTime) {
        const client = await this.getClient();
        
        const result = await client
            .api('/me/calendar/getSchedule')
            .post({
                schedules: [this.userEmail],
                startTime: { dateTime: startTime, timeZone: 'America/Chicago' },
                endTime: { dateTime: endTime, timeZone: 'America/Chicago' }
            });

        return result.value;
    }

    // ==================== TEAMS OPERATIONS ====================

    /**
     * Post message to Teams channel via webhook
     */
    async postToTeams(message, title = null) {
        if (!this.teamsWebhookUrl) {
            throw new Error('Teams webhook URL not configured');
        }

        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: '0076D7',
            summary: title || 'Phoenix AI Notification',
            sections: [{
                activityTitle: title || 'Phoenix AI Operational Steward',
                activitySubtitle: new Date().toLocaleString(),
                text: message,
                markdown: true
            }]
        };

        return axios.post(this.teamsWebhookUrl, card);
    }

    /**
     * Post an adaptive card to Teams
     */
    async postAdaptiveCard(card) {
        if (!this.teamsWebhookUrl) {
            throw new Error('Teams webhook URL not configured');
        }

        return axios.post(this.teamsWebhookUrl, {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: card
            }]
        });
    }

    /**
     * Create a job notification card for Teams
     */
    async notifyNewJob(job) {
        const card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: '00FF00',
            summary: `New Job Created: ${job.number || job.id}`,
            sections: [{
                activityTitle: `🔧 New Job: ${job.number || job.id}`,
                facts: [
                    { name: 'Customer', value: job.customerName || 'N/A' },
                    { name: 'Type', value: job.type || job.jobType || 'N/A' },
                    { name: 'Scheduled', value: job.scheduledDate || 'TBD' },
                    { name: 'Technician', value: job.technicianName || 'Unassigned' }
                ],
                markdown: true
            }],
            potentialAction: job.serviceTitanUrl ? [{
                '@type': 'OpenUri',
                name: 'View in ServiceTitan',
                targets: [{ os: 'default', uri: job.serviceTitanUrl }]
            }] : []
        };

        return axios.post(this.teamsWebhookUrl, card);
    }

    // ==================== SHAREPOINT/ONEDRIVE OPERATIONS ====================

    /**
     * Upload file to SharePoint/OneDrive
     */
    async uploadFile(folderPath, fileName, fileContent, siteId = null) {
        const client = await this.getClient();
        
        // If siteId provided, upload to SharePoint, otherwise to OneDrive
        const basePath = siteId 
            ? `/sites/${siteId}/drive/root:/${folderPath}/${fileName}:/content`
            : `/users/${this.userEmail}/drive/root:/${folderPath}/${fileName}:/content`;

        return client
            .api(basePath)
            .put(fileContent);
    }

    /**
     * Save email attachments to a folder
     */
    async saveEmailAttachments(messageId, targetFolder, siteId = null) {
        const attachments = await this.getEmailAttachments(messageId);
        const savedFiles = [];

        for (const attachment of attachments) {
            if (attachment['@odata.type'] === '#microsoft.graph.fileAttachment') {
                const content = Buffer.from(attachment.contentBytes, 'base64');
                
                // Add timestamp to prevent naming conflicts
                const timestamp = Date.now();
                const fileName = `${timestamp}_${attachment.name}`;
                
                await this.uploadFile(targetFolder, fileName, content, siteId);
                savedFiles.push(fileName);
            }
        }

        return savedFiles;
    }

    /**
     * List files in a folder
     */
    async listFiles(folderPath, siteId = null) {
        const client = await this.getClient();
        
        const basePath = siteId
            ? `/sites/${siteId}/drive/root:/${folderPath}:/children`
            : `/users/${this.userEmail}/drive/root:/${folderPath}:/children`;

        const result = await client.api(basePath).get();
        return result.value;
    }

    // ==================== TASKS/TO-DO OPERATIONS ====================

    /**
     * Create a To-Do task
     */
    async createTask(title, dueDate = null, notes = null) {
        const client = await this.getClient();
        
        // Get the default task list
        const lists = await client
            .api(`/users/${this.userEmail}/todo/lists`)
            .filter("wellknownListName eq 'defaultList'")
            .get();

        const listId = lists.value[0]?.id;
        if (!listId) {
            throw new Error('Default task list not found');
        }

        const task = {
            title,
            body: notes ? { content: notes, contentType: 'text' } : undefined,
            dueDateTime: dueDate ? {
                dateTime: dueDate,
                timeZone: 'America/Chicago'
            } : undefined
        };

        return client
            .api(`/users/${this.userEmail}/todo/lists/${listId}/tasks`)
            .post(task);
    }
}

// Create singleton instance
let instance = null;

function getGraphClient() {
    if (!instance) {
        instance = new GraphClient({
            tenantId: process.env.AZURE_TENANT_ID,
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            userEmail: process.env.GRAPH_USER_EMAIL,
            teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL
        });
    }
    return instance;
}

module.exports = { GraphClient, getGraphClient };
