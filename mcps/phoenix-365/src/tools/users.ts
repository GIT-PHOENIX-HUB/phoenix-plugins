/**
 * Phoenix 365 — User / Directory Tools
 *
 * Graph API operations for Azure AD user directory.
 * All functions accept a Graph client as the first parameter.
 *
 * @module tools/users
 */

import type { Client } from '@microsoft/microsoft-graph-client';

/** Single user from Graph API */
interface GraphUser {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  accountEnabled?: boolean;
}

/** Response shape for user collections */
interface GraphUserResponse {
  value: GraphUser[];
}

/**
 * Lists users in the directory.
 *
 * @param client - Authenticated Graph client
 * @param top - Maximum number of users to return (default 25, max 999)
 * @param filter - OData $filter expression (e.g. "department eq 'Electrical'")
 * @returns Array of user objects
 */
export async function listUsers(
  client: Client,
  top: number = 25,
  filter?: string,
): Promise<GraphUser[]> {
  let request = client
    .api('/users')
    .top(top)
    .select('id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones,accountEnabled');

  if (filter) {
    request = request.filter(filter);
  }

  const response: GraphUserResponse = await request.get();
  return response.value;
}

/**
 * Gets a single user by ID or UPN.
 *
 * @param client - Authenticated Graph client
 * @param userId - User ID (GUID) or userPrincipalName (e.g. "user@domain.com")
 * @returns User details
 */
export async function getUser(
  client: Client,
  userId: string,
): Promise<GraphUser> {
  const user: GraphUser = await client
    .api(`/users/${userId}`)
    .select('id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones,accountEnabled')
    .get();

  return user;
}

/**
 * Gets the signed-in user's profile.
 * Note: This requires delegated permissions. With client credentials (app-only),
 * use getUser() with a specific userId instead.
 *
 * @param client - Authenticated Graph client
 * @returns Current user's profile
 */
export async function getMe(
  client: Client,
): Promise<GraphUser> {
  const user: GraphUser = await client
    .api('/me')
    .select('id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones')
    .get();

  return user;
}
