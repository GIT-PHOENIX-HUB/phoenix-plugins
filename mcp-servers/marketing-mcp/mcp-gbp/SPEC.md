# MCP-GBP Server Specification

**Purpose:** MCP server that automates Google Business Profile operations for Phoenix Electric (Colorado Springs).

**Version:** 0.1.0-draft
**Last Updated:** 2026-03-25
**Status:** RESEARCH COMPLETE — Pending credentials and API access approval

---

## Table of Contents

1. [Auth + Permissions Model](#1-auth--permissions-model)
2. [API Endpoints — 5 Tools](#2-api-endpoints--5-tools)
3. [Guardrails](#3-guardrails)
4. [Error Model](#4-error-model)
5. [Mock-first Test Plan](#5-mock-first-test-plan)
6. [Open Decisions](#6-open-decisions)

---

## 1. Auth + Permissions Model

### 1.1 Which API?

Google Business Profile operations span **three separate APIs** that must all be enabled:

| API | Base URL | Used For |
|-----|----------|----------|
| Google My Business API (v4) | `https://mybusiness.googleapis.com/v4/` | Posts (localPosts), Reviews, Review Replies |
| Business Profile Performance API (v1) | `https://businessprofileperformance.googleapis.com/v1/` | Insights/metrics (impressions, clicks, actions) |
| My Business Account Management API (v1) | `https://mybusinessaccountmanagement.googleapis.com/v1/` | Account/location discovery |

**Important context on API landscape:**
- Google has been migrating away from the monolithic My Business API v4 to multiple smaller APIs.
- Business information (location data, attributes, categories) moved to `mybusinessbusinessinformation.googleapis.com/v1/`.
- Posts and Reviews remain on the legacy `mybusiness.googleapis.com/v4/` endpoint as of 2026-02. No deprecation notice exists for these endpoints.
- The old `accounts.locations.reportInsights` was deprecated 2022-11-21 and discontinued 2023-03-30. The replacement is the Performance API v1.
- Q&A API was discontinued 2025-11-03. Not relevant to this MCP server.

### 1.2 APIs to Enable in Google Cloud Console

All eight must be enabled after project approval:

1. Google My Business API
2. My Business Account Management API
3. My Business Lodging API
4. My Business Place Actions API
5. My Business Notifications API
6. My Business Verifications API
7. My Business Business Information API
8. Business Profile Performance API

### 1.3 OAuth 2.0 Scopes

**Single scope covers all operations:**

```
https://www.googleapis.com/auth/business.manage
```

A legacy scope `https://www.googleapis.com/auth/plus.business.manage` exists for backward compatibility but should NOT be used for new implementations.

### 1.4 Service Account vs. User OAuth

**Service accounts are NOT viable for GBP API.**

- The GBP API requires user-level OAuth 2.0 consent. A real Google account that is an **Owner or Manager** of the Business Profile must authorize the OAuth flow.
- Service accounts cannot accept GBP Manager invitations (they have no email inbox to receive/accept invitations), making them practically unusable.
- The confirmed pattern is: **OAuth 2.0 with offline refresh tokens.**

**Required flow:**

```
1. One-time: User (Shane or GBP owner) authorizes the app via OAuth consent screen
2. App receives authorization code
3. Exchange authorization code for access_token + refresh_token
4. Store refresh_token securely (encrypted at rest)
5. Use refresh_token to obtain new access_tokens as needed (they expire in ~1 hour)
6. User can revoke access from Google Account Settings at any time
```

### 1.5 Account Access Requirements

- The Google account used for OAuth must be an **Owner** or **Manager** of the Phoenix Electric GBP listing.
- Manager access is sufficient for posts, reviews, and insights.
- Owner access is needed only for destructive operations (deleting the listing, transferring ownership) — none of which this MCP server performs.

### 1.6 API Access Approval Process

**The GBP API is NOT publicly available.** Access must be requested and approved by Google.

**Prerequisites before applying:**
- Active Google Cloud project with a project number
- A verified, active Google Business Profile that has been managed for **60+ days**
- A live business website listed on the profile
- A business email address associated as owner/manager on the profile

**Process:**
1. Submit application via the [GBP API contact form](https://support.google.com/business/contact/api_default) — select "Application for Basic API Access"
2. Provide company name, contact email, project number
3. Email and website domains should match
4. Approval typically within 14 days
5. Verification: check Cloud Console quotas — 0 QPM = not approved, 300 QPM = approved

### 1.7 Token Storage

**Credentials are stored in Azure Key Vault (PhoenixAiVault), NOT locally.** This aligns with the security contract in `runbook/RUNBOOK.md` — no MCP server stores credentials on disk.

```
Source: Azure Key Vault → PhoenixAiVault
Secrets:
  - mcp-gbp-client-id        → OAuth 2.0 Client ID
  - mcp-gbp-client-secret    → OAuth 2.0 Client Secret
  - mcp-gbp-refresh-token    → Stored after initial OAuth consent flow

Runtime flow:
  1. MCP server starts → reads secrets from Key Vault via managed identity or app credentials
  2. Uses refresh_token to obtain short-lived access_token (expires ~1 hour)
  3. access_token held in memory ONLY — never written to disk
  4. On token refresh failure: log error, alert, halt write operations (reads may continue with cached data)
```

**Environment variables** (`MCP_GBP_CLIENT_ID`, etc.) are used ONLY in `MOCK_MODE` for local development. In production, all credentials come from vault.

**Security requirements:**
- Vault secrets are read-only from MCP server perspective — rotation happens in Key Vault
- Refresh token encrypted at rest in Key Vault (Azure-managed encryption)
- No credentials in git — `.gitignore` entry mandatory for any local dev overrides
- Token refresh handled automatically by Google Auth Library

---

## 2. API Endpoints — 6 Tools

### 2.1 `create-post`

Create a Google Business Profile post (update, event, or offer).

**API:** Google My Business API v4
**HTTP Method:** `POST`
**Endpoint:**
```
https://mybusiness.googleapis.com/v4/{parent}/localPosts
```
**Path parameter:** `parent` = `accounts/{accountId}/locations/{locationId}`

#### Post Types

| topicType | Required Fields | Optional Fields |
|-----------|----------------|-----------------|
| `STANDARD` | `summary`, `languageCode` | `media[]`, `callToAction` |
| `EVENT` | `summary`, `languageCode`, `event.title`, `event.schedule` | `media[]`, `callToAction` |
| `OFFER` | `summary`, `languageCode`, `event.title`, `event.schedule` | `media[]`, `offer.couponCode`, `offer.redeemOnlineUrl`, `offer.termsConditions` |

**Note:** `ALERT` type exists but is restricted to COVID-19 alerts. Product posts CANNOT be created via API.

#### Request Body — STANDARD Post Example

```json
{
  "languageCode": "en-US",
  "topicType": "STANDARD",
  "summary": "Phoenix Electric is offering free whole-home surge protection assessments this month. Call us to schedule yours!",
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "https://example.com/images/surge-protection.jpg"
    }
  ],
  "callToAction": {
    "actionType": "CALL",
    "url": ""
  }
}
```

#### Request Body — EVENT Post Example

```json
{
  "languageCode": "en-US",
  "topicType": "EVENT",
  "summary": "Join us for a free electrical safety workshop.",
  "event": {
    "title": "Home Electrical Safety Workshop",
    "schedule": {
      "startDate": { "year": 2026, "month": 4, "day": 15 },
      "startTime": { "hours": 10, "minutes": 0, "seconds": 0, "nanos": 0 },
      "endDate": { "year": 2026, "month": 4, "day": 15 },
      "endTime": { "hours": 12, "minutes": 0, "seconds": 0, "nanos": 0 }
    }
  },
  "callToAction": {
    "actionType": "LEARN_MORE",
    "url": "https://phoenixelectric.com/workshop"
  }
}
```

#### Request Body — OFFER Post Example

```json
{
  "languageCode": "en-US",
  "topicType": "OFFER",
  "summary": "$50 off any panel upgrade this spring!",
  "event": {
    "title": "Spring Panel Upgrade Special",
    "schedule": {
      "startDate": { "year": 2026, "month": 4, "day": 1 },
      "startTime": { "hours": 0, "minutes": 0, "seconds": 0, "nanos": 0 },
      "endDate": { "year": 2026, "month": 4, "day": 30 },
      "endTime": { "hours": 23, "minutes": 59, "seconds": 0, "nanos": 0 }
    }
  },
  "offer": {
    "couponCode": "SPRING50",
    "redeemOnlineUrl": "https://phoenixelectric.com/spring",
    "termsConditions": "Valid for residential panel upgrades only. Cannot be combined with other offers."
  }
}
```

#### CallToAction `actionType` Enum Values

| Value | Description |
|-------|-------------|
| `BOOK` | Appointments/reservations |
| `ORDER` | Purchase prompts |
| `SHOP` | Product catalog browsing |
| `LEARN_MORE` | Website details |
| `SIGN_UP` | Registration/membership |
| `CALL` | Direct phone contact (no URL needed) |

#### Content Limits

| Field | Limit |
|-------|-------|
| `summary` | 1,500 characters max (first 150-200 visible on mobile before truncation) |
| `media[]` | Up to 10 items per post |
| Photo format | JPG or PNG, 10 KB - 5 MB, minimum 400x300 px, recommended 1200x900 px |
| Video | Max 100 MB, 30 second limit |
| `media[].sourceUrl` | Must be a publicly accessible URL |

#### Response — `LocalPost` Object

```json
{
  "name": "accounts/123456/locations/789012/localPosts/345678",
  "languageCode": "en-US",
  "summary": "...",
  "topicType": "STANDARD",
  "callToAction": { "actionType": "CALL" },
  "createTime": "2026-03-25T14:30:00.000Z",
  "updateTime": "2026-03-25T14:30:00.000Z",
  "state": "LIVE",
  "searchUrl": "https://local.google.com/place?id=...",
  "media": [...]
}
```

#### `state` Values (output only)

| Value | Meaning |
|-------|---------|
| `LOCAL_POST_STATE_UNSPECIFIED` | Unknown |
| `PROCESSING` | Post is being processed |
| `LIVE` | Post is published and visible |
| `REJECTED` | Post was rejected by Google |

---

### 2.2 `list-reviews`

List all reviews for a location.

**API:** Google My Business API v4
**HTTP Method:** `GET`
**Endpoint:**
```
https://mybusiness.googleapis.com/v4/{parent}/reviews
```
**Path parameter:** `parent` = `accounts/{accountId}/locations/{locationId}`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageSize` | integer | No | Max 50 reviews per page |
| `pageToken` | string | No | Token for next page of results |
| `orderBy` | string | No | Sort: `rating`, `rating desc`, or `updateTime desc` (default) |

#### Response Schema

```json
{
  "reviews": [
    {
      "name": "accounts/123/locations/456/reviews/789",
      "reviewId": "AbCdEf123...",
      "reviewer": {
        "displayName": "John Doe",
        "profilePhotoUrl": "https://lh3.googleusercontent.com/...",
        "isAnonymous": false
      },
      "starRating": "FIVE",
      "comment": "Phoenix Electric did a great job rewiring our kitchen...",
      "createTime": "2026-03-20T10:15:30.000Z",
      "updateTime": "2026-03-20T10:15:30.000Z",
      "reviewReply": {
        "comment": "Thank you for the kind words, John!",
        "updateTime": "2026-03-21T08:00:00.000Z"
      }
    }
  ],
  "averageRating": 4.8,
  "totalReviewCount": 47,
  "nextPageToken": "CiAKGjBpM..."
}
```

#### `starRating` Enum Values

| Value | Rating |
|-------|--------|
| `STAR_RATING_UNSPECIFIED` | Unknown |
| `ONE` | 1 star |
| `TWO` | 2 stars |
| `THREE` | 3 stars |
| `FOUR` | 4 stars |
| `FIVE` | 5 stars |

#### Pagination

- Default page size: unspecified (API decides)
- Max page size: 50
- Use `nextPageToken` from response as `pageToken` in next request
- When `nextPageToken` is absent, all reviews have been retrieved

---

### 2.3 `draft-reply`

Draft a review reply — stored locally, NOT published to Google.

**This is a local-only operation.** No API call is made. The MCP server stores the draft in a local JSON file for human review before publishing.

#### Local Storage Schema

**File:** `~/.phoenix-marketing/mcp-gbp/draft-replies.json`

```json
{
  "drafts": [
    {
      "draftId": "draft-20260325-001",
      "reviewName": "accounts/123/locations/456/reviews/789",
      "reviewId": "AbCdEf123...",
      "reviewerName": "John Doe",
      "starRating": "FIVE",
      "reviewComment": "Phoenix Electric did a great job...",
      "draftReply": "Thank you for the kind words, John! We take pride in...",
      "createdAt": "2026-03-25T14:30:00.000Z",
      "status": "PENDING_APPROVAL",
      "approvedBy": null,
      "approvedAt": null
    }
  ]
}
```

#### Draft Status Values

| Status | Meaning |
|--------|---------|
| `PENDING_APPROVAL` | Draft created, awaiting human review |
| `APPROVED` | Human approved, ready to publish |
| `PUBLISHED` | Successfully published via `publish-reply` |
| `REJECTED` | Human rejected the draft |
| `FAILED` | Publish attempt failed |

#### Content Limits

| Field | Limit |
|-------|-------|
| `draftReply` | 4,000 characters max (Google enforced on publish) |
| Reply byte limit | 4,096 bytes max (API schema definition) |

#### Tool Parameters

```typescript
interface DraftReplyInput {
  reviewName: string;    // Full review resource name
  replyText: string;     // The draft reply content
}

interface DraftReplyOutput {
  draftId: string;
  status: "PENDING_APPROVAL";
  message: string;
}
```

---

### 2.4 `publish-reply`

Publish a previously drafted and approved review reply to Google.

**API:** Google My Business API v4
**HTTP Method:** `PUT`
**Endpoint:**
```
https://mybusiness.googleapis.com/v4/{name}/reply
```
**Path parameter:** `name` = `accounts/{accountId}/locations/{locationId}/reviews/{reviewId}`

#### Pre-conditions (Enforced by MCP Server)

1. Draft must exist in `draft-replies.json`
2. Draft status must be `APPROVED` (not `PENDING_APPROVAL`, not `PUBLISHED`)
3. Location must be verified

#### Request Body

```json
{
  "comment": "Thank you for the kind words, John! We take pride in delivering quality electrical work."
}
```

#### Response — `ReviewReply` Object

```json
{
  "comment": "Thank you for the kind words, John! We take pride in delivering quality electrical work.",
  "updateTime": "2026-03-25T15:00:00.000Z"
}
```

#### Post-publish Actions

1. Update draft status to `PUBLISHED` in `draft-replies.json`
2. Log the publish event to audit log
3. Return confirmation with timestamp

#### Tool Parameters

```typescript
interface PublishReplyInput {
  draftId: string;       // ID from draft-replies.json
}

interface PublishReplyOutput {
  success: boolean;
  reviewName: string;
  publishedAt: string;   // ISO 8601
  replyComment: string;
}
```

---

### 2.5 `insights`

Get performance metrics for the business listing.

**API:** Business Profile Performance API v1
**HTTP Method:** `GET`
**Endpoint:**
```
https://businessprofileperformance.googleapis.com/v1/{location}:fetchMultiDailyMetricsTimeSeries
```
**Path parameter:** `location` = `locations/{locationId}` (unobfuscated listing ID)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dailyMetrics[]` | repeated enum | Yes | One or more DailyMetric values |
| `dailyRange.startDate.year` | integer | Yes | Start year |
| `dailyRange.startDate.month` | integer | Yes | Start month (1-12) |
| `dailyRange.startDate.day` | integer | Yes | Start day (1-31) |
| `dailyRange.endDate.year` | integer | Yes | End year |
| `dailyRange.endDate.month` | integer | Yes | End month (1-12) |
| `dailyRange.endDate.day` | integer | Yes | End day (1-31) |

#### DailyMetric Enum Values

| Value | Description |
|-------|-------------|
| `DAILY_METRIC_UNKNOWN` | Unknown/unspecified |
| `BUSINESS_IMPRESSIONS_DESKTOP_MAPS` | Profile views on Maps (desktop) |
| `BUSINESS_IMPRESSIONS_DESKTOP_SEARCH` | Profile views on Search (desktop) |
| `BUSINESS_IMPRESSIONS_MOBILE_MAPS` | Profile views on Maps (mobile) |
| `BUSINESS_IMPRESSIONS_MOBILE_SEARCH` | Profile views on Search (mobile) |
| `BUSINESS_CONVERSATIONS` | Message conversations received |
| `BUSINESS_DIRECTION_REQUESTS` | Direction requests to business |
| `CALL_CLICKS` | Call button clicks |
| `WEBSITE_CLICKS` | Website link clicks |
| `BUSINESS_BOOKINGS` | Bookings via Reserve with Google |
| `BUSINESS_FOOD_ORDERS` | Food orders received |
| `BUSINESS_FOOD_MENU_CLICKS` | Menu interaction clicks |

**Recommended metrics for Phoenix Electric:**
`BUSINESS_IMPRESSIONS_DESKTOP_SEARCH`, `BUSINESS_IMPRESSIONS_MOBILE_SEARCH`, `BUSINESS_IMPRESSIONS_DESKTOP_MAPS`, `BUSINESS_IMPRESSIONS_MOBILE_MAPS`, `CALL_CLICKS`, `WEBSITE_CLICKS`, `BUSINESS_DIRECTION_REQUESTS`

#### Example Request URL

```
GET https://businessprofileperformance.googleapis.com/v1/locations/12345:fetchMultiDailyMetricsTimeSeries
  ?dailyMetrics=CALL_CLICKS
  &dailyMetrics=WEBSITE_CLICKS
  &dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_SEARCH
  &dailyRange.startDate.year=2026
  &dailyRange.startDate.month=3
  &dailyRange.startDate.day=1
  &dailyRange.endDate.year=2026
  &dailyRange.endDate.month=3
  &dailyRange.endDate.day=25
```

#### Response Schema

```json
{
  "multiDailyMetricTimeSeries": [
    {
      "dailyMetricTimeSeries": [
        {
          "dailyMetric": "CALL_CLICKS",
          "dailySubEntityType": {},
          "timeSeries": {
            "datedValues": [
              {
                "date": { "year": 2026, "month": 3, "day": 1 },
                "value": "12"
              },
              {
                "date": { "year": 2026, "month": 3, "day": 2 },
                "value": "8"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

#### Search Keywords (Supplementary Endpoint)

**HTTP Method:** `GET`
**Endpoint:**
```
https://businessprofileperformance.googleapis.com/v1/{parent}/searchkeywords/impressions/monthly
```
**Path parameter:** `parent` = `locations/{locationId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `monthlyRange.startMonth.year` | integer | Yes | Start year |
| `monthlyRange.startMonth.month` | integer | Yes | Start month |
| `monthlyRange.endMonth.year` | integer | Yes | End year |
| `monthlyRange.endMonth.month` | integer | Yes | End month |
| `pageSize` | integer | No | Max 100 (default 100) |
| `pageToken` | string | No | Pagination token |

**Response:**
```json
{
  "searchKeywordsCounts": [
    {
      "searchKeyword": "electrician colorado springs",
      "insightsValue": { "value": "342" }
    },
    {
      "searchKeyword": "electrical contractor near me",
      "insightsValue": { "threshold": "5" }
    }
  ],
  "nextPageToken": "..."
}
```

Note: `insightsValue` returns either `value` (actual count) or `threshold` (count is below this number, exact value not disclosed for privacy).

---

### 2.6 `cancel-scheduled-posts`

Cancel or delete pending/scheduled GBP posts. Used by the marketing orchestrator's `emergency-pause` tool to halt all outbound GBP activity.

**API:** Google My Business API v4
**HTTP Method:** `DELETE` (per post) or `PATCH` (to update state)
**Endpoint:** `https://mybusiness.googleapis.com/v4/{name}` where `name` = `accounts/{a}/locations/{l}/localPosts/{postId}`

#### MCP Tool Definition

```json
{
  "name": "gbp-cancel-scheduled-posts",
  "description": "Cancel pending or scheduled GBP posts. Supports cancelling a single post by ID or all posts with state LIVE or in a pending queue.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "post_id": {
        "type": "string",
        "description": "Specific post ID to cancel. If omitted, cancels ALL currently scheduled/pending posts."
      },
      "reason": {
        "type": "string",
        "description": "Why these posts are being cancelled (required for audit trail)"
      },
      "confirm": {
        "type": "boolean",
        "description": "Must be true to execute. Safety gate."
      }
    },
    "required": ["reason", "confirm"]
  }
}
```

#### Execution Flow

```
1. confirm !== true? → REJECT. "Cancellation requires confirm: true."
2. reason is empty? → REJECT. "A reason is required for audit trail."
3. If post_id provided:
   → DELETE the specific post via API
4. If post_id omitted:
   → List all localPosts with state != REJECTED
   → DELETE each one
   → Return count of cancelled posts
5. Log to audit trail: timestamp, who initiated, reason, post IDs cancelled
```

#### Approval Gate

**This tool requires approval before execution** (same as `create-post` and `publish-reply`). The orchestrator must request approval from the operator before calling this tool, except during `emergency-pause` where the emergency itself serves as pre-authorization.

---

## 3. Guardrails

### 3.1 Rate Limits

| Scope | Limit | Adjustable? |
|-------|-------|------------|
| All GBP APIs combined | 300 QPM per project (default) | Yes, via quota request form |
| Per-user per-project | 2,400 QPM | Yes |
| Edits per GBP listing | 10 per minute | **NO — hard limit, cannot be increased** |
| Create location | 100 per day | Yes |
| Update location | 10,000 per day | Yes |

**For Phoenix Electric (single location):** The 300 QPM default is more than sufficient. No quota increase needed.

### 3.2 Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.3,    // +/- 30% randomization

  retryableStatuses: [429, 500, 502, 503, 504],
  nonRetryableStatuses: [400, 401, 403, 404],

  backoff: (attempt: number, baseDelay: number, jitter: number) => {
    const delay = baseDelay * Math.pow(2, attempt);
    const jitterMs = delay * jitter * (Math.random() * 2 - 1);
    return Math.min(delay + jitterMs, 30000);
  }
};
```

**Retry behavior by status:**

| Status | Action |
|--------|--------|
| 429 (Too Many Requests) | Retry with exponential backoff. Respect `Retry-After` header if present. |
| 500 (Internal Server Error) | Retry up to 3 times. |
| 502/503/504 (Gateway/Unavailable) | Retry up to 3 times. |
| 400 (Bad Request) | Do NOT retry. Log error, return to caller. |
| 401 (Unauthorized) | Attempt token refresh once. If still 401, surface error. |
| 403 (Forbidden) | Do NOT retry. Likely a permissions issue. |
| 404 (Not Found) | Do NOT retry. Resource does not exist. |

### 3.3 Approval Gates

| Tool | Requires Human Approval? | Reason |
|------|--------------------------|--------|
| `create-post` | **YES** | Posts are publicly visible. Content must be reviewed before publishing. |
| `list-reviews` | No | Read-only operation. |
| `draft-reply` | No | Local-only storage, nothing published. |
| `publish-reply` | **YES** | Draft must have `APPROVED` status. Publishing replies is a public action. |
| `insights` | No | Read-only operation. |

**Approval flow for `create-post`:**
1. MCP tool generates post content
2. Post content displayed to operator for review
3. Operator explicitly confirms publication
4. Only then does the API call execute

**Approval flow for `publish-reply`:**
1. `draft-reply` creates draft with `PENDING_APPROVAL` status
2. Human reviews draft, changes status to `APPROVED`
3. `publish-reply` checks status before making API call
4. Refuses to publish if status is not `APPROVED`

### 3.4 Logging / Audit Requirements

**Audit log location:** `~/.phoenix-marketing/mcp-gbp/audit.log`

**Every API call logged with:**
```json
{
  "timestamp": "2026-03-25T14:30:00.000Z",
  "tool": "create-post",
  "method": "POST",
  "endpoint": "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts",
  "status": 200,
  "requestSummary": "STANDARD post: 'Phoenix Electric is offering...'",
  "responseId": "accounts/123/locations/456/localPosts/789",
  "durationMs": 1250,
  "error": null
}
```

**Retention:** 90 days minimum. Rotate logs monthly.

### 3.5 Policy Compliance

Per Google's API policies:
- **Never** auto-reply to reviews without explicit user consent/approval
- **Never** auto-revert changes made by Google
- Cached API data must not be stored for more than 30 calendar days
- All review replies must comply with Google's Prohibited and Restricted Content policies

---

## 4. Error Model

### 4.1 HTTP Error Codes

| HTTP Status | Google Error | Meaning | MCP Server Behavior |
|-------------|-------------|---------|---------------------|
| 400 | `INVALID_ARGUMENT` | Malformed request, bad parameters | Log error details. Return error to caller with field-level detail. Do not retry. |
| 401 | `UNAUTHENTICATED` | Token expired or invalid | Auto-refresh token once. If still 401, surface auth error to operator. |
| 403 | `PERMISSION_DENIED` | Account lacks access to this resource | Log and surface. Check if GBP Manager access is still granted. Do not retry. |
| 403 | `FORBIDDEN` | API not enabled or project not approved | Log and surface. Instruct operator to check Cloud Console API enablement. |
| 404 | `NOT_FOUND` | Location/review/post does not exist | Log and surface. Verify account/location IDs. Do not retry. |
| 409 | `ALREADY_EXISTS` | Duplicate resource | Log and surface. Check if operation already succeeded. |
| 429 | `RESOURCE_EXHAUSTED` | Rate limit exceeded | Retry with exponential backoff. Log warning. |
| 500 | `INTERNAL` | Google server error | Retry up to 3 times with backoff. If persistent, surface error. |
| 503 | `UNAVAILABLE` | Service temporarily unavailable | Retry up to 3 times with backoff. |

### 4.2 GBP-Specific Error Codes (Business Information API)

These may appear in error response `details` for location/post operations:

| Error Code | Description |
|------------|-------------|
| `INVALID_ATTRIBUTE_NAME` | Attribute not valid for this location |
| `BLOCKED_REGION` | Location blocked due to international sanctions |
| `INVALID_CHARACTERS` | Prohibited characters in content |
| `FORBIDDEN_WORDS` | Disallowed words detected |
| `STRING_TOO_LONG` | Content exceeds max length |
| `STRING_TOO_SHORT` | Content below min length |
| `REQUIRED_FIELD_MISSING_VALUE` | Required field not provided |
| `INVALID_URL` | Invalid link in callToAction or offer |
| `PROFILE_DESCRIPTION_CONTAINS_URL` | URL not allowed in description field |
| `THROTTLED` | Field update throttled temporarily |
| `STALE_DATA` | Resource recently updated by Google; must update via business.google.com |

### 4.3 Graceful Degradation Patterns

| Scenario | Behavior |
|----------|----------|
| Token refresh fails | Surface auth error. Do not attempt any API calls. Log event. |
| Google API is down (503 persistent) | After 3 retries, cache the operation intent locally. Alert operator. Retry on next invocation. |
| Rate limited (429 persistent) | Back off to 1 request per 10 seconds. Queue remaining operations. |
| Post rejected by Google | Log rejection. Return `state: REJECTED` to caller. Do not auto-retry — content may violate policies. |
| Review not found (404) | Check if review was deleted by Google or reviewer. Log and surface. |
| Stale data error | Surface to operator — they must update via the GBP web UI first. |

### 4.4 Error Response Format (MCP Server)

All tool errors return a consistent shape:

```typescript
interface McpGbpError {
  success: false;
  error: {
    code: string;         // e.g., "PERMISSION_DENIED"
    httpStatus: number;   // e.g., 403
    message: string;      // Human-readable description
    retryable: boolean;   // Whether the caller should retry
    details?: object;     // Google's error details if available
  };
}
```

---

## 5. Mock-first Test Plan

### 5.1 MOCK_MODE Environment Variable

```bash
# Enable mock mode (no real API calls)
export MCP_GBP_MOCK_MODE=true

# Disable mock mode (real API calls)
export MCP_GBP_MOCK_MODE=false   # or unset
```

When `MCP_GBP_MOCK_MODE=true`:
- All API calls are intercepted before reaching Google
- Mock responses are returned from local fixtures
- Draft-reply and publish-reply use the same local file system
- Audit logging still operates (logs indicate `[MOCK]` prefix)

### 5.2 Mock Data Fixtures

**Location:** `src/test/fixtures/`

#### `mock-reviews.json`

```json
{
  "reviews": [
    {
      "name": "accounts/MOCK_ACCOUNT/locations/MOCK_LOCATION/reviews/review-001",
      "reviewId": "mock-review-001",
      "reviewer": {
        "displayName": "Jane Smith",
        "profilePhotoUrl": "https://example.com/photo.jpg",
        "isAnonymous": false
      },
      "starRating": "FIVE",
      "comment": "Outstanding work on our panel upgrade. The team was professional, on time, and cleaned up perfectly.",
      "createTime": "2026-03-15T09:00:00.000Z",
      "updateTime": "2026-03-15T09:00:00.000Z",
      "reviewReply": null
    },
    {
      "name": "accounts/MOCK_ACCOUNT/locations/MOCK_LOCATION/reviews/review-002",
      "reviewId": "mock-review-002",
      "reviewer": {
        "displayName": "Bob Johnson",
        "profilePhotoUrl": null,
        "isAnonymous": false
      },
      "starRating": "THREE",
      "comment": "Work was fine but scheduling was difficult. Took three calls to get an appointment.",
      "createTime": "2026-03-10T14:30:00.000Z",
      "updateTime": "2026-03-10T14:30:00.000Z",
      "reviewReply": {
        "comment": "Thank you for your feedback, Bob. We're working on improving our scheduling process.",
        "updateTime": "2026-03-11T08:00:00.000Z"
      }
    },
    {
      "name": "accounts/MOCK_ACCOUNT/locations/MOCK_LOCATION/reviews/review-003",
      "reviewId": "mock-review-003",
      "reviewer": {
        "displayName": "",
        "profilePhotoUrl": null,
        "isAnonymous": true
      },
      "starRating": "ONE",
      "comment": "Never showed up for the appointment.",
      "createTime": "2026-03-05T16:00:00.000Z",
      "updateTime": "2026-03-05T16:00:00.000Z",
      "reviewReply": null
    }
  ],
  "averageRating": 3.0,
  "totalReviewCount": 3,
  "nextPageToken": null
}
```

#### `mock-post-response.json`

```json
{
  "name": "accounts/MOCK_ACCOUNT/locations/MOCK_LOCATION/localPosts/mock-post-001",
  "languageCode": "en-US",
  "summary": "Mock post content",
  "topicType": "STANDARD",
  "createTime": "2026-03-25T14:30:00.000Z",
  "updateTime": "2026-03-25T14:30:00.000Z",
  "state": "LIVE",
  "searchUrl": "https://local.google.com/place?id=mock"
}
```

#### `mock-insights.json`

```json
{
  "multiDailyMetricTimeSeries": [
    {
      "dailyMetricTimeSeries": [
        {
          "dailyMetric": "CALL_CLICKS",
          "dailySubEntityType": {},
          "timeSeries": {
            "datedValues": [
              { "date": { "year": 2026, "month": 3, "day": 1 }, "value": "5" },
              { "date": { "year": 2026, "month": 3, "day": 2 }, "value": "8" },
              { "date": { "year": 2026, "month": 3, "day": 3 }, "value": "3" }
            ]
          }
        },
        {
          "dailyMetric": "WEBSITE_CLICKS",
          "dailySubEntityType": {},
          "timeSeries": {
            "datedValues": [
              { "date": { "year": 2026, "month": 3, "day": 1 }, "value": "12" },
              { "date": { "year": 2026, "month": 3, "day": 2 }, "value": "15" },
              { "date": { "year": 2026, "month": 3, "day": 3 }, "value": "9" }
            ]
          }
        }
      ]
    }
  ]
}
```

#### `mock-keywords.json`

```json
{
  "searchKeywordsCounts": [
    { "searchKeyword": "electrician colorado springs", "insightsValue": { "value": "120" } },
    { "searchKeyword": "electrical contractor near me", "insightsValue": { "value": "85" } },
    { "searchKeyword": "panel upgrade colorado springs", "insightsValue": { "value": "42" } },
    { "searchKeyword": "emergency electrician", "insightsValue": { "value": "38" } },
    { "searchKeyword": "whole home surge protection", "insightsValue": { "threshold": "5" } }
  ],
  "nextPageToken": null
}
```

### 5.3 Test Matrix

| Tool | Test Case | Mock Behavior | Validates |
|------|-----------|---------------|-----------|
| `create-post` | STANDARD post | Returns `mock-post-response.json` with state LIVE | Request body construction, response parsing |
| `create-post` | EVENT post | Returns mock response | Event schedule serialization |
| `create-post` | OFFER post | Returns mock response | Offer fields included correctly |
| `create-post` | Summary too long | Returns 400 with STRING_TOO_LONG | Error handling, character validation |
| `list-reviews` | Happy path | Returns `mock-reviews.json` | Response parsing, star rating mapping |
| `list-reviews` | Pagination | Returns page 1, then page 2 with no nextPageToken | Pagination loop |
| `list-reviews` | Empty location | Returns empty reviews array | Edge case handling |
| `draft-reply` | New draft | Writes to draft-replies.json | Local file I/O, draft ID generation |
| `draft-reply` | Reply too long | Rejects before saving | Client-side validation |
| `publish-reply` | Approved draft | Returns mock ReviewReply | Status gate enforcement, API call |
| `publish-reply` | Unapproved draft | Rejects with error | Approval gate works |
| `publish-reply` | Already published | Rejects with error | Idempotency guard |
| `insights` | 7-day range | Returns `mock-insights.json` | Date parameter construction, response parsing |
| `insights` | Keywords | Returns `mock-keywords.json` | Keyword endpoint works, threshold handling |
| All | Auth failure | Returns 401 | Token refresh logic |
| All | Rate limited | Returns 429 then 200 | Retry with backoff |

### 5.4 Integration Test Approach (Post-Approval)

Once API access is approved:
1. Use a **test location** (Phoenix Electric's actual verified listing)
2. Create posts with `STANDARD` type, verify they appear, then delete
3. List real reviews and verify response parsing
4. Draft a reply locally, approve it, publish it to a real review, then delete the reply
5. Fetch real insights and verify date ranges work
6. Run the full test suite with `MCP_GBP_MOCK_MODE=false`

---

## 6. Open Decisions

These items cannot be resolved without credentials, API access, or team input.

### 6.1 Requires API Access Approval

| Item | Detail | Blocked By |
|------|--------|------------|
| Account ID discovery | Need to call Account Management API to find the `accountId` for Phoenix Electric | API project approval |
| Location ID discovery | Need to call `accounts.locations.list` to find the `locationId` | API project approval + account ID |
| Verify `mybusiness.googleapis.com/v4/` localPosts endpoint is still live | No deprecation notice exists, but Google has been migrating APIs. Need to confirm with a real call. | API project approval |
| Quota sufficiency | 300 QPM default should be fine for single-location, but need to confirm in practice | API project approval |

### 6.2 Requires Shane's Decision

| Item | Options | Recommendation |
|------|---------|----------------|
| OAuth consent account | Which Google account owns the Phoenix Electric GBP? That account must authorize OAuth. | Use the account that is Owner of the GBP listing |
| Token storage location | `~/.phoenix-marketing/mcp-gbp/tokens.json` vs OS keychain vs Azure Key Vault | OS keychain for MacBook/Studio, Key Vault for VPS |
| Post approval workflow | CLI confirmation prompt vs separate approval tool vs Slack/Teams notification | CLI prompt for v1, notification system for v2 |
| Draft reply storage | Local JSON file vs database vs shared file on Studio | Local JSON for v1, shared storage after filing system is implemented |
| Audit log format | JSON lines vs structured log vs database | JSON lines (`.jsonl`) for simplicity and grepability |
| Media hosting | Where do post images live? Need publicly accessible URLs. | S3/R2 bucket or OneDrive public links |

### 6.3 Requires Further Research

| Item | Question | Why It Matters |
|------|----------|----------------|
| Post expiration | Standard posts auto-expire after 7 days (per Google's current behavior). Does the API return this or handle it silently? | May need to implement auto-repost logic |
| Review notification webhook | Is there a way to get notified of new reviews via push rather than polling? The Notifications API exists but may not cover reviews. | Determines if we poll on a schedule or react to events |
| Multi-location future | If Phoenix Electric adds locations, how does the account/location hierarchy change? | Architecture should support multiple locations even if we start with one |
| Media upload | The API says only `sourceUrl` is supported for media — does the image need to remain at that URL forever, or is it copied to Google's servers? | Determines if we need permanent image hosting |
| `ALERT` post type restrictions | Is `ALERT` still limited to COVID-19, or has Google expanded the alert types? | May be useful for weather/emergency alerts |

### 6.4 GCP Project Setup Checklist

Before any code runs against real APIs:

- [ ] Google Cloud project created
- [ ] API access request submitted via contact form
- [ ] API access approved (300 QPM visible in Console)
- [ ] All 8 Business Profile APIs enabled
- [ ] OAuth 2.0 Client ID created (type: Desktop or Web)
- [ ] OAuth consent screen configured (app name, privacy policy, ToS)
- [ ] Authorized redirect URI configured
- [ ] One-time OAuth flow completed by GBP Owner account
- [ ] `refresh_token` stored securely
- [ ] `accountId` and `locationId` discovered and recorded
- [ ] Test call to `list-reviews` succeeds

---

## Appendix A: API Endpoint Quick Reference

| Tool | API | Method | Endpoint |
|------|-----|--------|----------|
| `create-post` | My Business v4 | `POST` | `/v4/accounts/{a}/locations/{l}/localPosts` |
| `list-reviews` | My Business v4 | `GET` | `/v4/accounts/{a}/locations/{l}/reviews` |
| `draft-reply` | Local only | N/A | Writes to `draft-replies.json` |
| `publish-reply` | My Business v4 | `PUT` | `/v4/accounts/{a}/locations/{l}/reviews/{r}/reply` |
| `insights` (metrics) | Performance v1 | `GET` | `/v1/locations/{l}:fetchMultiDailyMetricsTimeSeries` |
| `insights` (keywords) | Performance v1 | `GET` | `/v1/locations/{l}/searchkeywords/impressions/monthly` |
| `cancel-scheduled-posts` | My Business v4 | `DELETE` | `/v4/accounts/{a}/locations/{l}/localPosts/{p}` |

**Base URLs:**
- My Business v4: `https://mybusiness.googleapis.com`
- Performance v1: `https://businessprofileperformance.googleapis.com`

## Appendix B: Node.js Dependencies

```json
{
  "googleapis": "^130.0.0",
  "google-auth-library": "^9.0.0",
  "@modelcontextprotocol/sdk": "^1.0.0"
}
```

The `googleapis` package includes built-in support for the My Business API (`google.mybusiness`) and handles token refresh automatically when configured with OAuth2 credentials.

## Appendix C: Environment Variables

```bash
# Required
MCP_GBP_CLIENT_ID=           # OAuth 2.0 Client ID from Cloud Console
MCP_GBP_CLIENT_SECRET=       # OAuth 2.0 Client Secret
MCP_GBP_REFRESH_TOKEN=       # Stored after initial OAuth consent flow
MCP_GBP_ACCOUNT_ID=          # accounts/{id} — discovered after first auth
MCP_GBP_LOCATION_ID=         # locations/{id} — discovered after first auth

# Optional
MCP_GBP_MOCK_MODE=false      # Set to true for testing without API access
MCP_GBP_LOG_LEVEL=info       # debug | info | warn | error
MCP_GBP_AUDIT_LOG_PATH=      # Override default audit log location
```
