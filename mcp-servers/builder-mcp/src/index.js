/**
 * Azure Functions Entry Point
 * Main HTTP endpoints for Phoenix AI Operational Steward
 * Includes Phoenix Command (ServiceTitan), Phoenix Courier (Email Triage),
 * and Phoenix Builder Space (Automation & Knowledge Management)
 */

const { app } = require('@azure/functions');
require('dotenv').config();

const { getChatHandler } = require('./ai/chatHandler');
const { getWebhookHandler } = require('./webhooks/webhookHandler');
const { getServiceTitanClient } = require('./integrations/servicetitan');
const { getGraphClient } = require('./integrations/graph');
const { getLogger } = require('./utils/logger');
const { getPhoenixMailCourier } = require('./courier');
const { getPhoenixBuilderSpace } = require('./builder');

// ==================== CHAT ENDPOINT ====================
/**
 * Main chat endpoint for AI conversations
 * POST /api/chat
 * Body: { sessionId: string, message: string }
 */
app.http('chat', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { sessionId, message } = body;

            if (!message) {
                return {
                    status: 400,
                    jsonBody: { error: 'Message is required' }
                };
            }

            const chatHandler = getChatHandler();
            const result = await chatHandler.chat(
                sessionId || `session_${Date.now()}`,
                message
            );

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Chat endpoint error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Internal server error', details: error.message }
            };
        }
    }
});

// ==================== SERVICETITAN WEBHOOK ENDPOINT ====================
/**
 * Webhook endpoint for ServiceTitan events
 * POST /api/webhook/servicetitan
 */
app.http('servicetitan-webhook', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'webhook/servicetitan',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const eventType = request.headers.get('x-servicetitan-event') || body.eventType;

            if (!eventType) {
                return {
                    status: 400,
                    jsonBody: { error: 'Event type is required' }
                };
            }

            // Verify webhook secret if configured
            const webhookSecret = process.env.WEBHOOK_SECRET;
            if (webhookSecret) {
                const signature = request.headers.get('x-servicetitan-signature');
                const webhookHandler = getWebhookHandler();
                
                if (signature && !webhookHandler.verifySignature(body, signature, webhookSecret)) {
                    return {
                        status: 401,
                        jsonBody: { error: 'Invalid webhook signature' }
                    };
                }
            }

            const webhookHandler = getWebhookHandler();
            const result = await webhookHandler.processWebhook(eventType, body);

            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            context.error('Webhook error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Webhook processing failed', details: error.message }
            };
        }
    }
});

// ==================== DAILY SUMMARY ENDPOINT ====================
/**
 * Get daily summary (for scheduled triggers or manual calls)
 * GET /api/summary/daily?date=YYYY-MM-DD
 */
app.http('daily-summary', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'summary/daily',
    handler: async (request, context) => {
        try {
            const date = request.query.get('date') || new Date().toISOString().split('T')[0];
            
            const stClient = getServiceTitanClient();
            const summary = await stClient.getDailyJobSummary(date);

            return {
                status: 200,
                jsonBody: summary
            };
        } catch (error) {
            context.error('Daily summary error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to generate summary', details: error.message }
            };
        }
    }
});

// ==================== EMAIL SUMMARY ENDPOINT ====================
/**
 * Get email summary for triage
 * GET /api/summary/email
 */
app.http('email-summary', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'summary/email',
    handler: async (request, context) => {
        try {
            const graphClient = getGraphClient();
            const summary = await graphClient.getEmailSummary();

            return {
                status: 200,
                jsonBody: summary
            };
        } catch (error) {
            context.error('Email summary error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get email summary', details: error.message }
            };
        }
    }
});

// ==================== CALENDAR EVENTS ENDPOINT ====================
/**
 * Get today's calendar events
 * GET /api/calendar/today
 */
app.http('calendar-today', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'calendar/today',
    handler: async (request, context) => {
        try {
            const graphClient = getGraphClient();
            const events = await graphClient.getTodayEvents();

            return {
                status: 200,
                jsonBody: { events }
            };
        } catch (error) {
            context.error('Calendar error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get calendar events', details: error.message }
            };
        }
    }
});

// ==================== TEAMS NOTIFICATION ENDPOINT ====================
/**
 * Post a message to Teams
 * POST /api/teams/notify
 * Body: { message: string, title?: string }
 */
app.http('teams-notify', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'teams/notify',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { message, title } = body;

            if (!message) {
                return {
                    status: 400,
                    jsonBody: { error: 'Message is required' }
                };
            }

            const graphClient = getGraphClient();
            await graphClient.postToTeams(message, title);

            return {
                status: 200,
                jsonBody: { success: true, message: 'Notification sent' }
            };
        } catch (error) {
            context.error('Teams notification error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to send notification', details: error.message }
            };
        }
    }
});

// ==================== LOGS ENDPOINT ====================
/**
 * Get recent logs
 * GET /api/logs?count=50
 */
app.http('logs', {
    methods: ['GET'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            const count = parseInt(request.query.get('count')) || 50;
            const logger = getLogger();
            const logs = logger.getRecentLogs(count);

            return {
                status: 200,
                jsonBody: { logs }
            };
        } catch (error) {
            context.error('Logs error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get logs', details: error.message }
            };
        }
    }
});

// ==================== HEALTH CHECK ====================
/**
 * Health check endpoint
 * GET /api/health
 */
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            jsonBody: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
});

// ==================== SCHEDULED: DAILY BRIEFING ====================
/**
 * Scheduled function to send daily briefing at 9am
 */
app.timer('dailyBriefing', {
    schedule: '0 0 9 * * *', // Every day at 9:00 AM
    handler: async (timer, context) => {
        context.log('Daily briefing triggered');

        try {
            const stClient = getServiceTitanClient();
            const graphClient = getGraphClient();
            const logger = getLogger();

            // Get job summary
            const jobSummary = await stClient.getDailyJobSummary();
            
            // Get email summary
            const emailSummary = await graphClient.getEmailSummary();
            
            // Get today's calendar
            const events = await graphClient.getTodayEvents();

            // Format the briefing
            const briefing = `
📊 **Phoenix Daily Briefing - ${new Date().toLocaleDateString()}**

**🔧 Jobs:**
- Scheduled: ${jobSummary.scheduledJobsCount}
- Completed Yesterday: ${jobSummary.completedJobsCount}
- Revenue: $${jobSummary.totalRevenue?.toFixed(2) || '0.00'}

**📧 Email:**
- Unread Messages: ${emailSummary.totalUnread}

**📅 Calendar:**
- Events Today: ${events?.length || 0}

Have a great day! Reply to me anytime for more details.
            `.trim();

            // Post to Teams
            await graphClient.postToTeams(briefing, 'Daily Briefing');

            // Log the action
            await logger.log('daily_briefing_sent', {
                jobsScheduled: jobSummary.scheduledJobsCount,
                unreadEmails: emailSummary.totalUnread,
                eventsToday: events?.length || 0
            });

            context.log('Daily briefing sent successfully');
        } catch (error) {
            context.error('Daily briefing error:', error);
        }
    }
});

// ==================== PHOENIX MAIL COURIER ENDPOINTS ====================

/**
 * Run full email triage across all configured mailboxes
 * POST /api/courier/triage
 */
app.http('courier-triage', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'courier/triage',
    handler: async (request, context) => {
        try {
            context.log('Manual full triage triggered');
            
            const courier = getPhoenixMailCourier();
            const result = await courier.runFullTriage();

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Courier triage error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Triage failed', details: error.message }
            };
        }
    }
});

/**
 * Run triage on a specific mailbox
 * POST /api/courier/triage/:mailbox
 */
app.http('courier-triage-mailbox', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'courier/triage/{mailbox}',
    handler: async (request, context) => {
        try {
            const mailbox = request.params.mailbox;
            
            if (!mailbox) {
                return {
                    status: 400,
                    jsonBody: { error: 'Mailbox identifier is required' }
                };
            }

            context.log(`Manual triage triggered for mailbox: ${mailbox}`);
            
            const courier = getPhoenixMailCourier();
            const result = await courier.triageSingleMailbox(mailbox);

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Courier mailbox triage error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Mailbox triage failed', details: error.message }
            };
        }
    }
});

/**
 * Generate AI draft reply for a specific email
 * POST /api/courier/draft/:emailId
 * Body: { mailbox: string, category?: string, context?: object }
 */
app.http('courier-draft', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'courier/draft/{emailId}',
    handler: async (request, context) => {
        try {
            const emailId = request.params.emailId;
            const body = await request.json().catch(() => ({}));
            const { mailbox, category, contextData } = body;

            if (!emailId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Email ID is required' }
                };
            }

            if (!mailbox) {
                return {
                    status: 400,
                    jsonBody: { error: 'Mailbox is required in request body' }
                };
            }

            context.log(`Draft generation requested for email: ${emailId}`);
            
            const courier = getPhoenixMailCourier();
            const result = await courier.generateDraftReply(emailId, mailbox, {
                category,
                ...contextData
            });

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Courier draft error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Draft generation failed', details: error.message }
            };
        }
    }
});

/**
 * Process attachments for a specific email
 * POST /api/courier/attachments/:emailId
 * Body: { mailbox: string, targetFolder?: string }
 */
app.http('courier-attachments', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'courier/attachments/{emailId}',
    handler: async (request, context) => {
        try {
            const emailId = request.params.emailId;
            const body = await request.json().catch(() => ({}));
            const { mailbox, targetFolder } = body;

            if (!emailId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Email ID is required' }
                };
            }

            if (!mailbox) {
                return {
                    status: 400,
                    jsonBody: { error: 'Mailbox is required in request body' }
                };
            }

            context.log(`Attachment processing requested for email: ${emailId}`);
            
            const courier = getPhoenixMailCourier();
            const result = await courier.processEmailAttachments(emailId, mailbox, targetFolder);

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Courier attachment error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Attachment processing failed', details: error.message }
            };
        }
    }
});

/**
 * Get triage status and statistics
 * GET /api/courier/status
 */
app.http('courier-status', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'courier/status',
    handler: async (request, context) => {
        try {
            const courier = getPhoenixMailCourier();
            const status = await courier.getTriageStatus();

            return {
                status: 200,
                jsonBody: status
            };
        } catch (error) {
            context.error('Courier status error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get status', details: error.message }
            };
        }
    }
});

/**
 * Get recent triage logs
 * GET /api/courier/logs?limit=50&mailbox=info
 */
app.http('courier-logs', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'courier/logs',
    handler: async (request, context) => {
        try {
            const limit = parseInt(request.query.get('limit') || '50', 10);
            const mailbox = request.query.get('mailbox');

            const courier = getPhoenixMailCourier();
            const logs = await courier.getRecentLogs(limit, mailbox);

            return {
                status: 200,
                jsonBody: logs
            };
        } catch (error) {
            context.error('Courier logs error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get logs', details: error.message }
            };
        }
    }
});

// ==================== SCHEDULED: EMAIL TRIAGE ====================

/**
 * Scheduled email triage - runs every 30 minutes during business hours
 * Processes all configured mailboxes
 */
app.timer('scheduledEmailTriage', {
    schedule: '0 */30 7-19 * * 1-5', // Every 30 min, 7am-7pm, Mon-Fri
    handler: async (timer, context) => {
        context.log('Scheduled email triage triggered');

        try {
            const courier = getPhoenixMailCourier();
            const result = await courier.runFullTriage();

            context.log(`Triage completed: ${result.summary?.totalProcessed || 0} emails processed`);

            // Send summary to Teams if significant activity
            if (result.summary?.totalProcessed > 0 || result.summary?.errors?.length > 0) {
                await courier.sendTriageSummaryNotification(result.summary);
            }
        } catch (error) {
            context.error('Scheduled triage error:', error);
            
            // Try to send error notification
            try {
                const courier = getPhoenixMailCourier();
                await courier.sendErrorNotification('Scheduled Triage Failed', error);
            } catch (notifyError) {
                context.error('Failed to send error notification:', notifyError);
            }
        }
    }
});

/**
 * Urgent email check - runs every 5 minutes
 * Quick scan for high-priority items only
 */
app.timer('urgentEmailCheck', {
    schedule: '0 */5 * * * *', // Every 5 minutes, 24/7
    handler: async (timer, context) => {
        context.log('Urgent email check triggered');

        try {
            const courier = getPhoenixMailCourier();
            const result = await courier.checkUrgentEmails();

            if (result.urgentCount > 0) {
                context.log(`Found ${result.urgentCount} urgent emails`);
            }
        } catch (error) {
            context.error('Urgent email check error:', error);
        }
    }
});

/**
 * End of day triage summary - sends at 6pm
 */
app.timer('endOfDayTriageSummary', {
    schedule: '0 0 18 * * 1-5', // 6pm Mon-Fri
    handler: async (timer, context) => {
        context.log('End of day triage summary triggered');

        try {
            const courier = getPhoenixMailCourier();
            const summary = await courier.generateDailySummary();

            await courier.sendDailySummaryNotification(summary);

            context.log('End of day summary sent');
        } catch (error) {
            context.error('End of day summary error:', error);
        }
    }
});

// ==================== PHOENIX BUILDER SPACE ENDPOINTS ====================

/**
 * Initialize Builder Space
 * POST /api/builder/init
 */
app.http('builder-init', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/init',
    handler: async (request, context) => {
        try {
            const builder = getPhoenixBuilderSpace();
            const result = await builder.initialize();

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Builder init error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Initialization failed', details: error.message }
            };
        }
    }
});

/**
 * Onboard a new user
 * POST /api/builder/users/onboard
 * Body: { displayName, email, firstName, lastName, department, ... }
 */
app.http('builder-user-onboard', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/users/onboard',
    handler: async (request, context) => {
        try {
            const userDetails = await request.json();
            
            if (!userDetails.displayName || !userDetails.email) {
                return {
                    status: 400,
                    jsonBody: { error: 'displayName and email are required' }
                };
            }

            const builder = getPhoenixBuilderSpace();
            const result = await builder.onboardUser(userDetails);

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('User onboard error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Onboarding failed', details: error.message }
            };
        }
    }
});

/**
 * Offboard a user
 * POST /api/builder/users/offboard/:userId
 */
app.http('builder-user-offboard', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/users/offboard/{userId}',
    handler: async (request, context) => {
        try {
            const userId = request.params.userId;
            const options = await request.json().catch(() => ({}));

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: { error: 'userId is required' }
                };
            }

            const builder = getPhoenixBuilderSpace();
            const result = await builder.offboardUser(userId, options);

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('User offboard error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Offboarding failed', details: error.message }
            };
        }
    }
});

/**
 * Run permission audit
 * POST /api/builder/audit/permissions
 */
app.http('builder-audit-permissions', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/audit/permissions',
    handler: async (request, context) => {
        try {
            context.log('Permission audit triggered');
            
            const builder = getPhoenixBuilderSpace();
            const result = await builder.runPermissionAudit();

            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            context.error('Permission audit error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Audit failed', details: error.message }
            };
        }
    }
});

/**
 * Get admin role members
 * GET /api/builder/audit/admins
 */
app.http('builder-audit-admins', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'builder/audit/admins',
    handler: async (request, context) => {
        try {
            const builder = getPhoenixBuilderSpace();
            const admins = await builder.getAdminRoleMembers();

            return {
                status: 200,
                jsonBody: { admins }
            };
        } catch (error) {
            context.error('Get admins error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get admins', details: error.message }
            };
        }
    }
});

/**
 * Execute a workflow
 * POST /api/builder/workflows/:workflowId/execute
 */
app.http('builder-workflow-execute', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/workflows/{workflowId}/execute',
    handler: async (request, context) => {
        try {
            const workflowId = request.params.workflowId;
            const params = await request.json().catch(() => ({}));

            if (!workflowId) {
                return {
                    status: 400,
                    jsonBody: { error: 'workflowId is required' }
                };
            }

            context.log(`Executing workflow: ${workflowId}`);
            
            const builder = getPhoenixBuilderSpace();
            const result = await builder.executeWorkflow(workflowId, params);

            return {
                status: result.success ? 200 : 500,
                jsonBody: result
            };
        } catch (error) {
            context.error('Workflow execute error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Workflow failed', details: error.message }
            };
        }
    }
});

/**
 * Get available workflows
 * GET /api/builder/workflows
 */
app.http('builder-workflows-list', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'builder/workflows',
    handler: async (request, context) => {
        try {
            const builder = getPhoenixBuilderSpace();
            const workflows = builder.getAvailableWorkflows();

            return {
                status: 200,
                jsonBody: { workflows }
            };
        } catch (error) {
            context.error('Get workflows error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get workflows', details: error.message }
            };
        }
    }
});

/**
 * Get governance status
 * GET /api/builder/governance/status
 */
app.http('builder-governance-status', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'builder/governance/status',
    handler: async (request, context) => {
        try {
            const builder = getPhoenixBuilderSpace();
            const status = await builder.getGovernanceStatus();

            return {
                status: 200,
                jsonBody: status
            };
        } catch (error) {
            context.error('Governance status error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to get status', details: error.message }
            };
        }
    }
});

/**
 * Request approval for an action
 * POST /api/builder/approvals/request
 */
app.http('builder-approval-request', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/approvals/request',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { actionType, details } = body;

            if (!actionType) {
                return {
                    status: 400,
                    jsonBody: { error: 'actionType is required' }
                };
            }

            const builder = getPhoenixBuilderSpace();
            const result = await builder.requestApproval(actionType, details || {});

            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            context.error('Approval request error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Request failed', details: error.message }
            };
        }
    }
});

/**
 * Process an approval decision
 * POST /api/builder/approvals/:approvalId/process
 */
app.http('builder-approval-process', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'builder/approvals/{approvalId}/process',
    handler: async (request, context) => {
        try {
            const approvalId = request.params.approvalId;
            const body = await request.json();
            const { decision, notes } = body;

            if (!approvalId || !decision) {
                return {
                    status: 400,
                    jsonBody: { error: 'approvalId and decision are required' }
                };
            }

            if (!['approve', 'reject'].includes(decision)) {
                return {
                    status: 400,
                    jsonBody: { error: 'decision must be "approve" or "reject"' }
                };
            }

            const builder = getPhoenixBuilderSpace();
            const result = await builder.processApproval(approvalId, decision, notes);

            return {
                status: result.success ? 200 : 400,
                jsonBody: result
            };
        } catch (error) {
            context.error('Approval process error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Process failed', details: error.message }
            };
        }
    }
});

/**
 * Search knowledge base
 * GET /api/builder/knowledge/search?q=query
 */
app.http('builder-knowledge-search', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'builder/knowledge/search',
    handler: async (request, context) => {
        try {
            const query = request.query.get('q');

            if (!query) {
                return {
                    status: 400,
                    jsonBody: { error: 'Query parameter "q" is required' }
                };
            }

            const builder = getPhoenixBuilderSpace();
            const results = await builder.searchKnowledge(query);

            return {
                status: 200,
                jsonBody: results
            };
        } catch (error) {
            context.error('Knowledge search error:', error);
            return {
                status: 500,
                jsonBody: { error: 'Search failed', details: error.message }
            };
        }
    }
});

// ==================== SCHEDULED: PERMISSION AUDIT ====================

/**
 * Weekly permission audit - runs Monday at 1am
 */
app.timer('weeklyPermissionAudit', {
    schedule: '0 0 1 * * 1', // Monday at 1am
    handler: async (timer, context) => {
        context.log('Weekly permission audit triggered');

        try {
            const builder = getPhoenixBuilderSpace();
            const result = await builder.runPermissionAudit();

            context.log(`Audit completed: ${result.summary?.anomaliesFound || 0} anomalies found`);

            // Alert on anomalies
            if (result.anomalies?.length > 0) {
                // Would send Teams notification here
                context.log('Anomalies detected - notification would be sent');
            }
        } catch (error) {
            context.error('Weekly audit error:', error);
        }
    }
});

module.exports = { app };
