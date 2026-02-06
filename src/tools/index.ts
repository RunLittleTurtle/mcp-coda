/**
 * Tool Registry - Registers all Coda tools with the MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CodaClient } from '../coda-client.js';
import { getUserTools, handleUserToolCall } from './user-tools.js';
import { getDocumentTools, handleDocumentToolCall } from './document-tools.js';
import { getPageTools, handlePageToolCall } from './page-tools-simplified.js';
import { getTableTools, handleTableToolCall } from './table-tools-simplified.js';
import { getRowTools, handleRowToolCall } from './row-tools-simplified.js';
import { getFormulaTools, handleFormulaToolCall } from './formula-tools-simplified.js';
import { getControlTools, handleControlToolCall } from './control-tools-simplified.js';

export function registerAllTools(server: Server, client: CodaClient): void {
  // Collect all tool definitions
  const allTools = [
    ...getUserTools(),
    ...getDocumentTools(),
    ...getPageTools(),
    ...getTableTools(),
    ...getRowTools(),
    ...getFormulaTools(),
    ...getControlTools(),
  ];

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name } = request.params;

    // Route to appropriate handler based on tool name prefix
    if (name === 'coda_whoami') {
      return handleUserToolCall(request, client);
    } else if (
      name.startsWith('coda_list_docs') ||
      name.startsWith('coda_get_doc') ||
      name.startsWith('coda_create_doc') ||
      name.startsWith('coda_delete_doc')
    ) {
      return handleDocumentToolCall(request, client);
    } else if (name.includes('_page')) {
      return handlePageToolCall(request, client);
    } else if (name.includes('_table') || name.includes('_column')) {
      return handleTableToolCall(request, client);
    } else if (name.includes('_row')) {
      return handleRowToolCall(request, client);
    } else if (name.includes('_formula')) {
      return handleFormulaToolCall(request, client);
    } else if (name.includes('_control') || name.includes('_button')) {
      return handleControlToolCall(request, client);
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  console.log(`✓ Registered ${allTools.length} Coda tools successfully`);
}
