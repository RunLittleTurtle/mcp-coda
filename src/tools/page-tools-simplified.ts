import { CodaClient } from '../coda-client.js';

export function getPageTools() {
  return [
    {
      name: 'coda_list_pages',
      description: 'List all pages in a Coda document',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          limit: { type: 'number', description: 'Maximum pages to return (default: 100)' },
        },
        required: ['docId'],
      },
    },
  ];
}

export async function handlePageToolCall(request: any, client: CodaClient) {
  const { name, arguments: args } = request.params;
  try {
    if (name === 'coda_list_pages') {
      const result = await client.listPages(args.docId, { limit: args.limit || 100 });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    return { content: [{ type: 'text', text: 'Tool not found' }], isError: true };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
