/**
 * Document Tools - Create, read, update, delete Coda documents
 */

import { CodaClient } from '../coda-client.js';

export function getDocumentTools() {
  return [
    {
      name: 'coda_list_docs',
      description:
        'List all Coda documents accessible to the authenticated user. Supports filtering by owner, workspace, folder, and search query.',
      inputSchema: {
        type: 'object',
        properties: {
          isOwner: {
            type: 'boolean',
            description: 'Filter to only docs owned by the user',
          },
          query: {
            type: 'string',
            description: 'Search query to filter documents by name',
          },
          workspaceId: {
            type: 'string',
            description: 'Filter to docs in a specific workspace',
          },
          folderId: {
            type: 'string',
            description: 'Filter to docs in a specific folder',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of documents to return (default: 100)',
          },
        },
        required: [],
      },
    },
    {
      name: 'coda_get_doc',
      description:
        'Get detailed information about a specific Coda document by its ID. Returns metadata like name, owner, creation date, and links.',
      inputSchema: {
        type: 'object',
        properties: {
          docId: {
            type: 'string',
            description: 'The ID of the document to retrieve',
          },
        },
        required: ['docId'],
      },
    },
    {
      name: 'coda_create_doc',
      description:
        'Create a new Coda document. Can optionally copy from an existing document (sourceDoc) or create with initial content.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the new document',
          },
          sourceDoc: {
            type: 'string',
            description: 'Optional: ID of a document to copy from',
          },
          folderId: {
            type: 'string',
            description: 'Optional: Folder ID where the document should be created',
          },
          timezone: {
            type: 'string',
            description: 'Optional: Timezone for the document (e.g., "America/Los_Angeles")',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'coda_delete_doc',
      description:
        'Permanently delete a Coda document. This action cannot be undone. Use with caution.',
      inputSchema: {
        type: 'object',
        properties: {
          docId: {
            type: 'string',
            description: 'The ID of the document to delete',
          },
        },
        required: ['docId'],
      },
    },
  ];
}

export async function handleDocumentToolCall(request: any, client: CodaClient) {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'coda_list_docs': {
        const result = await client.listDocs({
          isOwner: args.isOwner,
          query: args.query,
          workspaceId: args.workspaceId,
          folderId: args.folderId,
          limit: args.limit || 100,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'coda_get_doc': {
        const doc = await client.getDoc(args.docId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2),
            },
          ],
        };
      }

      case 'coda_create_doc': {
        const newDoc = await client.createDoc({
          title: args.title,
          sourceDoc: args.sourceDoc,
          folderId: args.folderId,
          timezone: args.timezone,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newDoc, null, 2),
            },
          ],
        };
      }

      case 'coda_delete_doc': {
        const result = await client.deleteDoc(args.docId);
        return {
          content: [
            {
              type: 'text',
              text:
                `Document delete queued for ${args.docId}. ` +
                `Request ID: ${result.requestId ?? 'unknown'}`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: 'Tool not found' }],
          isError: true,
        };
    }
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
