/**
 * Phoenix Mail Courier - Logger
 * 
 * Comprehensive logging for email triage operations.
 * Logs to both console and SharePoint (Logs/EmailTriage/).
 * Also updates the Global Activity Log for unified audit trail.
 */

const { getGraphClient } = require('../integrations/graph');
const { courierConfig, getLogFilePath } = require('./config');

class CourierLogger {
    constructor() {
        this.graphClient = getGraphClient();
        this.currentRunId = null;
        this.logBuffer = [];
        this.runStartTime = null;
        
        // SharePoint configuration
        this.siteId = courierConfig.sharePointConfig.siteId;
        this.driveId = courierConfig.sharePointConfig.driveId;
    }

    /**
     * Start a new logging run
     */
    async startRun(runId) {
        this.currentRunId = runId;
        this.runStartTime = new Date();
        this.logBuffer = [];
        
        const header = [
            '═'.repeat(60),
            `PHOENIX MAIL COURIER - EMAIL TRIAGE RUN LOG`,
            '═'.repeat(60),
            `Run ID: ${runId}`,
            `Started: ${this.runStartTime.toISOString()}`,
            `Timezone: ${courierConfig.schedule.weekday.timezone}`,
            '─'.repeat(60),
            ''
        ].join('\n');
        
        this.logBuffer.push(header);
        console.log(header);
    }

    /**
     * Log a message
     */
    async log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        
        let logLine = `[${timestamp}] [${levelUpper}] ${message}`;
        
        if (data) {
            logLine += `\n    Data: ${JSON.stringify(data, null, 2).replace(/\n/g, '\n    ')}`;
        }
        
        this.logBuffer.push(logLine);
        
        // Also log to console
        switch (level) {
            case 'error':
                console.error(logLine);
                break;
            case 'warn':
                console.warn(logLine);
                break;
            default:
                console.log(logLine);
        }
    }

    /**
     * End the run and save logs
     */
    async endRun(runId, summary) {
        const endTime = new Date();
        const duration = endTime - this.runStartTime;
        
        // Add summary to log
        const footer = [
            '',
            '─'.repeat(60),
            'RUN SUMMARY',
            '─'.repeat(60),
            `Run ID: ${runId}`,
            `Completed: ${endTime.toISOString()}`,
            `Duration: ${Math.round(duration / 1000)} seconds`,
            '',
            `Mailboxes Processed: ${summary.mailboxesProcessed}`,
            `Total Emails Processed: ${summary.totalEmailsProcessed}`,
            `Drafts Created: ${summary.draftsCreated}`,
            `Attachments Saved: ${summary.attachmentsSaved}`,
            `Emails Flagged: ${summary.emailsFlagged}`,
            `Spam Filtered: ${summary.spamFiltered}`,
            `Errors: ${summary.errors.length}`,
            '',
            summary.errors.length > 0 ? 'ERRORS:\n' + summary.errors.map(e => `  - ${e.mailbox}: ${e.error}`).join('\n') : 'No errors.',
            '',
            '═'.repeat(60),
            'END OF LOG',
            '═'.repeat(60)
        ].join('\n');
        
        this.logBuffer.push(footer);
        console.log(footer);
        
        // Save log file to SharePoint
        try {
            await this.saveLogToSharePoint();
        } catch (error) {
            console.error(`Failed to save log to SharePoint: ${error.message}`);
        }
        
        // Update Global Activity Log
        try {
            await this.updateGlobalActivityLog(summary);
        } catch (error) {
            console.error(`Failed to update Global Activity Log: ${error.message}`);
        }
        
        // Reset for next run
        this.currentRunId = null;
        this.logBuffer = [];
    }

    /**
     * Save log file to SharePoint
     */
    async saveLogToSharePoint() {
        const client = await this.graphClient.getClient();
        const logPath = getLogFilePath();
        const logContent = this.logBuffer.join('\n');
        
        try {
            let uploadPath;
            if (this.siteId && this.driveId) {
                uploadPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${logPath}:/content`;
            } else if (this.siteId) {
                uploadPath = `/sites/${this.siteId}/drive/root:/${logPath}:/content`;
            } else {
                // Fall back to user's OneDrive
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                uploadPath = `/users/${userEmail}/drive/root:/${logPath}:/content`;
            }
            
            await client
                .api(uploadPath)
                .put(logContent);
            
            console.log(`Log saved to SharePoint: ${logPath}`);
        } catch (error) {
            // Try to ensure folder exists and retry
            await this.ensureLogFolderExists();
            
            let uploadPath;
            if (this.siteId && this.driveId) {
                uploadPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${logPath}:/content`;
            } else if (this.siteId) {
                uploadPath = `/sites/${this.siteId}/drive/root:/${logPath}:/content`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                uploadPath = `/users/${userEmail}/drive/root:/${logPath}:/content`;
            }
            
            await client
                .api(uploadPath)
                .put(logContent);
        }
    }

    /**
     * Ensure the log folder exists
     */
    async ensureLogFolderExists() {
        const client = await this.graphClient.getClient();
        const basePath = courierConfig.sharePointConfig.basePaths.logs;
        const folders = basePath.split('/').filter(f => f);
        
        let currentPath = '';
        
        for (const folder of folders) {
            const parentPath = currentPath || 'root';
            currentPath = currentPath ? `${currentPath}/${folder}` : folder;
            
            try {
                let checkPath;
                if (this.siteId && this.driveId) {
                    checkPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${currentPath}`;
                } else if (this.siteId) {
                    checkPath = `/sites/${this.siteId}/drive/root:/${currentPath}`;
                } else {
                    const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                    checkPath = `/users/${userEmail}/drive/root:/${currentPath}`;
                }
                
                await client.api(checkPath).get();
            } catch (error) {
                if (error.statusCode === 404) {
                    // Create folder
                    let createPath;
                    if (this.siteId && this.driveId) {
                        createPath = parentPath === 'root'
                            ? `/sites/${this.siteId}/drives/${this.driveId}/root/children`
                            : `/sites/${this.siteId}/drives/${this.driveId}/root:/${parentPath}:/children`;
                    } else if (this.siteId) {
                        createPath = parentPath === 'root'
                            ? `/sites/${this.siteId}/drive/root/children`
                            : `/sites/${this.siteId}/drive/root:/${parentPath}:/children`;
                    } else {
                        const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                        createPath = parentPath === 'root'
                            ? `/users/${userEmail}/drive/root/children`
                            : `/users/${userEmail}/drive/root:/${parentPath}:/children`;
                    }
                    
                    await client
                        .api(createPath)
                        .post({
                            name: folder,
                            folder: {},
                            '@microsoft.graph.conflictBehavior': 'fail'
                        });
                }
            }
        }
    }

    /**
     * Update the Global Activity Log with run summary
     */
    async updateGlobalActivityLog(summary) {
        const client = await this.graphClient.getClient();
        const globalLogPath = `${courierConfig.sharePointConfig.basePaths.memory}/99_Logs/Global_Activity_Log.md`;
        
        // Format the entry
        const timestamp = new Date().toISOString();
        const entry = `\n| ${timestamp} | Courier | Email Triage | ${summary.totalEmailsProcessed} emails, ${summary.draftsCreated} drafts, ${summary.attachmentsSaved} attachments | ${summary.success ? '✓' : '⚠️'} |`;
        
        try {
            // Try to get existing log
            let getPath;
            if (this.siteId && this.driveId) {
                getPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${globalLogPath}:/content`;
            } else if (this.siteId) {
                getPath = `/sites/${this.siteId}/drive/root:/${globalLogPath}:/content`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                getPath = `/users/${userEmail}/drive/root:/${globalLogPath}:/content`;
            }
            
            let existingContent = '';
            try {
                const response = await client.api(getPath).get();
                existingContent = response;
            } catch (e) {
                // File doesn't exist, create with header
                existingContent = `# Global Activity Log\n\n| Timestamp | Agent | Action | Details | Status |\n|-----------|-------|--------|---------|--------|`;
            }
            
            // Append new entry
            const updatedContent = existingContent + entry;
            
            // Save updated log
            let uploadPath;
            if (this.siteId && this.driveId) {
                uploadPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${globalLogPath}:/content`;
            } else if (this.siteId) {
                uploadPath = `/sites/${this.siteId}/drive/root:/${globalLogPath}:/content`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                uploadPath = `/users/${userEmail}/drive/root:/${globalLogPath}:/content`;
            }
            
            await client
                .api(uploadPath)
                .put(updatedContent);
            
            console.log('Global Activity Log updated');
        } catch (error) {
            console.error(`Failed to update Global Activity Log: ${error.message}`);
        }
    }

    /**
     * Get recent logs from SharePoint
     */
    async getRecentLogs(limit = 50, mailboxFilter = null) {
        const client = await this.graphClient.getClient();
        const logsPath = courierConfig.sharePointConfig.basePaths.logs;
        
        try {
            let listPath;
            if (this.siteId && this.driveId) {
                listPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${logsPath}:/children`;
            } else if (this.siteId) {
                listPath = `/sites/${this.siteId}/drive/root:/${logsPath}:/children`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                listPath = `/users/${userEmail}/drive/root:/${logsPath}:/children`;
            }
            
            let response = await client
                .api(listPath)
                .top(limit)
                .orderby('createdDateTime desc')
                .get();
            
            let logs = response.value || [];
            
            // Filter by mailbox if specified
            if (mailboxFilter && logs.length > 0) {
                logs = logs.filter(log => 
                    log.name && log.name.includes(mailboxFilter)
                );
            }
            
            return logs;
        } catch (error) {
            console.error(`Failed to get recent logs: ${error.message}`);
            return [];
        }
    }

    /**
     * Log a triage run summary
     */
    async logTriageRun(summary) {
        await this.startRun(summary.runId || `run_${Date.now()}`);
        await this.endRun(this.currentRunId, summary);
    }

    /**
     * Log an error
     */
    async logError(type, error, context = {}) {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            type,
            error: error.message || error,
            stack: error.stack,
            context
        };
        
        await this.log('error', `Error [${type}]: ${error.message || error}`, context);
        
        // Try to append to error log file
        try {
            const client = await this.graphClient.getClient();
            const errorLogPath = `${courierConfig.sharePointConfig.basePaths.logs}/errors_${new Date().toISOString().split('T')[0]}.json`;
            
            let uploadPath;
            if (this.siteId && this.driveId) {
                uploadPath = `/sites/${this.siteId}/drives/${this.driveId}/root:/${errorLogPath}:/content`;
            } else if (this.siteId) {
                uploadPath = `/sites/${this.siteId}/drive/root:/${errorLogPath}:/content`;
            } else {
                const userEmail = courierConfig.mailboxes[0]?.email || process.env.GRAPH_USER_EMAIL;
                uploadPath = `/users/${userEmail}/drive/root:/${errorLogPath}:/content`;
            }
            
            // Get existing content if any
            let existingErrors = [];
            try {
                let getPath = uploadPath.replace(':/content', '');
                const response = await client.api(`${getPath}:/content`).get();
                existingErrors = JSON.parse(response);
            } catch (e) {
                // File doesn't exist yet
            }
            
            existingErrors.push(errorEntry);
            
            await client
                .api(uploadPath)
                .put(JSON.stringify(existingErrors, null, 2));
        } catch (e) {
            console.error('Failed to save error to SharePoint:', e.message);
        }
    }

    /**
     * Generate daily summary from logs
     */
    async generateDailySummary() {
        const today = new Date().toISOString().split('T')[0];
        const logs = await this.getRecentLogs(100);
        
        // Filter today's logs
        const todaysLogs = logs.filter(log => 
            log.createdDateTime && log.createdDateTime.startsWith(today)
        );
        
        // Calculate summary stats (parse log content if needed)
        const summary = {
            date: today,
            totalRuns: todaysLogs.length,
            totalEmailsProcessed: 0,
            totalDraftsCreated: 0,
            totalAttachmentsSaved: 0,
            totalErrors: 0,
            mailboxBreakdown: {}
        };
        
        // Note: In a real implementation, you'd parse the log contents
        // to extract detailed statistics
        
        return summary;
    }

    /**
     * Create a JSON log entry (for programmatic access)
     */
    createJsonLogEntry(summary) {
        return {
            runId: this.currentRunId,
            timestamp: new Date().toISOString(),
            agent: 'PhoenixMailCourier',
            action: 'EmailTriage',
            ...summary,
            metadata: {
                version: '1.0.0',
                model: courierConfig.draftGeneration.model,
                mailboxes: courierConfig.mailboxes.filter(m => m.enabled).map(m => m.id)
            }
        };
    }
}

// Factory function
function createCourierLogger() {
    return new CourierLogger();
}

module.exports = { CourierLogger, createCourierLogger };
