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
      description: 'Push a button control in a Coda document',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          controlId: { type: 'string', description: 'The ID or name of the button control' },
        },
        required: ['docId', 'controlId'],
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
        const result = await client.pushButton(args.docId, args.controlId);
        return { content: [{ type: 'text', text: `Button pushed successfully. Request ID: ${result.requestId}` }] };
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
