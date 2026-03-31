/**
 * Phoenix 365 — Authentication Utilities
 *
 * Provides Graph API token acquisition and auth provider creation
 * using Azure Entra (AD) client credentials flow.
 *
 * Uses @azure/identity for credential management and
 * @microsoft/microsoft-graph-client for auth provider integration.
 */

import { ClientSecretCredential } from '@azure/identity';
import {
  type AuthenticationProvider,
  type AuthenticationProviderOptions,
} from '@microsoft/microsoft-graph-client';

/** The default scope for Microsoft Graph API access. */
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';

/**
 * Acquires an access token for the Microsoft Graph API using client credentials.
 *
 * Uses the OAuth 2.0 client credentials grant (app-only, no user context).
 * Suitable for daemon/service scenarios where no user is signed in.
 *
 * @param clientId - The Entra application (client) ID
 * @param clientSecret - The Entra client secret value
 * @param tenantId - The Azure AD tenant ID
 * @returns The access token string
 * @throws Error if credential creation or token acquisition fails
 */
export async function getTokenForGraph(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): Promise<string> {
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      'Missing credentials: clientId, clientSecret, and tenantId are all required. ' +
        'Check your Key Vault secrets or environment variables.',
    );
  }

  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const tokenResponse = await credential.getToken(GRAPH_SCOPE);

    if (!tokenResponse?.token) {
      throw new Error(
        'Token response was empty. Verify the Entra app registration has the ' +
          'correct API permissions (e.g., Mail.Read, Sites.Read.All) and admin consent.',
      );
    }

    return tokenResponse.token;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to acquire Graph token: ${message}`);
  }
}

/**
 * Creates an AuthenticationProvider compatible with the Microsoft Graph JS SDK.
 *
 * This provider acquires a fresh token on each call to getAccessToken(),
 * which lets the SDK handle token refresh transparently.
 *
 * @param clientId - The Entra application (client) ID
 * @param clientSecret - The Entra client secret value
 * @param tenantId - The Azure AD tenant ID
 * @returns An AuthenticationProvider for use with Client.initWithMiddleware()
 * @throws Error if credentials are missing
 *
 * @example
 * ```ts
 * import { Client } from '@microsoft/microsoft-graph-client';
 * import { createAuthProvider } from './auth.js';
 *
 * const authProvider = createAuthProvider(clientId, clientSecret, tenantId);
 * const graphClient = Client.initWithMiddleware({ authProvider });
 * const me = await graphClient.api('/me').get();
 * ```
 */
export function createAuthProvider(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): AuthenticationProvider {
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      'Missing credentials: clientId, clientSecret, and tenantId are all required. ' +
        'Check your Key Vault secrets or environment variables.',
    );
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  return {
    async getAccessToken(
      _options?: AuthenticationProviderOptions,
    ): Promise<string> {
      try {
        const tokenResponse = await credential.getToken(GRAPH_SCOPE);

        if (!tokenResponse?.token) {
          throw new Error(
            'Token response was empty. Verify Entra API permissions and admin consent.',
          );
        }

        return tokenResponse.token;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Auth provider failed to acquire token: ${message}`);
      }
    },
  };
}
