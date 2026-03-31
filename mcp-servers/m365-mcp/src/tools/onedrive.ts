/**
 * Phoenix 365 — OneDrive / Files Tools
 *
 * Graph API operations for OneDrive file management.
 * All functions accept a Graph client as the first parameter.
 *
 * @module tools/onedrive
 */

import type { Client } from '@microsoft/microsoft-graph-client';

/** Single drive item from Graph API */
interface GraphDriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  folder?: {
    childCount: number;
  };
  file?: {
    mimeType: string;
  };
  parentReference?: {
    driveId?: string;
    id?: string;
    path?: string;
  };
}

/** Response shape for drive item collections */
interface GraphDriveItemResponse {
  value: GraphDriveItem[];
}

/** Download result containing the file content as a readable stream or buffer */
interface DownloadResult {
  /** Base64-encoded file content for safe JSON transport */
  contentBase64: string;
  /** Original file size in bytes */
  size: number;
}

/**
 * Lists children of a folder in a user's OneDrive.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param folderId - Folder ID, or "root" for the drive root
 * @returns Array of drive items (files and folders)
 */
export async function listDriveItems(
  client: Client,
  userId: string,
  folderId: string = 'root',
): Promise<GraphDriveItem[]> {
  const path = folderId === 'root'
    ? `/users/${userId}/drive/root/children`
    : `/users/${userId}/drive/items/${folderId}/children`;

  const response: GraphDriveItemResponse = await client
    .api(path)
    .select('id,name,size,webUrl,lastModifiedDateTime,createdDateTime,folder,file,parentReference')
    .top(200)
    .get();

  return response.value;
}

/**
 * Gets metadata for a single drive item.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param itemId - The drive item ID
 * @returns Drive item metadata
 */
export async function getDriveItem(
  client: Client,
  userId: string,
  itemId: string,
): Promise<GraphDriveItem> {
  const item: GraphDriveItem = await client
    .api(`/users/${userId}/drive/items/${itemId}`)
    .select('id,name,size,webUrl,lastModifiedDateTime,createdDateTime,folder,file,parentReference')
    .get();

  return item;
}

/**
 * Searches a user's OneDrive for files matching a query.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param query - Search query string
 * @returns Array of matching drive items
 */
export async function searchDrive(
  client: Client,
  userId: string,
  query: string,
): Promise<GraphDriveItem[]> {
  const response: GraphDriveItemResponse = await client
    .api(`/users/${userId}/drive/root/search(q='${encodeURIComponent(query)}')`)
    .select('id,name,size,webUrl,lastModifiedDateTime,createdDateTime,folder,file,parentReference')
    .top(50)
    .get();

  return response.value;
}

/**
 * Downloads a file's content from OneDrive.
 * Returns the content as base64-encoded string for safe JSON transport via MCP.
 *
 * NOTE: For large files (>10MB), consider using the webUrl to download directly
 * instead of piping through the MCP server.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID or UPN
 * @param itemId - The drive item ID
 * @returns Object with base64 content and file size
 */
export async function downloadFile(
  client: Client,
  userId: string,
  itemId: string,
): Promise<DownloadResult> {
  const stream: ArrayBuffer = await client
    .api(`/users/${userId}/drive/items/${itemId}/content`)
    .get();

  const buffer = Buffer.from(stream);

  return {
    contentBase64: buffer.toString('base64'),
    size: buffer.length,
  };
}
