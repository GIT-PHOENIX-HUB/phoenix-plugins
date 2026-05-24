/**
 * Phoenix 365 — Microsoft Graph API Client Factory
 *
 * Creates authenticated Graph clients using Azure AD client credentials.
 * Two clients available:
 *   - Gateway client (Phoenix Echo Gateway Entra app)
 *   - SharePoint client (SharePoint Director Entra app)
 *
 * @module graph-client
 */

import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import {
  getGatewaySecrets,
  getSharePointDirectorSecrets,
} from '@phoenix-365/shared';

/**
 * Creates an authenticated Microsoft Graph client using client credentials flow.
 *
 * @param clientId - Azure AD application (client) ID
 * @param clientSecret - Azure AD client secret value
 * @param tenantId - Azure AD tenant (directory) ID
 * @returns Initialized Graph client ready for API calls
 */
export function createGraphClient(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): Client {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  return Client.initWithMiddleware({
    authProvider,
  });
}

/** Cached gateway client instance */
let gatewayClient: Client | null = null;

/** Cached SharePoint client instance */
let sharePointClient: Client | null = null;

/**
 * Returns an authenticated Graph client using the Phoenix Echo Gateway credentials.
 * The client is cached after first creation — subsequent calls return the same instance.
 *
 * @returns Authenticated Graph client for Gateway operations
 * @throws If Key Vault is unreachable or secrets are missing
 */
export async function getGatewayGraphClient(): Promise<Client> {
  if (gatewayClient) return gatewayClient;

  const { clientId, clientSecret, tenantId } = await getGatewaySecrets();

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      'Gateway credentials incomplete. Ensure AZURE_KEY_VAULT_URI is set ' +
      'or provide PHOENIX_ECHO_CLIENT_ID, PHOENIX_ECHO_CLIENT_SECRET, and AZURE_TENANT_ID env vars.',
    );
  }

  gatewayClient = createGraphClient(clientId, clientSecret, tenantId);
  return gatewayClient;
}

/**
 * Returns an authenticated Graph client using the SharePoint Director credentials.
 * The client is cached after first creation — subsequent calls return the same instance.
 *
 * @returns Authenticated Graph client for SharePoint operations
 * @throws If Key Vault is unreachable or secrets are missing
 */
export async function getSharePointGraphClient(): Promise<Client> {
  if (sharePointClient) return sharePointClient;

  const { clientId, clientSecret, tenantId } = await getSharePointDirectorSecrets();

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      'SharePoint Director credentials incomplete. Ensure AZURE_KEY_VAULT_URI is set ' +
      'or provide SHAREPOINT_DIRECTOR_CLIENT_ID, SHAREPOINT_DIRECTOR_CLIENT_SECRET, and SHAREPOINT_DIRECTOR_TENANT_ID env vars.',
    );
  }

  sharePointClient = createGraphClient(clientId, clientSecret, tenantId);
  return sharePointClient;
}
