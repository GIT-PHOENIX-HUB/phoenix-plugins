/**
 * {{MCP_SERVER_NAME}} — Tool Definitions
 * 
 * Phoenix Toolbox MCP Server Template
 * 
 * This file defines all tools exposed by this MCP server.
 * Each tool has:
 * - A schema (name, description, input parameters)
 * - A handler function (the actual implementation)
 * 
 * Reference: mcp-servers/m365-mcp/src/tools.ts (production example)
 * Guide: docs/MCP_DEVELOPMENT_GUIDE.md
 * 
 * RULES:
 * - Every tool must have clear input validation
 * - Every tool must return proper MCP response format
 * - No hardcoded paths — use config/env vars
 * - No credentials in code — use Azure Key Vault
 * - All errors must be caught and returned gracefully
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// ============================================================
// Type Definitions
// ============================================================

/**
 * Standard MCP tool response format.
 */
interface ToolResponse {
    content: Array<{
          type: "text";
          text: string;
    }>;
    isError?: boolean;
}

/**
 * Tool handler function signature.
 */
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;

// ============================================================
// Tool Definitions
// ============================================================

/**
 * Array of tool schemas exposed to Claude Code.
 * 
 * Each tool needs:
 * - name: Unique identifier (snake_case recommended)
 * - description: What the tool does (Claude reads this to decide when to use it)
 * - inputSchema: JSON Schema for the tool's parameters
 * 
 * TIPS:
 * - Write descriptions from the AI's perspective: "Retrieves..." not "This tool retrieves..."
 * - Be specific about what the tool returns
 * - Document required vs optional parameters clearly
 * - Include examples in descriptions when helpful
 */
export const tools: Tool[] = [
  {
        name: "{{tool_1_name}}",
        description: "{{TOOL_1_DESCRIPTION}}. Returns {{TOOL_1_RETURN_DESCRIPTION}}.",
        inputSchema: {
                type: "object" as const,
                properties: {
                          // Define parameters here:
                  // param_name: {
                  //   type: "string",
                  //   description: "What this parameter controls"
                  // },
                  query: {
                              type: "string",
                              description: "{{PARAM_DESCRIPTION}}",
                  },
                },
                required: ["query"],
        },
  },
  {
        name: "{{tool_2_name}}",
        description: "{{TOOL_2_DESCRIPTION}}. Returns {{TOOL_2_RETURN_DESCRIPTION}}.",
        inputSchema: {
                type: "object" as const,
                properties: {
                          id: {
                                      type: "string",
                                      description: "{{PARAM_DESCRIPTION}}",
                          },
                          options: {
                                      type: "object",
                                      description: "Optional configuration for the operation",
                                      properties: {
                                                    verbose: {
                                                                    type: "boolean",
                                                                    description: "Include detailed output",
                                                    },
                                      },
                          },
                },
                required: ["id"],
        },
  },
  ];

// ============================================================
// Tool Handlers
// ============================================================

/**
 * Map of tool names to their handler functions.
 * Add a handler for every tool defined above.
 */
const handlers: Record<string, ToolHandler> = {
    /**
         * Handler for {{tool_1_name}}.
     * {{TOOL_1_DESCRIPTION}}
     */
    "{{tool_1_name}}": async (args): Promise<ToolResponse> => {
          const query = args.query as string;

      // Validate input
      if (!query || typeof query !== "string") {
              return {
                        content: [{ type: "text", text: "Error: 'query' parameter is required and must be a string." }],
                        isError: true,
              };
      }

      try {
              // TODO: Implement actual tool logic
            // Examples:
            // - Call an external API
            // - Read from a database
            // - Process local files
            // - Query Azure Key Vault for credentials first if needed

            const result = `Placeholder result for query: ${query}`;

            return {
                      content: [{ type: "text", text: result }],
            };
      } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              return {
                        content: [{ type: "text", text: `Error in {{tool_1_name}}: ${message}` }],
                        isError: true,
              };
      }
    },

    /**
         * Handler for {{tool_2_name}}.
     * {{TOOL_2_DESCRIPTION}}
     */
    "{{tool_2_name}}": async (args): Promise<ToolResponse> => {
          const id = args.id as string;
          const options = (args.options as Record<string, unknown>) || {};

      if (!id || typeof id !== "string") {
              return {
                        content: [{ type: "text", text: "Error: 'id' parameter is required and must be a string." }],
                        isError: true,
              };
      }

      try {
              // TODO: Implement actual tool logic
            const verbose = options.verbose === true;
              const result = verbose
                ? `Detailed result for id: ${id}`
                        : `Result for id: ${id}`;

            return {
                      content: [{ type: "text", text: result }],
            };
      } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              return {
                        content: [{ type: "text", text: `Error in {{tool_2_name}}: ${message}` }],
                        isError: true,
              };
      }
    },
};

// ============================================================
// Tool Router
// ============================================================

/**
 * Routes a tool call to the appropriate handler.
 * Called from index.ts when a tools/call request is received.
 * 
 * @param name - The tool name from the MCP request
 * @param args - The tool arguments from the MCP request
 * @returns The tool response
 * @throws Error if the tool name is not recognized
 */
export async function handleToolCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResponse> {
    const handler = handlers[name];

  if (!handler) {
        throw new Error(
                `Unknown tool: ${name}. Available tools: ${Object.keys(handlers).join(", ")}`
              );
  }

  return handler(args);
}
