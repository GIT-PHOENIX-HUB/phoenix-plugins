/**
 * Phoenix 365 — SharePoint Tools
 *
 * Graph API operations for SharePoint sites, lists, and list items.
 * All functions accept a Graph client as the first parameter.
 *
 * @module tools/sharepoint
 */

import type { Client } from '@microsoft/microsoft-graph-client';

/** Single SharePoint site from Graph API */
interface GraphSite {
  id: string;
  displayName: string;
  webUrl: string;
  name?: string;
  description?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

/** Response shape for site collections */
interface GraphSiteResponse {
  value: GraphSite[];
}

/** Single SharePoint list from Graph API */
interface GraphList {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  list?: {
    contentTypesEnabled?: boolean;
    hidden?: boolean;
    template?: string;
  };
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

/** Response shape for list collections */
interface GraphListResponse {
  value: GraphList[];
}

/** Single list item from Graph API */
interface GraphListItem {
  id: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  fields?: Record<string, unknown>;
}

/** Response shape for list item collections */
interface GraphListItemResponse {
  value: GraphListItem[];
}

/**
 * Searches for SharePoint sites by keyword.
 *
 * @param client - Authenticated Graph client
 * @param search - Search query string (e.g. "Phoenix" to find sites with that name)
 * @returns Array of matching SharePoint sites
 */
export async function listSites(
  client: Client,
  search: string,
): Promise<GraphSite[]> {
  const response: GraphSiteResponse = await client
    .api('/sites')
    .query({ search })
    .select('id,displayName,webUrl,name,description')
    .get();

  return response.value;
}

/**
 * Gets a single SharePoint site by ID.
 *
 * @param client - Authenticated Graph client
 * @param siteId - The site ID (e.g. "contoso.sharepoint.com,guid,guid")
 * @returns Site details
 */
export async function getSite(
  client: Client,
  siteId: string,
): Promise<GraphSite> {
  const site: GraphSite = await client
    .api(`/sites/${siteId}`)
    .select('id,displayName,webUrl,name,description,createdDateTime,lastModifiedDateTime')
    .get();

  return site;
}

/**
 * Lists all lists in a SharePoint site.
 *
 * @param client - Authenticated Graph client
 * @param siteId - The site ID
 * @returns Array of SharePoint lists
 */
export async function listLists(
  client: Client,
  siteId: string,
): Promise<GraphList[]> {
  const response: GraphListResponse = await client
    .api(`/sites/${siteId}/lists`)
    .select('id,displayName,description,webUrl,list,createdDateTime,lastModifiedDateTime')
    .get();

  return response.value;
}

/**
 * Gets items from a SharePoint list with their field values expanded.
 *
 * @param client - Authenticated Graph client
 * @param siteId - The site ID
 * @param listId - The list ID
 * @param top - Maximum number of items to return (default 100)
 * @param filter - OData $filter expression for the items
 * @returns Array of list items with expanded fields
 */
export async function getListItems(
  client: Client,
  siteId: string,
  listId: string,
  top: number = 100,
  filter?: string,
): Promise<GraphListItem[]> {
  let request = client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand('fields')
    .top(top);

  if (filter) {
    request = request.filter(filter);
  }

  const response: GraphListItemResponse = await request.get();
  return response.value;
}

/**
 * Creates a new item in a SharePoint list.
 *
 * @param client - Authenticated Graph client
 * @param siteId - The site ID
 * @param listId - The list ID
 * @param fields - Field values for the new item (column name -> value)
 * @returns The created list item with its fields
 */
export async function createListItem(
  client: Client,
  siteId: string,
  listId: string,
  fields: Record<string, unknown>,
): Promise<GraphListItem> {
  const item: GraphListItem = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .post({ fields });

  return item;
}
