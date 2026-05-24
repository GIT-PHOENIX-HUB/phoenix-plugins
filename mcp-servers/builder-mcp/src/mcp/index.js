/**
 * Phoenix MCP Server - Main Entry Point
 * 
 * The TL (Top-Level) MCP server that serves as the single control plane for
 * Phoenix Electric's AI Operational Steward. This server:
 * - Advertises tools to ChatGPT via OpenAI Apps SDK
 * - Enforces per-tool security and OAuth 2.1 flows
 * - Proxies calls to Azure Functions/Logic Apps backend
 * - Logs all activity for audit compliance
 * 
 * Architecture: ChatGPT -> Apps SDK -> MCP Server -> Azure Functions -> ServiceTitan/Graph/etc
 */

const express = require('express');
const cors = require('cors');
const { MCPToolRegistry } = require('./toolRegistry');
const { MCPAuthHandler } = require('./auth');
const { MCPLogger } = require('./logger');
const { ProtectedResourceMetadata } = require('./protectedResource');

class PhoenixMCPServer {
    constructor(config = {}) {
        this.config = {
            port: config.port || process.env.MCP_PORT || 3000,
            azureFunctionsBaseUrl: config.azureFunctionsBaseUrl || process.env.AZURE_FUNCTIONS_URL,
            keyVaultName: config.keyVaultName || process.env.KEY_VAULT_NAME || '<KEY_VAULT_NAME>',
            enableAuth: config.enableAuth !== false,
            logLevel: config.logLevel || 'info',
            ...config
        };

        this.app = express();
        this.toolRegistry = new MCPToolRegistry();
        this.authHandler = new MCPAuthHandler(this.config);
        this.logger = new MCPLogger(this.config);
        this.protectedResource = new ProtectedResourceMetadata(this.config);

        this._setupMiddleware();
        this._registerRoutes();
        this._registerTools();
    }

    /**
     * Setup Express middleware
     */
    _setupMiddleware() {
        // CORS for ChatGPT Apps SDK
        this.app.use(cors({
            origin: [
                'https://chat.openai.com',
                'https://chatgpt.com',
                'http://localhost:*'
            ],
            credentials: true
        }));

        this.app.use(express.json());

        // Request logging
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            res.on('finish', () => {
                this.logger.logRequest({
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: Date.now() - startTime,
                    userAgent: req.get('User-Agent'),
                    correlationId: req.headers['x-correlation-id']
                });
            });
            next();
        });
    }

    /**
     * Register all HTTP routes
     */
    _registerRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });

        // OpenAI Apps SDK discovery endpoints
        this.app.get('/.well-known/ai-plugin.json', (req, res) => {
            res.json(this._getPluginManifest());
        });

        // OAuth protected resource metadata (RFC 9728)
        this.app.get('/.well-known/oauth-protected-resource', (req, res) => {
            res.json(this.protectedResource.getMetadata());
        });

        // MCP tool listing endpoint
        this.app.get('/mcp/tools', (req, res) => {
            res.json({
                tools: this.toolRegistry.listTools(),
                version: '1.0.0',
                server: 'Phoenix MCP'
            });
        });

        // MCP tool execution endpoint
        this.app.post('/mcp/tools/:toolName', async (req, res) => {
            await this._executeToolHandler(req, res);
        });

        // OpenAPI spec for ChatGPT
        this.app.get('/openapi.yaml', (req, res) => {
            res.type('text/yaml').send(this._generateOpenAPISpec());
        });

        // Individual tool endpoints (for direct HTTP access)
        this._registerToolEndpoints();
    }

    /**
     * Register individual tool HTTP endpoints
     */
    _registerToolEndpoints() {
        // Read-only endpoints (no auth required beyond API key)
        this.app.get('/api/jobs/daily-summary', async (req, res) => {
            await this._proxyToFunction(req, res, 'getDailyJobSummary');
        });

        this.app.get('/api/technicians/on-call', async (req, res) => {
            await this._proxyToFunction(req, res, 'getOnCallTechnician');
        });

        this.app.get('/api/emails/unread-summary', async (req, res) => {
            await this._proxyToFunction(req, res, 'getUnreadEmailSummary');
        });

        this.app.get('/api/customers/:id', async (req, res) => {
            await this._proxyToFunction(req, res, 'getCustomerDetails', { customerId: req.params.id });
        });

        this.app.get('/api/jobs/:id', async (req, res) => {
            await this._proxyToFunction(req, res, 'getJobDetails', { jobId: req.params.id });
        });

        // Write endpoints (OAuth protected)
        this.app.post('/api/jobs/assign-technician', 
            this.authHandler.requireScope('st.write'),
            async (req, res) => {
                await this._proxyToFunction(req, res, 'assignNearestTechnician', req.body);
            }
        );

        this.app.post('/api/quotes/draft',
            this.authHandler.requireScope('st.write'),
            async (req, res) => {
                await this._proxyToFunction(req, res, 'createQuoteDraft', req.body);
            }
        );

        this.app.post('/api/emails/draft',
            this.authHandler.requireScope('graph.mail.draft'),
            async (req, res) => {
                await this._proxyToFunction(req, res, 'createEmailDraft', req.body);
            }
        );

        this.app.post('/api/teams/post',
            this.authHandler.requireScope('graph.teams.post'),
            async (req, res) => {
                await this._proxyToFunction(req, res, 'postToTeams', req.body);
            }
        );
    }

    /**
     * Register all available MCP tools
     */
    _registerTools() {
        // ServiceTitan Read Tools
        this.toolRegistry.registerTool({
            name: 'getDailyJobSummary',
            description: 'Get a summary of all jobs scheduled for today including status, technician assignments, and customer details',
            category: 'servicetitan',
            requiresAuth: false,
            scopes: ['st.read'],
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', format: 'date', description: 'Date to get summary for (defaults to today)' },
                    businessUnitId: { type: 'string', description: 'Filter by business unit' }
                }
            }
        });

        this.toolRegistry.registerTool({
            name: 'getOnCallTechnician',
            description: 'Get the on-call technician for a specific date and business unit',
            category: 'servicetitan',
            requiresAuth: false,
            scopes: ['st.read'],
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', format: 'date' },
                    businessUnitId: { type: 'string' }
                }
            }
        });

        this.toolRegistry.registerTool({
            name: 'getJobDetails',
            description: 'Get detailed information about a specific job including appointments, invoices, and history',
            category: 'servicetitan',
            requiresAuth: false,
            scopes: ['st.read'],
            parameters: {
                type: 'object',
                properties: {
                    jobId: { type: 'string', description: 'ServiceTitan Job ID', required: true }
                },
                required: ['jobId']
            }
        });

        this.toolRegistry.registerTool({
            name: 'getCustomerDetails',
            description: 'Get customer information including locations, contact info, and job history',
            category: 'servicetitan',
            requiresAuth: false,
            scopes: ['st.read'],
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', description: 'ServiceTitan Customer ID', required: true }
                },
                required: ['customerId']
            }
        });

        this.toolRegistry.registerTool({
            name: 'searchCustomers',
            description: 'Search for customers by name, phone, email, or address',
            category: 'servicetitan',
            requiresAuth: false,
            scopes: ['st.read'],
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                    searchType: { type: 'string', enum: ['name', 'phone', 'email', 'address', 'any'] }
                },
                required: ['query']
            }
        });

        this.toolRegistry.registerTool({
            name: 'getCapacityAvailability',
            description: 'Get real-time availability for scheduling new jobs',
            category: 'servicetitan',
            requiresAuth: false,
            scopes: ['st.read'],
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' },
                    businessUnitId: { type: 'string' },
                    jobTypeId: { type: 'string' }
                },
                required: ['startDate', 'endDate']
            }
        });

        // ServiceTitan Write Tools (OAuth protected)
        this.toolRegistry.registerTool({
            name: 'assignNearestTechnician',
            description: 'Assign the nearest available technician to a job. Requires approval.',
            category: 'servicetitan',
            requiresAuth: true,
            scopes: ['st.write'],
            requiresApproval: true,
            parameters: {
                type: 'object',
                properties: {
                    jobId: { type: 'string', required: true },
                    preferredTechnicianId: { type: 'string' },
                    reason: { type: 'string' }
                },
                required: ['jobId']
            }
        });

        this.toolRegistry.registerTool({
            name: 'createQuoteDraft',
            description: 'Create a draft quote/estimate for a job. Requires approval before sending.',
            category: 'servicetitan',
            requiresAuth: true,
            scopes: ['st.write'],
            requiresApproval: true,
            parameters: {
                type: 'object',
                properties: {
                    jobId: { type: 'string', required: true },
                    items: { type: 'array', items: { type: 'object' } },
                    notes: { type: 'string' }
                },
                required: ['jobId', 'items']
            }
        });

        this.toolRegistry.registerTool({
            name: 'bookJob',
            description: 'Book a new job for a customer at a location. Requires approval.',
            category: 'servicetitan',
            requiresAuth: true,
            scopes: ['st.write'],
            requiresApproval: true,
            parameters: {
                type: 'object',
                properties: {
                    customerId: { type: 'string', required: true },
                    locationId: { type: 'string', required: true },
                    jobTypeId: { type: 'string', required: true },
                    scheduledDate: { type: 'string', format: 'date-time' },
                    summary: { type: 'string' }
                },
                required: ['customerId', 'locationId', 'jobTypeId']
            }
        });

        // Microsoft Graph Tools
        this.toolRegistry.registerTool({
            name: 'getUnreadEmailSummary',
            description: 'Get a summary of unread emails from monitored mailboxes',
            category: 'graph',
            requiresAuth: false,
            scopes: ['graph.mail.read'],
            parameters: {
                type: 'object',
                properties: {
                    mailbox: { type: 'string', description: 'Mailbox to check (defaults to all monitored)' },
                    maxResults: { type: 'number', default: 20 }
                }
            }
        });

        this.toolRegistry.registerTool({
            name: 'createEmailDraft',
            description: 'Create a draft email reply. Does NOT send - human review required.',
            category: 'graph',
            requiresAuth: true,
            scopes: ['graph.mail.draft'],
            requiresApproval: false, // Draft only, no approval needed
            parameters: {
                type: 'object',
                properties: {
                    mailbox: { type: 'string', required: true },
                    replyToMessageId: { type: 'string' },
                    to: { type: 'array', items: { type: 'string' } },
                    subject: { type: 'string' },
                    body: { type: 'string', required: true },
                    isHtml: { type: 'boolean', default: false }
                },
                required: ['mailbox', 'body']
            }
        });

        this.toolRegistry.registerTool({
            name: 'postToTeams',
            description: 'Post a message to a Teams channel',
            category: 'graph',
            requiresAuth: true,
            scopes: ['graph.teams.post'],
            requiresApproval: false, // Internal only
            parameters: {
                type: 'object',
                properties: {
                    channelId: { type: 'string' },
                    webhookUrl: { type: 'string' },
                    message: { type: 'string', required: true },
                    cardType: { type: 'string', enum: ['text', 'adaptive'], default: 'text' }
                },
                required: ['message']
            }
        });

        this.toolRegistry.registerTool({
            name: 'getCalendarEvents',
            description: 'Get calendar events for a user',
            category: 'graph',
            requiresAuth: false,
            scopes: ['graph.calendars.read'],
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' }
                }
            }
        });

        // Courier Tools (Email Triage)
        this.toolRegistry.registerTool({
            name: 'runEmailTriage',
            description: 'Run the email triage process for all monitored mailboxes',
            category: 'courier',
            requiresAuth: true,
            scopes: ['courier.run'],
            parameters: {
                type: 'object',
                properties: {
                    mailboxes: { type: 'array', items: { type: 'string' } },
                    dryRun: { type: 'boolean', default: false }
                }
            }
        });

        this.toolRegistry.registerTool({
            name: 'getTriageSummary',
            description: 'Get the summary from the last email triage run',
            category: 'courier',
            requiresAuth: false,
            scopes: ['courier.read'],
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', format: 'date' }
                }
            }
        });

        // Builder Tools (Governance)
        this.toolRegistry.registerTool({
            name: 'provisionUser',
            description: 'Provision a new user account with standard licenses and group memberships. Requires approval.',
            category: 'builder',
            requiresAuth: true,
            scopes: ['builder.users.write'],
            requiresApproval: true,
            parameters: {
                type: 'object',
                properties: {
                    displayName: { type: 'string', required: true },
                    email: { type: 'string', required: true },
                    department: { type: 'string' },
                    jobTitle: { type: 'string' },
                    manager: { type: 'string' }
                },
                required: ['displayName', 'email']
            }
        });

        this.toolRegistry.registerTool({
            name: 'runPermissionAudit',
            description: 'Run a permission audit across the tenant',
            category: 'builder',
            requiresAuth: true,
            scopes: ['builder.audit.read'],
            parameters: {
                type: 'object',
                properties: {
                    scope: { type: 'string', enum: ['all', 'admins', 'guests', 'external'] },
                    outputFormat: { type: 'string', enum: ['summary', 'detailed', 'csv'] }
                }
            }
        });

        // Finance Tools (placeholder for future)
        this.toolRegistry.registerTool({
            name: 'getAPAgingSummary',
            description: 'Get accounts payable aging summary',
            category: 'finance',
            requiresAuth: true,
            scopes: ['finance.read'],
            parameters: {
                type: 'object',
                properties: {
                    asOfDate: { type: 'string', format: 'date' }
                }
            }
        });

        this.toolRegistry.registerTool({
            name: 'getARAgingSummary',
            description: 'Get accounts receivable aging summary',
            category: 'finance',
            requiresAuth: true,
            scopes: ['finance.read'],
            parameters: {
                type: 'object',
                properties: {
                    asOfDate: { type: 'string', format: 'date' }
                }
            }
        });
    }

    /**
     * Execute a tool via the MCP endpoint
     */
    async _executeToolHandler(req, res) {
        const { toolName } = req.params;
        const parameters = req.body;
        const correlationId = req.headers['x-correlation-id'] || this._generateCorrelationId();

        try {
            const tool = this.toolRegistry.getTool(toolName);
            if (!tool) {
                return res.status(404).json({
                    error: 'Tool not found',
                    toolName,
                    availableTools: this.toolRegistry.listToolNames()
                });
            }

            // Check authentication for protected tools
            if (tool.requiresAuth) {
                const authResult = await this.authHandler.validateRequest(req, tool.scopes);
                if (!authResult.valid) {
                    return res.status(401).json({
                        error: 'Authentication required',
                        requiredScopes: tool.scopes,
                        authorizationUrl: this.authHandler.getAuthorizationUrl(tool.scopes)
                    });
                }
            }

            // Check if approval is required
            if (tool.requiresApproval) {
                const approvalStatus = await this._checkApprovalStatus(toolName, parameters, correlationId);
                if (!approvalStatus.approved) {
                    return res.status(202).json({
                        status: 'pending_approval',
                        approvalId: approvalStatus.approvalId,
                        tool: toolName,
                        parameters,
                        approvalWidget: this._generateApprovalWidget(tool, parameters, approvalStatus.approvalId)
                    });
                }
            }

            // Execute the tool
            const result = await this._proxyToFunctionDirect(toolName, parameters, correlationId);

            // Log successful execution
            this.logger.logToolExecution({
                toolName,
                parameters,
                result: { success: true },
                correlationId,
                userId: req.user?.id
            });

            res.json({
                success: true,
                toolName,
                result,
                correlationId
            });

        } catch (error) {
            this.logger.logError({
                toolName,
                parameters,
                error: error.message,
                correlationId
            });

            res.status(500).json({
                error: 'Tool execution failed',
                message: error.message,
                correlationId
            });
        }
    }

    /**
     * Proxy request to Azure Functions backend
     */
    async _proxyToFunction(req, res, functionName, additionalParams = {}) {
        const correlationId = req.headers['x-correlation-id'] || this._generateCorrelationId();
        
        try {
            const result = await this._proxyToFunctionDirect(
                functionName,
                { ...req.query, ...req.body, ...additionalParams },
                correlationId
            );
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: 'Backend request failed',
                message: error.message,
                correlationId
            });
        }
    }

    /**
     * Direct proxy to Azure Functions
     */
    async _proxyToFunctionDirect(functionName, parameters, correlationId) {
        const axios = require('axios');
        
        const functionUrl = `${this.config.azureFunctionsBaseUrl}/api/${functionName}`;
        
        const response = await axios({
            method: 'POST',
            url: functionUrl,
            data: parameters,
            headers: {
                'Content-Type': 'application/json',
                'x-correlation-id': correlationId,
                'x-functions-key': process.env.AZURE_FUNCTIONS_KEY
            },
            timeout: 30000
        });

        return response.data;
    }

    /**
     * Check approval status for a tool execution
     */
    async _checkApprovalStatus(toolName, parameters, correlationId) {
        // In production, this would check SharePoint/database for approval status
        // For now, return pending to demonstrate the flow
        return {
            approved: false,
            approvalId: `approval_${correlationId}`,
            status: 'pending'
        };
    }

    /**
     * Generate approval widget HTML for ChatGPT Apps SDK
     */
    _generateApprovalWidget(tool, parameters, approvalId) {
        return {
            type: 'approval',
            title: `Approve: ${tool.name}`,
            description: tool.description,
            parameters,
            approvalId,
            actions: [
                { type: 'approve', label: 'Approve', style: 'primary' },
                { type: 'reject', label: 'Reject', style: 'danger' },
                { type: 'modify', label: 'Modify', style: 'secondary' }
            ]
        };
    }

    /**
     * Get plugin manifest for OpenAI Apps SDK
     */
    _getPluginManifest() {
        return {
            schema_version: 'v1',
            name_for_human: 'Phoenix Electric Assistant',
            name_for_model: 'phoenix_assistant',
            description_for_human: 'AI assistant for Phoenix Electric - manage jobs, customers, emails, and more through ServiceTitan and Microsoft 365.',
            description_for_model: 'Phoenix Electric AI Operational Steward. Use this plugin to interact with ServiceTitan (field service management), Microsoft 365 (email, calendar, files), and internal systems. Available tools include job management, customer lookup, email triage, technician dispatch, and more. Some write operations require approval.',
            auth: {
                type: 'oauth',
                authorization_url: `${this.config.authorizationUrl || 'https://auth.phoenix.local'}/authorize`,
                authorization_content_type: 'application/json',
                client_url: `${this.config.baseUrl}/oauth/register`,
                scope: 'st.read st.write graph.mail.read graph.mail.draft',
                verification_tokens: {
                    openai: process.env.OPENAI_VERIFICATION_TOKEN
                }
            },
            api: {
                type: 'openapi',
                url: `${this.config.baseUrl}/openapi.yaml`
            },
            logo_url: `${this.config.baseUrl}/logo.png`,
            contact_email: 'support@phoenixelectric.life',
            legal_info_url: 'https://phoenixelectric.life/legal'
        };
    }

    /**
     * Generate OpenAPI specification
     */
    _generateOpenAPISpec() {
        const tools = this.toolRegistry.listTools();
        
        const paths = {};
        for (const tool of tools) {
            paths[`/mcp/tools/${tool.name}`] = {
                post: {
                    operationId: tool.name,
                    summary: tool.description,
                    description: `${tool.description}${tool.requiresApproval ? ' (Requires approval)' : ''}`,
                    tags: [tool.category],
                    security: tool.requiresAuth ? [{ oauth2: tool.scopes }] : [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: tool.parameters
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            toolName: { type: 'string' },
                                            result: { type: 'object' },
                                            correlationId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '202': {
                            description: 'Pending approval'
                        },
                        '401': {
                            description: 'Authentication required'
                        }
                    }
                }
            };
        }

        return `
openapi: 3.0.0
info:
  title: Phoenix MCP API
  description: Phoenix Electric AI Operational Steward API - MCP tools for ServiceTitan, Microsoft 365, and internal systems
  version: 1.0.0
servers:
  - url: ${this.config.baseUrl || 'http://localhost:3000'}
    description: Phoenix MCP Server
components:
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: ${this.config.authorizationUrl || 'https://auth.phoenix.local'}/authorize
          tokenUrl: ${this.config.tokenUrl || 'https://auth.phoenix.local'}/token
          scopes:
            st.read: Read ServiceTitan data
            st.write: Write ServiceTitan data (requires approval)
            graph.mail.read: Read emails
            graph.mail.draft: Create email drafts
            graph.teams.post: Post to Teams
            courier.run: Run email triage
            courier.read: Read triage results
            builder.users.write: Provision users
            builder.audit.read: Run audits
            finance.read: Read financial data
paths:
${Object.entries(paths).map(([path, methods]) => `  ${path}:
    post:
      operationId: ${methods.post.operationId}
      summary: ${methods.post.summary}
      tags: [${methods.post.tags.join(', ')}]
      responses:
        '200':
          description: Success`).join('\n')}
`;
    }

    /**
     * Generate a correlation ID for request tracking
     */
    _generateCorrelationId() {
        return `phx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start the MCP server
     */
    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.config.port, () => {
                console.log(`🔥 Phoenix MCP Server running on port ${this.config.port}`);
                console.log(`📋 Tools available: ${this.toolRegistry.listToolNames().length}`);
                console.log(`🔗 Plugin manifest: http://localhost:${this.config.port}/.well-known/ai-plugin.json`);
                console.log(`📖 OpenAPI spec: http://localhost:${this.config.port}/openapi.yaml`);
                resolve(this.server);
            });
        });
    }

    /**
     * Stop the MCP server
     */
    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = { PhoenixMCPServer };
