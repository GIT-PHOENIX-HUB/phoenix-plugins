# Weather-Trigger Service Specification

**Author:** Builder Agent T3
**Date:** 2026-03-23
**Status:** Draft — awaiting Shane approval
**Service:** `weather-trigger` (part of phoenix-marketing automation)

---

## 1. NWS Alerts API Reference

### Base URL

```
https://api.weather.gov
```

All responses are GeoJSON (`application/geo+json`). No API key required — this is a free, public API.

### Active Alerts Endpoint

```
GET /alerts/active?zone={zone_codes}
```

**Key query parameters:**

| Parameter   | Description                                      | Example                          |
|-------------|--------------------------------------------------|----------------------------------|
| `zone`      | Comma-separated UGC zone or county codes         | `COC041,COC119,COZ084,COZ085`   |
| `event`     | Filter by event type (comma-separated)           | `Severe Thunderstorm Warning,High Wind Warning` |
| `severity`  | Filter by severity                               | `Extreme,Severe`                 |
| `urgency`   | Filter by urgency                                | `Immediate,Expected`             |
| `status`    | Filter by status                                 | `actual`                         |
| `limit`     | Max number of alerts returned                    | `50`                             |

### Required User-Agent Header

NWS requires a descriptive `User-Agent` or they may throttle/block. Format:

```
User-Agent: PhoenixElectricWeatherTrigger/1.0 (shane@phoenixelectric.life)
```

### Rate Limiting Policy

- No formal API key or rate limit header.
- NWS publishes guidance: **no more than once per second** per client.
- Responses include `cache-control: public, max-age=30, s-maxage=30` — data is cacheable for 30 seconds.
- **Our polling at 5-minute intervals is well within acceptable use.**
- If abused, NWS will block by IP without warning.

### Alert Object Structure

Each alert is a GeoJSON Feature. Key fields in `properties`:

```jsonc
{
  "id": "urn:oid:2.49.0.1.840.0.e8959e62...003.1",   // Unique alert ID (use for dedupe)
  "areaDesc": "Northern El Paso County...",             // Human-readable area
  "geocode": {
    "SAME": ["008041"],                                 // FIPS codes (008 = CO, 041 = El Paso)
    "UGC": ["COZ084"]                                   // UGC zone codes
  },
  "affectedZones": ["https://api.weather.gov/zones/forecast/COZ084"],
  "sent": "2026-03-23T13:13:00-06:00",                 // When NWS issued
  "effective": "2026-03-23T13:13:00-06:00",             // When it takes effect
  "onset": "2026-03-25T12:00:00-06:00",                // When hazard begins
  "expires": "2026-03-24T05:15:00-06:00",               // When this MESSAGE expires
  "ends": "2026-03-25T19:00:00-06:00",                  // When hazard ends (use for TTL)
  "status": "Actual",                                   // Actual | Exercise | Test
  "messageType": "Alert",                               // Alert | Update | Cancel
  "severity": "Severe",                                 // Extreme | Severe | Moderate | Minor | Unknown
  "certainty": "Possible",                              // Observed | Likely | Possible | Unlikely
  "urgency": "Future",                                  // Immediate | Expected | Future | Past
  "event": "Fire Weather Watch",                        // The event type string (canonical)
  "headline": "Fire Weather Watch issued March 23...",   // One-line summary
  "description": "The National Weather Service...",      // Full text description
  "instruction": "A Fire Weather Watch means...",        // Public action guidance
  "response": "Prepare",                                // Shelter | Evacuate | Prepare | Execute | Monitor | None
  "parameters": {
    "VTEC": ["/O.NEW.KPUB.FW.A.0025..."],              // VTEC string (encodes event lifecycle)
    "NWSheadline": ["FIRE WEATHER WATCH IN EFFECT..."],
    "eventEndingTime": ["2026-03-25T19:00:00-06:00"]
  }
}
```

**Critical fields for our service:**
- `id` — dedupe key
- `event` — maps to storm profile
- `severity` + `certainty` + `urgency` — determines response intensity
- `onset` / `ends` — timing window for campaign activation/rollback
- `messageType` — detect updates (`Update`) and cancellations (`Cancel`)
- `parameters.VTEC` — encodes event lifecycle (new/upgrade/downgrade/cancel)

---

## 2. Geography Setup

### El Paso County Zone Codes

| Code    | Type     | Description                                                        |
|---------|----------|--------------------------------------------------------------------|
| `COC041`| County   | El Paso County (entire county, FIPS 08041)                         |
| `COZ084`| Forecast | Northern El Paso County / Monument Ridge / Rampart Range <7500ft   |
| `COZ085`| Forecast | Colorado Springs Vicinity / Southern El Paso County / <7400ft      |

### Teller County (Mountain Service Area)

| Code    | Type     | Description                                                        |
|---------|----------|--------------------------------------------------------------------|
| `COC119`| County   | Teller County (entire county, FIPS 08119)                          |
| `COZ081`| Forecast | Teller County / Rampart Range >7500ft / Pikes Peak 7500-11000ft   |
| `COZ082`| Forecast | Pikes Peak above 11000ft                                          |

### Recommended Query

Use both county-level and forecast-zone codes for maximum coverage. Alerts may be issued against either type:

```
GET /alerts/active?zone=COC041,COC119,COZ084,COZ085,COZ081,COZ082&status=actual
```

This covers:
- All of El Paso County (city + unincorporated)
- All of Teller County (Woodland Park, Cripple Creek, mountain communities)
- Both low-elevation and high-elevation forecast zones

### Alert Geography Granularity

- Alerts reference UGC zones, not addresses. A single alert may span multiple zones.
- The `areaDesc` field gives a human-readable description.
- The `geocode.SAME` array contains FIPS codes; `geocode.UGC` contains zone codes.
- Some alerts include polygon geometry for precise spatial targeting (e.g., SVR thunderstorm warnings), but most use zone-based areas.

---

## 3. Event Classification — Storm Profile Mapping

### Hail Storm Profile (`hail-storm.yaml`)

| NWS Event String                | Severity Context             |
|---------------------------------|------------------------------|
| `Severe Thunderstorm Warning`   | When description mentions hail |
| `Severe Thunderstorm Watch`     | Pre-event awareness           |
| `Severe Weather Statement`      | Follow-up / hail reports      |
| `Special Weather Statement`     | May reference hail outlook     |

**Note:** NWS does not have a standalone "Hail Warning." Hail is embedded in Severe Thunderstorm Warnings. Parse the `description` field for keywords: "hail", "quarter size", "golf ball", "inch".

### Severe Thunderstorm Profile (`severe-thunderstorm.yaml`)

| NWS Event String                | Notes                         |
|---------------------------------|-------------------------------|
| `Severe Thunderstorm Warning`   | Primary — imminent threat      |
| `Severe Thunderstorm Watch`     | Conditions favorable           |
| `Severe Weather Statement`      | Updates during active events   |
| `Special Weather Statement`     | Pre-storm outlook              |
| `Tornado Warning`               | Escalation — include in storm response |
| `Tornado Watch`                 | Escalation                     |
| `Flash Flood Warning`           | Storm-related flooding         |

### High Wind Profile (`high-wind.yaml`)

| NWS Event String                | Notes                         |
|---------------------------------|-------------------------------|
| `High Wind Warning`             | Sustained 40+ or gusts 58+ mph |
| `High Wind Watch`               | Expected within 48h            |
| `Wind Advisory`                 | Sustained 30+ or gusts 45+ mph |
| `Extreme Wind Warning`          | 115+ mph — catastrophic        |
| `Blowing Dust Warning`          | Wind-driven, visibility hazard |

### Winter Storm Profile (`winter-storm.yaml`)

| NWS Event String                | Notes                         |
|---------------------------------|-------------------------------|
| `Winter Storm Warning`          | Heavy snow/ice imminent        |
| `Winter Storm Watch`            | Possible within 48h            |
| `Winter Weather Advisory`       | Light accumulation             |
| `Ice Storm Warning`             | Significant ice — HIGH outage risk |
| `Blizzard Warning`              | Snow + wind + visibility       |
| `Freeze Warning`                | Below freezing, crop/pipe risk |
| `Freeze Watch`                  | Possible freeze                |
| `Snow Squall Warning`           | Brief, intense, dangerous      |

### Power Outage Risk Profile (`power-outage.yaml`)

These events have the highest correlation with electrical outages and should trigger "storm response" messaging:

| NWS Event String                | Outage Mechanism               |
|---------------------------------|-------------------------------|
| `Ice Storm Warning`             | **Highest risk** — ice on lines |
| `High Wind Warning`             | Tree/debris on lines           |
| `Extreme Wind Warning`          | Catastrophic infrastructure    |
| `Severe Thunderstorm Warning`   | Lightning strikes, wind, hail  |
| `Tornado Warning`               | Direct infrastructure damage   |
| `Blizzard Warning`              | Weight + wind on lines         |
| `Winter Storm Warning`          | Heavy wet snow on lines        |
| `Snow Squall Warning`           | Sudden whiteout, accidents into poles |

### Severity Scoring Matrix

Combine NWS fields into a 1-5 response intensity score:

| Score | Severity  | Certainty        | Urgency    | Action Level             |
|-------|-----------|------------------|------------|--------------------------|
| 5     | Extreme   | Observed/Likely  | Immediate  | Max budget + emergency GBP post |
| 4     | Severe    | Observed/Likely  | Immediate  | Budget increase + GBP post |
| 3     | Severe    | Possible         | Expected   | Moderate budget increase   |
| 2     | Moderate  | Possible/Likely  | Expected   | GBP post only              |
| 1     | Moderate  | Possible         | Future     | Monitor, no action         |

---

## 4. Polling Architecture

### Polling Interval

- **5 minutes** (300 seconds) — recommended baseline.
- NWS cache TTL is 30 seconds, but polling every 30s is aggressive for our use case.
- 5 minutes catches all alerts well before onset while staying well within rate guidelines.
- **During active severe weather:** can optionally decrease to **2 minutes** when score >= 3.

### Caching / Efficient Polling

NWS returns these caching headers:

```
cache-control: public, max-age=30, s-maxage=30
expires: Mon, 23 Mar 2026 23:19:02 GMT
```

- **No ETag or Last-Modified** headers are returned — conditional requests are NOT supported.
- The response payload is small (a few KB for active alerts), so full-fetch every poll is fine.
- Use the `updated` field in the response body to detect if data has changed since last poll.

### Streaming Alternatives

- **NWS does not offer WebSocket or SSE streaming.** Polling is the only option.
- CAP (Common Alerting Protocol) feeds exist but are XML-based and harder to parse.
- Some third-party services (Tomorrow.io, WeatherAPI) offer webhooks, but add cost and a dependency. NWS direct polling is free and authoritative.

### Detecting New vs Updated vs Expired Alerts

1. **New alerts:** `id` not in local seen-set AND `messageType === "Alert"`.
2. **Updated alerts:** `messageType === "Update"` with `references` array pointing to the original alert ID.
3. **Cancelled alerts:** `messageType === "Cancel"`.
4. **Expired alerts:** `expires` timestamp is in the past — remove from active tracking.
5. **Hazard ended:** `ends` timestamp is in the past — trigger rollback of any activated campaigns.

**VTEC parsing** (optional, advanced): The `parameters.VTEC` string encodes the event lifecycle:
```
/O.NEW.KPUB.SV.W.0045.260601T2100Z-260601T2200Z/
  |  |    |   |  |  |         |              |
  |  |    |   |  |  |         onset          ends
  |  |    |   |  |  sequence number
  |  |    |   |  significance (W=Warning, A=Watch)
  |  |    |   phenomenon (SV=Severe Thunderstorm)
  |  |    issuing office
  |  action (NEW/CON/EXP/CAN/UPG)
  product class (O=Operational)
```

Action codes: `NEW` = new event, `CON` = continued, `EXP` = expired, `CAN` = cancelled, `UPG` = upgraded (watch to warning).

---

## 5. Service Design — Weather-Trigger Flow

### Architecture Overview

```
+--------------+     +--------------+     +---------------+     +------------+
|  NWS API     |---->| Poll Loop    |---->| Classifier    |---->| Proposer   |
|  /alerts     |     | (5 min)      |     | (storm match) |     | (actions)  |
+--------------+     +--------------+     +---------------+     +-----+------+
                                                                      |
                     +--------------+     +---------------+           |
                     |  Rollback    |<----| Executor      |<---------+
                     |  (TTL-based) |     | (ads + GBP)   |     +-----+------+
                     +--------------+     +---------------+     | Approver   |
                                                                | (human/auto|
                                                                +------------+
```

### Step 1: Poll Loop

```typescript
// Pseudocode
const ZONES = "COC041,COC119,COZ084,COZ085,COZ081,COZ082";
const POLL_INTERVAL_MS = 300_000; // 5 minutes

async function poll() {
  const url = `https://api.weather.gov/alerts/active?zone=${ZONES}&status=actual`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PhoenixElectricWeatherTrigger/1.0 (shane@phoenixelectric.life)" }
  });
  const data = await res.json();
  return data.features; // Array of alert Features
}
```

### Step 2: Filter and Classify

```typescript
function classify(alert): StormActivation | null {
  const { event, severity, certainty, urgency, description } = alert.properties;

  // Match to storm profile
  const profile = matchStormProfile(event, description);
  if (!profile) return null; // Not a relevant event type

  // Score severity (1-5)
  const score = computeSeverityScore(severity, certainty, urgency);
  if (score < 2) return null; // Below action threshold

  // Check for hail sub-classification
  const hasHail = /hail|quarter.size|golf.ball|inch/i.test(description);

  return {
    alertId: alert.properties.id,
    profile: profile,           // "hail" | "thunderstorm" | "high-wind" | "winter-storm"
    score: score,
    hasOutageRisk: OUTAGE_EVENTS.includes(event),
    hasHail: hasHail,
    onset: alert.properties.onset,
    ends: alert.properties.ends,
    headline: alert.properties.headline,
  };
}
```

### Step 3: Propose Actions

Based on storm profile + severity score, generate proposed actions:

| Score | Profile         | Proposed Actions                                                 |
|-------|-----------------|------------------------------------------------------------------|
| 5     | Any             | +200% ad budget, emergency GBP post, pause non-storm campaigns    |
| 4     | Hail            | +150% ad budget, GBP post: "Hail damage? We're ready."           |
| 4     | Thunderstorm    | +100% ad budget, GBP post: "Storm damage electrical repair"      |
| 4     | Winter Storm    | +100% ad budget, GBP post: "Power out? We restore service fast." |
| 4     | High Wind       | +100% ad budget, GBP post: "Wind damage electrical repair"       |
| 3     | Any             | +50% ad budget, prepare GBP draft (do not post)                  |
| 2     | Any             | GBP post only (no budget change)                                 |

### Step 4: Approve

```typescript
interface ApprovalRequest {
  activationId: string;
  alertId: string;
  stormProfile: string;
  score: number;
  proposedActions: Action[];
  autoApproveEligible: boolean;  // true if within preapproved limits
  ttlMinutes: number;            // how long actions stay active
}
```

**Auto-approve rules** (configurable, requires Shane's initial approval to enable):
- Score 2-3: auto-approve GBP posts from pre-approved templates
- Score 4-5: always require human approval for budget changes
- Budget increases capped at $X/day auto-approve threshold

**Approval channels:**
- Primary: Notification to Shane (SMS/Telegram/email) with approve/reject links
- Timeout: If no response in 15 minutes for score 4+, send reminder
- Default: No action taken without approval (safe default)

### Step 5: Execute

On approval:
1. **Google Ads:** Call `mcp-google-ads` to increase campaign budgets by specified percentage
2. **GBP:** Call `mcp-gbp` to publish the storm-response post
3. **Log:** Record activation with alert ID, actions taken, timestamps, budget amounts

### Step 6: Rollback

- **TTL-based:** When `ends` timestamp passes (or `ends` + configurable buffer like 2 hours), auto-revert:
  - Restore original ad budgets
  - Optionally post "all clear" GBP update
- **Manual rollback:** Shane can trigger early rollback
- **Cancellation rollback:** If NWS issues `messageType: "Cancel"`, auto-revert immediately
- **Log:** Record rollback with before/after budget snapshots

### Dedupe Logic

```typescript
const activeAlerts = new Map<string, Activation>();

function shouldActivate(alert): boolean {
  const id = alert.properties.id;

  // Already tracking this alert
  if (activeAlerts.has(id)) {
    // Check if it's an upgrade (watch -> warning)
    if (alert.properties.messageType === "Update") {
      return reclassify(alert); // May increase score/actions
    }
    return false; // Already handled
  }

  return true; // New alert
}
```

---

## 6. Edge Cases

### Multiple Overlapping Alerts

- **Scenario:** Severe Thunderstorm Warning + High Wind Warning active simultaneously.
- **Rule:** Use the HIGHEST severity score across all active alerts for budget decisions. Do NOT stack budget increases (e.g., +100% + +100% = +200%).
- **GBP posts:** One consolidated post referencing all active conditions, or the most severe. Do not spam multiple posts.
- **Implementation:** Maintain a single "current activation level" that is the max of all active alert scores. Only escalate, never de-escalate while any alert is active.

### Alert Upgrades (Watch to Warning)

- **Detection:** NWS issues a new alert with `messageType: "Update"` and the `references` array pointing to the original watch.
- **Also detectable via VTEC:** action code `UPG` in the VTEC string.
- **Action:** Re-classify with new severity. If score increases, propose upgraded actions (requires new approval for budget changes). If already at max, no change needed.
- **Do NOT rollback the watch-level actions** before applying warning-level actions — upgrade in place.

### Rapid Succession Storms

- **Scenario:** First storm ends at 3 PM, second storm warning issued at 3:30 PM.
- **Cooldown rule:** If a new alert arrives within 60 minutes of a previous alert's `ends` time for the same profile, extend the existing activation rather than creating a new one.
- **Budget:** Keep elevated budget rather than reverting and re-increasing (avoids Google Ads churn).
- **Logging:** Track as a single "storm event" with multiple NWS alerts.

### NWS API Downtime

- **Detection:** HTTP errors (5xx), timeouts (>10 seconds), or malformed JSON.
- **Retry policy:** Exponential backoff — 30s, 60s, 120s, then hold at 120s.
- **Alert after 3 consecutive failures:** Notify Shane that weather monitoring is degraded.
- **Fallback:** None — NWS is the authoritative source. Do NOT fall back to third-party APIs without explicit configuration. The service enters "degraded" state and logs it.
- **Recovery:** On first successful poll after downtime, process all returned alerts normally (dedupe will prevent double-activation).

### Additional Edge Cases

- **Stale `ends` timestamp:** Some alerts have `ends: null`. Use `expires` as fallback; if both null, default TTL of 4 hours.
- **Test alerts:** Filter on `status: "actual"` (already in our query param) to exclude `Test` and `Exercise` alerts.
- **Timezone handling:** All NWS timestamps are ISO 8601 with offset. Parse with a proper date library; Colorado Springs is `America/Denver` (MST/MDT).
- **Service restart:** On startup, fetch current active alerts and reconcile against any persisted activation state. Resume tracking without duplicate actions.

---

## Appendix A: Example NWS Alert (Live Capture — 2026-03-23)

```json
{
  "id": "urn:oid:2.49.0.1.840.0.e8959e6230f1cf4f152e348c0fdc1dba84513d0a.003.1",
  "type": "Feature",
  "properties": {
    "id": "urn:oid:2.49.0.1.840.0.e8959e6230f1cf4f152e348c0fdc1dba84513d0a.003.1",
    "areaDesc": "Teller County/Rampart Range Including Pikes Peak and Florissant Fossil Beds National Monument; Fremont County Including Canon City/Howard/Texas Creek",
    "geocode": {
      "SAME": ["008041", "008043", "008119"],
      "UGC": ["COZ221", "COZ222"]
    },
    "sent": "2026-03-23T13:13:00-06:00",
    "effective": "2026-03-23T13:13:00-06:00",
    "onset": "2026-03-25T12:00:00-06:00",
    "expires": "2026-03-24T05:15:00-06:00",
    "ends": "2026-03-25T19:00:00-06:00",
    "status": "Actual",
    "messageType": "Alert",
    "severity": "Severe",
    "certainty": "Possible",
    "urgency": "Future",
    "event": "Fire Weather Watch",
    "headline": "Fire Weather Watch issued March 23 at 1:13PM MDT until March 25 at 7:00PM MDT by NWS Pueblo CO",
    "description": "The National Weather Service in Pueblo has issued a Fire Weather Watch for gusty winds and low relative humidity...",
    "instruction": "A Fire Weather Watch means that critical fire weather conditions are forecast to occur...",
    "response": "Prepare",
    "parameters": {
      "VTEC": ["/O.NEW.KPUB.FW.A.0025.260325T1800Z-260326T0100Z/"]
    }
  }
}
```

## Appendix B: All Relevant NWS Event Types for Colorado Springs

Complete list of event strings our service should recognize (from NWS `/alerts/types` endpoint):

**Storm/Wind:**
Severe Thunderstorm Warning, Severe Thunderstorm Watch, Severe Weather Statement, Special Weather Statement, Tornado Warning, Tornado Watch, High Wind Warning, High Wind Watch, Wind Advisory, Extreme Wind Warning

**Winter:**
Winter Storm Warning, Winter Storm Watch, Winter Weather Advisory, Ice Storm Warning, Blizzard Warning, Freeze Warning, Freeze Watch, Snow Squall Warning

**Flood:**
Flash Flood Warning, Flash Flood Watch, Flood Warning, Flood Watch, Flood Advisory

**Fire (secondary — not a direct marketing trigger but good to monitor):**
Fire Weather Watch, Red Flag Warning

**Not applicable to Colorado Springs (coastal/marine/tropical):** excluded from configuration.

## Appendix C: Configuration File Structure

```yaml
# config/weather-trigger.yaml
service:
  poll_interval_seconds: 300
  elevated_poll_interval_seconds: 120  # when score >= 3
  api_timeout_ms: 10000
  max_retry_count: 3

geography:
  zones:
    - COC041   # El Paso County
    - COC119   # Teller County
    - COZ084   # Northern El Paso / Monument
    - COZ085   # Colorado Springs / Southern El Paso
    - COZ081   # Teller / Rampart Range high elevation
    - COZ082   # Pikes Peak summit

approval:
  auto_approve_max_score: 3        # scores above this require human approval
  auto_approve_budget_cap_pct: 50  # max auto-approved budget increase %
  approval_timeout_minutes: 15
  notification_channel: telegram   # telegram | sms | email

rollback:
  buffer_after_ends_minutes: 120   # keep elevated 2h after hazard ends
  default_ttl_hours: 4             # when ends is null
  cooldown_minutes: 60             # merge rapid succession storms

dedup:
  store: sqlite                    # sqlite | redis | memory
  retention_days: 30               # keep alert history for reporting
```
