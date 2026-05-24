/**
 * MCP Logger
 * 
 * Comprehensive logging for MCP tool executions.
 * Logs to console, Application Insights, and SharePoint 99_Logs.
 */

class MCPLogger {
    constructor(config = {}) {
        this.config = {
            logLevel: config.logLevel || process.env.LOG_LEVEL || 'info',
            appInsightsKey: config.appInsightsKey || process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
            sharePointLogging: config.sharePointLogging !== false,
            consoleLogging: config.consoleLogging !== false,
            logPath: config.logPath || '/Shared Documents/99_Logs',
            ...config
        };

        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };

        // Initialize Application Insights if configured
        if (this.config.appInsightsKey) {
            this._initAppInsights();
        }
    }

    /**
     * Initialize Application Insights
     */
    _initAppInsights() {
        try {
            const appInsights = require('applicationinsights');
            appInsights.setup(this.config.appInsightsKey)
                .setAutoDependencyCorrelation(true)
                .setAutoCollectRequests(true)
                .setAutoCollectPerformance(true, true)
                .setAutoCollectExceptions(true)
                .setAutoCollectDependencies(true)
                .setAutoCollectConsole(true, true)
                .start();
            
            this.appInsights = appInsights.defaultClient;
            console.log('📊 Application Insights initialized');
        } catch (error) {
            console.warn('⚠️ Application Insights not available:', error.message);
        }
    }

    /**
     * Check if should log at given level
     */
    _shouldLog(level) {
        return this.levels[level] <= this.levels[this.config.logLevel];
    }

    /**
     * Format log entry
     */
    _formatEntry(level, message, data = {}) {
        return {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...data,
            server: 'Phoenix-MCP',
            version: '1.0.0'
        };
    }

    /**
     * Log to console
     */
    _logConsole(level, entry) {
        if (!this.config.consoleLogging) return;

        const colors = {
            error: '\x1b[31m',   // Red
            warn: '\x1b[33m',    // Yellow
            info: '\x1b[36m',    // Cyan
            debug: '\x1b[35m',   // Magenta
            trace: '\x1b[90m'    // Gray
        };
        const reset = '\x1b[0m';
        
        const prefix = `${colors[level] || ''}[${entry.timestamp}] [${entry.level}]${reset}`;
        console.log(prefix, entry.message, JSON.stringify(entry, null, 2));
    }

    /**
     * Log to Application Insights
     */
    _logAppInsights(level, entry) {
        if (!this.appInsights) return;

        const properties = {
            ...entry,
            message: undefined // Don't duplicate in properties
        };

        switch (level) {
            case 'error':
                this.appInsights.trackException({
                    exception: new Error(entry.message),
                    properties
                });
                break;
            case 'warn':
                this.appInsights.trackTrace({
                    message: entry.message,
                    severity: 2, // Warning
                    properties
                });
                break;
            case 'info':
                this.appInsights.trackTrace({
                    message: entry.message,
                    severity: 1, // Information
                    properties
                });
                break;
            default:
                this.appInsights.trackTrace({
                    message: entry.message,
                    severity: 0, // Verbose
                    properties
                });
        }
    }

    /**
     * Core log method
     */
    _log(level, message, data = {}) {
        if (!this._shouldLog(level)) return;

        const entry = this._formatEntry(level, message, data);
        
        this._logConsole(level, entry);
        this._logAppInsights(level, entry);

        return entry;
    }

    // Standard log methods
    error(message, data = {}) { return this._log('error', message, data); }
    warn(message, data = {}) { return this._log('warn', message, data); }
    info(message, data = {}) { return this._log('info', message, data); }
    debug(message, data = {}) { return this._log('debug', message, data); }
    trace(message, data = {}) { return this._log('trace', message, data); }

    // Audit log for security-sensitive operations
    audit(action, data = {}) {
        return this._log('info', `AUDIT: ${action}`, { ...data, audit: true, timestamp: new Date().toISOString() });
    }

    /**
     * Log HTTP request
     */
    logRequest(requestData) {
        const { method, path, statusCode, duration, userAgent, correlationId } = requestData;
        
        const level = statusCode >= 500 ? 'error' : 
                      statusCode >= 400 ? 'warn' : 'info';

        this._log(level, `${method} ${path} ${statusCode} ${duration}ms`, {
            type: 'request',
            method,
            path,
            statusCode,
            duration,
            userAgent,
            correlationId
        });

        // Track in App Insights
        if (this.appInsights) {
            this.appInsights.trackRequest({
                name: `${method} ${path}`,
                url: path,
                duration,
                resultCode: statusCode,
                success: statusCode < 400,
                properties: { correlationId, userAgent }
            });
        }
    }

    /**
     * Log tool execution
     */
    logToolExecution(executionData) {
        const { toolName, parameters, result, correlationId, userId, duration } = executionData;

        this.info(`Tool executed: ${toolName}`, {
            type: 'tool_execution',
            toolName,
            parameters: this._sanitizeParameters(parameters),
            success: result?.success !== false,
            correlationId,
            userId,
            duration
        });

        // Track as custom event in App Insights
        if (this.appInsights) {
            this.appInsights.trackEvent({
                name: 'ToolExecution',
                properties: {
                    toolName,
                    success: String(result?.success !== false),
                    correlationId,
                    userId
                },
                measurements: {
                    duration: duration || 0
                }
            });
        }
    }

    /**
     * Log error
     */
    logError(errorData) {
        const { toolName, parameters, error, correlationId, stack } = errorData;

        this.error(`Tool error: ${toolName} - ${error}`, {
            type: 'tool_error',
            toolName,
            parameters: this._sanitizeParameters(parameters),
            error,
            stack,
            correlationId
        });

        // Track exception in App Insights
        if (this.appInsights) {
            this.appInsights.trackException({
                exception: new Error(error),
                properties: {
                    toolName,
                    correlationId
                }
            });
        }
    }

    /**
     * Log approval event
     */
    logApproval(approvalData) {
        const { toolName, approvalId, action, userId, correlationId } = approvalData;

        this.info(`Approval ${action}: ${toolName}`, {
            type: 'approval',
            toolName,
            approvalId,
            action, // 'requested', 'approved', 'rejected', 'modified'
            userId,
            correlationId
        });

        if (this.appInsights) {
            this.appInsights.trackEvent({
                name: 'ApprovalAction',
                properties: {
                    toolName,
                    approvalId,
                    action,
                    userId,
                    correlationId
                }
            });
        }
    }

    /**
     * Log authentication event
     */
    logAuth(authData) {
        const { action, userId, scopes, success, error, correlationId } = authData;

        const level = success ? 'info' : 'warn';
        this._log(level, `Auth ${action}: ${success ? 'success' : 'failed'}`, {
            type: 'auth',
            action, // 'token_validation', 'authorization', 'token_exchange'
            userId,
            scopes,
            success,
            error,
            correlationId
        });
    }

    /**
     * Sanitize parameters to remove sensitive data
     */
    _sanitizeParameters(params) {
        if (!params || typeof params !== 'object') {
            return params;
        }

        const sanitized = { ...params };
        const sensitiveKeys = [
            'password', 'secret', 'token', 'key', 'apiKey', 'api_key',
            'authorization', 'auth', 'credential', 'ssn', 'creditCard',
            'cardNumber', 'cvv', 'pin'
        ];

        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(s => lowerKey.includes(s))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object') {
                sanitized[key] = this._sanitizeParameters(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Create a daily log entry for SharePoint
     */
    createDailyLogEntry(summary) {
        const date = new Date().toISOString().split('T')[0];
        
        return {
            filename: `Daily_Report_${date}.txt`,
            path: `${this.config.logPath}/Daily_Report_${date}.txt`,
            content: this._formatDailyLog(summary)
        };
    }

    /**
     * Format daily log for SharePoint
     */
    _formatDailyLog(summary) {
        const date = new Date().toISOString();
        
        return `
================================================================================
PHOENIX MCP SERVER - DAILY ACTIVITY LOG
Generated: ${date}
================================================================================

SUMMARY
-------
Total Tool Executions: ${summary.totalExecutions || 0}
Successful: ${summary.successful || 0}
Failed: ${summary.failed || 0}
Approvals Requested: ${summary.approvalsRequested || 0}
Approvals Completed: ${summary.approvalsCompleted || 0}

TOOL BREAKDOWN
--------------
${Object.entries(summary.byTool || {}).map(([tool, count]) => 
    `${tool}: ${count}`
).join('\n') || 'No tool executions'}

ERRORS
------
${summary.errors?.map(e => `- ${e.timestamp}: ${e.toolName} - ${e.error}`).join('\n') || 'No errors'}

================================================================================
END OF REPORT
================================================================================
`;
    }

    /**
     * Flush any pending logs (for graceful shutdown)
     */
    async flush() {
        if (this.appInsights) {
            return new Promise((resolve) => {
                this.appInsights.flush({
                    callback: resolve
                });
            });
        }
    }
}

module.exports = { MCPLogger };
