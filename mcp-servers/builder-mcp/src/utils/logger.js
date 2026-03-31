/**
 * Simple Logger Utility
 * Logs actions to console and optionally to a data store
 */

const { Client } = require('@microsoft/microsoft-graph-client');

class Logger {
    constructor() {
        this.logs = [];
        this.maxInMemoryLogs = 1000;
    }

    /**
     * Log an action
     */
    async log(action, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            data,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Console log
        console.log(`[Phoenix AI] ${action}:`, JSON.stringify(data, null, 2));

        // In-memory log (for debugging)
        this.logs.push(logEntry);
        if (this.logs.length > this.maxInMemoryLogs) {
            this.logs.shift();
        }

        // TODO: In production, persist to SharePoint List or Azure Table Storage
        // await this.persistLog(logEntry);

        return logEntry;
    }

    /**
     * Get recent logs
     */
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    /**
     * Get logs by action type
     */
    getLogsByAction(action) {
        return this.logs.filter(log => log.action === action);
    }

    /**
     * Persist log to SharePoint List (for production use)
     * Uncomment and configure when ready
     */
    /*
    async persistLog(logEntry) {
        try {
            const graphClient = getGraphClient();
            const client = await graphClient.getClient();
            
            await client
                .api('/sites/{site-id}/lists/PhoenixAI_Logs/items')
                .post({
                    fields: {
                        Title: logEntry.action,
                        Timestamp: logEntry.timestamp,
                        Data: JSON.stringify(logEntry.data),
                        LogId: logEntry.id
                    }
                });
        } catch (error) {
            console.error('Failed to persist log:', error);
        }
    }
    */
}

// Create singleton instance
let instance = null;

function getLogger() {
    if (!instance) {
        instance = new Logger();
    }
    return instance;
}

module.exports = { Logger, getLogger };
