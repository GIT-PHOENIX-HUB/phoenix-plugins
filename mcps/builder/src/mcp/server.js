/**
 * Phoenix MCP Server - Standalone Entry Point
 * 
 * Run with: node src/mcp/server.js
 * Or: npm run mcp
 */

const { PhoenixMCPServer } = require('./index');

// Load environment variables
require('dotenv').config();

// Configuration from environment
const config = {
    port: process.env.MCP_PORT || 3000,
    azureFunctionsBaseUrl: process.env.AZURE_FUNCTIONS_URL || 'http://localhost:7071',
    keyVaultName: process.env.KEY_VAULT_NAME || '<KEY_VAULT_NAME>',
    baseUrl: process.env.MCP_BASE_URL || `http://localhost:${process.env.MCP_PORT || 3000}`,
    
    // OAuth configuration
    authorizationUrl: process.env.MCP_OAUTH_ISSUER 
        ? `${process.env.MCP_OAUTH_ISSUER}/authorize`
        : 'https://auth.phoenix.local/authorize',
    tokenUrl: process.env.MCP_OAUTH_ISSUER
        ? `${process.env.MCP_OAUTH_ISSUER}/token`
        : 'https://auth.phoenix.local/token',
    
    logLevel: process.env.LOG_LEVEL || 'info'
};

// Create and start server
const server = new PhoenixMCPServer(config);

server.start().then(() => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🔥 PHOENIX MCP SERVER STARTED 🔥                   ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Port:           ${config.port.toString().padEnd(43)}║`);
    console.log(`║  Backend:        ${config.azureFunctionsBaseUrl.substring(0, 43).padEnd(43)}║`);
    console.log(`║  Key Vault:      ${config.keyVaultName.padEnd(43)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                                  ║');
    console.log('║    GET  /health                    - Health check            ║');
    console.log('║    GET  /.well-known/ai-plugin.json - Plugin manifest        ║');
    console.log('║    GET  /.well-known/oauth-protected-resource - OAuth meta   ║');
    console.log('║    GET  /openapi.yaml              - OpenAPI specification   ║');
    console.log('║    GET  /mcp/tools                 - List available tools    ║');
    console.log('║    POST /mcp/tools/:toolName       - Execute a tool          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down...');
    server.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...');
    server.stop();
    process.exit(0);
});

module.exports = server;
