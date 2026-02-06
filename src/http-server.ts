#!/usr/bin/env node
/**
 * Coda MCP Server - HTTP/Streamable HTTP Transport (for LangSmith Agent Builder)
 */

import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { CodaClient } from './coda-client.js';
import { loadDotEnv } from './env.js';
import { registerAllTools } from './tools/index.js';

// Load .env from the project root when present.
loadDotEnv();

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const apiKey = process.env.API_KEY || process.env.CODA_API_KEY;

if (!apiKey) {
  console.error('Error: API_KEY environment variable is required');
  console.error('Get your Coda API key from: https://coda.io/account');
  process.exit(1);
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create Coda API client
const codaClient = new CodaClient({ apiKey });

function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'coda-mcp-http',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerAllTools(server, codaClient);
  return server;
}

// Keep one transport per session for routing requests.
const sseTransports: Record<string, SSEServerTransport> = {};
const streamableTransports: Record<string, StreamableHTTPServerTransport> = {};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    transport: 'http',
    version: '1.0.0',
    server: 'coda-mcp-http',
  });
});

// SSE endpoint for MCP protocol
app.get('/sse', async (req, res) => {
  console.log('New SSE connection request');

  // Create a new MCP server instance for this connection
  const server = createMcpServer();

  // Create SSE transport
  const transport = new SSEServerTransport('/message', res);
  sseTransports[transport.sessionId] = transport;

  res.on('close', () => {
    delete sseTransports[transport.sessionId];
  });

  try {
    await server.connect(transport);
    console.log('✓ SSE transport connected');
  } catch (error) {
    delete sseTransports[transport.sessionId];
    console.error('Failed to connect SSE transport:', error);
    res.status(500).json({ error: 'Failed to establish SSE connection' });
  }
});

// Streamable HTTP endpoint (recommended for LangSmith Agent Builder)
function normalizeMcpAcceptHeader(req: express.Request): void {
  const acceptHeader = req.headers.accept;
  const current = typeof acceptHeader === 'string' ? acceptHeader : '';
  const normalized = current.toLowerCase();

  // Some clients send only application/json, but MCP SDK currently expects both values.
  if (!current) {
    req.headers.accept = 'application/json, text/event-stream';
    return;
  }

  if (normalized.includes('application/json') && !normalized.includes('text/event-stream')) {
    req.headers.accept = `${current}, text/event-stream`;
    return;
  }

  if (normalized.includes('text/event-stream') && !normalized.includes('application/json')) {
    req.headers.accept = `${current}, application/json`;
  }
}

app.all('/mcp', async (req, res) => {
  normalizeMcpAcceptHeader(req);

  const rawSessionId = req.headers['mcp-session-id'];
  const sessionId =
    typeof rawSessionId === 'string'
      ? rawSessionId
      : Array.isArray(rawSessionId) && typeof rawSessionId[0] === 'string'
        ? rawSessionId[0]
        : undefined;

  try {
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId) {
      transport = streamableTransports[sessionId];
      if (!transport) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: `Session not found: ${sessionId}`,
          },
          id: null,
        });
        return;
      }
    } else if (req.method === 'POST' && isInitializeRequest(req.body)) {
      let createdTransport: StreamableHTTPServerTransport;
      createdTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          streamableTransports[newSessionId] = createdTransport;
        },
      });

      createdTransport.onclose = () => {
        if (createdTransport.sessionId) {
          delete streamableTransports[createdTransport.sessionId];
        }
      };

      transport = createdTransport;
      const server = createMcpServer();
      await server.connect(transport);
      console.log('✓ Streamable HTTP transport connected');
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'Bad Request: missing or invalid MCP session. Send initialize as POST /mcp first.',
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Failed to handle /mcp request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Message endpoint for receiving client messages
app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId;
  let normalizedSessionId: string | undefined;
  if (typeof sessionId === 'string') {
    normalizedSessionId = sessionId;
  } else if (Array.isArray(sessionId) && typeof sessionId[0] === 'string') {
    normalizedSessionId = sessionId[0];
  }

  let transport: SSEServerTransport | undefined;
  if (normalizedSessionId) {
    transport = sseTransports[normalizedSessionId];
  } else {
    const activeTransports = Object.values(sseTransports);
    // Convenience for manual local testing with curl when exactly one SSE session exists.
    if (activeTransports.length === 1) {
      transport = activeTransports[0];
    }
  }

  if (!transport) {
    const message = normalizedSessionId
      ? `No transport found for sessionId ${normalizedSessionId}`
      : 'Missing sessionId query parameter and no single active SSE session found';
    res.status(400).json({ error: message });
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Failed to handle POST message:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process MCP message' });
    }
  }
});

// Root endpoint with information
app.get('/', (req, res) => {
  res.json({
    name: 'Coda MCP Server (HTTP)',
    version: '1.0.0',
    description:
      'Model Context Protocol server for Coda API with Streamable HTTP (/mcp) and legacy SSE transport',
    transport: 'Streamable HTTP + SSE (legacy)',
    endpoints: {
      health: 'GET /health',
      mcp: 'GET/POST/DELETE /mcp',
      sse: 'GET /sse',
      message: 'POST /message',
    },
    documentation: 'https://github.com/yourusername/coda-mcp-http',
    coda_tools_count: 15, // Approximate - update based on actual count
  });
});

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✓ Coda MCP HTTP Server running on port ${PORT}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Transport:     Streamable HTTP + SSE (legacy)`);
  console.log(`  MCP endpoint:  http://localhost:${PORT}/mcp`);
  console.log(`  SSE endpoint:  http://localhost:${PORT}/sse`);
  console.log(`  Health check:  http://localhost:${PORT}/health`);
  console.log(`  Info:          http://localhost:${PORT}/`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  For LangSmith Agent Builder, use:`);
  console.log(`    URL: http://localhost:${PORT}/mcp`);
  console.log('═══════════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down HTTP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down HTTP server...');
  process.exit(0);
});
