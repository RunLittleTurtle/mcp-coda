/**
 * Core types for Coda MCP Server
 */

export interface CodaConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface CodaDocument {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  icon?: {
    name: string;
    type: string;
    browserLink?: string;
  };
  name: string;
  owner: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    type: string;
    organizationId: string;
    browserLink: string;
  };
  folder: {
    id: string;
    type: string;
    browserLink: string;
    name: string;
  };
  workspaceId: string;
  folderId: string;
}

export interface CodaPage {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  name: string;
  subtitle?: string;
  icon?: {
    name: string;
    type: string;
    browserLink?: string;
  };
  image?: {
    type: string;
    browserLink?: string;
  };
  contentType: string;
  isHidden: boolean;
  children?: CodaPage[];
  parent?: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
}

export interface CodaTable {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  name: string;
  parent: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
  parentTable?: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
  displayColumn: {
    id: string;
    type: string;
    href: string;
  };
  rowCount: number;
  sorts: any[];
  layout: string;
  filter?: {
    valid: boolean;
    isVolatile: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CodaColumn {
  id: string;
  type: string;
  href: string;
  name: string;
  calculated: boolean;
  formula?: string;
  defaultValue?: string;
  display: boolean;
  format?: {
    type: string;
    isArray: boolean;
    label?: string;
  };
}

export interface CodaRow {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  name: string;
  index: number;
  createdAt: string;
  updatedAt: string;
  values: Record<string, any>;
}

export interface CodaFormula {
  id: string;
  type: string;
  href: string;
  name: string;
  formula?: string;
  value?: any;
}

export interface CodaControl {
  id: string;
  type: string;
  href: string;
  name: string;
  controlType: string;
  value?: any;
}

export interface CodaUser {
  name: string;
  loginId: string;
  type: string;
  scoped: boolean;
  tokenName?: string;
  href: string;
  workspace?: {
    id: string;
    type: string;
    organizationId: string;
    browserLink: string;
  };
}

export interface ListResponse<T> {
  items: T[];
  nextPageToken?: string;
  nextPageLink?: string;
}

export interface CodaApiError {
  statusCode: number;
  statusMessage: string;
  message: string;
}
