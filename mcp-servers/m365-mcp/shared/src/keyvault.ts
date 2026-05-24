import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

// =============================================================================
// Types — Each app is a SEPARATE Entra registration. No cross-app fallbacks.
// =============================================================================

export interface PhoenixEchoGatewaySecrets {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface SharePointDirectorSecrets {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface MailCourierSecrets {
  secret: string;
}

export interface PhoenixCommandSecrets {
  secret: string;
}

// =============================================================================
// Secret Client
// =============================================================================

let secretClient: SecretClient | null = null;

function getSecretClient(): SecretClient | null {
  if (secretClient) return secretClient;

  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;
  if (!vaultUrl) return null;

  const credential = new DefaultAzureCredential();
  secretClient = new SecretClient(vaultUrl, credential);
  return secretClient;
}

async function fetchSecret(name: string): Promise<string> {
  const client = getSecretClient();
  if (!client) {
    throw new Error('Key Vault not configured. Set AZURE_KEY_VAULT_URI.');
  }
  const secret = await client.getSecret(name);
  return (secret.value || '').trim();
}

// =============================================================================
// Phoenix Echo Gateway (PRIMARY — new Entra app)
// Vault: Phoenix-Echo-ClientID, Phoenix-Echo-ClientSecret-, AZURE-TENANT-ID
// =============================================================================

export async function getGatewaySecrets(): Promise<PhoenixEchoGatewaySecrets> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    return {
      clientId: process.env.PHOENIX_ECHO_CLIENT_ID || '',
      clientSecret: process.env.PHOENIX_ECHO_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_TENANT_ID || '',
    };
  }

  const [clientId, clientSecret, tenantId] = await Promise.all([
    fetchSecret('Phoenix-Echo-ClientID'),
    fetchSecret('Phoenix-Echo-ClientSecret-'),
    fetchSecret('AZURE-TENANT-ID'),
  ]);

  return { clientId, clientSecret, tenantId };
}

// =============================================================================
// SharePoint Director (separate Entra app)
// Vault: SharePoint-Director-ClientId, SharePoint-Director-ClientSecret,
//        SharePoint-Director-TenantId
// Note: GRAPH-TEST-* secrets are DUPLICATES of these. Do not use them.
// =============================================================================

export async function getSharePointDirectorSecrets(): Promise<SharePointDirectorSecrets> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    return {
      clientId: process.env.SHAREPOINT_DIRECTOR_CLIENT_ID || '',
      clientSecret: process.env.SHAREPOINT_DIRECTOR_CLIENT_SECRET || '',
      tenantId: process.env.SHAREPOINT_DIRECTOR_TENANT_ID || process.env.AZURE_TENANT_ID || '',
    };
  }

  const [clientId, clientSecret, tenantId] = await Promise.all([
    fetchSecret('SharePoint-Director-ClientId'),
    fetchSecret('SharePoint-Director-ClientSecret'),
    fetchSecret('SharePoint-Director-TenantId'),
  ]);

  return { clientId, clientSecret, tenantId };
}

// =============================================================================
// Phoenix Mail Courier (separate Entra app)
// Vault: PhoenixMailCourierSecret
// Note: App ID stored as Azure Automation variable, not in Key Vault
// =============================================================================

export async function getMailCourierSecrets(): Promise<MailCourierSecrets> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    return {
      secret: process.env.MAIL_COURIER_SECRET || '',
    };
  }

  const secret = await fetchSecret('PhoenixMailCourierSecret');
  return { secret };
}

// =============================================================================
// Phoenix Command App (separate Entra app)
// Vault: PhoenixAiCommandSecret
// =============================================================================

export async function getPhoenixCommandSecrets(): Promise<PhoenixCommandSecrets> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    return {
      secret: process.env.PHOENIX_COMMAND_SECRET || '',
    };
  }

  const secret = await fetchSecret('PhoenixAiCommandSecret');
  return { secret };
}

// =============================================================================
// Utilities
// =============================================================================

export async function testKeyVaultConnection(): Promise<boolean> {
  try {
    const client = getSecretClient();
    if (!client) return false;
    const iterator = client.listPropertiesOfSecrets();
    await iterator.next();
    return true;
  } catch {
    return false;
  }
}
