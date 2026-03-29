# Phoenix MCP Server

Model Context Protocol server providing centralized tool execution, OAuth 2.1 authentication, and approval workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Clients                              │
│              (ChatGPT, VS Code, Claude, Custom)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PhoenixMCPServer                              │
│                   (Express.js + OAuth 2.1)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │    Tool     │  │       Approval          │  │
│  │   Handler   │  │   Registry  │  │       Widgets           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Logger    │  │  Protected  │  │      Health Check       │  │
│  │   (Audit)   │  │  Resource   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
    ServiceTitan        MS Graph           QuickBooks
```

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main server class (`PhoenixMCPServer`) |
| `server.js` | Standalone entry point for `npm run mcp` |
| `toolRegistry.js` | Tool registration and execution |
| `auth.js` | OAuth 2.1 + PKCE authentication |
| `approvalWidgets.js` | Two-step approval UI components |
| `logger.js` | Audit logging to App Insights + SharePoint |
| `protectedResource.js` | RFC 9728 OAuth metadata |

## Quick Start

### Start the Server

```bash
# Via npm script
npm run mcp

# Or directly
node src/mcp/server.js
```

### Connect a Client

```javascript
// Example: Using fetch
const response = await fetch('http://localhost:3000/mcp/tools', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const tools = await response.json();

// Execute a tool
const result = await fetch('http://localhost:3000/mcp/tools/servicetitan_getJobs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  })
});
```

## OAuth 2.1 Authentication

### Authorization Flow (PKCE)

```javascript
// 1. Generate PKCE challenge
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// 2. Redirect to authorization
const authUrl = new URL('http://localhost:3000/mcp/auth/authorize');
authUrl.searchParams.set('client_id', 'your-client-id');
authUrl.searchParams.set('redirect_uri', 'http://localhost:8080/callback');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'tools:read tools:write');
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('state', generateState());

// 3. Exchange code for token
const tokenResponse = await fetch('http://localhost:3000/mcp/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'http://localhost:8080/callback',
    client_id: 'your-client-id',
    code_verifier: codeVerifier
  })
});

const { access_token, refresh_token, expires_in } = await tokenResponse.json();
```

### OAuth Metadata Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/oauth-authorization-server` | OAuth server metadata |
| `/.well-known/oauth-protected-resource` | RFC 9728 resource metadata |

## Tool Registry

### Available Tools (20+)

| Category | Tools |
|----------|-------|
| **servicetitan** | `getJobs`, `getCustomer`, `searchCustomers`, `createJob`, `updateJob`, `getInvoices`, `getTechnicians` |
| **graph** | `getEmails`, `sendEmail`, `createDraft`, `getCalendar`, `createEvent`, `uploadFile` |
| **email** | `triageInbox`, `generateDraft`, `saveAttachment` |
| **scheduling** | `getAvailability`, `bookAppointment`, `reschedule` |
| **finance** | `getPendingBills`, `approveBill`, `syncInvoices`, `getAging` |
| **governance** | `auditPermissions`, `checkCompliance`, `requestAccess` |
| **system** | `healthCheck`, `getCapabilities`, `getLogs` |

### Registering a Tool

```javascript
const { MCPToolRegistry } = require('./toolRegistry');

const registry = new MCPToolRegistry();

registry.registerTool({
  name: 'myCustomTool',
  category: 'custom',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'The input value' },
      options: { 
        type: 'object',
        properties: {
          verbose: { type: 'boolean', default: false }
        }
      }
    },
    required: ['input']
  },
  handler: async (params, context) => {
    // Implementation
    const result = await doSomething(params.input);
    return { success: true, data: result };
  },
  requiresApproval: true, // Triggers approval widget for write operations
  riskLevel: 'medium'
});
```

### Tool Execution with Approval

```javascript
// Tools with requiresApproval: true trigger two-step flow
const pendingResult = await registry.executeTool('finance_approveBill', {
  billId: '12345',
  amount: 15000
}, context);

// Returns approval widget for user confirmation
// {
//   status: 'pending_approval',
//   widget: {
//     type: 'approval',
//     title: 'Approve Bill Payment',
//     details: { ... },
//     actions: ['approve', 'reject']
//   }
// }

// After user approves
const finalResult = await registry.confirmApproval(pendingResult.approvalId, 'approve');
```

## Approval Widgets

### Widget Types

```javascript
const { ApprovalWidgets } = require('./approvalWidgets');

// Confirmation widget (simple yes/no)
const confirmWidget = ApprovalWidgets.createConfirmation({
  title: 'Delete Customer Record',
  message: 'This action cannot be undone. Continue?',
  destructive: true
});

// Diff widget (show changes)
const diffWidget = ApprovalWidgets.createDiff({
  title: 'Update Job Status',
  before: { status: 'Scheduled', notes: 'Original note' },
  after: { status: 'Completed', notes: 'Job completed successfully' }
});

// Multi-select widget (choose from options)
const selectWidget = ApprovalWidgets.createMultiSelect({
  title: 'Select Recipients',
  options: [
    { id: 'shane', label: 'Shane Warehime', email: 'shane@...' },
    { id: 'stephanie', label: 'Stephanie', email: 'stephanie@...' }
  ],
  minSelections: 1
});
```

## Audit Logging

All tool executions are logged:

```javascript
const { MCPLogger } = require('./logger');

const logger = new MCPLogger({
  appInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  sharePointLogPath: 'Phoenix Electric/99_Logs'
});

// Automatic logging on tool execution
logger.toolExecution({
  tool: 'finance_approveBill',
  params: { billId: '12345' },
  result: { success: true },
  user: 'shane@phoenixelectric.life',
  duration: 1250
});

// Audit events
logger.audit('bill_approved', {
  billId: '12345',
  approver: 'Shane',
  amount: 15000
});
```

### Log Destinations

| Destination | Purpose | Retention |
|-------------|---------|-----------|
| Azure Application Insights | Real-time monitoring, alerts | 90 days |
| SharePoint 99_Logs | Compliance, audit trail | 7 years |
| Console | Development debugging | Session |

## API Endpoints

### MCP Protocol

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp/tools` | GET | List available tools |
| `/mcp/tools/:toolName` | POST | Execute a tool |
| `/mcp/tools/:toolName/schema` | GET | Get tool JSON schema |
| `/mcp/approvals/:id` | POST | Confirm/reject pending approval |
| `/mcp/approvals` | GET | List pending approvals |

### Authentication

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp/auth/authorize` | GET | OAuth authorization |
| `/mcp/auth/token` | POST | Token exchange |
| `/mcp/auth/revoke` | POST | Revoke token |
| `/mcp/auth/userinfo` | GET | Get current user info |

### System

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness probe |
| `/.well-known/oauth-authorization-server` | GET | OAuth metadata |
| `/.well-known/oauth-protected-resource` | GET | Resource metadata |

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `MCP_PORT` | Server port | 3000 |
| `MCP_HOST` | Server host | localhost |
| `KEY_VAULT_NAME` | Azure Key Vault | <KEY_VAULT_NAME> |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights | - |
| `MCP_ALLOWED_ORIGINS` | CORS origins | * |
| `MCP_TOKEN_EXPIRY` | Token lifetime (seconds) | 3600 |

### Security Configuration

```javascript
// In index.js
const server = new PhoenixMCPServer({
  port: 3000,
  cors: {
    origins: ['https://chat.openai.com', 'https://claude.ai'],
    credentials: true
  },
  rateLimit: {
    windowMs: 60000,
    max: 100
  },
  auth: {
    providers: ['entra', 'auth0'],
    requirePKCE: true
  }
});
```

## Supported MCP Clients

| Client | Status | Notes |
|--------|--------|-------|
| ChatGPT (Actions) | ✅ Supported | Via OpenAPI spec |
| Claude Desktop | ✅ Supported | Native MCP |
| VS Code (Copilot) | ✅ Supported | MCP extension |
| Custom Apps | ✅ Supported | REST API |

## Testing

```bash
# Start server
npm run mcp

# Health check
curl http://localhost:3000/health

# List tools
curl http://localhost:3000/mcp/tools

# Execute tool (requires auth)
curl -X POST http://localhost:3000/mcp/tools/system_healthCheck \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Get OAuth metadata
curl http://localhost:3000/.well-known/oauth-authorization-server
```

## Golden Rules Enforcement

The MCP server enforces Phoenix governance rules:

1. **No external email auto-send** - Email tools create drafts only
2. **Approval required for writes** - Tools with `requiresApproval: true`
3. **All actions logged** - Every tool execution is audited
4. **Token-based access** - No anonymous tool execution
5. **Rate limiting** - Prevents abuse
