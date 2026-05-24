# Stephanie — Read-Only M365 Assistant App Registration

**Status:** SPEC COMPLETE / NOT YET REGISTERED
**Author:** Phoenix Echo
**Date:** 2026-03-19
**Tenant:** phoenixelectric.life (single tenant)

---

## 1. App Registration Details

| Field | Value |
|-------|-------|
| **Display Name** | `Stephanie` |
| **Application Type** | Confidential client (web app/daemon) |
| **Supported Account Types** | Single tenant (phoenixelectric.life only) |
| **Redirect URI** | None (client credentials flow, no user sign-in) |
| **Auth Flow** | OAuth 2.0 Client Credentials Grant |
| **Purpose** | Read-only M365 data access for AI assistant queries |

Stephanie is the 7th Entra app registration for Phoenix Electric. She exists because PHOENIX-ECHO-GATEWAY has admin-level write permissions across the entire M365 tenant, and Microsoft's own guidance says: **use multiple scoped apps with least privilege, not one app with carte blanche.**

Stephanie reads. She never writes, sends, deletes, or modifies.

---

## 2. Microsoft Graph API Permissions

All permissions are **Application** type (not Delegated). Application permissions run as the app itself with no signed-in user — appropriate for daemon/background AI agent use.

**Every permission listed below requires Admin Consent.** This is standard for all Application-type Graph permissions. Shane grants consent once during registration; no user interaction needed after that.

### Email

| Permission | Graph API Name | What It Allows |
|------------|---------------|----------------|
| Read all mail | `Mail.Read` | Read email messages in all mailboxes. Check inbox for customer inquiries, vendor responses, quote requests. Cannot send, delete, or modify. |
| Read all mail basic properties | `Mail.ReadBasic.All` | Read subject, sender, date, recipients for all mailboxes WITHOUT reading the body. Faster for "any new emails?" checks without pulling full content. Optional — can skip if `Mail.Read` alone is sufficient. |

### Calendar

| Permission | Graph API Name | What It Allows |
|------------|---------------|----------------|
| Read all calendars | `Calendars.Read` | Read calendar events in all mailboxes. Check today's schedule, upcoming job appointments, PTO. Cannot create, modify, or delete events. |

### SharePoint & OneDrive

| Permission | Graph API Name | What It Allows |
|------------|---------------|----------------|
| Read items in all site collections | `Sites.Read.All` | Read SharePoint site content — lists, list items, document libraries. Job tracking lists, customer data, price lists. Cannot create/modify/delete sites or content. |
| Read files in all site collections | `Files.Read.All` | Read files in SharePoint document libraries and OneDrive for Business. Proposals, contracts, job photos. Cannot upload, modify, or delete files. |

### User Profiles

| Permission | Graph API Name | What It Allows |
|------------|---------------|----------------|
| Read all users' full profiles | `User.Read.All` | Read user profile properties — name, email, phone, department, job title. Look up team members, technician contact info. Cannot modify profiles. |

### Teams

| Permission | Graph API Name | What It Allows |
|------------|---------------|----------------|
| Read all chat messages | `Chat.Read.All` | Read Teams chat messages (1:1 and group chats). Check for technician updates, job-site communications. Cannot send or delete messages. |
| Read all channel messages | `ChannelMessage.Read.All` | Read messages in Teams channels. Monitor project channels, announcements. Cannot post or delete. |
| Read all groups | `Group.Read.All` | Read group/team membership and properties. Required for resolving which Teams and channels exist. Cannot modify groups. |
| Read all Teams | `Team.ReadBasic.All` | Read basic Team properties (name, description). List which Teams exist in the tenant. |

### Summary Table

| Scope | Permission | Admin Consent | Read/Write |
|-------|-----------|---------------|------------|
| Mail | `Mail.Read` | Yes | Read |
| Mail | `Mail.ReadBasic.All` | Yes | Read (headers only) |
| Calendar | `Calendars.Read` | Yes | Read |
| SharePoint | `Sites.Read.All` | Yes | Read |
| Files | `Files.Read.All` | Yes | Read |
| Users | `User.Read.All` | Yes | Read |
| Teams Chat | `Chat.Read.All` | Yes | Read |
| Teams Channels | `ChannelMessage.Read.All` | Yes | Read |
| Groups | `Group.Read.All` | Yes | Read |
| Teams | `Team.ReadBasic.All` | Yes | Read |

**Total: 10 permissions, all read-only, all Application type.**

---

## 3. Vault Secret Naming Convention

Following the established pattern from `CREDENTIAL_MAP.md`:

| Vault Secret Name | Purpose | Env Var Fallback |
|-------------------|---------|-----------------|
| `Stephanie-ClientId` | Stephanie app client ID | `STEPHANIE_CLIENT_ID` |
| `Stephanie-ClientSecret` | Stephanie app client secret | `STEPHANIE_CLIENT_SECRET` |
| `Stephanie-TenantId` | Stephanie tenant ID (or reuse `AZURE-TENANT-ID`) | `STEPHANIE_TENANT_ID` |
| `Stephanie-SecretExpires` | Secret expiration date (for rotation tracking) | n/a |

**Note on TenantId:** Since all apps share the same tenant (`phoenixelectric.life`), Stephanie could reuse `AZURE-TENANT-ID`. But the SharePoint Director pattern stores its own copy (`SharePoint-Director-TenantId`). Recommendation: store `Stephanie-TenantId` separately for consistency and isolation — if one app's secret gets rotated or the vault gets reorganized, no cross-app dependencies break.

---

## 4. Security Notes

### Why Read-Only Is Better

- **Blast radius:** If Stephanie's client secret is compromised, the attacker can read emails and files but cannot send phishing emails from your domain, delete data, or modify SharePoint content. PHOENIX-ECHO-GATEWAY compromised = full admin access to the entire tenant.
- **Audit clarity:** When Azure AD logs show Stephanie accessing Graph, you know it was a read operation. When GATEWAY accesses Graph, you have to investigate whether it read or wrote.
- **Compliance posture:** Read-only apps are trivially easier to justify in security reviews. An insurance auditor or a client asking about your data practices hears "our AI can only read, never modify" and moves on.
- **Microsoft recommendation:** [Microsoft Identity Platform best practices](https://learn.microsoft.com/en-us/entra/identity-platform/identity-platform-integration-checklist) explicitly recommend requesting minimum necessary permissions and using multiple app registrations with scoped access.

### Secret Rotation Schedule

| Item | Recommendation |
|------|---------------|
| Client secret expiry | 12 months max (Azure default offers 6, 12, 24 — pick 12) |
| Rotation reminder | Store expiry date in `Stephanie-SecretExpires` vault secret |
| Rotation process | Generate new secret in Entra, update vault, verify app still works, delete old secret |
| Calendar reminder | Set a recurring calendar event 30 days before expiry |

### Conditional Access Considerations

If Shane enables Conditional Access policies in the future:

- **IP restriction:** Lock Stephanie's client credentials to known IPs (MacBook's public IP, VPS IP, Studio IP, Azure service IPs). This means even with a leaked secret, auth fails from unknown locations.
- **Named locations:** Create a named location in Entra for "Phoenix Infrastructure" containing those IPs.
- **Workload identity policies:** Entra supports Conditional Access for workload identities (apps). Requires Entra Workload Identities Premium license — not needed now, but good to know it exists.

---

## 5. Comparison: Stephanie vs PHOENIX-ECHO-GATEWAY

| Dimension | Stephanie | PHOENIX-ECHO-GATEWAY |
|-----------|-----------|----------------------|
| **Purpose** | Read-only data access for AI queries | Full M365 admin/orchestration |
| **Permission count** | 10 | 30+ (broad admin) |
| **Read/Write** | Read ONLY | Read + Write + Admin |
| **Mail** | `Mail.Read` | `Mail.Read` + `Mail.ReadWrite` + `Mail.Send` |
| **Calendar** | `Calendars.Read` | `Calendars.ReadWrite` |
| **SharePoint** | `Sites.Read.All` | `Sites.ReadWrite.All` + `Sites.FullControl.All` |
| **Files** | `Files.Read.All` | `Files.ReadWrite.All` |
| **Users** | `User.Read.All` | `User.ReadWrite.All` + `Directory.ReadWrite.All` |
| **Teams** | `Chat.Read.All`, `ChannelMessage.Read.All` | Full Teams admin |
| **Tasks** | None | `Tasks.ReadWrite.All` |
| **Contacts** | None | `Contacts.ReadWrite` |
| **DevOps** | None | DevOps access |
| **Compromise impact** | Attacker reads data | Attacker owns the tenant |
| **Use case** | "What's on the schedule today?" | "Send this proposal to the customer and update the SharePoint list" |

**The operating principle:** Stephanie answers questions. Gateway takes actions. Two apps, two scopes, two blast radii.

---

## 6. Registration Steps (Azure Portal)

### Step 1: Create the App Registration

1. Go to [Entra Admin Center](https://entra.microsoft.com) > **Identity** > **Applications** > **App registrations**
2. Click **+ New registration**
3. Name: `Stephanie`
4. Supported account types: **Accounts in this organizational directory only (phoenixelectric.life - Single tenant)**
5. Redirect URI: **Leave blank** (client credentials flow needs no redirect)
6. Click **Register**
7. Copy the **Application (client) ID** — this goes to vault as `Stephanie-ClientId`
8. Copy the **Directory (tenant) ID** — this goes to vault as `Stephanie-TenantId`

### Step 2: Create Client Secret

1. In the Stephanie app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Description: `Stephanie-Primary-Secret`
4. Expiry: **12 months**
5. Click **Add**
6. **IMMEDIATELY** copy the secret value (it won't be shown again) — this goes to vault as `Stephanie-ClientSecret`
7. Note the expiry date — store it in vault as `Stephanie-SecretExpires`

### Step 3: Add API Permissions

1. Go to **API permissions** > **+ Add a permission**
2. Select **Microsoft Graph** > **Application permissions**
3. Search and check each permission:

   ```
   Mail.Read
   Mail.ReadBasic.All        (optional — skip if not needed)
   Calendars.Read
   Sites.Read.All
   Files.Read.All
   User.Read.All
   Chat.Read.All
   ChannelMessage.Read.All
   Group.Read.All
   Team.ReadBasic.All
   ```

4. Click **Add permissions**
5. Click **Grant admin consent for phoenixelectric.life** (the blue button with the checkmark)
6. Confirm the consent dialog
7. Verify all permissions show a green checkmark under "Status"

### Step 4: Store Secrets in Key Vault

```bash
# Store Stephanie's credentials in phoenixaaivault
az keyvault secret set --vault-name phoenixaaivault --name "Stephanie-ClientId" --value "<app-id-from-step-1>"
az keyvault secret set --vault-name phoenixaaivault --name "Stephanie-ClientSecret" --value "<secret-from-step-2>"
az keyvault secret set --vault-name phoenixaaivault --name "Stephanie-TenantId" --value "<tenant-id-from-step-1>"
az keyvault secret set --vault-name phoenixaaivault --name "Stephanie-SecretExpires" --value "2027-03-19"
```

### Step 5: Verify

```bash
# Confirm secrets are stored
az keyvault secret show --vault-name phoenixaaivault --name "Stephanie-ClientId" --query "value" -o tsv
az keyvault secret show --vault-name phoenixaaivault --name "Stephanie-ClientSecret" --query "value" -o tsv

# Test token acquisition (client credentials flow)
curl -X POST "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \
  -d "client_id=<stephanie-client-id>" \
  -d "client_secret=<stephanie-client-secret>" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"

# Test a read call
curl -H "Authorization: Bearer <token-from-above>" \
  "https://graph.microsoft.com/v1.0/users?$top=3&$select=displayName,mail"
```

---

## 7. Code Integration — `keyvault.ts`

Add the following to `${TOOLBOX_ROOT}/mcp-servers/m365-mcp/shared/src/keyvault.ts`:

### Interface (add after `PhoenixCommandSecrets`)

```typescript
export interface StephanieSecrets {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}
```

### Fetch Function (add before the Utilities section)

```typescript
// =============================================================================
// Stephanie (READ-ONLY M365 assistant — separate Entra app)
// Vault: Stephanie-ClientId, Stephanie-ClientSecret, Stephanie-TenantId
// Permissions: Mail.Read, Calendars.Read, Sites.Read.All, Files.Read.All,
//              User.Read.All, Chat.Read.All, ChannelMessage.Read.All,
//              Group.Read.All, Team.ReadBasic.All — ALL READ-ONLY
// =============================================================================

export async function getStephanieSecrets(): Promise<StephanieSecrets> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URI;

  if (!vaultUrl) {
    return {
      clientId: process.env.STEPHANIE_CLIENT_ID || '',
      clientSecret: process.env.STEPHANIE_CLIENT_SECRET || '',
      tenantId: process.env.STEPHANIE_TENANT_ID || process.env.AZURE_TENANT_ID || '',
    };
  }

  const [clientId, clientSecret, tenantId] = await Promise.all([
    fetchSecret('Stephanie-ClientId'),
    fetchSecret('Stephanie-ClientSecret'),
    fetchSecret('Stephanie-TenantId'),
  ]);

  return { clientId, clientSecret, tenantId };
}
```

### Usage Example (Graph client initialization)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { getStephanieSecrets } from '@phoenix/shared';

async function getStephanieGraphClient(): Promise<Client> {
  const { clientId, clientSecret, tenantId } = await getStephanieSecrets();

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  return Client.initWithMiddleware({ authProvider });
}

// Example: read today's calendar
async function getTodaySchedule(userId: string) {
  const client = await getStephanieGraphClient();

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await client
    .api(`/users/${userId}/calendarView`)
    .query({
      startDateTime: now.toISOString(),
      endDateTime: endOfDay.toISOString(),
    })
    .select('subject,start,end,location,organizer')
    .orderby('start/dateTime')
    .get();

  return events.value;
}

// Example: check inbox for unread emails
async function getUnreadEmails(userId: string, count = 10) {
  const client = await getStephanieGraphClient();

  const messages = await client
    .api(`/users/${userId}/messages`)
    .filter('isRead eq false')
    .select('subject,from,receivedDateTime,bodyPreview')
    .top(count)
    .orderby('receivedDateTime desc')
    .get();

  return messages.value;
}
```

---

## Appendix: What Stephanie Does NOT Have

Explicitly excluded permissions — these stay on GATEWAY only:

| Excluded Permission | Why |
|--------------------|-----|
| `Mail.Send` | Stephanie never sends email |
| `Mail.ReadWrite` | Stephanie never modifies/deletes email |
| `Calendars.ReadWrite` | Stephanie never creates/modifies events |
| `Sites.ReadWrite.All` | Stephanie never modifies SharePoint content |
| `Sites.FullControl.All` | Stephanie never administers sites |
| `Files.ReadWrite.All` | Stephanie never uploads/modifies/deletes files |
| `User.ReadWrite.All` | Stephanie never modifies user profiles |
| `Directory.ReadWrite.All` | Stephanie never modifies directory objects |
| `Chat.ReadWrite.All` | Stephanie never sends chat messages |
| `Tasks.ReadWrite.All` | Stephanie has no task access at all |
| `Contacts.ReadWrite` | Stephanie has no contacts access at all |

---

## Checklist

- [ ] App registered in Entra
- [ ] Client secret created (12-month expiry)
- [ ] All 10 permissions added and admin consent granted
- [ ] 4 secrets stored in Key Vault (`Stephanie-ClientId`, `Stephanie-ClientSecret`, `Stephanie-TenantId`, `Stephanie-SecretExpires`)
- [ ] Token acquisition tested via curl
- [ ] Graph read call tested (e.g., `/users?$top=3`)
- [ ] `keyvault.ts` updated with `StephanieSecrets` interface and `getStephanieSecrets()` function
- [ ] `CREDENTIAL_MAP.md` updated with Stephanie section
- [ ] Calendar reminder set for secret rotation (30 days before expiry)
