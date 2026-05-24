# Phase 3: Service Fusion Integration -- Complete Knowledge Reference

**Company:** Phoenix Electric (ELECTRICAL company -- never HVAC)
**Owner:** Shane Warehime
**Status:** READY FOR EXECUTION (requires Shane approval)
**Date:** 2026-03-10
**Author:** Echo Pro (Opus 4.6)

---

## 1. ARCHITECTURE OVERVIEW

### System Context

Phase 3 integrates Service Fusion (SF) -- Phoenix Electric's field service management platform -- into the Phoenix AI ecosystem. This involves a full MCP server rebuild, a polling engine (SF has NO webhooks), pricebook integration with 7-tier pricing, Rexel vendor sync, and Gateway dashboard panels.

### Component Map

```
Service Fusion Cloud (api.servicefusion.com)
    |
    v (HTTPS / OAuth 2.0 Bearer)
SF MCP Server (packages/servicefusion-mcp/)
    |--- ServiceFusionClient (src/client.ts)
    |--- Tool Definitions (src/tools/index.ts)
    |--- Rate Limiter (src/rate-limiter.ts) [planned]
    |--- Polling Engine (src/polling-engine.ts) [planned]
    |
    v (stdio transport / MCP protocol)
Claude Code Plugin (~/.claude/plugins/servicefusion/)
    |--- 6 commands, 1 skill, 1 agent
    |
    v (HTTP API / SSE)
Phoenix Echo Gateway (~/Phoenix-Echo-Gateway/ on Studio)
    |--- /api/sf/* routes
    |--- /api/sf/events SSE stream
    |--- Dashboard panels (6 panels)
    |--- Port: 18790
```

### Key Constraint

Service Fusion has NO webhooks. All real-time data comes from polling. Shane confirmed 15-60 second data lag is a "NONE ISSUE."

---

## 2. TECHNOLOGY STACK

### Languages & Frameworks

| Component | Technology | Version |
|-----------|-----------|---------|
| MCP Server | TypeScript / Node.js | Node.js 22+ |
| Package Manager | pnpm | (monorepo workspace) |
| Schema Validation | zod | (used in tool input schemas) |
| HTTP Client | Native fetch | (Node.js built-in) |
| Logging | Custom logger | `@phoenix/shared` createLogger |
| Gateway | Express.js | Running on VPS/Studio |
| Dashboard | HTML/CSS/JS | Served by Gateway |
| Pricebook Generator | Python | `generate_sf_import.py` |

### Dependencies

```bash
# MCP Server (packages/servicefusion-mcp/)
@phoenix/shared           # Shared types, Key Vault, logger
zod                       # Input schema validation

# Shared Package (packages/shared/)
@azure/keyvault-secrets   # Azure Key Vault client
@azure/identity           # Azure authentication

# Gateway
express                   # HTTP framework
```

### Build Commands

```bash
cd ~/GitHub/phoenix-ai-core-staging
pnpm install
pnpm -F servicefusion-mcp build
```

---

## 3. AUTHENTICATION & CREDENTIALS

### OAuth 2.0 Flow

- **Grant Type:** `client_credentials`
- **Token Endpoint:** `POST https://api.servicefusion.com/oauth/access_token`
- **Content-Type:** `application/json` (NOT x-www-form-urlencoded)
- **Required Credentials:** `client_id` + `client_secret` ONLY
- **No AppKey/TenantId required** (those were ServiceTitan patterns, not SF)

### Token Request

```json
{
  "grant_type": "client_credentials",
  "client_id": "<SF_CLIENT_ID>",
  "client_secret": "<SF_CLIENT_SECRET>"
}
```

### Token Response

```json
{
  "access_token": "eyJ...",
  "refresh_token": "<refresh_token>",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Token Refresh

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>"
}
```

### Token Caching

- Tokens cached in memory with 60-second expiry buffer
- Refresh token used first when available; falls back to client_credentials
- Implemented in `ServiceFusionClient.getToken()` method

### API Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Azure Key Vault Storage

**Vault Name:** `PhoenixaAiVault`
**Vault URI:** `https://phoenixaaivault.vault.azure.net/`

| Secret Name (Primary) | Fallback Names | Purpose |
|------------------------|----------------|---------|
| `SERVICEFUSION-CORE-CLIENT-ID` | `ServiceFusion-ClientId`, `PhoenixAiCommandClientId` | OAuth client ID |
| `SERVICEFUSION-CORE-SECRET` | `ServiceFusion-ClientSecret-2025-11`, `PhoenixAiCommandSecret` | OAuth client secret |
| `SERVICEFUSION-CORE-APP-KEY` | `ServiceFusion-AppKey`, `PhoenixAiCommandAppKey` | Legacy (may not be needed) |
| `SERVICEFUSION-TENANT-ID` | `ServiceFusion-TenantId`, `PhoenixAiCommandTenantId` | Legacy (may not be needed) |

**Key Vault Secret Name Mismatch (Known Issue):**
- Key Vault has `Service-Fusion-ClientID` but code tries `SERVICEFUSION-CORE-CLIENT-ID` first
- Key Vault has `Clients-secret` but code tries `SERVICEFUSION-CORE-SECRET` first
- The fallback chain in `packages/shared/src/keyvault.ts` (lines 127-168) handles this

### Environment Variables

```env
AZURE_KEY_VAULT_URI=https://phoenixaaivault.vault.azure.net/
SERVICEFUSION_ENVIRONMENT=production    # or "integration"
SF_APPROVAL_TOKEN=<token>               # Required for write operations
ALLOW_SF_WRITES=true                    # Alternative: bypass approval gate
SF_POLLING_ENABLED=true/false           # Enable/disable polling engine
SF_RATE_LIMIT_BYPASS=true               # Emergency: bypass rate limiter (Shane approval required)
```

### Write Operation Approval Gate

All POST operations require either:
1. `SF_APPROVAL_TOKEN` environment variable set, OR
2. `ALLOW_SF_WRITES=true` in environment

Enforced at HTTP level in `client.ts` -- no bypass possible without token.

---

## 4. SERVICE FUSION API -- VALIDATED ENDPOINTS

### Base Configuration

- **Base URL:** `https://api.servicefusion.com/v1`
- **Auth URL:** `https://api.servicefusion.com/oauth/access_token`
- **Pagination:** `?per-page=N&page=N`
- **Response Envelope:** `{ items[], _meta: { totalCount, pageCount, currentPage, perPage }, _expandable }`
- **Available Methods:** GET (list/detail) and POST (create) ONLY
- **No PUT, PATCH, DELETE** available on v1 API
- **Subscription Required:** Pro Plan

### Confirmed Endpoints (200 responses from live testing 2026-03-05)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/me` | Current authenticated user info |
| GET | `/v1/customers` | List customers (supports filters, pagination, sort) |
| GET | `/v1/customers/{id}` | Get customer by ID |
| GET | `/v1/customers/{id}/equipment` | Get customer equipment records |
| POST | `/v1/customers` | Create new customer |
| GET | `/v1/jobs` | List jobs (supports status filter, pagination, sort) |
| GET | `/v1/jobs/{id}` | Get job detail (supports `expand` param) |
| POST | `/v1/jobs` | Create new job |
| GET | `/v1/estimates` | List estimates |
| POST | `/v1/estimates` | Create new estimate |
| GET | `/v1/invoices` | List invoices (read-only, no POST) |
| GET | `/v1/techs` | List technicians |
| GET | `/v1/calendar-tasks` | List calendar tasks / scheduled reminders |
| GET | `/v1/job-statuses` | List all job status codes |
| GET | `/v1/payment-types` | List payment types |
| GET | `/v1/sources` | List referral/marketing sources |
| GET | `/v1/job-categories` | List job categories |

### Confirmed NOT Available (404 responses)

All v2-style paths from the old ServiceTitan codebase return 404:
- `/crm/v2/*`, `/jpm/v2/*`, `/dispatch/v2/*`, `/pricebook/v2/*`
- `/accounting/v2/*`, `/telecom/v2/*`, `/memberships/v2/*`, `/marketing/v2/*`
- PUT/PATCH/DELETE on any endpoint

### Pagination Parameters

```
per-page=N    # Items per page (default varies)
page=N        # 1-indexed page number
sort=field    # Sort field, prefix with - for descending (e.g., -created_at)
```

### Filter Parameters

```
filters[customer_name]=John    # Filter customers by name
filters[status]=Scheduled      # Filter jobs by status
```

### Job Expand Fields

When getting a single job, the following fields can be expanded:
```
agents, custom_fields, pictures, documents, equipment, techs_assigned,
tasks, notes, products, services, other_charges, labor_charges,
expenses, payments, invoices, signatures, visits
```

Usage: `GET /v1/jobs/{id}?expand=techs_assigned,notes,invoices`

### Zapier Integration (Webhook Proxy)

Since SF has no native webhooks, Zapier serves as a webhook proxy:

**Available Zapier Triggers:**
- New Customer, New Job, Job Status Updated, New Invoice, New Estimate, New Technician

**Available Zapier Actions:**
- Create Customer, Create Job, Create Company Calendar Task

---

## 5. MCP TOOL DEFINITIONS -- COMPLETE INVENTORY

### Active Tools (16 tools)

#### Identity (1 tool)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_me` | Identity | GET | `/me` | No | Get authenticated user info |

#### Customers (5 tools)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_customers` | Customers | GET | `/customers` | No | List customers with pagination, sort |
| `servicefusion_get_customer` | Customers | GET | `/customers/{id}` | No | Get customer by ID |
| `servicefusion_get_customer_equipment` | Customers | GET | `/customers/{id}/equipment` | No | Get equipment for customer |
| `servicefusion_search_customers` | Customers | GET | `/customers?filters[customer_name]=query` | No | Search by name |
| `servicefusion_create_customer` | Customers | POST | `/customers` | YES | Create new customer |

**`servicefusion_list_customers` Input Schema:**
```typescript
{
  page?: number,       // Page number (1-indexed)
  perPage?: number,    // Items per page (default 20)
  sort?: string        // Sort field, prefix - for descending
}
```

**`servicefusion_create_customer` Input Schema:**
```typescript
{
  customer_name: string,   // Customer or company name (required)
  phone?: string,
  email?: string,
  street_1?: string,
  city?: string,
  state_prov?: string,
  postal_code?: string
}
```

#### Jobs (3 tools)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_jobs` | Jobs | GET | `/jobs` | No | List jobs with filters |
| `servicefusion_get_job` | Jobs | GET | `/jobs/{id}` | No | Get job detail with expand support |
| `servicefusion_create_job` | Jobs | POST | `/jobs` | YES | Create new job |

**`servicefusion_list_jobs` Input Schema:**
```typescript
{
  page?: number,
  perPage?: number,    // default 20
  sort?: string,
  status?: string      // e.g., "Scheduled", "Started"
}
```

**`servicefusion_get_job` Input Schema:**
```typescript
{
  jobId: number,
  expand?: string      // Comma-separated: agents,custom_fields,pictures,documents,
                       // equipment,techs_assigned,tasks,notes,products,services,
                       // other_charges,labor_charges,expenses,payments,invoices,
                       // signatures,visits
}
```

**`servicefusion_create_job` Input Schema:**
```typescript
{
  customer_name: string,   // Must match existing or creates new
  status?: string,         // Default: Tentative/Unconfirmd
  description?: string,
  category?: string,
  source?: string          // Referral source
}
```

#### Estimates (2 tools)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_estimates` | Estimates | GET | `/estimates` | No | List estimates |
| `servicefusion_create_estimate` | Estimates | POST | `/estimates` | YES | Create new estimate |

**`servicefusion_create_estimate` Input Schema:**
```typescript
{
  customer_name: string,
  description?: string
}
```

#### Invoices (1 tool)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_invoices` | Invoices | GET | `/invoices` | No | List invoices (read-only) |

#### Technicians (1 tool)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_techs` | Technicians | GET | `/techs` | No | List all technicians |

#### Calendar (1 tool)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_calendar_tasks` | Calendar | GET | `/calendar-tasks` | No | List calendar tasks |

#### Lookups (4 tools)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_list_job_statuses` | Lookups | GET | `/job-statuses` | No | All status codes |
| `servicefusion_list_payment_types` | Lookups | GET | `/payment-types` | No | All payment types |
| `servicefusion_list_sources` | Lookups | GET | `/sources` | No | Referral/marketing sources |
| `servicefusion_list_job_categories` | Lookups | GET | `/job-categories` | No | Job categories |

#### Composite (1 tool)

| Tool Name | Category | Method | Endpoint | Approval | Description |
|-----------|----------|--------|----------|----------|-------------|
| `servicefusion_get_daily_job_summary` | Composite | GET | `/jobs` | No | Fetch recent jobs, group by status |

**Input:** `{ perPage?: number }` (default 100)
**Output:** `{ totalFetched, totalInSystem, byStatus: { [status]: count } }`

### Deprecated Tool Stubs (33 tools)

These tools return clear error messages explaining why they are unavailable. They exist so code referencing them by name gets helpful messages instead of cryptic 404s.

| Deprecated Tool | Reason |
|----------------|--------|
| `servicefusion_cancel_job` | No PUT/DELETE on v1 API |
| `servicefusion_reschedule_appointment` | No appointments endpoint or PUT method |
| `servicefusion_update_material` | No pricebook/materials endpoint |
| `servicefusion_sell_estimate` | No PUT method for estimate status changes |
| `servicefusion_list_services` | No pricebook/services endpoint |
| `servicefusion_list_materials` | No pricebook/materials endpoint |
| `servicefusion_create_material` | No pricebook/materials endpoint |
| `servicefusion_compare_prices` | No pricebook endpoint; use separate pricebook-mcp-server |
| `servicefusion_list_calls` | No telecom/calls endpoint |
| `servicefusion_get_call` | No telecom/calls endpoint |
| `servicefusion_get_missed_calls` | No telecom/calls endpoint |
| `servicefusion_get_calls_with_recordings` | No telecom/calls endpoint |
| `servicefusion_list_membership_types` | No memberships endpoint |
| `servicefusion_list_customer_memberships` | No memberships endpoint |
| `servicefusion_list_recurring_services` | No memberships/recurring-services endpoint |
| `servicefusion_list_campaigns` | No marketing/campaigns endpoint |
| `servicefusion_list_campaign_categories` | No marketing endpoint |
| `servicefusion_list_campaign_costs` | No marketing endpoint |
| `servicefusion_list_employees` | No employees endpoint; use list_techs |
| `servicefusion_list_business_units` | No business-units endpoint |
| `servicefusion_get_capacity` | No dispatch/capacity endpoint |
| `servicefusion_list_technician_shifts` | No technician-shifts endpoint |
| `servicefusion_get_on_call_technician` | No on-call/shift endpoint |
| `servicefusion_list_zones` | No dispatch/zones endpoint |
| `servicefusion_list_equipment` | No standalone equipment endpoint; use get_customer_equipment |
| `servicefusion_list_categories` | No pricebook/categories endpoint; use list_job_categories |
| `servicefusion_list_tag_types` | No tag-types endpoint |
| `servicefusion_list_bookings` | No bookings endpoint |
| `servicefusion_create_booking` | No bookings endpoint |
| `servicefusion_list_appointments` | No appointments endpoint |
| `servicefusion_list_job_types` | No job-types endpoint; use list_job_categories |
| `servicefusion_list_locations` | No standalone locations endpoint |
| `servicefusion_get_invoice` | Use list_invoices with filters instead |
| `servicefusion_get_technician` | Use list_techs instead |
| `servicefusion_list_payments` | No standalone payments endpoint |

### Tool Utility Functions

```typescript
getToolByName(tools: Tool[], name: string): Tool | undefined
getToolsByCategory(tools: Tool[], category: string): Tool[]
getProtectedTools(tools: Tool[]): Tool[]      // Tools requiring approval
getActiveTools(tools: Tool[]): Tool[]          // Non-deprecated tools
getDeprecatedTools(tools: Tool[]): Tool[]      // Deprecated stubs only
```

### Planned Expansion (Runbook Target: 74 tools)

The runbook targets expanding from 47 to 74 tools. However, live API testing revealed many planned endpoints do not exist on SF v1. The actual achievable tool count depends on undocumented SF API capabilities. New tools planned:

| Category | Planned New Tools | Count |
|----------|-------------------|-------|
| CRM | update_customer, delete_location, list_contacts, add_contact | +4 |
| Jobs | update_job, list_job_tags, add_job_tag, list_job_notes, add_job_note | +5 |
| Dispatch | assign_technician, unassign_technician, list_dispatch_board | +3 |
| Pricebook | get_service, update_service, create_service, deactivate_material | +4 |
| Accounting | create_invoice, void_invoice, update_estimate, delete_estimate, list_line_items | +5 |
| Telecom | create_call_note, list_voicemails | +2 |
| Memberships | create_membership, cancel_membership | +2 |
| Marketing | create_campaign, update_campaign | +2 |

**Note:** Many of these require PUT/DELETE which is NOT available on v1 API. Each must be verified against live API before implementation.

---

## 6. MCP CLIENT IMPLEMENTATION

### ServiceFusionClient Class

**File:** `packages/servicefusion-mcp/src/client.ts`

```typescript
class ServiceFusionClient {
  // Singleton pattern
  private tokenCache: TokenCache | null;
  private secrets: ServiceFusionSecrets | null;
  private initialized: boolean;

  constructor(environment: 'production' | 'integration');

  // URLs
  authUrl: 'https://api.servicefusion.com/oauth/access_token';
  apiBaseUrl: 'https://api.servicefusion.com/v1';

  // Methods
  async initialize(): Promise<void>;
  async getToken(): Promise<string>;
  async refreshAccessToken(): Promise<string>;
  async request<T>(path: string, options?: RequestOptions): Promise<T>;
  async get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  async post<T>(path: string, body: unknown): Promise<T>;
  async healthCheck(): Promise<boolean>;
}
```

### Key Design Decisions in Client

1. **Method restriction:** Only GET and POST allowed. PUT/PATCH/DELETE throw error with explanation.
2. **Write approval gate:** POST requests require `SF_APPROVAL_TOKEN` or `ALLOW_SF_WRITES=true`.
3. **Token caching:** 60-second expiry buffer. Refresh token attempted before re-auth.
4. **No SF-App-Key header:** Removed (was ServiceTitan pattern).
5. **No tenant in URL path:** Tenant is derived from token scope, not passed separately.
6. **Singleton pattern:** `getClient(environment?)` returns shared instance. `resetClient()` clears it.

### Tool Interface

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  requiresApproval: boolean;
  category: string;
  handler: (params: any) => Promise<unknown>;
}
```

---

## 7. RATE LIMITER (PLANNED)

**File:** `packages/servicefusion-mcp/src/rate-limiter.ts`

### Configuration

```typescript
interface RateLimiterConfig {
  maxTokens: number;       // Bucket capacity (e.g., 100)
  refillRate: number;      // Tokens per second (e.g., 10)
  retryAfterMs: number;    // Backoff on 429 (default: 5000)
  maxRetries: number;      // Max retry attempts (default: 3)
}
```

### Interface

```typescript
interface RateLimiter {
  acquire(cost?: number): Promise<void>;
  tryAcquire(cost?: number): boolean;
  onRateLimited(retryAfter?: number): void;
  getStats(): {
    available: number;
    waiting: number;
    totalRequests: number;
    totalThrottled: number;
  };
}
```

### Rules

- Token bucket algorithm: tokens refill at constant rate
- GET operations cost 1 token; write operations cost 2 tokens
- On 429 response: drain bucket, wait Retry-After value (or default 5s), refill
- Queue requests when empty (never drop)
- Per-category budgets (v2): Polling max 50%, User requests min 30% reserved, Writes max 20%

### Integration Point

```typescript
// In client.request(), before fetch:
await this.rateLimiter.acquire(method === 'GET' ? 1 : 2);

// On 429 response:
const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
this.rateLimiter.onRateLimited(retryAfter * 1000);
```

### SF Rate Limit Characteristics

- Rate limits are enforced but specific limits are NOT publicly documented
- Expected range: 60-300 requests per minute (industry standard)
- Recommended starting point: 30-60 req/min
- Monitor HTTP 429 responses
- Error response: `{ "error": "rate_limit_exceeded", "message": "...", "retry_after": 60 }`

---

## 8. POLLING ENGINE (PLANNED)

**File:** `packages/servicefusion-mcp/src/polling-engine.ts`

### Architecture

```
PollingEngine
  |-- PollingScheduler (manages intervals, handles backoff)
  |-- ChangeDetector (compares snapshots, emits deltas)
  |-- EventEmitter (broadcasts changes to Gateway via SSE/WebSocket)
  |-- CircuitBreaker (disables polling on repeated failures)
```

### Polling Intervals (Shane-Approved)

| Data Type | Interval | Justification |
|-----------|----------|---------------|
| Jobs (status changes) | 30 seconds | Core operational data |
| Calls (missed/new) | 15 seconds | Customer responsiveness |
| Appointments | 60 seconds | Scheduling visibility |
| Estimates (status) | 60 seconds | Sales pipeline |
| Invoices | 120 seconds | Financial, less urgent |
| Technician shifts | 300 seconds (5 min) | Changes infrequently |
| Pricebook | 600 seconds (10 min) | Changes very rarely |

### Change Detection Strategy

1. **Modified-since filtering:** Use `modifiedOnOrAfter` parameter, passing last poll timestamp
2. **Snapshot diffing:** For endpoints without modified-since support, keep in-memory snapshot and diff
3. **Delta events:** Emit structured events

```typescript
interface PollEvent {
  type: 'job.created' | 'job.statusChanged' | 'call.missed' | 'appointment.changed' | ...;
  entity: string;
  entityId: number;
  timestamp: string;
  data: unknown;
  previous?: unknown;
}
```

### Backoff Rules

- On API error: double interval (max 10x original)
- On 3 consecutive errors: pause that poller for 5 minutes
- On rate limit (429): pause ALL pollers for Retry-After duration
- On recovery: gradually restore original interval over 3 successful polls

### Circuit Breaker

```typescript
interface CircuitBreakerConfig {
  failureThreshold: 5;
  resetTimeMs: 300000;      // 5 minutes
  halfOpenRequests: 1;
}
// States: CLOSED (normal) -> OPEN (paused) -> HALF_OPEN (test) -> CLOSED
```

### Memory Budget

- Max 10,000 entities cached in memory across all types
- LRU eviction for entities not updated in 24 hours
- Total memory budget: 50MB

---

## 9. PRICEBOOK INTEGRATION

### Current State

| Metric | Value |
|--------|-------|
| Total services documented | 1,769+ |
| NC base items | 170 |
| Tier prefixes | NC_, RM_, COM_, COMRM_, FP_, SMP_, GEN_ |
| Target total items | ~1,040 (170 x 6 + ~20 GEN) |
| SF import file | `pricebook/Phoenix_Electric_SF_Import_7Tier.xlsx` |
| Price generator | `pricebook/generate_sf_import.py` |

### 7-Tier Pricing Structure

| Tier | Prefix | Use Case | Color (Dashboard) |
|------|--------|----------|-------------------|
| New Construction | NC_ | Residential new build | Blue |
| Remodel | RM_ | Residential remodel | Green |
| Commercial | COM_ | Commercial new | Purple |
| Commercial Remodel | COMRM_ | Commercial remodel | Dark Purple |
| Fixed Price | FP_ | Service call | Orange |
| Small Projects | SMP_ | Small project | Teal |
| Generac | GEN_ | Generac products | Red |

### Pricing Formula

```
Phoenix Cost = (Hours x $48.58) + (Material x (1 + Markup))
Premium      = Phoenix Cost x 1.20 (loyalty)
Member       = Phoenix Cost x 1.30 (membership)
List         = Phoenix Cost x 1.40 (standard)
Add-On       = List x 0.90 (bundle)
Afterhours   = List x 1.50 (emergency)
```

### Material Markup Brackets

| Cost Range | Markup |
|------------|--------|
| < $50 | 7% |
| $50 - $500 | 12% |
| $500 - $1,500 | 17% |
| $1,500+ | 25% |

### Labor Rates

- Burdened cost: $48.58/hr
- Billable rate: $115/hr

### Estimate Builder Workflow

1. Look up customer via `servicefusion_search_customers`
2. Select or create job
3. Browse pricebook via `servicefusion_list_services` / `servicefusion_list_materials`
4. Apply correct tier based on job type (NC_, RM_, COM_, COMRM_, FP_, SMP_)
5. Assemble line items with correct tier pricing
6. `servicefusion_create_estimate` with line items
7. Generate formatted proposal document

---

## 10. REXEL CATALOG INTEGRATION

### Data Inventory

| Metric | Value | Location |
|--------|-------|----------|
| Total line items | 18,673 | `rexel/data/raw_batches/` |
| CSV batches | 9 | `batch_01` through `batch_09` |
| Unique SKUs | 1,624 | After dedup |
| Invoices covered | 2,215 | All Phoenix Electric purchases |
| Branch | `feature/rexel-data-organization` | Staging repo |

### Price Sync Workflow

1. **Extract:** Parse latest Rexel invoice CSV from `rexel/data/raw_batches/`
2. **Normalize:** Map Rexel SKUs to Phoenix pricebook material codes
3. **Compare:** Use price comparison (items with code, newPrice, newCost)
4. **Review:** Display price changes (increases, decreases, new items)
5. **Apply:** Use create/update material tools for approved changes
6. **Log:** Record all changes with date, old price, new price, source invoice

### Catalog Output Format

```json
{
  "sku": "14/2-NM-250",
  "description": "Romex 14/2 NM-B Wire, 250ft",
  "category": "Wire & Cable",
  "manufacturer": "Southwire",
  "unit": "Roll",
  "rexelPrice": 89.50,
  "phoenixCost": 95.77,
  "phoenixList": 134.08,
  "photoPath": "rexel/catalog/wire-cable/14-2-NM-250/photo.png",
  "specsPath": "rexel/catalog/wire-cable/14-2-NM-250/specs.json",
  "lastUpdated": "2026-03-10"
}
```

### Priority Categories for Catalog

1. Wire & Cable (highest volume)
2. Devices (switches, receptacles, covers)
3. Panels & Breakers
4. Lighting
5. Conduit & Fittings

---

## 11. GATEWAY DASHBOARD

### Dashboard URL

`http://<gateway-host>:18790/dashboard` or `https://echo.phoenixelectric.life/dashboard`

### Panel Layout (6 panels)

```
+--------------------+----------------------+
|    JOB FEED        |    CALL LOG          |
|    (real-time)     |    (real-time)       |
+--------------------+----------------------+
|  DISPATCH BOARD    |  SF HEALTH STATUS    |
|  (real-time)       |  (heartbeat)         |
+--------------------+----------------------+
|  PRICEBOOK VIEW    |  REXEL CATALOG       |
|  (on-demand)       |  BROWSER             |
+--------------------+----------------------+
```

### Gateway API Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/sf/jobs` | Job feed with status filters | Polling (30s) |
| GET | `/api/sf/jobs/summary` | Daily summary (status/priority counts) | Polling |
| GET | `/api/sf/calls` | Call log with missed-calls highlight | Polling (15s) |
| GET | `/api/sf/calls/missed` | Missed calls only | Polling (15s) |
| GET | `/api/sf/dispatch` | Dispatch board (techs + appointments) | Polling (60s) |
| GET | `/api/sf/pricebook` | Pricebook browse with tier/category filters | On-demand + cache |
| GET | `/api/sf/rexel/catalog` | Rexel catalog browser | Static catalog |
| GET | `/api/sf/health` | Rate limiter stats, poller status, circuit breaker | Local data |
| SSE | `/api/sf/events` | Server-sent events stream for real-time updates | Polling engine |

### SSE Event Types

```typescript
interface SSEEvent {
  event: 'job.update' | 'call.new' | 'call.missed' | 'appointment.change' |
         'estimate.update' | 'health.update';
  data: string;   // JSON payload
  id: string;     // Event ID for reconnection
}
```

### SSE Reconnection

- Auto-reconnect via browser EventSource
- Send `Last-Event-ID` header on reconnect
- Server replays missed events from in-memory buffer (max 1000 events, 5 min window)
- If gap too large, send `full-refresh` event to trigger full data reload

### API Response Formats

**GET /api/sf/jobs:**
```json
{
  "jobs": [{
    "id": 4521,
    "jobNumber": "J-4521",
    "customer": { "id": 102, "name": "...", "type": "Residential" },
    "location": { "address": "..." },
    "status": "Dispatched",
    "priority": "Urgent",
    "summary": "200A Panel Upgrade - Residential",
    "technician": { "id": 5, "name": "Miguel Rodriguez" },
    "appointment": { "start": "...", "end": "..." },
    "jobType": "Panel Upgrade",
    "createdOn": "..."
  }],
  "summary": {
    "total": 12,
    "byStatus": { "Pending": 2, "Scheduled": 4, ... },
    "byPriority": { "Urgent": 1, "High": 2, ... },
    "urgentCount": 1
  },
  "meta": { "page": 1, "pageSize": 50, "hasMore": false }
}
```

**GET /api/sf/health:**
```json
{
  "status": "healthy",
  "rateLimiter": {
    "available": 87, "maxTokens": 100, "refillRate": 10,
    "waiting": 0, "totalRequests": 4521, "totalThrottled": 12
  },
  "pollers": {
    "jobs": { "status": "running", "interval": 30000, "lastPoll": "...", "consecutiveErrors": 0 },
    "calls": { "status": "running", "interval": 15000, ... },
    ...
  },
  "circuitBreaker": { "state": "closed", "failureCount": 0 },
  "auth": { "tokenValid": true, "expiresIn": 872 },
  "memory": { "used": 23068672, "budget": 52428800, "percent": 44 },
  "uptime": 310932
}
```

### Dashboard CSS Theme

```css
:root {
  --pe-primary: #1a56db;      /* Electric blue */
  --pe-secondary: #f59e0b;    /* Amber/gold */
  --pe-bg: #0f172a;           /* Dark slate */
  --pe-card: #1e293b;         /* Card background */
  --pe-text: #e2e8f0;         /* Light text */
  --pe-border: #334155;       /* Subtle border */

  /* Status: pending=#94a3b8, scheduled=#3b82f6, dispatched=#eab308,
     working=#22c55e, completed=#166534, hold=#f97316, canceled=#ef4444 */
  /* Priority: urgent=#ef4444, high=#f97316, normal=#3b82f6, low=#94a3b8 */
  /* Health: good=#22c55e, warning=#eab308, critical=#ef4444 */
}
```

---

## 12. CLAUDE CODE PLUGIN

### Plugin Location

```
~/.claude/plugins/servicefusion/
  |-- .claude-plugin/plugin.json
  |-- .mcp.json
  |-- commands/
  |     |-- sf-briefing.md
  |     |-- sf-schedule.md
  |     |-- sf-customers.md
  |     |-- sf-jobs.md
  |     |-- sf-estimate.md
  |     |-- sf-pricebook.md
  |-- skills/
  |     |-- servicefusion-operations/
  |           |-- SKILL.md
  |           |-- references/
  |                 |-- api-reference.md
  |                 |-- workflows.md
  |                 |-- browser-fallback.md
  |                 |-- financials.md
  |                 |-- rexel-integration.md
  |                 |-- future-gateway.md
  |-- agents/
  |     |-- sf-operations-agent.md
  |-- hooks/
        |-- hooks.json
```

### MCP Server Wiring

```json
{
  "server": "~/GitHub/phoenix-ai-core-staging/packages/servicefusion-mcp/dist/index.js",
  "transport": "stdio",
  "env": {
    "AZURE_KEY_VAULT_URI": "https://phoenixaaivault.vault.azure.net/",
    "SERVICEFUSION_ENVIRONMENT": "production"
  }
}
```

### Commands

| Command | Purpose |
|---------|---------|
| `/sf-briefing` | Morning operations briefing (jobs, missed calls, estimates, capacity, on-call) |
| `/sf-schedule` | Today/tomorrow appointments by technician, capacity gaps |
| `/sf-customers` | Interactive customer lookup (search, locations, job history) |
| `/sf-jobs` | Job lifecycle (list, create, cancel, daily summary) |
| `/sf-estimate` | Guided estimate builder (customer > pricebook > line items > create) |
| `/sf-pricebook` | Pricebook management (browse, Rexel sync, vendor analysis) |

### Agent

The `sf-operations-agent` handles autonomous operations:
- Triggers: "check my schedule", "create an estimate", "what jobs are open", "morning briefing", "who's on call", "pull up customer", "update pricebook"
- Tools: All SF MCP tools + file writing + browser automation
- Scope: CRM, jobs, dispatch, pricebook, accounting, telecom, memberships, marketing, settings

### Users

- **Shane:** Full write access (ALLOW_SF_WRITES=true)
- **Stephanie/Ash:** Configurable per user via their env setup

---

## 13. INFRASTRUCTURE REQUIREMENTS

### Machines

| Machine | Role | Requirements |
|---------|------|-------------|
| Mac Studio | Gateway host, primary development | Node.js 22+, Gateway running on port 18790 |
| MacBook Pro | Development, plugin testing | Node.js 22+, Azure CLI |
| VPS | Production Gateway, Teams bot | Node.js, HTTPS, port 18790, port 3978 (Teams) |

### Network

- HTTPS to `api.servicefusion.com` (port 443)
- HTTPS to `phoenixaaivault.vault.azure.net` (Azure Key Vault)
- Gateway accessible at `echo.phoenixelectric.life` (port 18790)
- SSE requires persistent HTTP connections

---

## 14. SECURITY CONSIDERATIONS

### Write Gates

- All POST operations require `SF_APPROVAL_TOKEN` or `ALLOW_SF_WRITES=true`
- Enforced at HTTP client level (cannot be bypassed)
- Rate limiter emergency bypass requires explicit Shane approval

### Credential Management

- All secrets in Azure Key Vault (never in code or .env files)
- Fallback chain for secret names ensures resilience
- Token auto-refresh prevents expired credential issues

### No-Delete Compliance

- Original `servicetitan/` directory preserved (not deleted)
- Original Key Vault secret names preserved (new ones added alongside)
- No files deleted without Shane's explicit approval

---

## 15. TESTING REQUIREMENTS

### Authentication Tests

- Key Vault secrets exist with canonical names
- OAuth token endpoint returns valid token
- Token caching works (second call returns cached)
- Token auto-refresh works (60s before expiry)
- Fallback chain works

### MCP Server Tests

- Zero ServiceTitan references in source
- Zero `ST*`-prefixed type imports
- All API paths verified against live SF API
- All tools registered
- Write operations blocked without approval token
- Server boots cleanly on all machines
- Health check endpoint returns status

### Rate Limiter Tests

- Token bucket algorithm unit tested
- Write operations cost 2 tokens
- 429 triggers bucket drain + backoff
- Requests queue when empty (no drops)
- Stats endpoint returns correct values

### Polling Engine Tests

- 7 pollers configured with correct intervals
- Change detection emits delta events
- Backoff on API errors
- Circuit breaker opens on 5 consecutive failures
- Memory budget stays under 50MB

### Dashboard Tests

- All 6 panels render without JavaScript errors
- SSE connection and event delivery
- Reconnection after network interruption
- Pricebook search < 300ms latency
- Browser memory < 100MB with all panels

---

## 16. DEPLOYMENT PROCEDURES

### Build & Deploy

```bash
cd ~/GitHub/phoenix-ai-core-staging
pnpm install
pnpm -F servicefusion-mcp build

# Verify clean build
grep -r "ServiceTitan\|servicetitan\|STCustomer\|STJob" packages/servicefusion-mcp/src/ && echo "FAIL" || echo "PASS"
```

### Start MCP Server

```bash
AZURE_KEY_VAULT_URI=https://phoenixaaivault.vault.azure.net/ \
SERVICEFUSION_ENVIRONMENT=production \
node packages/servicefusion-mcp/dist/index.js
```

### Rollback Procedures

| Component | Rollback |
|-----------|----------|
| MCP Server | `git checkout <working-commit> -- packages/servicefusion-mcp/` then rebuild |
| Polling Engine | Set `SF_POLLING_ENABLED=false` |
| Rate Limiter | Set `SF_RATE_LIMIT_BYPASS=true` (Shane approval required) |
| Dashboard Panels | Comment out SF routes in Gateway, remove panel divs, restart |
| Key Vault | Old secret names still work via fallback chain |

---

## 17. SHANE'S SPECIFIC DECISIONS

- 15-60 second data lag from polling is a "NONE ISSUE"
- Mistakes by the bot are expected and communicated
- "PROPOSE > APPROVE > EXECUTE -- nothing ships without Shane's green light"
- Write operations require approval gate
- Phoenix Electric is ELECTRICAL -- never HVAC
- Full hands-off operation is the goal

---

## 18. FILE REFERENCE

| File | Path | Purpose | Status |
|------|------|---------|--------|
| SF Client | `packages/servicefusion-mcp/src/client.ts` | API client (auth, requests) | Production-ready |
| Tool Definitions | `packages/servicefusion-mcp/src/tools/index.ts` | 16 active + 33 deprecated stubs | Production-ready |
| Rate Limiter | `packages/servicefusion-mcp/src/rate-limiter.ts` | Token bucket rate limiter | Planned |
| Polling Engine | `packages/servicefusion-mcp/src/polling-engine.ts` | Change-detection poller | Planned |
| Key Vault | `packages/shared/src/keyvault.ts` | Azure Key Vault credential fetch | Working |
| Shared Types | `packages/shared/src/types/index.ts` | SF type definitions (SF* prefix) | Working |
| Pricebook Gen | `pricebook/generate_sf_import.py` | 7-tier import file generator | Present |
| Pricebook File | `pricebook/Phoenix_Electric_SF_Import_7Tier.xlsx` | SF import spreadsheet | Present |
| Rexel Data | `rexel/data/raw_batches/` | 9 Rexel invoice CSV batches | Present |
| Plugin Dir | `~/.claude/plugins/servicefusion/` | Claude Code plugin (6 commands, 1 skill, 1 agent) | Present |
| Plugin Design | `docs/plans/2026-03-08-servicefusion-plugin-design.md` | Plugin design doc | Reference |
| ServiceTitan (archive) | `servicetitan/servicetitan-client.ts` | Original ST client (DO NOT USE) | Archive |

---

## 19. INTEGRATION POINTS WITH OTHER PHASES

- **Phase 4 (M365):** Teams bot can call SF MCP tools for job/customer lookups from Teams chat
- **Gateway:** SF dashboard panels integrate alongside M365 panels on the same Gateway instance
- **Pricebook:** SF pricebook data feeds into estimate builder used across all phases
- **Rexel:** Vendor pricing sync keeps SF materials current with supplier costs

---

## 20. SF API DOCUMENTATION LINKS

- API Documentation: `https://docs.servicefusion.com/#/docs/summary`
- Getting Started: `https://servicefusion.zendesk.com/hc/en-us/articles/360035145811`
- Client Credentials Grant: `https://servicefusion.zendesk.com/hc/en-us/articles/360039135151`
- Connected Apps (Auth Code): `https://servicefusion.zendesk.com/hc/en-us/articles/360039138891`
- Zapier Integration: `https://servicefusion.zendesk.com/hc/en-us/articles/4404612613005`
- Zapier MCP Server: `https://zapier.com/mcp/service-fusion`
