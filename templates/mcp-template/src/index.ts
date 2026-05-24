/**
 * {{MCP_SERVER_NAME}} — MCP Server Entry Point
 * 
 * Phoenix Toolbox MCP Server Template
 * 
 * This is the main entry point for the MCP server. It handles:
 * - Server initialization and configuration
 * - Transport setup (stdio or HTTP)
 * - Tool registration
 * - Request routing
 * - Graceful shutdown
 * 
 * Reference: mcp-servers/m365-mcp/src/index.ts (production example)
 * Guide: docs/MCP_DEVELOPMENT_GUIDE.md
 * 
 * IMPORTANT:
 * - No hardcoded paths. Use process.env with fallbacks.
 * - No credentials in code. Use Azure Key Vault.
 * - All errors must be caught and returned as proper MCP error responses.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, handleToolCall } from "./tools.js";

// ============================================================
// Configuration
// ============================================================

const SERVER_NAME = "{{MCP_SERVER_NAME}}";
const SERVER_VERSION = "1.0.0";

/**
 * Server configuration loaded from environment variables.
 * All paths use fallbacks — no hardcoded values.
 */
const config = {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    logLevel: process.env.LOG_LEVEL || "info",
    phoenixRoot: process.env.PHOENIX_ROOT || `${process.env.HOME}/phoenix-toolbox`,
    // Add server-specific config here:
    // apiBaseUrl: process.env.{{API_BASE_URL}} || "https://api.example.com",
    // keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
};

// ============================================================
// Logging
// ============================================================

/**
 * Simple logger that respects LOG_LEVEL.
 * MCP servers using stdio transport MUST NOT write to stdout
 * (that's the MCP communication channel). Use stderr instead.
 */
const log = {
    debug: (...args: unknown[]) => {
          if (config.logLevel === "debug") {
                  console.error(`[${SERVER_NAME}] [DEBUG]`, ...args);
          }
    },
    info: (...args: unknown[]) => {
          if (["debug", "info"].includes(config.logLevel)) {
                  console.error(`[${SERVER_NAME}] [INFO]`, ...args);
          }
    },
    warn: (...args: unknown[]) => {
          console.error(`[${SERVER_NAME}] [WARN]`, ...args);
    },
    error: (...args: unknown[]) => {
          console.error(`[${SERVER_NAME}] [ERROR]`, ...args);
    },
};

// ============================================================
// Server Setup
// ============================================================

const server = new Server(
  {
        name: config.name,
        version: config.version,
  },
  {
        capabilities: {
                tools: {},
        },
  }
  );

// ============================================================
// Request Handlers
// ============================================================

/**
 * Handle tools/list requests.
 * Returns the array of available tools with their schemas.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    log.debug("Listing tools:", tools.length);
    return { tools };
});

/**
 * Handle tools/call requests.
 * Routes to the appropriate tool handler based on the tool name.
 */
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    log.info(`Tool call: ${name}`, args);

                           try {
                                 const result = await handleToolCall(name, args || {});
                                 log.debug(`Tool ${name} completed successfully`);
                                 return result;
                           } catch (error) {
                                 const message = error instanceof Error ? error.message : String(error);
                                 log.error(`Tool ${name} failed:`, message);
                                 return {
                                         content: [
                                           {
                                                       type: "text" as const,
                                                       text: `Error: ${message}`,
                                           },
                                                 ],
                                         isError: true,
                                 };
                           }
});

// ============================================================
// Server Lifecycle
// ============================================================

/**
 * Initialize and start the MCP server.
 * Uses stdio transport by default (standard for Claude Code integration).
 */
async function main(): Promise<void> {
    log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);
    log.info(`Phoenix root: ${config.phoenixRoot}`);
    log.info(`Log level: ${config.logLevel}`);

  // Initialize any async resources here:
  // - Azure Key Vault client
  // - Database connections
  // - API client setup
  // await initializeKeyVault(config.keyVaultUrl);
  // await initializeApiClient(config.apiBaseUrl);

  const transport = new StdioServerTransport();
    await server.connect(transport);

  log.info(`${SERVER_NAME} is running`);
}

/**
 * Graceful shutdown handler.
 * Clean up resources before exit.
 */
process.on("SIGINT", async () => {
    log.info("Received SIGINT, shutting down...");
    // Clean up resources:
             // await closeConnections();
             // await flushLogs();
             await server.close();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    log.info("Received SIGTERM, shutting down...");
    await server.close();
    process.exit(0);
});

// Start the server
main().catch((error) => {
    log.error("Fatal error:", error);
    process.exit(1);
});
