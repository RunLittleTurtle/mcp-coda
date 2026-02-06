import { CodaClient } from '../coda-client.js';

export function getRowTools() {
  return [
    {
      name: 'coda_list_rows',
      description: 'List all rows in a table with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          tableId: { type: 'string', description: 'The ID or name of the table' },
          query: { type: 'string', description: 'Optional query to filter rows' },
          limit: { type: 'number', description: 'Maximum rows to return (default: 100)' },
        },
        required: ['docId', 'tableId'],
      },
    },
    {
      name: 'coda_create_row',
      description: 'Create a new row in a table',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          tableId: { type: 'string', description: 'The ID or name of the table' },
          cells: {
            type: 'array',
            description: 'Array of cell objects with column and value',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string', description: 'Column ID or name' },
                value: { description: 'Value to set' },
              },
              required: ['column', 'value'],
            },
          },
        },
        required: ['docId', 'tableId', 'cells'],
      },
    },
    {
      name: 'coda_update_row',
      description: 'Update an existing row in a table',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          tableId: { type: 'string', description: 'The ID or name of the table' },
          rowId: { type: 'string', description: 'The ID of the row to update' },
          cells: {
            type: 'array',
            description: 'Array of cell objects to update',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string', description: 'Column ID or name' },
                value: { description: 'New value' },
              },
              required: ['column', 'value'],
            },
          },
        },
        required: ['docId', 'tableId', 'rowId', 'cells'],
      },
    },
  ];
}

export async function handleRowToolCall(request: any, client: CodaClient) {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'coda_list_rows':
        const rows = await client.listRows(args.docId, args.tableId, {
          query: args.query,
          useColumnNames: true,
          limit: args.limit || 100,
        });
        return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
      case 'coda_create_row':
        const newRow = await client.createRow(args.docId, args.tableId, { row: { cells: args.cells } });
        return { content: [{ type: 'text', text: JSON.stringify(newRow, null, 2) }] };
      case 'coda_update_row':
        const updatedRow = await client.updateRow(args.docId, args.tableId, args.rowId, { row: { cells: args.cells } });
        return { content: [{ type: 'text', text: JSON.stringify(updatedRow, null, 2) }] };
      default:
        return { content: [{ type: 'text', text: 'Tool not found' }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
