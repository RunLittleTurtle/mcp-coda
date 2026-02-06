import { CodaClient } from '../coda-client.js';

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractDocIdFromCodaUrl(rawUrl: string): string | undefined {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // Expected examples:
    // /d/_d167_R7sE_h/Insights-RH_suBt3VMg
    // /d/167_R7sE_h/Insights-RH_suBt3VMg
    // /d/Some-Doc_d167_R7sE_h
    if (parts[0] !== 'd' || !parts[1]) {
      return undefined;
    }

    const candidate = parts[1];
    if (candidate.startsWith('_d')) {
      return candidate.slice(2);
    }

    const embeddedDocMatch = candidate.match(/_d([A-Za-z0-9_-]+)/);
    if (embeddedDocMatch?.[1]) {
      return embeddedDocMatch[1];
    }

    return candidate;
  } catch {
    return undefined;
  }
}

function extractSearchHintsFromCodaUrl(rawUrl: string): string[] {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const pagePart = parts[2] || '';
    const hashPart = parsed.hash.replace(/^#/, '');

    const cleanPart = (value: string): string =>
      decodeURIComponent(value)
        .replace(/_[A-Za-z0-9]{6,}$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

    const pageHint = cleanPart(pagePart);
    const hashHint = cleanPart(hashPart);
    return [pageHint, hashHint].filter(Boolean);
  } catch {
    return [];
  }
}

function buildKeywords(...values: Array<unknown>): string[] {
  const keywordSet = new Set<string>();

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) {
      continue;
    }
    keywordSet.add(normalized);
    for (const token of normalized.split(' ')) {
      if (token.length >= 3) {
        keywordSet.add(token);
      }
    }
  }

  return [...keywordSet];
}

function scoreMatch(
  tableName: string,
  pageName: string,
  pageId: string,
  keywords: string[],
  requestedPageId?: string
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const normalizedTableName = normalizeText(tableName);
  const normalizedPageName = normalizeText(pageName);
  const normalizedRequestedPageId = normalizeText(requestedPageId);
  let score = 0;

  if (normalizedRequestedPageId && normalizeText(pageId) === normalizedRequestedPageId) {
    score += 120;
    reasons.push('pageId match');
  }

  for (const keyword of keywords) {
    if (!keyword) {
      continue;
    }

    if (normalizedTableName === keyword) {
      score += 80;
      reasons.push(`exact table match: ${keyword}`);
      continue;
    }

    if (normalizedTableName.includes(keyword)) {
      score += 40;
      reasons.push(`table match: ${keyword}`);
    }

    if (normalizedPageName.includes(keyword)) {
      score += 24;
      reasons.push(`page match: ${keyword}`);
    }
  }

  return { score, reasons: [...new Set(reasons)] };
}

async function listAllTables(client: CodaClient, docId: string, maxItems = 500) {
  const items: any[] = [];
  let pageToken: string | undefined;

  do {
    const result = await client.listTables(docId, {
      limit: 100,
      pageToken,
    });
    items.push(...(result.items || []));
    pageToken = result.nextPageToken;
  } while (pageToken && items.length < maxItems);

  return items.slice(0, maxItems);
}

export function getTableTools() {
  return [
    {
      name: 'coda_list_tables',
      description:
        'List tables in a Coda document, with optional fuzzy search by table name/page name or Coda URL context',
      inputSchema: {
        type: 'object',
        properties: {
          docId: {
            type: 'string',
            description: 'The document ID (optional if contextUrl contains a Coda doc URL)',
          },
          limit: { type: 'number', description: 'Maximum tables to return (default: 100)' },
          query: {
            type: 'string',
            description: 'Free-text query to find relevant tables by table/page name',
          },
          pageName: {
            type: 'string',
            description: 'Hint for the parent page name (e.g. "Insights RH")',
          },
          pageId: {
            type: 'string',
            description: 'Filter tables under a specific page ID',
          },
          contextUrl: {
            type: 'string',
            description: 'Optional full Coda URL; used to infer docId and search hints',
          },
          includeColumns: {
            type: 'boolean',
            description: 'When true, include column list for each matched table',
          },
          scanLimit: {
            type: 'number',
            description: 'Maximum tables to scan before ranking (default: 500)',
          },
        },
        required: [],
      },
    },
    {
      name: 'coda_get_table',
      description: 'Get detailed information about a specific table',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          tableId: { type: 'string', description: 'The ID or name of the table' },
        },
        required: ['docId', 'tableId'],
      },
    },
    {
      name: 'coda_list_columns',
      description: 'List all columns in a table',
      inputSchema: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'The ID of the document' },
          tableId: { type: 'string', description: 'The ID or name of the table' },
          limit: { type: 'number', description: 'Maximum columns to return (default: 100)' },
        },
        required: ['docId', 'tableId'],
      },
    },
  ];
}

export async function handleTableToolCall(request: any, client: CodaClient) {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'coda_list_tables': {
        const inferredDocId = args.contextUrl ? extractDocIdFromCodaUrl(args.contextUrl) : undefined;
        const docId = args.docId || inferredDocId;

        if (!docId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: docId is required (or provide a valid contextUrl with a Coda doc ID)',
              },
            ],
            isError: true,
          };
        }

        const hasSearchFilters = Boolean(
          args.query || args.pageName || args.pageId || args.contextUrl || args.includeColumns
        );

        // Keep old behavior for simple listing for backwards compatibility.
        if (!hasSearchFilters) {
          const tables = await client.listTables(docId, { limit: args.limit || 100 });
          return { content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }] };
        }

        const maxScan = Math.max(100, Number(args.scanLimit) || 500);
        const allTables = await listAllTables(client, docId, maxScan);
        const contextHints = args.contextUrl ? extractSearchHintsFromCodaUrl(args.contextUrl) : [];
        const keywords = buildKeywords(args.query, args.pageName, ...contextHints);

        const scored = allTables
          .map((table) => {
            const tableName = table?.name || '';
            const parentName = table?.parent?.name || '';
            const parentId = table?.parent?.id || '';
            const { score, reasons } = scoreMatch(
              tableName,
              parentName,
              parentId,
              keywords,
              args.pageId
            );
            return {
              table,
              score,
              reasons,
            };
          })
          .filter((entry) => {
            if (args.pageId && normalizeText(entry.table?.parent?.id) === normalizeText(args.pageId)) {
              return true;
            }
            if (keywords.length === 0) {
              return true;
            }
            return entry.score > 0;
          })
          .sort((a, b) => b.score - a.score || String(a.table?.name).localeCompare(String(b.table?.name)));

        const resultLimit = Math.max(1, Number(args.limit) || 100);
        const selected = scored.slice(0, resultLimit);
        const includeColumns = Boolean(args.includeColumns);

        const items = await Promise.all(
          selected.map(async ({ table, score, reasons }) => {
            if (!includeColumns) {
              return { ...table, matchScore: score, matchReasons: reasons };
            }

            try {
              const columnResult = await client.listColumns(docId, table.id, { limit: 200 });
              return {
                ...table,
                columns: columnResult.items || [],
                matchScore: score,
                matchReasons: reasons,
              };
            } catch (error) {
              return {
                ...table,
                columns: [],
                columnsError: error instanceof Error ? error.message : String(error),
                matchScore: score,
                matchReasons: reasons,
              };
            }
          })
        );

        const payload = {
          items,
          totalMatched: scored.length,
          totalScanned: allTables.length,
          filters: {
            docId,
            query: args.query || null,
            pageName: args.pageName || null,
            pageId: args.pageId || null,
            contextUrl: args.contextUrl || null,
          },
          hintsFromContextUrl: contextHints,
        };

        return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
      }
      case 'coda_get_table':
        const table = await client.getTable(args.docId, args.tableId);
        return { content: [{ type: 'text', text: JSON.stringify(table, null, 2) }] };
      case 'coda_list_columns':
        const columns = await client.listColumns(args.docId, args.tableId, { limit: args.limit || 100 });
        return { content: [{ type: 'text', text: JSON.stringify(columns, null, 2) }] };
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
