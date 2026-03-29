# Phoenix Builder Space SDK

JavaScript client for interacting with the Phoenix MCP server and downstream Azure Functions. It mirrors the tool + REST surface available to the ChatGPT Apps SDK so that internal services, CLIs, or batch jobs can call the same workflows with consistent auth, logging, and error handling.

## Features

- **Resource-based client** – `jobs`, `customers`, `technicians`, `emails`, `quotes`, `teams`, `finance`, `courier`, `builder`, and `calendar` namespaces map directly to Phoenix MCP tools/REST APIs.
- **Automatic auth decoration** – API-key header for read-only calls plus pluggable OAuth token providers for write scopes (`TokenProvider`, `EnvTokenProvider`, `StaticTokenProvider`).
- **MCP tool access** – List and invoke any registered MCP tool, fetch plugin manifests, or protected-resource metadata.
- **Consistent errors** – Failures surface as `PhoenixSDKError` with HTTP status, payload, and correlation ID to line up with MCP logs.

## Installation

```bash
npm install --save @phoenix-builder-space/sdk
```

## Quick start

```js
const { PhoenixSDK, EnvTokenProvider } = require('@phoenix-builder-space/sdk');

const sdk = new PhoenixSDK({
  baseUrl: 'https://phoenix-mcp.azurewebsites.net',
  apiKey: process.env.PHOENIX_API_KEY,
  tokenProvider: new EnvTokenProvider('PHOENIX_OAUTH_TOKEN')
});

async function main() {
  const jobs = await sdk.jobs.getDailySummary({ date: '2025-02-01' });
  const technician = await sdk.technicians.getOnCall();

  await sdk.emails.createDraft({
    mailbox: 'ops@phoenixelectric.com',
    body: 'Dispatch board is green.',
    to: ['controller@phoenixelectric.com']
  });

  // Call any MCP tool directly
  await sdk.mcp.invokeTool('runPermissionAudit', { scope: 'admins' }, {
    requireAuth: true,
    scopes: ['builder.audit.read']
  });
}

main();
```

### Environment bootstrap

```js
const { PhoenixSDK } = require('@phoenix-builder-space/sdk');

const sdk = PhoenixSDK.fromEnvironment();
// Reads PHOENIX_BASE_URL, PHOENIX_API_KEY, PHOENIX_OAUTH_TOKEN.
```

## Configuration options

| Option | Description |
| --- | --- |
| `baseUrl` | **Required.** Base HTTPS URL for the Phoenix MCP deployment. |
| `apiKey` | Optional string added as `x-api-key` on every request. |
| `tokenProvider` | Optional object implementing `getToken(context)`; used for OAuth-protected endpoints. |
| `getAccessToken` | Legacy fallback async function returning a bearer token. |
| `timeout` | Optional number (ms). Defaults to `10000`. |
| `userAgent` | Override default `PhoenixSDK/0.1.0`. |

## Error handling

All failures throw `PhoenixSDKError` with:

- `status`: HTTP status code (if available)
- `payload`: raw response body from MCP/Azure Function
- `requestId`: correlation ID also logged server-side

## Folder structure

```
sdk/
├─ package.json
├─ README.md
└─ src/
   ├─ auth/tokenProvider.js
   ├─ errors.js
   ├─ httpClient.js
   ├─ phoenixClient.js
   ├─ resources/
   │   ├─ builder.js
   │   ├─ calendar.js
   │   ├─ courier.js
   │   ├─ customers.js
   │   ├─ emails.js
   │   ├─ finance.js
   │   ├─ jobs.js
   │   ├─ quotes.js
   │   ├─ teams.js
   │   ├─ technicians.js
   │   └─ tools.js
   └─ index.js
```

## Development

- Unit tests live in `tests/sdk/*.test.js` and mock axios to keep runs fast.
- Run `npm test -- --testPathPattern=sdk` from the repo root to execute SDK tests only.

## Roadmap

1. Generate TypeScript declaration files for IDE intellisense.
2. Wire SDK publish pipeline (GitHub Packages + semantic-release tags).
3. Expand finance + builder resources as new MCP tools become available.
