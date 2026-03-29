/**
 * Function Executor
 * Maps function calls from ChatGPT to actual implementations
 */

const { getServiceTitanClient } = require('../integrations/servicetitan');
const { getGraphClient } = require('../integrations/graph');
const { isWriteOperation } = require('./functionDefinitions');

class FunctionExecutor {
    constructor() {
        this.stClient = getServiceTitanClient();
        this.graphClient = getGraphClient();
        this.pendingConfirmations = new Map();
    }

    /**
     * Execute a function by name with given arguments
     */
    async execute(functionName, args, sessionId = null) {
        // Check if this is a write operation that needs confirmation
        if (isWriteOperation(functionName) && sessionId) {
            const confirmationKey = `${sessionId}_${functionName}`;
            
            // If not confirmed, store for confirmation and return prompt
            if (!this.pendingConfirmations.has(confirmationKey)) {
                this.pendingConfirmations.set(confirmationKey, { functionName, args });
                return {
                    needsConfirmation: true,
                    message: this.getConfirmationMessage(functionName, args)
                };
            }
            
            // Clear confirmation after use
            this.pendingConfirmations.delete(confirmationKey);
        }

        try {
            const result = await this.executeFunction(functionName, args);
            return { success: true, data: result };
        } catch (error) {
            console.error(`Function execution error (${functionName}):`, error);
            return { 
                success: false, 
                error: error.message || 'An error occurred while executing the function'
            };
        }
    }

    /**
     * Confirm a pending operation
     */
    confirmOperation(sessionId, functionName) {
        const confirmationKey = `${sessionId}_${functionName}`;
        const pending = this.pendingConfirmations.get(confirmationKey);
        
        if (pending) {
            this.pendingConfirmations.set(confirmationKey, { ...pending, confirmed: true });
            return true;
        }
        return false;
    }

    /**
     * Get confirmation message for write operations
     */
    getConfirmationMessage(functionName, args) {
        const messages = {
            addJobNote: `I'm about to add a note to job ${args.jobId}: "${args.noteText}". Should I proceed?`,
            updateJobStatus: `I'm about to update job ${args.jobId} status to "${args.status}". Should I proceed?`,
            moveEmail: `I'm about to move an email to the "${args.folderName}" folder. Should I proceed?`,
            sendEmail: `I'm about to send an email to ${args.to} with subject "${args.subject}". Should I proceed?`,
            createCalendarEvent: `I'm about to create a calendar event: "${args.title}" on ${args.startDateTime}. Should I proceed?`,
            saveEmailAttachments: `I'm about to save email attachments to "${args.targetFolder}". Should I proceed?`,
            createTask: `I'm about to create a task: "${args.title}". Should I proceed?`
        };
        
        return messages[functionName] || `I'm about to execute ${functionName}. Should I proceed?`;
    }

    /**
     * Route function call to appropriate handler
     */
    async executeFunction(functionName, args) {
        // ServiceTitan functions
        const stFunctions = {
            getDailyJobSummary: () => this.stClient.getDailyJobSummary(args.date),
            getScheduledJobs: () => this.stClient.getScheduledJobs(args.date),
            getJobDetails: () => this.stClient.getJobDetails(args.jobId),
            getCompletedJobs: () => this.stClient.getCompletedJobs(args.startDate, args.endDate),
            addJobNote: () => this.stClient.addJobNote(args.jobId, args.noteText),
            updateJobStatus: () => this.stClient.updateJobStatus(args.jobId, args.status),
            searchCustomers: () => this.stClient.searchCustomers(args.query),
            getCustomerDetails: () => this.stClient.getCustomer(args.customerId),
            getTechnicians: () => this.stClient.getTechnicians(),
            getTechnicianSchedule: () => this.stClient.getTechnicianSchedule(args.technicianId, args.date),
            getInvoices: () => this.stClient.getInvoices(args.startDate, args.endDate),
            getOpenEstimates: () => this.stClient.getOpenEstimates(),
            getTodayTimesheets: () => this.stClient.getTodayTimesheets()
        };

        // Graph/Microsoft 365 functions
        const graphFunctions = {
            getUnreadEmails: () => this.graphClient.getUnreadEmails(args.count),
            getEmailSummary: () => this.graphClient.getEmailSummary(),
            getRecentEmails: () => this.graphClient.getRecentEmails(args.hours),
            moveEmail: () => this.graphClient.moveEmail(args.messageId, args.folderName),
            createDraftReply: () => this.graphClient.createDraftReply(args.messageId, args.replyContent),
            sendEmail: () => {
                const recipients = args.to.includes(',') ? args.to.split(',').map(e => e.trim()) : args.to;
                return this.graphClient.sendEmail(recipients, args.subject, args.body);
            },
            getTodayEvents: () => this.graphClient.getTodayEvents(),
            getCalendarEvents: () => this.graphClient.getCalendarEvents(args.startDate, args.endDate),
            createCalendarEvent: () => this.graphClient.createCalendarEvent({
                title: args.title,
                startDateTime: args.startDateTime,
                endDateTime: args.endDateTime,
                location: args.location,
                attendees: args.attendees,
                description: args.description
            }),
            postToTeams: () => this.graphClient.postToTeams(args.message, args.title),
            saveEmailAttachments: () => this.graphClient.saveEmailAttachments(args.messageId, args.targetFolder),
            listFiles: () => this.graphClient.listFiles(args.folderPath),
            createTask: () => this.graphClient.createTask(args.title, args.dueDate, args.notes)
        };

        // Find and execute the function
        const allFunctions = { ...stFunctions, ...graphFunctions };
        const fn = allFunctions[functionName];

        if (!fn) {
            throw new Error(`Unknown function: ${functionName}`);
        }

        return fn();
    }
}

// Create singleton instance
let instance = null;

function getFunctionExecutor() {
    if (!instance) {
        instance = new FunctionExecutor();
    }
    return instance;
}

module.exports = { FunctionExecutor, getFunctionExecutor };
