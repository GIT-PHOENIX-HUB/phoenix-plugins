# {{MCP_SERVER_NAME}} — MCP Server

## Overview

**Server name:** {{MCP_SERVER_NAME}}
**Transport:** {{TRANSPORT_TYPE}} (stdio | HTTP)
**Status:** {{STATUS}} (active | spec-only | proposal | placeholder)
**Tools:** {{TOOL_COUNT}}
**Version:** {{VERSION}}

{{SERVER_DESCRIPTION}}

## Architecture

This MCP server provides external tool access to Claude Code agents through the Model Context Protocol. It bridges the gap between Claude's native capabilities and external services, APIs, and data sources.

**Transport: stdio**
The server runs as a local process, communicating with Claude Code through stdin/stdout. This is the standard transport for local MCP servers.

**Transport: HTTP**
The server runs as an HTTP endpoint (local or remote), accessed via REST API calls. This is used for Azure Functions, cloud-hosted servers, or shared services.

## Tools

| Tool | Description | Parameters |
|------|------------|------------|
| {{TOOL_1_NAME}} | {{TOOL_1_DESC}} | {{TOOL_1_PARAMS}} |
| {{TOOL_2_NAME}} | {{TOOL_2_DESC}} | {{TOOL_2_PARAMS}} |
| {{TOOL_3_NAME}} | {{TOOL_3_DESC}} | {{TOOL_3_PARAMS}} |

## Configuration

### .mcp.json

The server is configured via `.mcp.json` in the project root or capability directory. See the `.mcp.json` template in this directory for the full configuration format.

**Critical rules:**
- NO hardcoded paths. All paths must use environment variables with fallbacks.
- - NO credentials in config files. Use Azure Key Vault references.
  - - Config paths should be relative or use `$HOME` / `$PHOENIX_ROOT` variables.
   
    - ### Environment Variables
   
    - | Variable | Description | Default |
    - |----------|------------|---------|
    - | `{{ENV_VAR_1}}` | {{ENV_DESC_1}} | {{DEFAULT_1}} |
    - | `{{ENV_VAR_2}}` | {{ENV_DESC_2}} | {{DEFAULT_2}} |
    - | `AZURE_KEY_VAULT_URL` | Key Vault URL for credential retrieval | (required) |
   
    - ### Credentials
   
    - This server uses Azure Key Vault for all credential management. No API keys, tokens, or secrets are stored in code, config files, or environment variables.
   
    - To configure credentials:
    - 1. Store the credential in Azure Key Vault
      2. 2. Reference it in the server code using the Key Vault SDK
         3. 3. Ensure the runtime environment has Key Vault access (managed identity or service principal)
           
            4. ## Installation
           
            5. ```bash
               # Navigate to the MCP server directory
               cd mcp-servers/{{MCP_SERVER_NAME}}/

               # Install dependencies
               npm install

               # Build (TypeScript servers)
               npm run build

               # Verify the server starts
               npm start
               ```

               ## Development

               ### Prerequisites

               - Node.js 18+ (LTS recommended)
               - - TypeScript 5.0+
                 - - Azure CLI (for Key Vault access during development)
                   - - Claude Code with MCP support enabled
                    
                     - ### Project Structure
                    
                     - ```
                       {{MCP_SERVER_NAME}}/
                         README.md          # This file
                         .mcp.json          # MCP configuration
                         package.json       # Dependencies and scripts
                         tsconfig.json      # TypeScript configuration
                         src/
                           index.ts         # Server entry point and lifecycle
                           tools.ts         # Tool definitions and handlers
                           types.ts         # TypeScript type definitions (optional)
                           utils.ts         # Shared utilities (optional)
                       ```

                       ### Adding a New Tool

                       1. Define the tool schema in `src/tools.ts`
                       2. 2. Implement the handler function
                          3. 3. Register the tool in the tools array
                             4. 4. Update this README with the new tool's documentation
                                5. 5. Test with Claude Code
                                  
                                   6. ### Testing
                                  
                                   7. ```bash
                                      # Run the server in development mode
                                      npm run dev

                                      # Test a specific tool (stdio transport)
                                      echo '{"method":"tools/call","params":{"name":"{{TOOL_1_NAME}}","arguments":{}}}' | npm start

                                      # Test HTTP transport
                                      curl -X POST http://localhost:{{PORT}}/tools/call \
                                        -H "Content-Type: application/json" \
                                        -d '{"name":"{{TOOL_1_NAME}}","arguments":{}}'
                                      ```

                                      ## Integration

                                      ### With Claude Code

                                      Add to your Claude Code MCP configuration:

                                      ```json
                                      {
                                        "mcpServers": {
                                          "{{MCP_SERVER_NAME}}": {
                                            "command": "node",
                                            "args": ["${PHOENIX_ROOT:-$HOME/phoenix-toolbox}/mcp-servers/{{MCP_SERVER_NAME}}/dist/index.js"],
                                            "env": {}
                                          }
                                        }
                                      }
                                      ```

                                      ### With Phoenix Gateway

                                      The Phoenix Gateway integrates MCP servers through the capability system. The Gateway runtime is vanilla JavaScript only (no frameworks). MCP calls from the Gateway go through the standard stdio/HTTP transport.

                                      ## Troubleshooting

                                      | Issue | Cause | Fix |
                                      |-------|-------|-----|
                                      | Server won't start | Missing dependencies | Run `npm install` |
                                      | Tools not appearing | .mcp.json not found | Verify config path in Claude Code settings |
                                      | Authentication errors | Key Vault access denied | Check Azure CLI login: `az login` |
                                      | Timeout on tool calls | Server process hung | Check for blocking I/O in tool handlers |

                                      ## Related Documentation

                                      - **MCP development guide:** `docs/MCP_DEVELOPMENT_GUIDE.md`
                                      - - **Architecture:** `docs/ARCHITECTURE.md`
                                        - - **Capability registry:** `CAPABILITY_REGISTRY.md`
                                          - - **Production examples:** `mcp-servers/builder-mcp/`, `mcp-servers/m365-mcp/`, `mcp-servers/marketing-mcp/`
