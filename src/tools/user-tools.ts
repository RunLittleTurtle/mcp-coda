/**
 * User/Authentication Tools
 */

import { CodaClient } from '../coda-client.js';

export function getUserTools() {
  return [
    {
      name: 'coda_whoami',
      description:
        'Get information about the current authenticated user. Use this to verify API key and check permissions.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

export async function handleUserToolCall(request: any, client: CodaClient) {
  const { name } = request.params;

  if (name === 'coda_whoami') {
    try {
      const user = await client.whoami();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: 'text', text: 'Tool not found' }],
    isError: true,
  };
}
