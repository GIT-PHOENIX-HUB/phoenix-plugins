# Phase 6: Security & Authentication -- Complete Technical Knowledge File

**Source Documents:**
- `05_RUNBOOKS/PHASE_06_SECURITY.md` (runbook)
- `06_PLAYBOOKS/PHASE_06_PLAYBOOK.md` (playbook)
**Extraction Date:** 2026-03-10
**Status:** READY FOR EXECUTION (pending Shane approval per PROPOSE > APPROVE > EXECUTE)

---

## 1. Objective and Shane's Directives

### Core Objective
Harden Phoenix Echo Gateway from "works for Shane on LAN" to "survives hostile internet with 24/7 reliable connections." Every external surface authenticated. Every internal surface authorized. Every secret in Azure Key Vault. Every sandbox escape-proof.

### Shane's Directives (Verbatim)
- "THIS NEEDS ADDRESSED WITH THE OPTION OF 24/7 RELIABLE CONNECTION FOR TASK PURPOSE. THE USER CREDS OR FINGER PRINT, FACE SCAN SHOULD BE A HOOK FOR THE GATE CODE TO LOAD."
- Asked about vm2: "WHATS THE ACTUAL RISK POTENTIAL AND CAN IT CRAWL OUT OF MY STUDIO?"

### Engineering Translation
- Authentication is the gate. No gate, no code loads. Period.
- Biometric (fingerprint, Face ID) is the preferred trigger for the auth flow.
- Sessions must persist across device sleep, network interruption, VPS restart.
- 24/7 means: auto-reconnect, token refresh, session recovery -- zero human intervention after initial auth.

---

## 2. Threat Model

### 2.1 Attack Surface Inventory

| Surface | Current State | Risk | Priority |
|---------|--------------|------|----------|
| Dashboard HTTP (port 18790) | OAuth via auth.js | M-6: Code has bugs (await without async, sessionStorage on server) | P0 |
| Dashboard WebSocket | NO AUTHENTICATION (m-4) | Anyone on network can connect and receive all events | P0 |
| VPS SSH (port 22) | Key-based, UFW restricted | Adequate | P2 |
| VPS HTTP (80/443) | Nginx + Let's Encrypt | Adequate but no CSP | P1 |
| Ollama API (11434/11435) | Localhost only | Safe if firewall holds | P2 |
| MCP servers (various ports) | Localhost bind | Safe if firewall holds | P2 |
| Sandbox (agent code execution) | vm2 DEPRECATED | Known escape vulnerabilities -- C-5 | P0 |
| Secret storage | Mixed (Key Vault + process.env) | M-1: Voice AI uses process.env.OPENAI_API_KEY | P1 |
| Tailscale mesh | End-to-end encrypted | Low risk | P3 |

### 2.2 Threat Actors

| Actor | Capability | Target | Mitigation |
|-------|-----------|--------|------------|
| Internet scanner (Shodan/Censys) | Port scanning, known CVE | VPS open ports | UFW, Nginx hardening, CSP |
| Rogue MCP server | Code injection via tool responses | Sandbox escape | Replace vm2, input validation |
| Stolen device | Physical access to MacBook/Studio | Session tokens, local secrets | Biometric gate, encrypted storage, session invalidation |
| Compromised model (DeepSeek-class) | Embedded behavioral exploit | Agent actions, data exfiltration | Model ban list, output validation, sandbox |
| LAN neighbor | ARP spoofing, WebSocket hijack | Dashboard events, chat content | WS auth, HTTPS everywhere |

### 2.3 vm2 Escape Risk Assessment
vm2 escape vulnerabilities (CVE-2023-37903, CVE-2023-37466, CVE-2023-29199) allow arbitrary code execution in the HOST Node.js process. Once in the host process:
- File system access (read/write any file the Node process can)
- Network (make HTTP requests, open sockets)
- Environment variables (steal secrets)
- Child processes (run shell commands)

**Can it crawl out of Studio?** YES, if escaped code reads SSH keys or Tailscale auth, reads Azure Key Vault tokens, or makes outbound HTTP to exfiltrate data.

**Containment boundary:** Host-process access, not root. Cannot install kernel modules without privilege escalation. But can read anything the `phoenix` user can read and send it anywhere.

---

## 3. Technology Stack

### 3.1 Runtime
- **Node.js:** 22.x LTS (Studio: `/opt/homebrew/bin/node`)
- **Module system:** ES modules

### 3.2 Dependencies

| Package | Version | Purpose | Install |
|---------|---------|---------|---------|
| `isolated-vm` | 5.x | Sandbox replacement for vm2 | `npm install isolated-vm` |
| `jsonwebtoken` | 9.x | JWT signing/verification | `npm install jsonwebtoken` |
| `jose` | 5.x | PKCE crypto (Web Crypto compatible) | `npm install jose` |
| `helmet` | 8.x | HTTP security headers including CSP | `npm install helmet` |
| `@azure/keyvault-secrets` | 4.x | Azure Key Vault SDK | `npm install @azure/keyvault-secrets` |
| `@azure/identity` | 4.x | Azure auth for Key Vault | `npm install @azure/identity` |

### 3.3 Infrastructure

| Component | Details |
|-----------|---------|
| VPS | IP: 93.188.161.80 |
| VPS Firewall | UFW: ports 22, 80, 443 |
| SSL/TLS | Nginx + Let's Encrypt |
| Secrets Vault | Azure Key Vault `PhoenixaAiVault` |
| Tailscale mesh | 5 devices, end-to-end encrypted |
| Domain | echo.phoenixelectric.life |

---

## 4. Step 1: OAuth PKCE Rewrite (Clean Room)

### 4.1 Bugs in Current Code (Do NOT Copy-Paste)

**Bug 1 -- Frontend `await` without `async`:**
```javascript
// BROKEN
function redirectToOAuth() {
  const codeChallenge = await generatePKCE();  // SyntaxError
}
```

**Bug 2 -- Backend uses `sessionStorage` (browser-only API):**
```javascript
// BROKEN
app.get('/oauth-callback', async (req, res) => {
  const verifier = req.query.state ? sessionStorage.getItem('pkce_verifier') : null;
  // sessionStorage is undefined on server
});
```

### 4.2 Frontend Auth Flow (`public-vps/auth.js`)

**Auth Config:**
```javascript
const AUTH_CONFIG = {
  configEndpoint: '/api/auth/config',
  tokenEndpoint: '/api/auth/token',
  callbackPath: '/oauth-callback',
};
```

**PKCE Challenge Generation:**
- Random string: `Uint8Array(length)` with `crypto.getRandomValues`
- SHA-256: `crypto.subtle.digest('SHA-256', data)`
- Base64URL encoding: standard base64 with `+`->`-`, `/`->`_`, padding removed

**Login Flow:**
1. Generate PKCE pair (codeVerifier + codeChallenge)
2. Store codeVerifier in `sessionStorage` (browser -- correct usage)
3. Fetch auth config from backend (`/api/auth/config`)
4. Build authorization URL with: client_id, redirect_uri, response_type=code, code_challenge, code_challenge_method=S256, scope, state
5. Store state in `sessionStorage` (CSRF protection)
6. Redirect to authorization URL

**Callback Handling:**
1. Extract code, state, error from URL params
2. Verify state matches saved state (CSRF protection)
3. Retrieve codeVerifier from `sessionStorage`
4. POST to backend `/api/auth/token` with code + codeVerifier
5. Clean up PKCE artifacts from sessionStorage
6. Redirect to `/` (backend sets HTTP-only cookie)

**Session Check:**
```javascript
async function checkSession() {
  const res = await fetch('/api/auth/session', { credentials: 'include' });
  if (res.ok) return await res.json();
  return null;
}
```

**Login Gate UI:**
- Full-screen dark background (`#0d1117`)
- Phoenix logo centered with breathing glow animation (soft orange pulse)
- Single "Sign In" button
- No navigation, no links, no footer -- entire page is the gate

### 4.3 Backend Auth Routes (BFF Pattern)

**Cookie Configuration:**
```javascript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 24 * 60 * 60,  // 24 hours (seconds)
};
```

**API Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/auth/config` | Public | Returns clientId, authorizeUrl, scope |
| POST | `/api/auth/token` | Public | Exchanges authorization code for tokens (BFF) |
| GET | `/api/auth/session` | Cookie | Checks if user has valid session |
| POST | `/api/auth/logout` | Cookie | Destroys session, clears cookie |

**Token Exchange Flow (BFF):**
1. Receive code + codeVerifier from frontend
2. POST to OAuth provider token URL with: grant_type=authorization_code, code, client_id, code_verifier, redirect_uri
3. **CRITICAL HEADER:** `anthropic-beta: oauth-2025-04-20` (MANDATORY on every Anthropic API call)
4. Create internal JWT session with: sub, role, iat
5. Store OAuth access/refresh tokens in server-side memory (NEVER sent to browser)
6. Set JWT as HTTP-only cookie (`phoenix_session`)

### 4.4 The Beta Header (Hard Lesson)

```javascript
// NEVER FORGET THIS.
// OAuth tokens REQUIRE this header. Without it, Anthropic API returns:
// "OAuth not supported"
//
// Shane KNEW this worked. Echo argued for a WEEK. Cost $50.
// Documented 2026-03-05. Permanent rule.
headers: {
  'anthropic-beta': 'oauth-2025-04-20'
}
```

Must be present on:
- Token exchange endpoint
- Claude API calls in model-router.js
- Any refresh token flow

### 4.5 Token Refresh (24/7 Reliability)

- Runs server-side via `setInterval` every 5 minutes
- Refreshes tokens older than 50 minutes (of 60 min lifetime)
- Uses `grant_type: refresh_token` with the beta header
- Updates both access and refresh tokens in session store
- Zero human intervention required

```javascript
setInterval(refreshOAuthTokens, 5 * 60 * 1000);
```

### 4.6 OAuth Verification Checklist
- `redirectToOAuth` is `async` and `await` works
- `sessionStorage` is only used in BROWSER code
- Backend NEVER accesses `sessionStorage`
- `code_verifier` generated client-side, sent to backend in POST body
- Backend exchanges code + verifier at OAuth provider
- OAuth access token NEVER sent to browser
- JWT cookie is httpOnly + secure + sameSite strict
- `anthropic-beta: oauth-2025-04-20` header on every Anthropic API call
- Token refresh runs server-side on interval
- State parameter checked on callback (CSRF protection)

---

## 5. Step 2: JWT Session Management

### 5.1 Architecture

```
Browser <-> [HTTP-only cookie: JWT] <-> Gateway <-> [in-memory session store]
                                                        |
                                              [OAuth tokens, user data]
```

### 5.2 JWT Payload Schema

```javascript
{
  "sub": "shane",              // User identifier
  "role": "admin",             // RBAC role
  "iat": 1741564800,           // Issued at (Unix timestamp)
  "exp": 1741651200,           // Expires at (24h later)
  "jti": "a1b2c3d4e5f6",      // Unique token ID (for revocation)
  "device": "macbook-pro",     // Device identifier
}
```

### 5.3 JWT Configuration
- **Algorithm:** HS256
- **Expiration:** 24 hours
- **Signing key:** From Azure Key Vault (`JWT-Signing-Key`)
- **Library:** `jose` (SignJWT, jwtVerify)

### 5.4 Auth Middleware (`middleware/authMiddleware.js`)

Key behaviors:
- Extracts token from `req.cookies?.phoenix_session`
- Verifies JWT with `jwtVerify` using secret from Key Vault
- Verifies session exists in server-side store
- Attaches `req.user` with: id, role, device, sessionId
- Attaches `req.auditContext` with: user, role, path, method, timestamp
- On expired JWT: clears cookie, returns 401
- On invalid JWT: returns 403

### 5.5 Public vs Protected Routes

**Public routes (no auth):**
- `GET /login`
- `GET /oauth-callback`
- `GET /api/auth/config`
- `POST /api/auth/token`
- `GET /health`

**All other routes:** Protected via `app.use(requireAuth)`

### 5.6 JWT Secret Generation

```bash
# Generate 256-bit secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Store in Azure Key Vault
az keyvault secret set \
  --vault-name PhoenixaAiVault \
  --name JWT-Signing-Key \
  --value "THE_GENERATED_SECRET_HERE"
```

---

## 6. Step 3: Role-Based Access Control (RBAC)

### 6.1 Role Definitions

| Role | Who | Dashboard | Chat | Tools | Admin | Fleet |
|------|-----|-----------|------|-------|-------|-------|
| `admin` | Shane | Full (RWC) | Full (all models, extended thinking) | All | Full | Full |
| `technician` | Field crew | Read-only | Basic (limited models) | 5 specific tools | None | None |
| `viewer` | Stakeholders/Accountants | Read-only | None | None | None | None |

### 6.2 Permission Matrix

**Admin permissions:**
```javascript
{
  dashboard: ['read', 'write', 'configure'],
  chat: ['send', 'receive', 'model_select', 'extended_thinking'],
  tools: ['*'],
  admin: ['user_manage', 'config', 'deploy', 'secret_manage'],
  fleet: ['view', 'swap_model', 'evict', 'benchmark'],
  files: ['read', 'write', 'execute', 'delete'],
  agents: ['dispatch', 'kill', 'configure'],
  models: ['*'],
  channels: ['*'],
  rateLimit: null
}
```

**Technician permissions:**
```javascript
{
  dashboard: ['read'],
  chat: ['send', 'receive'],
  tools: ['sf_read_job', 'sf_update_status', 'sf_read_customer', 'sf_clock_in', 'sf_clock_out'],
  admin: [],
  fleet: [],
  files: ['read'],
  agents: [],
  models: ['llama3.1:8b', 'mistral:7b'],
  channels: ['telegram'],
  rateLimit: { requests: 100, window: '1h' }
}
```

**Viewer permissions:**
```javascript
{
  dashboard: ['read'],
  chat: [],
  tools: [],
  admin: [],
  fleet: [],
  files: [],
  agents: [],
  models: [],
  channels: [],
  rateLimit: { requests: 50, window: '1h' }
}
```

### 6.3 RBAC Middleware

```javascript
function requirePermission(resource, action) {
  return (req, res, next) => {
    const result = checkPermission(req.user, resource, action);
    if (!result.allowed) {
      logger.warn(`RBAC DENIED: user=${req.user.id} resource=${resource} action=${action}`);
      return res.status(403).json({ error: result.reason });
    }
    next();
  };
}
```

### 6.4 Route Protection Examples

```javascript
app.get('/api/fleet/status', requirePermission('fleet', 'view'), fleetStatusHandler);
app.post('/api/fleet/swap', requirePermission('fleet', 'swap_model'), fleetSwapHandler);
app.post('/api/agents/dispatch', requirePermission('agents', 'dispatch'), dispatchHandler);
app.get('/api/admin/config', requirePermission('admin', 'config'), adminConfigHandler);
app.post('/api/tools/execute', requirePermission('tools', '*'), toolExecuteHandler);
```

### 6.5 Model Access Control

```javascript
function checkModelAccess(user, modelName) {
  const role = ROLES[user.role];
  if (!role) return false;
  if (role.models.includes('*')) return true;
  return role.models.includes(modelName);
}
```

### 6.6 DeepSeek Enforcement (PERMANENT BAN)

**Banned models:** `deepseek`, `deepseek-r1`, `deepseek-v2`, `deepseek-coder`

Enforcement is double-layered:
1. **Router level:** Hard block regardless of role
2. **RBAC level:** Never in any role's allowed models list

```javascript
const BANNED_MODELS = ['deepseek', 'deepseek-r1', 'deepseek-v2', 'deepseek-coder'];

function isModelBanned(modelName) {
  return BANNED_MODELS.some(banned => modelName.toLowerCase().includes(banned));
}
```

Response on attempted use:
```json
{
  "error": "Model is permanently banned from this system",
  "reason": "CrowdStrike security advisory -- embedded behavioral exploits"
}
```

Ban is PERMANENT. Cannot be removed through UI. Code change required.

### 6.7 Frontend Role-Based UI

CSS-based role hiding (UX only -- server RBAC enforces actual access):

```css
[data-role-min="admin"] { display: none; }
[data-role-min="technician"] { display: none; }

body[data-user-role="admin"] [data-role-min="admin"] { display: initial; }
body[data-user-role="admin"] [data-role-min="technician"] { display: initial; }
body[data-user-role="technician"] [data-role-min="technician"] { display: initial; }
```

HTML usage:
```html
<body data-user-role="admin">
  <div class="dashboard-overview">...</div>  <!-- Everyone -->
  <div data-role-min="technician" class="chat-panel">...</div>  <!-- Admin + Tech -->
  <nav data-role-min="admin" class="admin-nav">...</nav>  <!-- Admin only -->
</body>
```

---

## 7. Step 4: Sandbox Replacement (vm2 Removal)

### 7.1 Decision: isolated-vm

| Option | Isolation Level | Verdict |
|--------|----------------|---------|
| `vm2` | BROKEN (CVE escape) | **REMOVE** |
| `isolated-vm` | V8 isolate (strong) | **SELECTED** |
| Docker containers | Kernel-level (strongest) | Future option for untrusted code |
| macOS `sandbox-exec` | OS-level | Supplementary, not primary |

### 7.2 isolated-vm Configuration

```javascript
const SANDBOX_DEFAULTS = {
  memoryLimit: 128,     // MB per isolate
  timeout: 30000,       // ms execution timeout
  maxIsolates: 10,      // Max concurrent isolates
};
```

### 7.3 Input Validation (Pre-Sandbox)

Code must be a string, max 100KB. Blocked patterns:
```javascript
const dangerousPatterns = [
  /require\s*\(/,
  /import\s+/,
  /process\./,
  /child_process/,
  /\bfs\./,
  /\bnet\./,
  /\bhttp\./,
  /\bFunction\s*\(/,
  /\bProxy\s*\(/,
  /__proto__/,
  /constructor\s*\[/,
];
```

### 7.4 Sandbox Capabilities

Provides within isolate:
- `console.log/error/warn` (captured to logs array, lines capped at 10,000 chars)
- `context` object (frozen, read-only copy of provided context)

Blocks within isolate:
- File system access (no `fs`, `require`, `import`)
- Network access (no `http`, `net`, `fetch`, `XMLHttpRequest`)
- Process control (no `process`, `child_process`, `os`)
- Prototype pollution (pattern check + V8 isolate boundary)
- Memory bomb (capped at 128MB per isolate, hard-killed by V8)
- CPU bomb (capped at 30s timeout, hard-killed by V8)

### 7.5 Migration Steps

```bash
npm uninstall vm2
npm install isolated-vm

# Find all vm2 imports
grep -rn "require.*vm2\|from.*vm2" --include="*.js" --include="*.mjs" .

# Replace each:
# Old: const { VM } = require('vm2');
#      const result = vm.run(code);
# New: import { executeInSandbox } from './sandbox.js';
#      const { success, result, error } = await executeInSandbox(code, context);

# Verify full removal
grep -rn "vm2" --include="*.js" --include="*.mjs" --include="package.json" .
# Must return ZERO results
```

### 7.6 Can It Still Crawl Out?
**Answer to Shane: No, it cannot crawl out of the Studio.** V8 isolates are the same technology Chrome uses to prevent malicious websites from escaping tab boundaries.

---

## 8. Step 5: Azure Key Vault Integration

### 8.1 Vault Configuration

| Property | Value |
|----------|-------|
| Vault URL | `https://PhoenixaAiVault.vault.azure.net/` |
| Auth | `DefaultAzureCredential` |
| Cache TTL | 5 minutes |
| Fallback | Environment variables (local dev only) |

### 8.2 Secret Manager (`secrets.js`)

```javascript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const VAULT_URL = 'https://PhoenixaAiVault.vault.azure.net/';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

**Secret resolution order:**
1. Check local cache (if within TTL)
2. Try Azure Key Vault
3. Fallback: environment variable (Key Vault name converted: `JWT-Signing-Key` -> `JWT_SIGNING_KEY`)

### 8.3 Secrets Inventory

| Secret Name | Description | Current Location | Status |
|-------------|-------------|-----------------|--------|
| `Anthropic-Oauth-key` | OAuth token for Claude API | Already in Key Vault | DONE |
| `JWT-Signing-Key` | 256-bit key for JWT HS256 | Does not exist yet | MUST GENERATE |
| `Gateway-Session-Secret` | Express session secret | process.env | MUST MIGRATE |
| `Telegram-Bot-Token` | Telegram adapter auth | process.env | MUST MIGRATE |
| `OpenAI-API-Key` | Voice AI | process.env.OPENAI_API_KEY (M-1 violation) | MUST MIGRATE |
| `Discord-Bot-Token` | Discord adapter auth | process.env | MUST MIGRATE |

### 8.4 Migration Commands

```bash
# Generate and store new secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")

az keyvault secret set --vault-name PhoenixaAiVault --name JWT-Signing-Key --value "$JWT_SECRET"
az keyvault secret set --vault-name PhoenixaAiVault --name Gateway-Session-Secret --value "$SESSION_SECRET"

# Migrate existing secrets from .env
az keyvault secret set --vault-name PhoenixaAiVault --name Telegram-Bot-Token --value "$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)"
az keyvault secret set --vault-name PhoenixaAiVault --name OpenAI-API-Key --value "$(grep OPENAI_API_KEY .env | cut -d= -f2)"
```

### 8.5 Replace All process.env Secret Access

```bash
# Find every secret access in codebase
grep -rn "process\.env\.\(API_KEY\|SECRET\|TOKEN\|PASSWORD\)" --include="*.js" --include="*.mjs" .

# Each must be replaced with:
# const value = await getSecret('Key-Vault-Name');
```

### 8.6 Pre-Flight Checks

```bash
# Verify VPS connectivity
ssh phoenix-echo "systemctl status phoenix-echo"

# Verify Azure Key Vault access
az keyvault secret list --vault-name PhoenixaAiVault --query "[].name" -o tsv

# Verify Node version
node --version  # Must be 22.x

# Git tag current state (rollback anchor)
cd ~/Phoenix-Echo-Gateway
git tag pre-security-hardening
git push origin pre-security-hardening

# Backup current auth.js
cp public-vps/auth.js public-vps/auth.js.backup.$(date +%Y%m%d)
```

---

## 9. Step 6: WebSocket Authentication

### 9.1 Problem (m-4)
Dashboard WebSocket has zero authentication. Anyone who can reach port 18790 can connect and receive all system events.

### 9.2 Authenticated WebSocket (`ws-auth.js`)

**Connection authentication:**
1. Extract JWT from cookie or query parameter
2. Verify JWT with jose `jwtVerify`
3. Verify session exists in server-side store
4. Attach user info to WebSocket connection

**Message authorization:**
- Each incoming WebSocket message is validated against RBAC
- Chat messages require `checkPermission(user, 'chat', 'send')`

**Heartbeat:**
- Ping every 30 seconds
- Dead connections terminated after missed pong

**Role-filtered broadcasting:**
```javascript
function broadcastToRole(wss, event, minRole) {
  const roleHierarchy = { admin: 3, technician: 2, viewer: 1 };
  const minLevel = roleHierarchy[minRole] || 0;
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      const clientLevel = roleHierarchy[ws.userRole] || 0;
      if (clientLevel >= minLevel) {
        ws.send(JSON.stringify(event));
      }
    }
  });
}
```

### 9.3 Frontend WebSocket Reconnect (`ws-manager.js`)

**Reconnect behavior:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
- Max reconnect attempts: 20
- Auth failure (code 4001): redirect to `/login`
- Cookies sent automatically on same-origin WebSocket

---

## 10. Step 7: Content Security Policy (CSP)

### 10.1 CSP Configuration with Helmet

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'wss:', 'https://api.anthropic.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true,  // nosniff
  xFrameOptions: { action: 'deny' },
}));
```

### 10.2 Security Headers Summary

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | (see above) | XSS prevention |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Force HTTPS |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |

### 10.3 Inline Handler Cleanup

All inline handlers must be replaced:

Before (blocks CSP):
```html
<button onclick="connectService('sf')">Connect</button>
```

After (CSP-compatible):
```html
<button data-action="connect" data-service="sf">Connect</button>
```
```javascript
document.querySelectorAll('[data-action="connect"]').forEach(btn => {
  btn.addEventListener('click', () => connectService(btn.dataset.service));
});
```

### 10.4 CSP Deployment Sequence
1. Deploy with `reportOnly: true`
2. Monitor `/api/csp-report` for 48 hours
3. Fix all reported violations
4. Switch to `reportOnly: false` (enforcement mode)

### 10.5 CSP Violation Reporting Endpoint

```javascript
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  logger.warn('CSP Violation:', JSON.stringify(req.body));
  res.status(204).end();
});
```

---

## 11. Step 8: Biometric Gate Hooks (WebAuthn/FIDO2)

### 11.1 Flow Overview

**First-time setup:**
1. Shane authenticates via OAuth first time
2. Dashboard offers "Enable Biometric Login"
3. WebAuthn registration triggers Touch ID / Face ID
4. Credential public key stored server-side
5. Next login: biometric replaces OAuth redirect

**Subsequent logins:**
1. User taps "Sign In"
2. Browser checks WebAuthn support
3. Touch ID / Face ID prompt appears
4. Biometric succeeds -> credential returned
5. Credential sent to backend for verification
6. Backend verifies -> creates JWT session -> sets cookie
7. Dashboard loads in < 1 second

**Fallback chain:**
```
WebAuthn (Touch ID / Face ID)
  -> Success: Dashboard loads
  -> Cancelled: Show "Sign in with OAuth" button
  -> Not available: OAuth PKCE redirect
  -> Error: OAuth PKCE redirect
OAuth PKCE
  -> Success: Dashboard loads
  -> Failed: Error message + "Try Again"
```

### 11.2 WebAuthn Registration API

**Frontend registration:**
```javascript
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: serverChallenge,
    rp: { name: 'Phoenix Echo', id: window.location.hostname },
    user: { id: userId, name: userName, displayName: 'Shane Warehime' },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },    // ES256
      { alg: -257, type: 'public-key' },   // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',  // Built-in (Touch ID, Face ID)
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  },
});
```

### 11.3 WebAuthn Authentication API

**Frontend assertion:**
```javascript
const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: serverChallenge,
    rpId: window.location.hostname,
    allowCredentials: registeredCredentials,
    userVerification: 'required',
    timeout: 60000,
  },
});
```

### 11.4 Backend WebAuthn Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/webauthn/register-challenge` | Required (JWT) | Generate registration challenge |
| POST | `/api/auth/webauthn/register-complete` | Required (JWT) | Complete registration, store credential |
| GET | `/api/auth/webauthn/auth-challenge` | Public | Generate authentication challenge |
| POST | `/api/auth/webauthn/auth-complete` | Public | Verify assertion, create session |

**Challenge storage:**
- Short-lived: 60 seconds TTL
- Stored in server-side Map with UUID key
- Deleted after use (single-use)

**Credential storage:**
- Currently: in-memory Map (production: move to SQLite)
- Stores: userId, publicKey, counter, createdAt
- Counter updated on each authentication (replay protection)

### 11.5 Device Compatibility

| Device | Biometric | WebAuthn Support |
|--------|-----------|-----------------|
| MacBook Pro (Touch ID) | Fingerprint | Full (Safari, Chrome, Firefox) |
| Mac Studio (no biometric) | N/A | Falls back to OAuth |
| iPhone (Face ID) | Face scan | Full (Safari) |
| iPad (Face ID) | Face scan | Full (Safari) |
| VPS (SSH) | N/A | Not applicable (API access only) |

---

## 12. Session Management and 24/7 Reliability

### 12.1 Session Architecture
- JWT in HTTP-only cookie: session key
- OAuth tokens: server-side memory store (keyed by JWT)
- Session lifetime: 24 hours

### 12.2 Returning User Flow
```
Browser sends HTTP-only cookie automatically
  -> Gateway validates JWT
    -> Valid: Dashboard loads immediately (no login screen)
    -> Expired: Login gate appears, re-authenticate
    -> Invalid: Cookie cleared, login gate appears
```

### 12.3 Session Recovery After Sleep/Disconnect
```
Device sleeps for 2 hours
  -> Device wakes up
    -> WebSocket reconnects (exponential backoff)
      -> Session still valid (24h window): Reconnected, no interruption
      -> Session expired: Login gate on next page action
Meanwhile: Backend auto-refreshed OAuth tokens every 50 minutes
```

---

## 13. Visual Design Specs

### 13.1 Login Gate CSS

| Element | Color | Hex |
|---------|-------|-----|
| Background (dark) | Near-black | `#0d1117` |
| Card background | Dark gray | `#161b22` |
| Border | Subtle gray | `#30363d` |
| Primary text | Light gray | `#e6edf3` |
| Secondary text | Mid gray | `#8b949e` |
| Phoenix accent | Clay/orange | `#d97757` |
| Success | Green | `#3fb950` |
| Warning | Yellow | `#d29922` |
| Error | Red | `#f85149` |
| Info | Blue | `#58a6ff` |

### 13.2 Login Gate Layout
- Centered flex container, min-height 100vh
- Login card: max-width 400px, 16px border-radius, box-shadow
- Phoenix logo: 80px, breathing glow animation (4s ease-in-out infinite)
- Sign In button: padding 0.875rem 2.5rem, #d97757 background, 8px border-radius

### 13.3 Security Dashboard Layout
- Grid: 2-column on desktop, 1-column on mobile (768px breakpoint)
- Panels: 12px border-radius, #161b22 background, #30363d border
- Auth events log: full-width, grid columns for time/type/user/device/method/result

---

## 14. Security Dashboard (Admin Only)

### 14.1 Dashboard Panels

**Auth Status:**
- Active sessions (device, duration, expiry, biometric type)
- OAuth provider and token status
- Last refresh and next refresh time
- Registered biometric devices
- Controls: [Revoke All Sessions], [Remove Biometric]

**Threat Monitor:**
- Failed logins count
- RBAC denials count
- CSP violations count
- Sandbox kills count
- Banned model attempts count
- Link to full audit log

**Secret Management:**
- Key Vault connection status
- Count of loaded secrets
- Cache TTL
- Per-secret health indicators

**Sandbox Status:**
- Engine: isolated-vm
- Active isolates count / max
- Memory limit per isolate
- Timeout per isolate
- Last execution time
- Blocked executions count
- vm2 status: REMOVED

**Model Security (DeepSeek Ban):**
- List of banned models with advisory citations
- Ban enforcement method: ROUTER + RBAC (double block)
- Last attempt timestamp
- Note: Ban is PERMANENT, code change required to remove

**Recent Auth Events Log:**
- Time, type, user, device, method, result
- Types: LOGIN, REFRESH, RBAC, SANDBOX
- Results: SUCCESS, BLOCKED, ALLOWED

---

## 15. Testing Requirements

### 15.1 Auth Flow Smoke Test

```bash
# Unauthenticated access blocked
curl -s http://localhost:18790/ -o /dev/null -w "%{http_code}"
# Expected: 401

# Health endpoint public
curl -s http://localhost:18790/health -o /dev/null -w "%{http_code}"
# Expected: 200

# Login page public
curl -s http://localhost:18790/login -o /dev/null -w "%{http_code}"
# Expected: 200

# Auth config public
curl -s http://localhost:18790/api/auth/config | jq .
# Expected: { "clientId": "...", "authorizeUrl": "...", "scope": "..." }

# WebSocket requires auth
wscat -c ws://localhost:18790/ws
# Expected: Connection rejected with 401
```

### 15.2 RBAC Tests

```bash
# Technician cannot access admin
curl -s -b "phoenix_session=TECHNICIAN_TOKEN" http://localhost:18790/api/admin/config -w "%{http_code}"
# Expected: 403

# Viewer cannot send chat
curl -s -b "phoenix_session=VIEWER_TOKEN" -X POST http://localhost:18790/api/chat -w "%{http_code}"
# Expected: 403

# Admin can access everything
curl -s -b "phoenix_session=ADMIN_TOKEN" http://localhost:18790/api/admin/config -w "%{http_code}"
# Expected: 200
```

### 15.3 Sandbox Escape Tests

All must return BLOCKED (PASS):
- `require('fs').readFileSync('/etc/passwd')` -- require access
- `process.env` -- process access
- `import fs from 'fs'` -- import statement
- `this.constructor.constructor('return process')()` -- constructor escape
- `({}).__proto__.polluted = true` -- proto pollution
- `while(true){}` -- infinite loop
- `const a = []; while(true) a.push(new Array(1000000))` -- memory bomb
- `fetch('https://example.com')` -- network access

### 15.4 CSP Validation

```bash
# Check CSP header present
curl -sI https://echo.phoenixelectric.life/ | grep -i "content-security-policy"

# Check no inline handlers
grep -rn "onclick\|onsubmit\|onchange\|onload\|onerror" --include="*.html" public-vps/
# Expected: ZERO results
```

### 15.5 Key Vault Connectivity

```bash
node -e "
  import { initSecrets, getSecret } from './secrets.js';
  await initSecrets();
  const secrets = ['Anthropic-Oauth-key', 'JWT-Signing-Key', 'Gateway-Session-Secret'];
  for (const name of secrets) {
    try {
      const val = await getSecret(name);
      console.log(name + ': OK (' + val.length + ' chars)');
    } catch (e) {
      console.log(name + ': FAILED -- ' + e.message);
    }
  }
"
```

### 15.6 DeepSeek Block Verification

```bash
curl -s -b "phoenix_session=ADMIN_TOKEN" \
  -X POST http://localhost:18790/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek-r1", "message": "test"}' \
  | jq .error
# Expected: "Model is permanently banned from this system"
```

---

## 16. Rollback Plan

### 16.1 Full Rollback

```bash
# On Studio
cd ~/Phoenix-Echo-Gateway
git checkout pre-security-hardening
npm install

# On VPS
ssh phoenix-echo
cd /opt/phoenix-echo-gateway
git fetch origin
git checkout pre-security-hardening
npm install
sudo systemctl restart phoenix-echo

# Restore auth.js backup
cp public-vps/auth.js.backup.YYYYMMDD public-vps/auth.js
```

### 16.2 Partial Rollback (Feature Flags)

```javascript
const SECURITY_CONFIG = {
  oauth: { enabled: true },       // false: opens dashboard without auth
  jwt: { enabled: true },         // false: skips JWT validation
  rbac: { enabled: true },        // false: all roles get all access
  sandbox: { enabled: true },     // false: direct code execution (DANGEROUS)
  csp: { enabled: true },         // false: removes CSP headers
  webauthn: { enabled: true },    // false: OAuth only, no biometric
  wsAuth: { enabled: true },      // false: unauthenticated WebSocket
};
```

Each flag toggleable independently without affecting others.

### 16.3 Emergency: "Nothing Works, Shane Can't Log In"

```bash
ssh phoenix-echo
sudo nano /opt/phoenix-echo-gateway/middleware/authMiddleware.js

# Add at top of requireAuth():
# const BYPASS_IPS = ['100.80.140.118'];  // Shane's MacBook Tailscale IP
# if (BYPASS_IPS.includes(req.ip)) { req.user = { id: 'shane', role: 'admin' }; return next(); }

sudo systemctl restart phoenix-echo
```

**Remove bypass immediately after fixing the real issue.**

---

## 17. Execution Order

| Step | Task | Dependency | Est. Time | Risk |
|------|------|-----------|-----------|------|
| 1 | Generate and store JWT secret in Key Vault | None | 15 min | Low |
| 2 | Implement `secrets.js` (Key Vault integration) | Step 1 | 2 hours | Medium |
| 3 | Implement `authMiddleware.js` (JWT validation) | Step 2 | 1 hour | Low |
| 4 | Implement `rbac.js` (role system) | Step 3 | 2 hours | Low |
| 5 | Rewrite `auth.js` frontend (OAuth PKCE) | Step 3 | 3 hours | High |
| 6 | Implement backend auth routes (BFF pattern) | Steps 2, 5 | 3 hours | High |
| 7 | Replace vm2 with isolated-vm (`sandbox.js`) | None (parallel) | 2 hours | Medium |
| 8 | Implement WebSocket auth (`ws-auth.js`) | Step 3 | 2 hours | Medium |
| 9 | Add CSP via helmet (report-only first) | None (parallel) | 1 hour | Low |
| 10 | Clean up inline event handlers | Step 9 | 2 hours | Low |
| 11 | Implement WebAuthn biometric gate | Steps 5, 6 | 4 hours | Medium |
| 12 | Token refresh automation | Step 6 | 1 hour | Low |
| 13 | Run full Gauntlet checklist | All steps | 2 hours | -- |
| **Total** | | | **~25 hours** | |

Steps 7, 9, and 10 can run in parallel with Steps 1-6.

---

## 18. Gauntlet Checklist (28 checks)

### Authentication (6 checks)
- G-AUTH-1: Unauthenticated HTTP requests to protected endpoints return 401
- G-AUTH-2: OAuth PKCE flow completes end-to-end
- G-AUTH-3: JWT tokens expire after 24 hours
- G-AUTH-4: Token refresh happens automatically
- G-AUTH-5: `anthropic-beta: oauth-2025-04-20` header on all Anthropic API calls
- G-AUTH-6: Biometric gate triggers Touch ID / Face ID on supported devices

### Authorization (5 checks)
- G-AUTHZ-1: Admin can access all endpoints and all models
- G-AUTHZ-2: Technician restricted to read-only dashboard + limited tools
- G-AUTHZ-3: Viewer has zero write access
- G-AUTHZ-4: DeepSeek models rejected regardless of role (hard ban)
- G-AUTHZ-5: RBAC denials logged with user, resource, action, timestamp

### Secrets (4 checks)
- G-SEC-1: Zero secrets in source code or committed .env files
- G-SEC-2: All secrets retrievable from Azure Key Vault
- G-SEC-3: Fallback to env vars works for local development
- G-SEC-4: OAuth access tokens NEVER sent to browser

### Sandbox (4 checks)
- G-SAND-1: vm2 completely removed from package.json and node_modules
- G-SAND-2: isolated-vm blocks require, import, process, fs, net
- G-SAND-3: Infinite loops killed by 30s timeout
- G-SAND-4: Memory bombs killed by 128MB limit

### Network (5 checks)
- G-NET-1: WebSocket connections require valid JWT
- G-NET-2: CSP headers on all HTML responses
- G-NET-3: Zero inline event handlers in HTML
- G-NET-4: HSTS header with 1-year max-age
- G-NET-5: WebSocket heartbeat kills dead connections after 30s

### Operations (4 checks)
- G-OPS-1: All security components individually disableable via config flags
- G-OPS-2: Rollback procedure tested and documented
- G-OPS-3: CSP deployed in report-only first, then enforcement
- G-OPS-4: Audit log captures all auth events

---

## 19. File Inventory

| File | Purpose | Location |
|------|---------|----------|
| `public-vps/auth.js` | Frontend OAuth PKCE + biometric gate | VPS public |
| `routes/auth.js` | Backend BFF OAuth handler | Gateway |
| `routes/webauthn.js` | Backend WebAuthn endpoints | Gateway |
| `middleware/authMiddleware.js` | JWT validation middleware | Gateway |
| `middleware/rbacMiddleware.js` | RBAC permission middleware | Gateway |
| `rbac.js` | Role definitions and permission checks | Gateway |
| `sandbox.js` | isolated-vm code execution | Gateway |
| `secrets.js` | Azure Key Vault integration | Gateway |
| `ws-auth.js` | Authenticated WebSocket server | Gateway |
| `ws-manager.js` | Frontend WebSocket reconnect manager | VPS public |
| `biometric-gate.js` | Frontend WebAuthn registration/authentication | VPS public |

---

## 20. API Endpoint Reference

### Public Endpoints (No Auth)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/login` | -- | Login page HTML |
| GET | `/oauth-callback` | `?code=&state=` | Handles OAuth redirect |
| GET | `/api/auth/config` | -- | `{ clientId, authorizeUrl, scope }` |
| POST | `/api/auth/token` | `{ code, codeVerifier }` | Sets cookie, `{ success: true }` |
| GET | `/health` | -- | 200 OK |
| GET | `/api/auth/webauthn/auth-challenge` | -- | `{ challenge, challengeId, allowCredentials }` |
| POST | `/api/auth/webauthn/auth-complete` | `{ id, response, challengeId }` | Sets cookie, `{ success: true }` |

### Protected Endpoints (JWT Required)

| Method | Path | Min Role | Purpose |
|--------|------|----------|---------|
| GET | `/api/auth/session` | Any | Check session validity |
| POST | `/api/auth/logout` | Any | Destroy session |
| GET | `/` | Any | Dashboard (role-filtered) |
| POST | `/api/auth/webauthn/register-challenge` | Any (authenticated) | WebAuthn registration |
| POST | `/api/auth/webauthn/register-complete` | Any (authenticated) | Complete registration |
| GET | `/api/fleet/status` | admin (fleet.view) | Fleet status |
| POST | `/api/fleet/swap` | admin (fleet.swap_model) | Swap model |
| POST | `/api/agents/dispatch` | admin (agents.dispatch) | Dispatch agent |
| GET | `/api/admin/config` | admin (admin.config) | System config |
| POST | `/api/tools/execute` | admin (tools.*) | Execute tool |
| POST | `/api/chat` | admin/technician (chat.send) | Send chat message |
| WS | `/ws` | Any (JWT in cookie) | WebSocket (role-filtered events) |

---

## 21. Network and TLS Configuration

### VPS Firewall (UFW)
- Port 22: SSH (key-based only)
- Port 80: HTTP (redirects to HTTPS)
- Port 443: HTTPS (Nginx + Let's Encrypt)

### Nginx Configuration
- SSL/TLS: Let's Encrypt auto-renewing certificates
- HSTS: max-age=31536000, includeSubDomains, preload
- Proxy: Forwards to Gateway on port 18790

### Tailscale Mesh
- 5 devices
- End-to-end encrypted
- Shane's MacBook Tailscale IP: 100.80.140.118 (emergency bypass)

### Ollama Ports (Localhost Only)
- Fleet A: 11434 (127.0.0.1 bind)
- Fleet B: 11435 (127.0.0.1 bind)

---

## 22. Shane's Specific Decisions and Preferences

1. **Biometric is the gate.** Touch ID / Face ID is the preferred auth trigger. "THE USER CREDS OR FINGER PRINT, FACE SCAN SHOULD BE A HOOK FOR THE GATE CODE TO LOAD."
2. **24/7 reliability.** Auto-reconnect, token refresh, session recovery -- zero human intervention.
3. **Three roles:** Admin (Shane), Technician (field crew), Viewer (stakeholders).
4. **DeepSeek permanently banned.** CrowdStrike advisory. Cannot be removed via UI.
5. **No code until authenticated.** The entire dashboard is behind the gate. Nothing renders until auth passes.
6. **Beta header is mandatory.** `anthropic-beta: oauth-2025-04-20` on every Anthropic API call. Hard lesson: cost $50 and a week of debugging.
7. **vm2 must be replaced now.** Not eventually. "WHATS THE ACTUAL RISK POTENTIAL AND CAN IT CRAWL OUT OF MY STUDIO?" -- Answer: Yes it can. Replace with isolated-vm.
8. **All secrets in Azure Key Vault.** No secrets in .env or source code.

---

*Knowledge file compiled from Phase 6 Runbook and Playbook.*
*All code blocks, configurations, and specifications extracted verbatim from source documents.*
*For use by Claude, Llama, and local AI models as authoritative reference.*
