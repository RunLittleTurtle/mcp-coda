/**
 * Coda API Client
 * Handles all HTTP requests to the Coda API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  CodaConfig,
  CodaDocument,
  CodaPage,
  CodaTable,
  CodaColumn,
  CodaRow,
  CodaFormula,
  CodaControl,
  CodaUser,
  ListResponse,
  CodaApiError,
} from './types.js';

const CODA_API_BASE_URL = 'https://coda.io/apis/v1';

export class CodaClient {
  private client: AxiosInstance;

  constructor(config: CodaConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || CODA_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<CodaApiError>) => {
        if (error.response) {
          const apiError = error.response.data;
          throw new Error(
            `Coda API Error (${error.response.status}): ${apiError.message || error.message}`
          );
        }
        throw error;
      }
    );
  }

  // User/Auth Methods
  async whoami(): Promise<CodaUser> {
    const { data } = await this.client.get('/whoami');
    return data;
  }

  // Document Methods
  async listDocs(params?: {
    isOwner?: boolean;
    query?: string;
    sourceDoc?: string;
    isStarred?: boolean;
    inGallery?: boolean;
    workspaceId?: string;
    folderId?: string;
    limit?: number;
    pageToken?: string;
  }): Promise<ListResponse<CodaDocument>> {
    const { data } = await this.client.get('/docs', { params });
    return data;
  }

  async getDoc(docId: string): Promise<CodaDocument> {
    const { data } = await this.client.get(`/docs/${docId}`);
    return data;
  }

  async createDoc(params: {
    title: string;
    sourceDoc?: string;
    timezone?: string;
    folderId?: string;
    initialPage?: {
      name?: string;
      subtitle?: string;
      iconName?: string;
      imageUrl?: string;
      parentPageId?: string;
      pageContent?: {
        type: string;
        content?: string;
        canvasContent?: {
          format: string;
          content: string;
        };
      };
    };
  }): Promise<CodaDocument> {
    const { data } = await this.client.post('/docs', params);
    return data;
  }

  async deleteDoc(docId: string): Promise<{ requestId?: string; [key: string]: unknown }> {
    const { data } = await this.client.delete(`/docs/${docId}`);
    return data;
  }

  // Page Methods
  async listPages(
    docId: string,
    params?: { limit?: number; pageToken?: string }
  ): Promise<ListResponse<CodaPage>> {
    const { data } = await this.client.get(`/docs/${docId}/pages`, { params });
    return data;
  }

  async getPage(docId: string, pageId: string): Promise<CodaPage> {
    const { data } = await this.client.get(`/docs/${docId}/pages/${pageId}`);
    return data;
  }

  async createPage(
    docId: string,
    params: {
      name: string;
      subtitle?: string;
      iconName?: string;
      imageUrl?: string;
      parentPageId?: string;
      pageContent?: {
        type: string;
        content?: string;
        canvasContent?: {
          format: string;
          content: string;
        };
      };
    }
  ): Promise<CodaPage> {
    const { data } = await this.client.post(`/docs/${docId}/pages`, params);
    return data;
  }

  async updatePage(
    docId: string,
    pageId: string,
    params: {
      name?: string;
      subtitle?: string;
      iconName?: string;
      imageUrl?: string;
      contentUpdate?: {
        insertionMode: string;
        canvasContent?: {
          format: string;
          content: string;
        };
        content?: string;
      };
    }
  ): Promise<CodaPage> {
    const { data } = await this.client.put(`/docs/${docId}/pages/${pageId}`, params);
    return data;
  }

  async deletePage(docId: string, pageId: string): Promise<void> {
    await this.client.delete(`/docs/${docId}/pages/${pageId}`);
  }

  // Table Methods
  async listTables(
    docId: string,
    params?: {
      limit?: number;
      pageToken?: string;
      sortBy?: string;
      tableTypes?: string[];
    }
  ): Promise<ListResponse<CodaTable>> {
    const { data } = await this.client.get(`/docs/${docId}/tables`, { params });
    return data;
  }

  async getTable(docId: string, tableId: string): Promise<CodaTable> {
    const { data } = await this.client.get(`/docs/${docId}/tables/${tableId}`);
    return data;
  }

  // Column Methods
  async listColumns(
    docId: string,
    tableId: string,
    params?: { limit?: number; pageToken?: string }
  ): Promise<ListResponse<CodaColumn>> {
    const { data } = await this.client.get(`/docs/${docId}/tables/${tableId}/columns`, {
      params,
    });
    return data;
  }

  async getColumn(docId: string, tableId: string, columnId: string): Promise<CodaColumn> {
    const { data } = await this.client.get(
      `/docs/${docId}/tables/${tableId}/columns/${columnId}`
    );
    return data;
  }

  // Row Methods
  async listRows(
    docId: string,
    tableId: string,
    params?: {
      query?: string;
      sortBy?: string;
      useColumnNames?: boolean;
      valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
      limit?: number;
      pageToken?: string;
      visibleOnly?: boolean;
    }
  ): Promise<ListResponse<CodaRow>> {
    const { data } = await this.client.get(`/docs/${docId}/tables/${tableId}/rows`, {
      params,
    });
    return data;
  }

  async getRow(
    docId: string,
    tableId: string,
    rowId: string,
    params?: {
      useColumnNames?: boolean;
      valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
    }
  ): Promise<CodaRow> {
    const { data } = await this.client.get(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, {
      params,
    });
    return data;
  }

  async createRow(
    docId: string,
    tableId: string,
    params: {
      rows: Array<{
        cells: Array<{ column: string; value: any }>;
      }>;
      keyColumns?: string[];
      disableParsing?: boolean;
    }
  ): Promise<{
    requestId?: string;
    addedRowIds?: string[];
    [key: string]: unknown;
  }> {
    const { disableParsing, ...body } = params;
    const { data } = await this.client.post(`/docs/${docId}/tables/${tableId}/rows`, body, {
      params: typeof disableParsing === 'boolean' ? { disableParsing } : undefined,
    });
    return data;
  }

  async updateRow(
    docId: string,
    tableId: string,
    rowId: string,
    params: {
      row: {
        cells: Array<{ column: string; value: any }>;
      };
      disableParsing?: boolean;
    }
  ): Promise<{ requestId?: string; id?: string; [key: string]: unknown }> {
    const { disableParsing, ...body } = params;
    const { data } = await this.client.put(
      `/docs/${docId}/tables/${tableId}/rows/${rowId}`,
      body,
      {
        params: typeof disableParsing === 'boolean' ? { disableParsing } : undefined,
      }
    );
    return data;
  }

  async deleteRow(docId: string, tableId: string, rowId: string): Promise<void> {
    await this.client.delete(`/docs/${docId}/tables/${tableId}/rows/${rowId}`);
  }

  async deleteRows(docId: string, tableId: string, rowIds: string[]): Promise<void> {
    await this.client.delete(`/docs/${docId}/tables/${tableId}/rows`, {
      data: { rowIds },
    });
  }

  // Formula Methods
  async listFormulas(
    docId: string,
    params?: { limit?: number; pageToken?: string }
  ): Promise<ListResponse<CodaFormula>> {
    const { data } = await this.client.get(`/docs/${docId}/formulas`, { params });
    return data;
  }

  async getFormula(docId: string, formulaId: string): Promise<CodaFormula> {
    const { data } = await this.client.get(`/docs/${docId}/formulas/${formulaId}`);
    return data;
  }

  // Control Methods
  async listControls(
    docId: string,
    params?: { limit?: number; pageToken?: string; sortBy?: string }
  ): Promise<ListResponse<CodaControl>> {
    const { data } = await this.client.get(`/docs/${docId}/controls`, { params });
    return data;
  }

  async getControl(docId: string, controlId: string): Promise<CodaControl> {
    const { data } = await this.client.get(`/docs/${docId}/controls/${controlId}`);
    return data;
  }

  async pushButton(
    docId: string,
    tableId: string,
    rowId: string,
    columnId: string
  ): Promise<{ requestId?: string; [key: string]: unknown }> {
    const { data } = await this.client.post(
      `/docs/${docId}/tables/${tableId}/rows/${rowId}/buttons/${columnId}`
    );
    return data;
  }

  // Legacy endpoint kept as fallback for older Coda API behavior.
  async pushControlButtonLegacy(
    docId: string,
    controlId: string
  ): Promise<{ requestId?: string; [key: string]: unknown }> {
    const { data } = await this.client.post(`/docs/${docId}/controls/${controlId}/push`);
    return data;
  }
}
