# Marketing Orchestrator — Design Document

**Server:** `marketing-orchestrator`
**Task:** C-007 (Runbook Phase 1)
**Author:** Builder Agent T6 (Phoenix Echo, Opus 4.6)
**Date:** 2026-03-23
**Status:** PROPOSAL — Awaiting Shane approval

---

## Architecture Decision

**Choice: Standalone MCP server with thin slash-command wrappers.**

The orchestrator is itself an MCP server that acts as a client to the five platform-specific MCP servers (`mcp-gbp`, `mcp-callrail`, `mcp-google-ads`, `weather-trigger`, `nextdoor-adapter`). It exposes six tools. Slash commands in Claude Code are thin wrappers that call these tools with sensible defaults.

```
  Ash (slash commands)          Echo (direct tool calls)
        |                              |
        v                              v
  +-----------------------------------------+
  |       marketing-orchestrator (MCP)      |
  |                                         |
  |  Tools:                                 |
  |    marketing-report                     |
  |    marketing-post                       |
  |    marketing-storm-check                |
  |    marketing-leads                      |
  |    marketing-pause                      |
  |    marketing-status                     |
  +-----------------------------------------+
       |        |        |        |       |
       v        v        v        v       v
   mcp-gbp  callrail  google-ads  weather  nextdoor
```

**Why standalone MCP, not a Claude Code plugin:**

1. **Decoupled from any single AI client.** If we swap Claude Code for another agent, the orchestrator still works.
2. **Testable independently.** Can validate tool schemas and responses without spinning up Claude.
3. **Same transport for Ash and Echo.** Ash uses slash commands (sugar). Echo calls tools directly (full parameters). Both hit the same server.
4. **Matches the existing architecture.** Every other component is already an MCP server.

**Slash commands** are defined in a Claude Code skill file (`.claude/skills/marketing.md` or equivalent) that maps each command to its orchestrator tool call with default arguments.

---

## Tool Definitions

### 1. `marketing-report`

**Description:** Pull data from all active MCP servers and format a unified marketing summary. This is the "Monday morning report" for Ash and the "weekly review input" for Shane.

**Approval required:** No (read-only).

#### Input Schema

```json
{
  "name": "marketing-report",
  "description": "Generate a unified marketing report aggregating data from all active platform MCP servers.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "start_date": {
        "type": "string",
        "format": "date",
        "description": "Start of reporting period (YYYY-MM-DD). Default: 7 days ago."
      },
      "end_date": {
        "type": "string",
        "format": "date",
        "description": "End of reporting period (YYYY-MM-DD). Default: today."
      },
      "format": {
        "type": "string",
        "enum": ["summary", "detailed"],
        "default": "summary",
        "description": "Summary: key metrics only. Detailed: full breakdowns per platform."
      }
    },
    "required": []
  }
}
```

#### Data Sources and Aggregation

| Section | Source MCP | Tool Called | Data Pulled |
|---------|-----------|------------|-------------|
| GBP Performance | `mcp-gbp` | `gbp-insights` | Views, calls, direction requests, posts published |
| Call Tracking | `mcp-callrail` | `callrail-weekly-report` | Total calls, missed calls, avg duration, top sources |
| Ad Spend & Leads | `mcp-google-ads` | `google-ads-weekly-report` | Spend, impressions, clicks, conversions, CPL |
| Weather Actions | `weather-trigger` | `weather-actions-log` | Alerts received, actions proposed, actions executed, auto-rollbacks |
| Nextdoor | `nextdoor-adapter` | `nextdoor-performance` | Post impressions, engagement (from last CSV import) |

#### Output Format (summary)

```markdown
# Phoenix Electric — Marketing Report
## Mar 16 - Mar 22, 2026

### At a Glance
| Metric | Value | vs Prior Week |
|--------|-------|---------------|
| Total Leads | 23 | +4 |
| Ad Spend | $487.20 | -$12.80 |
| Cost per Lead | $21.18 | improved |
| Missed Calls | 2 | -1 |
| GBP Views | 1,240 | +180 |
| Storm Actions | 1 triggered, 1 approved | — |

### Google Ads
[spend breakdown, top keywords, conversion count]

### Calls (CallRail)
[call count by source, missed calls needing follow-up]

### GBP
[posts published this week, review count, avg rating]

### Weather Triggers
[alerts matched, actions taken, budget adjustments and rollbacks]

### Nextdoor
[last import date, impressions, engagement — or "No data imported this period"]

### Data Gaps
[lists any MCP that was unreachable or returned errors — see Failure Handling]
```

#### Error Cases

| Error | Behavior |
|-------|----------|
| One MCP unreachable | Report generates with partial data; missing section shows "UNAVAILABLE: [mcp-name] — [error]" |
| All MCPs unreachable | Return error: "Cannot generate report — no data sources available. Run /marketing-status to diagnose." |
| Invalid date range | Return error: "start_date must be before end_date" |
| Date range > 90 days | Return error: "Maximum report range is 90 days. For longer periods, run multiple reports." |

---

### 2. `marketing-post`

**Description:** Create a Google Business Profile post from the template library. Supports selecting by template ID or browsing by category. Always requires human approval before publishing.

**Approval required:** YES — always, before publish.

#### Input Schema

```json
{
  "name": "marketing-post",
  "description": "Create a GBP post from the template library. Generates a preview for approval before publishing.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "template_id": {
        "type": "string",
        "description": "Filename of template in templates/gbp-posts/ (e.g., 'storm-response-hail'). If omitted, lists available templates by category."
      },
      "category": {
        "type": "string",
        "enum": ["seasonal", "service-highlight", "generator", "storm-response"],
        "description": "Filter templates by category. Ignored if template_id is provided."
      },
      "custom_text": {
        "type": "string",
        "description": "Optional override text. Replaces template body but keeps formatting structure."
      },
      "placeholders": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "description": "Key-value pairs to fill template placeholders (e.g., {\"storm_type\": \"hail\", \"date\": \"March 20\"})."
      }
    },
    "required": []
  }
}
```

#### Execution Flow

```
1. No template_id and no category?
   → List all templates grouped by category. STOP. (Browse mode)

2. Category provided, no template_id?
   → List templates in that category. STOP. (Filtered browse)

3. template_id provided?
   → Load template from templates/gbp-posts/{template_id}.md
   → Fill placeholders (error if required placeholder missing)
   → Apply custom_text override if provided
   → Return PREVIEW with rendered post content
   → Ask: "Approve this post? (yes/no)"
   → On approval: call mcp-gbp → gbp-create-post
   → Return: post URL and confirmation
   → On rejection: return "Post cancelled. No changes made."
```

#### Output Format

**Browse mode:**
```markdown
## Available GBP Templates

### seasonal (4 templates)
- summer-ac-load — "Beat the heat" electrical load tips
- winter-generator — Winter storm generator readiness
- spring-panel — Spring electrical inspection promo
- storm-prep — General storm preparation checklist

### storm-response (2 templates)
- storm-response-hail — Post-hail damage assessment offer
- storm-response-general — General storm damage response

Select a template: /marketing-post storm-response-hail
```

**Preview mode:**
```markdown
## Post Preview

**Template:** storm-response-hail
**Filled placeholders:** storm_type=hail, date=March 20

---
[rendered post content here]
---

**Action required:** Approve this post? Reply YES to publish, NO to cancel.
```

#### Error Cases

| Error | Behavior |
|-------|----------|
| Template not found | "Template '{id}' not found. Run /marketing-post to browse available templates." |
| Missing required placeholder | "Template requires placeholder '{key}' but it was not provided. Required: [list]" |
| GBP API error on publish | "Post approved but publish failed: [error]. Post saved locally. Retry with /marketing-post --retry" |
| mcp-gbp unreachable | "Cannot reach GBP server. Post drafted locally. Run /marketing-status to check." |

---

### 3. `marketing-storm-check`

**Description:** Poll NWS for active weather alerts matching configured storm profiles and propose marketing actions. Never auto-executes — always proposes and waits for approval.

**Approval required:** YES — always, before any action executes.

#### Input Schema

```json
{
  "name": "marketing-storm-check",
  "description": "Check NWS alerts for the configured geography, match against storm profiles, and propose marketing actions for approval.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "force_check": {
        "type": "boolean",
        "default": false,
        "description": "Bypass cooldown timer and check now. Does NOT bypass approval."
      }
    },
    "required": []
  }
}
```

#### Execution Flow

```
1. Call weather-trigger → get-active-alerts (geography: el_paso_county_co)
2. For each alert:
   a. Match against storm profiles in config/storm-profiles/*.yaml
   b. Check dedupe_key — skip if this NWS alert ID was already acted on
   c. Check cooldown_hours — skip if last activation was too recent
3. No matches? → "No active weather alerts match storm profiles. All clear."
4. Matches found? → For each match, build proposal:
   - Alert details (type, severity, NWS ID, issued time, expires time)
   - Matched profile (which YAML, what actions)
   - Proposed actions with specifics:
     * GBP post: show template name + rendered preview
     * Budget increase: show current daily budget, proposed new budget, multiplier, TTL
     * Ad schedule extension: show current schedule, proposed extension
   - Server-enforced caps: show what the hard caps are so approver sees guardrails
5. Return proposal. Wait for approval.
6. On approval: execute each action via respective MCP server. Log to LEDGER.
7. On rejection: "Storm actions cancelled. Alert logged but no actions taken."
```

#### Output Format

```markdown
## Storm Alert Matched

**NWS Alert:** Severe Thunderstorm Warning — Hail (SVR-2026-0320-001)
**Issued:** 2026-03-20 14:32 MDT | **Expires:** 2026-03-20 17:00 MDT
**Matched Profile:** hail-storm.yaml

### Proposed Actions

| # | Action | Detail | Guardrail |
|---|--------|--------|-----------|
| 1 | GBP Post | storm-response-hail template | Approval required (this prompt) |
| 2 | Budget Increase | $100/day → $150/day (1.5x) | Server cap: 2.0x / $200 max |
| 3 | TTL | Auto-rollback in 24 hours | Budget returns to $100/day |

**Cooldown:** 12 hours before this profile can re-trigger.
**Dedupe:** Alert ID SVR-2026-0320-001 will not trigger again.

**Action required:** Approve ALL proposed actions? Reply YES to execute, NO to cancel, or PARTIAL to select individual actions.
```

#### Error Cases

| Error | Behavior |
|-------|----------|
| NWS API unreachable | "Cannot reach NWS API. Check manually at weather.gov/alerts. No actions proposed." |
| Storm profile YAML invalid | "Error parsing profile '{name}': [error]. Skipping this profile. Other profiles still evaluated." |
| weather-trigger MCP down | "Weather trigger server unavailable. Run /marketing-status for diagnostics." |
| Cooldown active | "Profile '{name}' is in cooldown (activated {N}h ago, cooldown is {M}h). Use --force-check to override cooldown (still requires approval)." |

---

### 4. `marketing-leads`

**Description:** Show recent leads with source attribution. Combines CallRail call data with Google Ads conversion data into one list.

**Approval required:** No (read-only).

#### Input Schema

```json
{
  "name": "marketing-leads",
  "description": "List recent leads with source attribution, combining call tracking and ad conversion data.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "days": {
        "type": "integer",
        "default": 7,
        "minimum": 1,
        "maximum": 90,
        "description": "Number of days to look back."
      },
      "source": {
        "type": "string",
        "enum": ["all", "callrail", "google-ads", "gbp", "nextdoor"],
        "default": "all",
        "description": "Filter by lead source."
      },
      "status": {
        "type": "string",
        "enum": ["all", "answered", "missed", "converted"],
        "default": "all",
        "description": "Filter by lead status."
      }
    },
    "required": []
  }
}
```

#### Data Sources

| Source | MCP | Tool | Lead Type |
|--------|-----|------|-----------|
| Phone calls | `mcp-callrail` | `callrail-recent-calls` | Inbound call with tracking number |
| Google Ads conversions | `mcp-google-ads` | `google-ads-conversions` | Form fill, call from ad, click-to-call |
| GBP actions | `mcp-gbp` | `gbp-insights` | Calls/directions from GBP listing |

**Deduplication:** Calls that appear in both CallRail and Google Ads (ad-attributed calls) are merged into one lead entry with both sources noted.

#### Output Format

```markdown
## Leads — Last 7 Days (Mar 16-22)
**Total: 23 leads** | Answered: 19 | Missed: 2 | Converted: 14

| # | Date | Time | Source | Type | Duration | Status | Notes |
|---|------|------|--------|------|----------|--------|-------|
| 1 | Mar 22 | 3:14p | Google Ads (generator) | Call | 4:32 | Converted | Booked panel inspection |
| 2 | Mar 22 | 1:08p | GBP | Call | 1:15 | Answered | Price check only |
| 3 | Mar 21 | 5:45p | Google Ads (emergency) | Call | 0:00 | Missed | After hours — needs callback |
| ... | | | | | | | |

### By Source
| Source | Leads | Converted | CPL |
|--------|-------|-----------|-----|
| Google Ads | 12 | 8 | $22.40 |
| GBP organic | 6 | 4 | — |
| CallRail (direct) | 3 | 1 | — |
| Nextdoor | 2 | 1 | — |

### Action Items
- 2 missed calls need callback (see rows 3, 17)
```

#### Error Cases

| Error | Behavior |
|-------|----------|
| CallRail down | Report generates without call data. Shows: "CallRail unavailable — call data missing from this report." |
| Google Ads down | Report generates without ad conversions. Shows: "Google Ads unavailable — conversion data missing." |
| No leads in range | "No leads found in the last {N} days. Check /marketing-status to verify data sources are connected." |

---

### 5. `marketing-pause`

**Description:** Emergency pause of all active marketing campaigns. This is the kill switch. Pauses Google Ads campaigns, disables weather trigger automation, and logs everything.

**Approval required:** YES — explicit confirmation flag required in the input. No accidental pauses.

#### Input Schema

```json
{
  "name": "marketing-pause",
  "description": "Emergency pause all active marketing campaigns and automations. Requires explicit confirmation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "confirm": {
        "type": "boolean",
        "description": "Must be true to execute. Safety gate against accidental invocation."
      },
      "reason": {
        "type": "string",
        "description": "Required reason for the pause. Logged to LEDGER."
      },
      "scope": {
        "type": "string",
        "enum": ["all", "google-ads", "weather-trigger", "gbp"],
        "default": "all",
        "description": "Pause everything or target a specific platform."
      }
    },
    "required": ["confirm", "reason"]
  }
}
```

#### Execution Flow

```
1. confirm !== true? → REJECT. "Emergency pause requires confirm: true. This is a safety gate."
2. reason is empty? → REJECT. "A reason is required for audit trail."
3. Execute per scope:
   - google-ads: call mcp-google-ads → google-ads-pause-campaign (all active campaigns)
   - weather-trigger: call weather-trigger → disable-all-profiles
   - gbp: call mcp-gbp → cancel-scheduled-posts
   - all: execute all of the above
4. Log to LEDGER:
   - Timestamp
   - Who initiated (Ash/Echo/Shane)
   - Reason
   - What was paused (list each campaign/profile/post)
   - State before pause (so we can resume)
5. Return confirmation with everything that was paused.
```

#### Output Format

```markdown
## EMERGENCY PAUSE EXECUTED

**Time:** 2026-03-22 16:45 MDT
**Scope:** ALL
**Reason:** "Call volume exceeding capacity during storm event"
**Initiated by:** Ash

### Actions Taken
| Platform | Action | Detail |
|----------|--------|--------|
| Google Ads | 3 campaigns paused | generator-search, emergency-electric, lsa-main |
| Weather Trigger | All profiles disabled | hail-storm, wind-storm, winter-storm |
| GBP | 1 scheduled post cancelled | storm-response-hail (was scheduled for 5:00p) |

### To Resume
Run individual platform tools to re-enable:
- Google Ads: use mcp-google-ads → google-ads-resume-campaign
- Weather: use weather-trigger → enable-profile
- Or wait for Shane to issue a full resume.

**Logged to LEDGER.**
```

#### Error Cases

| Error | Behavior |
|-------|----------|
| confirm is false/missing | REJECT immediately. No partial execution. |
| reason is empty | REJECT. "Reason is required for the audit trail." |
| One platform fails to pause | Pause what you can. Report failures: "Google Ads paused. Weather trigger FAILED to pause: [error]. GBP paused. Manual intervention needed for weather-trigger." |
| All platforms fail | "PAUSE FAILED — no platforms responded. MANUAL INTERVENTION REQUIRED. Go to Google Ads dashboard directly." |

---

### 6. `marketing-status`

**Description:** Quick health check of all MCP servers. Shows connectivity, last successful data pull, and any active errors.

**Approval required:** No (read-only diagnostic).

#### Input Schema

```json
{
  "name": "marketing-status",
  "description": "Health check of all marketing MCP servers. Shows connectivity, last data pull, and errors.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

#### Execution Flow

```
1. Ping each MCP server (lightweight health endpoint or minimal tool call)
2. For each, record: reachable (yes/no), last successful response timestamp, any error message
3. Check for active weather alerts (are we in a storm event?)
4. Check for active pauses (is anything currently paused from marketing-pause?)
5. Return formatted status board
```

#### Output Format

```markdown
## Marketing System Status

| Server | Status | Last Data | Notes |
|--------|--------|-----------|-------|
| mcp-gbp | ONLINE | 2 min ago | 3 posts this week |
| mcp-callrail | ONLINE | 5 min ago | 14 calls today |
| mcp-google-ads | ONLINE | 1 min ago | 3 campaigns active, $42.10 spent today |
| weather-trigger | ONLINE | 15 min ago | No active alerts. Next poll: 2 min |
| nextdoor-adapter | OFFLINE | 3 days ago | Last CSV import: Mar 19. No API — manual import required. |

### Active Alerts
- None

### Active Pauses
- None

### System Notes
- Nextdoor data is 3 days stale. Remind Ash to export and import latest CSV.
```

#### Error Cases

| Error | Behavior |
|-------|----------|
| MCP server unreachable | Show as OFFLINE with last known good timestamp and error message |
| All servers unreachable | "ALL SERVERS OFFLINE. Check MCP server processes. Are they running?" |

---

## Failure Handling — Partial Data Strategy

The orchestrator operates on the principle of **graceful degradation**. One MCP being down should never prevent the rest from working.

### Rules

1. **Reports generate with partial data.** If CallRail is down but Google Ads is up, the report still generates. Missing sections are clearly marked.

2. **Every response includes a `data_gaps` field.** Even when everything works, this field is present (as empty). Ash never has to wonder "is this the full picture?"

3. **Staleness warnings.** If the last data pull from a source is older than expected (e.g., CallRail data is 6 hours old when it should be real-time), the report flags it.

4. **Error format is consistent.** Every missing data section uses the same pattern:
   ```
   > UNAVAILABLE: {mcp-name} — {error_message}
   > Last successful pull: {timestamp}
   > Impact: {what data is missing from this report}
   ```

5. **Never silently omit data.** If a section is missing, it must be explicitly called out. An empty section and an unavailable section are different things and must look different.

### Response Envelope

Every orchestrator tool response follows this structure:

```json
{
  "status": "complete" | "partial" | "error",
  "data_gaps": [
    {
      "source": "mcp-callrail",
      "error": "Connection refused",
      "last_success": "2026-03-22T10:00:00Z",
      "impact": "Call tracking data missing from report"
    }
  ],
  "content": "... rendered markdown ...",
  "actions_taken": [],
  "approval_pending": false
}
```

---

## Approval Gate Design

### Which tools require approval?

| Tool | Approval Required | Why |
|------|-------------------|-----|
| `marketing-report` | No | Read-only. No side effects. |
| `marketing-post` | **YES** | Publishes content publicly on GBP. |
| `marketing-storm-check` | **YES** | Proposes budget changes and content. |
| `marketing-leads` | No | Read-only. No side effects. |
| `marketing-pause` | **YES** (via `confirm` flag) | Shuts down active campaigns. |
| `marketing-status` | No | Read-only diagnostic. |

### How approval works

Approval is **inline in the CLI conversation**. No separate queue, no external system. This is intentional — Ash is already in Claude Code when she runs the slash command. The approval flow is:

```
Ash: /marketing-post storm-response-hail

Orchestrator: [shows preview]
  "Approve this post? Reply YES to publish, NO to cancel."

Ash: yes

Orchestrator: [publishes, confirms]
```

For Echo (AI agent), approval still routes to a human. Echo can prepare the proposal but cannot self-approve anything that spends money or publishes content. The tool returns `approval_pending: true` and the action waits.

### Future: approval queue

If volume grows (many storm alerts, many posts), a lightweight approval queue could be added — pending items persist and Ash reviews them in batch. But for launch, inline approval is simpler and sufficient.

---

## Slash Command Wrappers

These live in the Claude Code skill/plugin configuration. Each wraps the orchestrator tool with sensible defaults for Ash.

| Command | Maps To | Default Args |
|---------|---------|-------------|
| `/marketing-report` | `marketing-report` | `{ days: 7, format: "summary" }` |
| `/marketing-report detailed` | `marketing-report` | `{ days: 7, format: "detailed" }` |
| `/marketing-post` | `marketing-post` | `{}` (browse mode) |
| `/marketing-post [template]` | `marketing-post` | `{ template_id: arg }` |
| `/marketing-storm` | `marketing-storm-check` | `{}` |
| `/marketing-leads` | `marketing-leads` | `{ days: 7, source: "all" }` |
| `/marketing-leads [N]` | `marketing-leads` | `{ days: N }` |
| `/marketing-pause` | `marketing-pause` | Prompts for `confirm` and `reason` interactively |
| `/marketing-status` | `marketing-status` | `{}` |

### Ash-specific UX Notes

- Slash commands use plain English where possible. No JSON, no flags.
- `/marketing-post` with no args shows the template browser — Ash picks visually.
- `/marketing-pause` always asks for confirmation interactively, never auto-confirms.
- Error messages include what to do next, not just what went wrong.

---

## Implementation Notes

### Tech Stack

- **Runtime:** Node.js (ES modules, matching all other MCP servers in this repo)
- **MCP SDK:** `@modelcontextprotocol/sdk` (standard MCP server implementation)
- **No database.** State lives in the underlying MCP servers and LEDGER. The orchestrator is stateless — it aggregates on demand.
- **Credentials:** None stored. The orchestrator calls other MCP servers; those servers handle their own auth via vault.

### File Structure

```
mcp-servers/marketing-orchestrator/
  package.json
  src/
    index.ts              # MCP server entry point, tool registration
    tools/
      report.ts           # marketing-report implementation
      post.ts             # marketing-post implementation
      storm-check.ts      # marketing-storm-check implementation
      leads.ts            # marketing-leads implementation
      pause.ts            # marketing-pause implementation
      status.ts           # marketing-status implementation
    clients/
      mcp-client.ts       # Generic MCP client wrapper for calling child servers
      gbp.ts              # mcp-gbp client
      callrail.ts         # mcp-callrail client
      google-ads.ts       # mcp-google-ads client
      weather.ts          # weather-trigger client
      nextdoor.ts         # nextdoor-adapter client
    formatters/
      markdown.ts         # Shared markdown formatting utilities
      report-sections.ts  # Report section builders
    types.ts              # Shared TypeScript types
```

### Dependencies Between Servers

The orchestrator needs at minimum **one** child MCP server running to be useful. It degrades gracefully if others are missing. The dependency order for build is:

1. `mcp-gbp` (C-005) — first server, enables `marketing-post` and GBP sections of reports
2. `marketing-orchestrator` (C-007) — useful as soon as mcp-gbp exists
3. `mcp-callrail` (C-006) — adds call data to reports and leads
4. `mcp-google-ads` (C-009) — adds ad spend/conversion data, enables pause
5. `weather-trigger` (C-010) — enables storm-check
6. `nextdoor-adapter` (C-011) — adds Nextdoor data to reports (lowest priority)

### Configuration

```yaml
# config/orchestrator.yaml
geography: el_paso_county_co
timezone: America/Denver

servers:
  mcp-gbp:
    enabled: true
    transport: stdio          # or sse, depending on deployment
  mcp-callrail:
    enabled: true
    transport: stdio
  mcp-google-ads:
    enabled: true
    transport: stdio
  weather-trigger:
    enabled: true
    transport: stdio
  nextdoor-adapter:
    enabled: true
    transport: stdio

defaults:
  report_days: 7
  leads_days: 7
  max_report_range_days: 90
```

---

## Open Questions for Shane

1. **Scope of `/marketing-pause`:** Should it also pause LSA (which is a Google Ads sub-type) or just standard campaigns? Currently designed to pause all Google Ads campaigns including LSA.

2. **PARTIAL approval for storm actions:** Currently proposed that Ash can approve individual actions from a storm proposal (e.g., approve the GBP post but reject the budget increase). Is this needed for launch or can it be all-or-nothing?

3. **Nextdoor import cadence:** The adapter is read-only from CSV exports. Should the orchestrator remind Ash when the last import is stale, or is that noise?

4. **Resume command:** Currently there is no `/marketing-resume` — individual platforms are re-enabled manually. Should we add a symmetric resume command?
