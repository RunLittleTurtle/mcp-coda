import { CodaClient } from '../coda-client.js';

export function getControlTools() {
  return [
    {
      name: 'coda_list_controls',
      description: 'List all controls (buttons, sliders, etc.) in a Coda document',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          limit: { type: 'number', description: 'Maximum controls to return (default: 100)' },
        },
        required: ['docId'],
      },
    },
    {
      name: 'coda_push_button',
      description:
        'Push a button in a Coda table row (recommended: docId + tableId + rowId + columnId). Legacy controlId fallback is also supported.',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          tableId: {
            type: 'string',
            description: 'The table ID or name containing the button column',
          },
          rowId: {
            type: 'string',
            description: 'The row ID or name where the button will be pushed',
          },
          columnId: {
            type: 'string',
            description: 'The button column ID or name to push',
          },
          controlId: {
            type: 'string',
            description:
              'Legacy fallback only. Prefer tableId + rowId + columnId for Coda API v1 compatibility.',
          },
        },
        required: ['docId'],
      },
    },
  ];
}

export async function handleControlToolCall(request: any, client: CodaClient) {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'coda_list_controls':
        const controls = await client.listControls(args.docId, { limit: args.limit || 100 });
        return { content: [{ type: 'text', text: JSON.stringify(controls, null, 2) }] };
      case 'coda_push_button':
        if (args.tableId && args.rowId && args.columnId) {
          const result = await client.pushButton(args.docId, args.tableId, args.rowId, args.columnId);
          return {
            content: [
              {
                type: 'text',
                text: `Button pushed successfully. Request ID: ${result.requestId ?? 'unknown'}`,
              },
            ],
          };
        }

        if (args.controlId) {
          const result = await client.pushControlButtonLegacy(args.docId, args.controlId);
          return {
            content: [
              {
                type: 'text',
                text:
                  `Button pushed via legacy control endpoint. ` +
                  `Request ID: ${result.requestId ?? 'unknown'}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text:
                'Error: coda_push_button requires either (tableId + rowId + columnId) ' +
                'or legacy controlId.',
            },
          ],
          isError: true,
        };
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
