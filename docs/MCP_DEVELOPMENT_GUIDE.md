# MCP Development Guide

## Phoenix Toolbox — Model Context Protocol Server Development

This guide covers everything you need to build, configure, and deploy MCP servers within the Phoenix Toolbox ecosystem. MCP servers are the bridge between Claude Code agents and external services, APIs, and data sources.

## What Are MCP Servers?

The Model Context Protocol (MCP) is an open standard that lets AI assistants connect to external tools and data sources. In the Phoenix Toolbox, MCP servers expose specialized tools that Claude Code agents can call during conversations.

When a user asks Claude to check their calendar, the M365 MCP server handles the Microsoft Graph API call. When a marketing agent needs Google Ads data, the marketing MCP server provides it. The agent focuses on reasoning and conversation; the MCP server handles the external integration.

The Phoenix Toolbox currently maintains 9 MCP server entries across three directories under `mcp-servers/`, plus capability-embedded servers like the volt-marketing MCP.

## Architecture Overview

```
User <-> Claude Code <-> MCP Protocol <-> MCP Server <-> External API
                |                              |
                |-- stdio (local process) -----+
                |-- HTTP (remote endpoint) ----+
```

MCP servers in the Phoenix ecosystem follow a consistent pattern. The server registers tools with Claude Code. Claude decides when to call each tool based on the conversation context and the tool's description. The server receives the call, executes the logic, and returns results. Claude incorporates the results into its response.

## Transport Types

### stdio Transport

The server runs as a child process of Claude Code. Communication happens through stdin/stdout using JSON-RPC messages. This is the standard transport for local development and most Phoenix MCP servers.

Advantages: Simple setup, no network configuration, works offline, process lifecycle managed by Claude Code.

Disadvantages: Must run on the same machine as Claude Code, one instance per session.

Configuration in `.mcp.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${PHOENIX_ROOT:-$HOME/phoenix-toolbox}/mcp-servers/my-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### HTTP Transport

The server runs as an HTTP endpoint, either locally or on a remote host. Requests arrive as HTTP POST calls. This is used for Azure Functions, shared services, and cloud-hosted servers.

Advantages: Can run on remote infrastructure, shared across sessions, scales independently.

Disadvantages: Requires network access, more complex deployment, needs authentication.

Configuration in `.mcp.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "url": "https://my-function.azurewebsites.net/api/mcp",
      "headers": {}
    }
  }
}
```

The builder-mcp server uses HTTP transport via Azure Functions. The m365-mcp and marketing-mcp servers use stdio transport.

## Building an MCP Server — Step by Step

### Step 1: Plan Your Tools

Before writing code, define what tools your server will expose. Each tool needs a clear name (snake_case), a description that Claude reads to decide when to use it, an input schema defining the parameters, and a return format.

Good tool design means Claude naturally knows when to call each tool. Write descriptions from the AI's perspective, be specific about return values, and make parameters self-documenting.

### Step 2: Scaffold from Template

Copy the MCP template directory:

```
cp -r templates/mcp-template/ mcp-servers/{{your-server-name}}/
```

This gives you: README.md (server documentation), .mcp.json (configuration), package.json (dependencies), src/index.ts (entry point), and src/tools.ts (tool definitions).

### Step 3: Define Tool Schemas

In `src/tools.ts`, define your tools in the `tools` array. Each tool is a JSON Schema object that Claude uses to understand the tool's interface:

```typescript
export const tools: Tool[] = [
  {
    name: "get_customer",
    description: "Retrieves a customer record by ID or email. Returns customer name, contact info, and service history.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Customer ID (numeric) or email address"
        },
        include_history: {
          type: "boolean",
          description: "Whether to include service history (default: false)"
        }
      },
      required: ["identifier"]
    }
  }
];
```

### Step 4: Implement Handlers

Each tool needs a handler function that receives the validated arguments and returns an MCP response:

```typescript
const handlers: Record<string, ToolHandler> = {
  "get_customer": async (args) => {
    const identifier = args.identifier as string;

    // Validate input
    if (!identifier) {
      return {
        content: [{ type: "text", text: "Error: identifier is required" }],
        isError: true
      };
    }

    // Call external API (credentials from Key Vault)
    const apiKey = await getSecret("customer-api-key");
    const customer = await fetchCustomer(identifier, apiKey);

    return {
      content: [{ type: "text", text: JSON.stringify(customer, null, 2) }]
    };
  }
};
```

### Step 5: Configure the Server

Edit `.mcp.json` with your server's configuration. Remember the critical rules: no hardcoded paths (use `${PHOENIX_ROOT:-$HOME/phoenix-toolbox}`), no credentials in config (use Azure Key Vault), and use environment variable fallbacks for all configurable values.

### Step 6: Handle Credentials with Azure Key Vault

The Phoenix ecosystem uses Azure Key Vault for all credential management. Never store API keys, tokens, or secrets in code, config files, or environment variables.

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const credential = new DefaultAzureCredential();
const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
const client = new SecretClient(vaultUrl, credential);

async function getSecret(name: string): Promise<string> {
  const secret = await client.getSecret(name);
  return secret.value!;
}
```

For local development, use `az login` to authenticate. For production, use managed identities.

### Step 7: Build and Test

```bash
cd mcp-servers/your-server/
npm install
npm run build

# Test with direct invocation
echo '{"method":"tools/list"}' | node dist/index.js

# Test with Claude Code (add to .mcp.json, restart Claude)
```

### Step 8: Document

Update the server's README.md with all tools documented (name, description, parameters, return format), configuration requirements, environment variables, installation steps, and troubleshooting guide.

### Step 9: Register

Add your MCP server to `CAPABILITY_REGISTRY.md` in the MCP Servers section. Include the server name, tool count, transport type, status, and description.

## Logging Best Practices

MCP servers using stdio transport MUST NOT write to stdout — that channel is reserved for MCP protocol messages. All logging goes to stderr using `console.error()`.

Use structured log levels (debug, info, warn, error) controlled by a `LOG_LEVEL` environment variable. Log tool calls at info level, results at debug level, and errors at error level. Include the server name as a prefix in all log messages for easy filtering.

## Error Handling

Every tool handler must catch all errors and return them as proper MCP error responses. Never let uncaught exceptions crash the server — Claude Code will lose the connection and the user's context.

Return errors with `isError: true` and a clear message explaining what went wrong and what to try instead. Log the full error details to stderr for debugging.

## Configuration Rules

These rules are non-negotiable in the Phoenix ecosystem:

No hardcoded paths. Every file path must use environment variables with fallbacks. Use `${PHOENIX_ROOT:-$HOME/phoenix-toolbox}` as the base path pattern. This ensures the server works on any machine without modification.

No credentials in code. All API keys, tokens, and secrets go through Azure Key Vault. The `.mcp.json` config file, source code, and environment variable definitions must never contain actual credentials.

Configurable everything. Timeouts, API endpoints, log levels, and feature flags should all be configurable via environment variables with sensible defaults.

## Production MCP Servers — Reference

| Server | Transport | Tools | Status | Location |
|--------|----------|-------|--------|----------|
| builder-mcp | HTTP (Azure Functions) | 20+ | Active | `mcp-servers/builder-mcp/` |
| m365-mcp | stdio (TypeScript) | 18 | Active | `mcp-servers/m365-mcp/` |
| marketing-mcp | Mixed | 6 sub-servers | Mixed | `mcp-servers/marketing-mcp/` |
| volt-marketing | stdio | 8 | Active | `capabilities/volt-marketing/mcp/` |

Study these servers to understand production patterns, error handling strategies, and configuration approaches.

## Common Mistakes

Logging to stdout instead of stderr breaks the MCP protocol on stdio transport. Always use `console.error()` for logging.

Hardcoding file paths makes the server break on other machines. Always use environment variables with fallbacks.

Missing input validation causes cryptic errors. Validate every parameter before using it.

Not handling async errors causes the server to crash silently. Wrap all async operations in try/catch.

Putting credentials in `.mcp.json` exposes them in the Git repository. Use Azure Key Vault.

Vague tool descriptions mean Claude calls the wrong tool. Write descriptions from the AI's perspective and be specific about what the tool returns.

## Related Documentation

- **Architecture overview:** `docs/ARCHITECTURE.md`
- - **Plugin development:** `docs/PLUGIN_DEVELOPMENT_GUIDE.md`
  - - **Skill authoring:** `docs/SKILL_AUTHORING_GUIDE.md`
    - - **MCP template:** `templates/mcp-template/`
      - - **Capability registry:** `CAPABILITY_REGISTRY.md`
