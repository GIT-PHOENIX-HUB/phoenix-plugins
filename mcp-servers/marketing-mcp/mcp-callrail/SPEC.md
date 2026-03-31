# mcp-callrail MCP Server Specification

**Purpose:** Provide Phoenix Electric with call tracking, campaign attribution, and missed-call alerting via the CallRail API v3.

**CallRail Plan Target:** Essentials ($45/mo) or Pro ($95/mo for conversation intelligence)

---

## 1. Authentication

CallRail uses **API key authentication** via an HTTP header. No OAuth flow required.

### How to get the key
1. Log into CallRail > Settings > API > Enable API v3
2. Copy the API key (scoped to the user who created it -- sees only that user's data)

### Required header on every request
```
Authorization: Token token="YOUR_API_KEY"
```

### Environment variable
```
CALLRAIL_API_KEY=<key>
CALLRAIL_ACCOUNT_ID=<9-digit account ID from URL after /a/>
CALLRAIL_COMPANY_ID=<optional, filters to one company>
CALLRAIL_TIME_ZONE=America/Denver   # Colorado Springs = Mountain
```

The account ID is the 9-digit number visible in the CallRail dashboard URL after `/a/`.

---

## 2. API Endpoints We Need

Base URL: `https://api.callrail.com/v3/a/{account_id}`

### 2.1 List All Calls
- **Method:** `GET /v3/a/{account_id}/calls.json`
- **Key parameters:**
  - `company_id` (string, optional) -- filter to one company
  - `tracker_id` (string, optional) -- filter to one tracking number
  - `date_range` -- `recent` (default, 30 days), `today`, `yesterday`, `last_7_days`, `last_30_days`, `this_month`, `last_month`
  - `start_date` / `end_date` -- ISO 8601 (`2026-03-01` or `2026-03-01T09:00`)
  - `call_type` -- `first_call`, `missed`, `voicemails`, `inbound`, `outbound`
  - `answer_status` -- `answered`, `missed`, `voicemail`
  - `lead_status` -- `good_lead`, `not_a_lead`, `not_scored`
  - `tags` -- single or array `tags[]=A&tags[]=B`
  - `sort` -- `start_time`, `duration`, `source`, `customer_name`, etc. + `order=asc|desc`
  - `fields` -- request additional fields: `source`, `campaign`, `medium`, `keywords`, `landing_page_url`, `utm_source`, `utm_medium`, `utm_campaign`, `gclid`, `milestones`, `transcription`, `call_summary`, `tags`, `lead_status`, `first_call`, `device_type`, `call_type`, `company_id`, `company_name`, `note`, `sentiment`, `person_id`
  - `search` -- search by `customer_name`, `customer_number`, `source`, `tracking_phone_number`, `note`
- **Pagination:** Offset (`page`, `per_page` max 250) or Relative (`relative_pagination=true`, `offset`, `per_page`)
- **Default response fields:** `id`, `answered`, `business_phone_number`, `customer_city`, `customer_country`, `customer_name`, `customer_phone_number`, `customer_state`, `direction`, `duration`, `recording`, `recording_duration`, `recording_player`, `start_time`, `tracking_phone_number`, `voicemail`, `agent_email`

### 2.2 Retrieve a Single Call
- **Method:** `GET /v3/a/{account_id}/calls/{call_id}.json`
- **Parameters:** `fields` (same additional fields as listing)
- **Response:** Single call object with all default + requested fields, including `milestones` (first_touch, lead_created, qualified, last_touch with source/campaign/medium/keywords/landing/device per milestone)

### 2.3 List Missed/Abandoned Calls
Uses the same List All Calls endpoint with filters:
```
GET /v3/a/{account_id}/calls.json?answer_status=missed&date_range=today
GET /v3/a/{account_id}/calls.json?call_type=missed&start_date=2026-03-17&end_date=2026-03-23
```

### 2.4 Campaign/Source Attribution
Uses List All Calls with `fields=source,campaign,medium,utm_source,utm_campaign,milestones,first_call,lead_status`. Aggregation is done client-side (no server-side aggregation endpoint). Group by `source` or `campaign` field.

### 2.5 Webhooks (Real-time Notifications)
Configured in CallRail UI or via API. Sends HTTP POST to your endpoint.

**Webhook types for calls:**
| Event | When it fires | Use case |
|---|---|---|
| Pre-Call | Moment call is received, before connection | Screen-pop, CRM lookup |
| Call Routing Complete | Call routed to destination | Supplement info during live call |
| Post-Call | After call completes + recording/transcription attached | Full call data logging, missed call alerts |
| Call Modified | Call data changed (tagged, scored, etc.) | Lead status updates |

**Webhook management endpoints:**
- `GET /v3/a/{account_id}/webhooks.json` -- list webhooks
- `POST /v3/a/{account_id}/webhooks.json` -- create webhook
- `GET /v3/a/{account_id}/webhooks/{webhook_id}.json` -- get single
- `PUT /v3/a/{account_id}/webhooks/{webhook_id}.json` -- update
- `DELETE /v3/a/{account_id}/webhooks/{webhook_id}.json` -- delete

**Create webhook body:**
```json
{
  "name": "Phoenix Missed Call Alert",
  "url": "https://your-endpoint.com/callrail/webhook",
  "events": ["post_call"],
  "company_id": "COM..."
}
```

**Important:** CallRail does NOT retry failed webhooks. Your endpoint must return 2xx. Repeated failures auto-disable the webhook.

### 2.6 Summary Emails (informational)
- `GET /v3/a/{account_id}/summary_emails` -- list subscriptions
- Can configure daily/weekly/monthly email summaries with call logs
- Config options: `summary_statistics`, `top_sources`, `top_keywords`, `call_log`

---

## 3. MCP Tool Definitions

### 3.1 `callrail-recent-calls`

**Description:** List recent phone calls to Phoenix Electric with source/campaign attribution. Supports filtering by date range, call type, and answer status.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "date_range": {
      "type": "string",
      "enum": ["today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "recent"],
      "default": "recent",
      "description": "Standard date range filter"
    },
    "start_date": {
      "type": "string",
      "description": "ISO 8601 start date (overrides date_range). e.g. 2026-03-01"
    },
    "end_date": {
      "type": "string",
      "description": "ISO 8601 end date (overrides date_range). e.g. 2026-03-23"
    },
    "call_type": {
      "type": "string",
      "enum": ["first_call", "missed", "voicemails", "inbound", "outbound"],
      "description": "Filter by call type"
    },
    "limit": {
      "type": "integer",
      "default": 25,
      "maximum": 250,
      "description": "Max results to return"
    },
    "search": {
      "type": "string",
      "description": "Search by customer name, number, source, or tracking number"
    }
  },
  "additionalProperties": false
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "total_calls": { "type": "integer" },
    "calls": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "start_time": { "type": "string" },
          "customer_name": { "type": "string" },
          "customer_phone_number": { "type": "string" },
          "customer_city": { "type": "string" },
          "customer_state": { "type": "string" },
          "duration": { "type": "integer", "description": "seconds" },
          "answered": { "type": "boolean" },
          "voicemail": { "type": "boolean" },
          "direction": { "type": "string" },
          "source": { "type": "string" },
          "campaign": { "type": "string" },
          "medium": { "type": "string" },
          "tracking_phone_number": { "type": "string" },
          "first_call": { "type": "boolean" },
          "lead_status": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

**Error Cases:**
- `401` -- Invalid API key
- `404` -- Invalid account_id
- `422` -- Invalid date range or filter parameters
- `429` -- Rate limited (retry after backoff)

---

### 3.2 `callrail-missed-calls`

**Description:** List missed and unanswered calls that need follow-up. Returns calls where answer_status=missed, sorted newest first. Critical for ensuring no customer inquiry is lost.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "date_range": {
      "type": "string",
      "enum": ["today", "yesterday", "last_7_days", "last_30_days", "this_month"],
      "default": "today",
      "description": "Date range to check for missed calls"
    },
    "start_date": {
      "type": "string",
      "description": "ISO 8601 start date (overrides date_range)"
    },
    "end_date": {
      "type": "string",
      "description": "ISO 8601 end date (overrides date_range)"
    },
    "include_voicemails": {
      "type": "boolean",
      "default": true,
      "description": "Also include calls that went to voicemail"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 250
    }
  },
  "additionalProperties": false
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "total_missed": { "type": "integer" },
    "total_voicemails": { "type": "integer" },
    "calls": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "start_time": { "type": "string" },
          "customer_name": { "type": "string" },
          "customer_phone_number": { "type": "string" },
          "customer_city": { "type": "string" },
          "customer_state": { "type": "string" },
          "voicemail": { "type": "boolean" },
          "source": { "type": "string" },
          "campaign": { "type": "string" },
          "first_call": { "type": "boolean" },
          "recording_player": { "type": "string", "description": "URL to listen to voicemail if available" },
          "transcription": { "type": "string", "description": "Voicemail transcription if available (requires CI plan)" }
        }
      }
    }
  }
}
```

**Error Cases:** Same as `callrail-recent-calls`.

---

### 3.3 `callrail-call-details`

**Description:** Get full details for a specific call including recording URL, duration, caller info, campaign attribution milestones (first touch, lead created, last touch), transcription, and tags.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "call_id": {
      "type": "string",
      "description": "The call ID (e.g. CAL8154748ae6bd4e278a7cddd38a662f4f)"
    }
  },
  "required": ["call_id"],
  "additionalProperties": false
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "start_time": { "type": "string" },
    "duration": { "type": "integer" },
    "answered": { "type": "boolean" },
    "direction": { "type": "string" },
    "voicemail": { "type": "boolean" },
    "customer_name": { "type": "string" },
    "customer_phone_number": { "type": "string" },
    "customer_city": { "type": "string" },
    "customer_state": { "type": "string" },
    "tracking_phone_number": { "type": "string" },
    "business_phone_number": { "type": "string" },
    "agent_email": { "type": "string" },
    "source": { "type": "string" },
    "campaign": { "type": "string" },
    "medium": { "type": "string" },
    "keywords": { "type": "string" },
    "landing_page_url": { "type": "string" },
    "gclid": { "type": "string" },
    "utm_source": { "type": "string" },
    "utm_medium": { "type": "string" },
    "utm_campaign": { "type": "string" },
    "recording_player": { "type": "string" },
    "recording_duration": { "type": "string" },
    "transcription": { "type": "string" },
    "call_summary": { "type": "string" },
    "sentiment": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "lead_status": { "type": "string" },
    "first_call": { "type": "boolean" },
    "prior_calls": { "type": "integer" },
    "total_calls": { "type": "integer" },
    "note": { "type": "string" },
    "milestones": {
      "type": "object",
      "properties": {
        "first_touch": { "$ref": "#/$defs/milestone" },
        "lead_created": { "$ref": "#/$defs/milestone" },
        "qualified": { "$ref": "#/$defs/milestone" },
        "last_touch": { "$ref": "#/$defs/milestone" }
      }
    }
  },
  "$defs": {
    "milestone": {
      "type": "object",
      "properties": {
        "event_date": { "type": "string" },
        "source": { "type": "string" },
        "campaign": { "type": "string" },
        "medium": { "type": "string" },
        "keywords": { "type": "string" },
        "landing": { "type": "string" },
        "device": { "type": "string" },
        "referrer": { "type": "string" }
      }
    }
  }
}
```

**Error Cases:**
- `401` -- Invalid API key
- `404` -- Call ID not found
- `429` -- Rate limited

---

### 3.4 `callrail-campaign-attribution`

**Description:** Aggregate call data by marketing source/campaign to show which campaigns are driving calls. Fetches calls for a date range and groups them client-side by source and campaign, returning counts, first-call counts, and average duration.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "date_range": {
      "type": "string",
      "enum": ["last_7_days", "last_30_days", "this_month", "last_month", "this_year"],
      "default": "last_30_days",
      "description": "Date range for attribution analysis"
    },
    "start_date": {
      "type": "string",
      "description": "ISO 8601 start date (overrides date_range)"
    },
    "end_date": {
      "type": "string",
      "description": "ISO 8601 end date (overrides date_range)"
    },
    "group_by": {
      "type": "string",
      "enum": ["source", "campaign", "medium", "landing_page_url"],
      "default": "source",
      "description": "Field to group attribution by"
    }
  },
  "additionalProperties": false
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "date_range": { "type": "string" },
    "total_calls": { "type": "integer" },
    "total_first_calls": { "type": "integer" },
    "attribution": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "Source/campaign/medium name" },
          "total_calls": { "type": "integer" },
          "answered_calls": { "type": "integer" },
          "missed_calls": { "type": "integer" },
          "first_calls": { "type": "integer" },
          "avg_duration_seconds": { "type": "number" },
          "good_leads": { "type": "integer" },
          "percentage": { "type": "number", "description": "% of total calls" }
        }
      }
    }
  }
}
```

**Implementation note:** The CallRail API does not provide a server-side aggregation endpoint. This tool fetches all calls for the period (paginating as needed) and performs client-side grouping. For large date ranges, this may require multiple API calls. Use relative pagination for efficiency.

**Error Cases:** Same as `callrail-recent-calls`, plus potential timeout for very large date ranges.

---

### 3.5 `callrail-weekly-report`

**Description:** Generate a formatted weekly call summary for Phoenix Electric. Covers total calls, breakdown by source, missed calls needing follow-up, average call duration, first-time callers (new leads), and top-performing campaigns. Designed for Monday morning review.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "week_of": {
      "type": "string",
      "description": "ISO 8601 date for the Monday of the week to report on. Defaults to the most recent completed week."
    }
  },
  "additionalProperties": false
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "period": { "type": "string", "description": "e.g. 2026-03-16 to 2026-03-22" },
    "summary": {
      "type": "object",
      "properties": {
        "total_calls": { "type": "integer" },
        "answered_calls": { "type": "integer" },
        "missed_calls": { "type": "integer" },
        "voicemails": { "type": "integer" },
        "first_time_callers": { "type": "integer" },
        "avg_duration_seconds": { "type": "number" },
        "answer_rate_percent": { "type": "number" }
      }
    },
    "by_source": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source": { "type": "string" },
          "calls": { "type": "integer" },
          "first_calls": { "type": "integer" },
          "good_leads": { "type": "integer" }
        }
      }
    },
    "by_day": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "date": { "type": "string" },
          "day_name": { "type": "string" },
          "total": { "type": "integer" },
          "missed": { "type": "integer" }
        }
      }
    },
    "missed_calls_needing_followup": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "customer_name": { "type": "string" },
          "customer_phone_number": { "type": "string" },
          "start_time": { "type": "string" },
          "source": { "type": "string" },
          "voicemail": { "type": "boolean" }
        }
      }
    },
    "formatted_report": {
      "type": "string",
      "description": "Human-readable markdown-formatted weekly report"
    }
  }
}
```

**Error Cases:** Same as `callrail-recent-calls`.

---

## 4. Rate Limits and Throttling

### Default Limits (from CallRail docs)

| API Type | Hourly Limit | Daily Limit |
|---|---|---|
| General API Requests | 1,000/hour | 10,000/day |
| SMS Send | 150/hour | 1,000/day |
| Outbound Call | 100/hour | 2,000/day |

### Throttling Strategy

When `HTTP 429` is returned:

1. **Exponential backoff:** Wait 2s, 4s, 8s, 16s, max 60s between retries
2. **Max 3 retries** per request, then return error to caller
3. **Request budgeting:** The weekly report tool may need up to 10+ paginated requests for a busy week. At 1,000/hour we have plenty of headroom for normal use (~50 calls/week for a small electrical company means 1 API call).
4. **Cache layer:** Cache call data for 5 minutes. The weekly report and attribution tools should cache their assembled results for 15 minutes.

### Implementation

```javascript
async function callRailRequest(path, params, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, { headers });
    if (response.status === 429) {
      const wait = Math.min(2000 * Math.pow(2, attempt), 60000);
      await sleep(wait);
      continue;
    }
    if (!response.ok) throw new CallRailError(response.status, await response.text());
    return response.json();
  }
  throw new CallRailError(429, 'Rate limit exceeded after retries');
}
```

---

## 5. Webhook Configuration for Real-time Alerts

### Recommended webhooks for Phoenix Electric

| Webhook | Event | Purpose |
|---|---|---|
| Missed Call Alert | `post_call` (filter: answered=false) | Immediate notification when a call is missed |
| New Lead Alert | `post_call` (filter: first_call=true) | Alert when a brand-new caller reaches out |
| Call Modified | `call_modified` | Know when a call is tagged or lead-scored |

### Webhook POST body (what CallRail sends)
The POST body is the same call object as the Retrieve Single Call endpoint, with all default fields plus attribution data. Parse the JSON body (not query string).

### Critical notes
- CallRail does **NOT retry** failed webhooks
- Repeated failures auto-disable the webhook
- Your endpoint MUST return `2xx` status
- Webhook URL must be HTTPS in production

---

## 6. Integration Notes and Setup Prerequisites

### Tracking Number Setup
1. **Purchase a local Colorado Springs tracking number** in CallRail (included in plan)
2. **Set destination number** to Phoenix Electric's main business line
3. **Create source trackers:**
   - Google Ads tracker (Source type: Google Ads, with gclid capture)
   - Google Organic tracker (Source type: Google Organic)
   - Direct/offline tracker (for yard signs, truck wraps, business cards)
   - Website session pool (4-6 numbers for visitor-level tracking via DNI JavaScript)
4. **Install DNI JavaScript** on phoenixelectric.life for dynamic number insertion

### Google Ads Integration
- CallRail has native Google Ads integration via gclid parameter capture
- Requires: Google Ads account linked in CallRail Settings > Integrations
- Captures: campaign name, ad group, keyword, match type, gclid
- Can import call conversions back into Google Ads for bidding optimization
- Call assets (formerly call extensions) supported via Call Details Forwarding

### Data Retention
- CallRail retains communication records for **25 months**, then auto-deletes
- API requests outside retention period return an error
- For long-term reporting, export and store data externally

### Fields requiring higher-tier plans
- `transcription`, `call_summary`, `sentiment`, `keywords_spotted` -- require Conversation Intelligence plan ($95/mo Pro or higher)
- Basic call tracking, source attribution, recording -- available on Essentials ($45/mo)

### Time Zone
- Set `time_zone=America/Denver` on API requests for Colorado Springs alignment
- Or configure in CallRail account settings (preferred -- then API inherits it)

---

## Appendix: API Request Examples

```bash
# List today's calls with source attribution
curl -H "Authorization: Token token=YOUR_KEY" \
  "https://api.callrail.com/v3/a/ACCOUNT_ID/calls.json?date_range=today&fields=source,campaign,medium,first_call,lead_status,tags&sort=start_time&order=desc"

# Get missed calls this week
curl -H "Authorization: Token token=YOUR_KEY" \
  "https://api.callrail.com/v3/a/ACCOUNT_ID/calls.json?answer_status=missed&date_range=last_7_days&fields=source,campaign,first_call"

# Get full call details with milestones
curl -H "Authorization: Token token=YOUR_KEY" \
  "https://api.callrail.com/v3/a/ACCOUNT_ID/calls/CAL_ID.json?fields=source,campaign,medium,milestones,transcription,call_summary,tags,lead_status,note,gclid,landing_page_url,keywords"

# Create a webhook for post-call notifications
curl -H "Authorization: Token token=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Phoenix Post-Call","url":"https://your-endpoint/webhook","events":["post_call"]}' \
  "https://api.callrail.com/v3/a/ACCOUNT_ID/webhooks.json"
```
