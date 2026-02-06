#!/usr/bin/env node
/**
 * Coda MCP Server - Stdio Transport (for Claude Desktop/Cursor)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CodaClient } from './coda-client.js';
import { loadDotEnv } from './env.js';
import { registerAllTools } from './tools/index.js';

// Load .env from the project root when present.
loadDotEnv();

// Get API key from environment
const apiKey = process.env.API_KEY || process.env.CODA_API_KEY;

if (!apiKey) {
  console.error('Error: API_KEY environment variable is required');
  console.error('Get your Coda API key from: https://coda.io/account');
  process.exit(1);
}

// Create Coda API client
const codaClient = new CodaClient({ apiKey });

// Create MCP server
const server = new Server(
  {
    name: 'coda-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all Coda tools
registerAllTools(server, codaClient);

// Create stdio transport
const transport = new StdioServerTransport();

// Connect server to transport
async function main() {
  try {
    await server.connect(transport);
    console.error('✓ Coda MCP Server running on stdio transport');
    console.error('✓ Ready to accept requests from Claude Desktop/Cursor');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
