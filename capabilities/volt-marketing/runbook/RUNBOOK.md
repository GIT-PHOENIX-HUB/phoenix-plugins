# Marketing Campaign Execution Runbook
## Phoenix Electric — Volt Campaign Architecture Implementation

**Created:** 2026-03-23 | Phoenix Echo (Opus 4.6)
**Source:** Volt marketing agent campaign plan, Stephanie/Ash review, Echo+Codex architecture alignment
**Status:** PROPOSAL — Awaiting Shane approval before distribution

---

## How This Runbook Works

Three lanes. Three teams. One goal.

| Lane | Owner | Work Type |
|------|-------|-----------|
| **HUMAN** | Stephanie + Ash | Research, vendor calls, account setup, platform access, creative decisions |
| **CODE** | Echo + Codex | MCP servers, plugins, automation, landing pages, integrations |
| **GATE** | Shane | Approval checkpoints where human output feeds code work |

**Nothing crosses lanes without a gate.** Stephanie doesn't need to understand MCP servers. Echo doesn't call Generac. Shane watches the board and approves at gates.

---

## Phase 0: Foundation (Week 1)
*Before any money is spent or code is written*

### HUMAN LANE — Stephanie + Ash

#### H-001A: Google Ads Account Bootstrap (Ash — IMMEDIATE, NO SPEND)
**What:** Create Google Ads account so Keyword Planner is available for research
**Why:** Keyword Planner requires an account. This is a no-spend bootstrap — account only, no campaigns, no billing until GATE-01.
**Deliverables:**
- [ ] Google Ads account created (NO campaigns, NO billing info yet)
- [ ] Keyword Planner access confirmed
**IMPORTANT:** This is account creation ONLY. No billing, no campaigns, no spend. Billing and developer token come after GATE-01.
**Time estimate:** 30 minutes

#### H-001B: Google Ads Market Research (Ash — PRIMARY)
**What:** Deep dive on actual Google Ads / LSA costs for Colorado Springs electrical market
**Why:** Volt's CPL estimates are industry averages, not verified for our territory
**Deliverables (commit to repo):**
- [ ] Actual CPC range for "electrician colorado springs" and top 10 keywords (via Keyword Planner from H-001A)
- [ ] LSA cost-per-lead in our market (talk to other contractors or check forums)
- [ ] Competitor ad presence and creative footprint — who's running ads, what copy/extensions they use (Google Ads Transparency Center)
- [ ] Auction competitiveness proxies — keyword difficulty, estimated top-of-page bids (Keyword Planner + SpyFu)
- [ ] Recommended starting budget based on real data (not Volt's estimate)
- [ ] GO/NO-GO recommendation: Is Google Ads worth it at our scale?
- [ ] Define: what counts as a "lead"? (phone call >60s? form fill? booked job?) — needed for attribution later
**Tools:** Google Ads Keyword Planner (from H-001A account), Google Ads Transparency Center, SpyFu free tier
**Time estimate:** 3-4 hours of research
**Gate:** GATE-01 — Shane reviews before any money is committed

#### H-002: Google Ads Full Setup (Ash — after GATE-01 ONLY)
**What:** Add billing, apply for developer token, create OAuth credentials
**Why:** Developer token is required for API automation. Takes days/weeks for Google approval. Billing enables campaign creation.
**Deliverables:**
- [ ] Billing info added to account from H-001A
- [ ] Developer token application submitted (needs basic company info)
- [ ] OAuth credentials created in Google Cloud Console (Echo will provide exact steps)
- [ ] Note: Test accounts are available immediately but cannot serve real ads or produce real metrics
**IMPORTANT:** Do NOT launch any campaigns until GATE-02. Setup only.
**Time estimate:** 1-2 hours

#### H-003: Google Business Profile Audit (Stephanie)
**What:** Verify and optimize our GBP listing before automating posts
**Deliverables (commit to repo):**
- [ ] Confirm business hours, phone number, service area are current
- [ ] Confirm all service categories are set (Electrician, Electrical Installation, Generator Installation, etc.)
- [ ] Upload 5-10 recent job photos if not already there
- [ ] Check for and respond to any unanswered reviews
- [ ] Note: GBP owner access is required for API automation — confirm who has owner access
- [ ] Document the Google account email that owns the GBP listing
**Time estimate:** 1-2 hours

#### H-004: Generac Co-Op Fund Research (Stephanie)
**What:** Call our Generac RSM, learn the co-op advertising program
**Deliverables (commit to repo):**
- [ ] RSM name and contact info
- [ ] Our current co-op fund balance (if any)
- [ ] What's eligible for reimbursement (digital ads? landing pages? print?)
- [ ] Reimbursement process — what proof do they need?
- [ ] Quarterly deadlines (use-it-or-lose-it?)
- [ ] Any Generac-provided marketing assets we can use (logos, copy, landing page templates)
**Why this matters:** Free money that offsets ad spend. But only if we know the rules.
**Time estimate:** 1-2 phone calls + follow-up email

#### H-005: CallRail Decision (Stephanie + Shane)
**What:** Decide if CallRail ($45-95/mo) is worth it for call tracking
**Context:**
- CallRail provides: which ad/campaign generated each phone call, call recording, missed call alerts
- Alternative: just use SF call logging (manual, no campaign attribution)
- Volt's plan assumes CallRail
**Deliverables:**
- [ ] GO/NO-GO on CallRail
- [ ] If GO: sign up, note the API key for Echo
**Gate:** GATE-01 (bundled with Google Ads decision)

#### H-006: Facebook vs Nextdoor Priority Decision (Stephanie + Ash)
**What:** Document our actual conversion data and recommend priority
**Context:** Volt weighted Facebook heavily. Our data says Nextdoor converts 10:1 better.
**Deliverables (commit to repo):**
- [ ] Facebook: count of actual paying jobs from FB ads in past 12 months
- [ ] Nextdoor: count of actual paying jobs from Nextdoor in past 12 months
- [ ] Recommendation: flip priority to Nextdoor > Facebook? Drop Facebook entirely?
- [ ] Forward recommendation to Volt for plan revision
**Time estimate:** 1 hour reviewing records

---

### CODE LANE — Echo + Codex (Week 1)

#### C-001: GitHub Repo Setup — `phoenix-marketing`
**What:** Create the repo where all marketing work lives
**Structure:**
```
phoenix-marketing/
  README.md                    # What this repo is, who does what
  CONTRIBUTORS.md              # Stephanie, Ash, Echo, Codex roles
  CODEOWNERS                   # Protects config/ and mcp-servers/ from unreviewed changes
  research/                    # Stephanie + Ash commit their findings here
    google-ads-market-data.md
    generac-coop-program.md
    conversion-history.md
    gbp-audit.md
    lead-definition.md         # What counts as a "lead" (attribution standard)
  runbook/                     # This runbook + updates
    RUNBOOK.md
    lsa-ops-sop.md             # LSA operational SOP (response SLA, disputes, storm surge)
    security-appendix.md       # Credential rotation, revocation, offboarding
  mcp-servers/                 # Code (Echo + Codex only) — CODEOWNERS protected
    mcp-gbp/
    mcp-callrail/
    mcp-google-ads/
    marketing-orchestrator/
    weather-trigger/
    nextdoor-adapter/
  config/                      # EXECUTABLE CONFIGS — CODEOWNERS protected (Shane only)
    storm-profiles/            # Budget controls, approval flags, rollback metadata
    hard-caps.yaml             # Server-side maximums (from vault at runtime)
  landing-pages/               # Generator page, storm damage page
  templates/                   # GBP post templates, ad copy (Stephanie can edit)
  decisions/                   # Logged decisions with date + reasoning
```
**CODEOWNERS:**
```
# Protected paths — require Shane's review
config/         @shane7777777777777
mcp-servers/    @shane7777777777777
runbook/security-appendix.md  @shane7777777777777
```
**Branch protection (required at repo creation):**
- `main` branch: require PR reviews (1 reviewer minimum)
- Require CODEOWNERS review for protected paths
- No direct pushes to `main` — all changes via PR
- This ensures CODEOWNERS is enforced, not just documented
**Stephanie access:** Collaborator with write access. She commits to `research/`, `decisions/`, and `templates/` (content only — NOT `config/`).
**Why GitHub:** Version-controlled, visible to all agents, Stephanie's research becomes permanent context for builds.

#### C-002: GBP Post Templates (Echo)
**What:** Draft 10-15 GBP post templates that Stephanie approves
**Categories:**
- Seasonal (summer AC load, winter generator, storm prep)
- Service highlight (panel upgrades, EV charger installs, whole-home surge protection)
- Generator-specific (Generac dealer, backup power, storm readiness)
- Storm response (damage assessment, emergency service, generator activation)
**Deliverable:** `templates/gbp-posts/` with markdown files, awaiting Stephanie review
**Gate:** GATE-02 — Stephanie approves templates before they go into automation

#### C-003: Storm Profile Configs (Echo + Codex)
**What:** Create version-controlled storm profile files
**SECURITY (Codex CRIT-1 fix):** Storm profiles contain budget controls and approval flags. These are EXECUTABLE CONFIGS — they must NOT live in a path Stephanie can edit.
**Location:** `config/storm-profiles/` (protected path, CODEOWNERS restricts to Echo+Codex+Shane)
**CODEOWNERS entry:** `config/ @shane7777777777777` — all changes require Shane's review approval
**Server-side enforcement:** The weather-trigger MCP server enforces hard caps regardless of what the YAML says:
- `requires_approval` cannot be set to `false` without Shane's commit approval
- `max_daily_budget` cannot exceed server-side hard cap (set by Shane, stored in vault)
- `budget_multiplier` cannot exceed server-side max multiplier (default: 2.0)
**Deliverable:** `config/storm-profiles/` with YAML configs:
```yaml
# Example: hail-storm.yaml
trigger:
  event_types: [hail, severe_thunderstorm]
  min_severity: moderate
  geography: el_paso_county_co
actions:
  gbp_post: templates/gbp-posts/storm-response-hail.md
  budget_multiplier: 1.5           # server cap: 2.0
  max_daily_budget: 150            # server cap: from vault
  ttl_hours: 24
  requires_approval: true          # server enforced: cannot be false without owner approval
rollback:
  baseline_budget_source: google-ads-campaign-daily  # where to read the pre-storm baseline
  dedupe_key: "nws-alert-id"       # prevent duplicate activations for same storm
  cooldown_hours: 12               # minimum gap between activations
  allowed_actions: [gbp_post, budget_adjust]  # whitelist — no ad creation
```

#### C-004: Research Codex's Source Docs (Codex)
**What:** Prep API integration specs for each platform
**Deliverables:**
- Google Ads API: auth flow, required scopes, rate limits, campaign read/write capabilities
- GBP API: post creation, review reply, insights read
- CallRail API: call log read, attribution, webhook setup
- NWS API: alert polling, geography filtering, event classification
**Purpose:** These specs become the contract for each MCP server build

---

### GATE-01: Market Reality Check (End of Week 1)
**Who decides:** Shane
**Inputs:**
- Ash's Google Ads market research (H-001B, using account from H-001A)
- Stephanie's Generac co-op findings (H-004)
- Facebook vs Nextdoor data (H-006)
- CallRail GO/NO-GO (H-005)
**Decisions:**
- [ ] Is Google Ads worth pursuing? At what budget?
- [ ] Is CallRail worth $45-95/mo?
- [ ] Facebook: reduce, maintain, or drop?
- [ ] Nextdoor: elevate priority?
- [ ] Generac co-op: available? How much? What qualifies?
**Output:** Updated priority list for Phase 1 builds

---

## Phase 1: First Builds (Weeks 2-3)
*Only what GATE-01 approved*

### HUMAN LANE

#### H-007: GBP Post Template Review (Stephanie)
**What:** Review and approve/edit Echo's GBP post templates
**Deliverable:** Approved templates committed to `templates/gbp-posts/`
**Time estimate:** 30-45 minutes

#### H-008: Landing Page Content (Stephanie)
**What:** Provide content for generator landing page
**Deliverables (commit to repo):**
- [ ] Key selling points for our generator service (why Phoenix Electric?)
- [ ] Customer testimonials or job photos we can use
- [ ] Service area specifics
- [ ] Any Generac assets from co-op program (H-004)
- [ ] Preferred call-to-action (call, form, both?)
**Time estimate:** 1-2 hours
**Note:** Echo builds the page. Stephanie provides the content and approves the result.

#### H-009: Google Ads Account Handoff (Ash — if GATE-01 approved)
**What:** Share Google Ads credentials/access with Echo for API integration
**Deliverables:**
- [ ] Developer token (once approved by Google)
- [ ] OAuth client ID + secret from Google Cloud Console
- [ ] Customer ID (the 10-digit number from Google Ads dashboard)
- [ ] MCC login-customer-id if using a manager account
**Security:** Credentials go into Azure Key Vault, not the repo. Ash provides to Shane, Shane vaults them.

### CODE LANE

#### C-005: Build mcp-gbp (Echo — FIRST PRIORITY)
**What:** MCP server for Google Business Profile automation
**Tools exposed:**
- `gbp-create-post` — create GBP post from template
- `gbp-list-reviews` — pull recent reviews
- `gbp-draft-review-reply` — draft reply (human approves before publish)
- `gbp-publish-review-reply` — publish approved reply
- `gbp-insights` — pull view/call/direction stats
**Approval gate:** Review replies require human approval until trust is earned
**Depends on:** H-003 (GBP audit, owner access confirmed)

#### C-006: Build mcp-callrail (Echo — if GATE-01 approved CallRail)
**What:** MCP server for call tracking integration
**Tools exposed:**
- `callrail-recent-calls` — list recent calls with source attribution
- `callrail-missed-calls` — missed calls needing follow-up
- `callrail-campaign-attribution` — which campaign drove which call
- `callrail-weekly-report` — formatted weekly summary
**Depends on:** H-005 GO decision + API key

#### C-007: Build marketing-orchestrator (Codex)
**What:** Plugin with slash commands for Ash
**Commands:**
- `/marketing-report` — pull from all active MCPs, format weekly summary
- `/marketing-post` — create GBP post from template library
- `/marketing-storm-check` — check NWS alerts, propose actions
- `/marketing-leads` — show recent leads with attribution
**Depends on:** At least C-005 being live

#### C-008: Generator Landing Page (Echo)
**What:** Build the landing page for generator services
**Depends on:** H-008 (Stephanie's content) + H-004 (Generac assets)
**Output:** Deployed page, URL committed to repo

### GATE-02: First Build Review (End of Week 3)
**Who decides:** Shane + Stephanie
**Inputs:**
- Working mcp-gbp with test posts
- Landing page draft
- CallRail integration (if approved)
- Orchestrator demo
**Decisions:**
- [ ] GBP automation: approve for regular use?
- [ ] Landing page: approve for deployment?
- [ ] Ready for Google Ads campaign launch?

---

## Phase 2: Ad Campaigns + Weather (Weeks 4-6)
*Only after Phase 1 is proven*

### HUMAN LANE

#### H-010: First Google Ads Campaign (Ash + Shane)
**What:** Launch first campaign based on market research
**Note:** LSA campaign CREATION is manual (API doesn't support it). Echo manages budget/status after launch.
**Deliverables:**
- [ ] Campaign created in Google Ads dashboard
- [ ] Initial keywords, ad copy, budget set
- [ ] Landing page URL pointed to C-008
- [ ] Tracking/conversion tags installed

#### H-011: Nextdoor Strategy (Stephanie)
**What:** Define Nextdoor posting cadence and content
**Context:** No campaign management API — this stays human-driven with possible export analysis
**Deliverables:**
- [ ] Weekly posting schedule
- [ ] Content themes per week
- [ ] Budget for Nextdoor ads (if any)

### CODE LANE

#### C-009: Build mcp-google-ads (Echo — platform connector, if GATE-01 approved)
**Tools exposed:**
- `google-ads-spend-today` — current daily spend
- `google-ads-campaign-status` — list campaigns with performance
- `google-ads-pause-campaign` — emergency pause (guarded)
- `google-ads-set-budget` — adjust daily budget (with max cap)
- `google-ads-keyword-performance` — top/bottom performing keywords
- `google-ads-conversions` — form fills, calls from ads, click-to-call (used by orchestrator lead reports)
- `google-ads-weekly-report` — formatted report
**Hard guardrails:**
- Maximum daily budget cap (set by Shane, cannot be overridden)
- No campaign creation via API (Google LSA limitation)
- All budget changes logged to LEDGER
- Approval required for any increase > 20%

#### C-010: Build weather-trigger-service (Codex)
**Components:**
- NWS alert poller (checks every 15 minutes)
- Severity classifier (maps weather events to storm profiles)
- Action proposer (reads storm profile YAML, proposes actions)
- Approval gate (sends proposal to Shane/Ash, waits for GO)
- Auto-rollback (TTL expires, revert budget to baseline)
**Config:** Storm profiles in `config/storm-profiles/` — CODEOWNERS protected, Shane approval required for changes
**Hard caps:** Server-side enforcement from vault. Profile YAML cannot override.

---

## Phase 3: Optimization + Reporting (Weeks 6-8)
*Tune what's working, cut what's not*

### HUMAN LANE

#### H-012: Weekly Review Cadence (Stephanie — 30 min/week)
**What:** Review `/marketing-report` output every Monday
**Actions:**
- Approve/adjust GBP post schedule
- Review any pending review replies
- Note conversion trends
- Flag anything that feels off

#### H-013: Generac Co-Op Reimbursement (Stephanie — monthly)
**What:** Submit ad spend receipts to Generac for reimbursement
**Depends on:** H-004 findings on what qualifies

### CODE LANE

#### C-011: Build nextdoor-adapter (Echo — LOW PRIORITY)
**What:** Ingest Nextdoor export data for reporting
**Reality:** No campaign management API. This is read-only analysis.
**Tools:**
- `nextdoor-import-data` — ingest CSV exports
- `nextdoor-performance` — analyze post/ad performance from exports

#### C-012: Reporting Dashboard Integration
**What:** Wire all MCP data into `/marketing-report` unified view
**Output:** One command gives Ash the full picture across all platforms

---

## Stephanie's Complete Task List (Sorted by Priority)

| # | Task | Time | When | Depends On |
|---|------|------|------|------------|
| H-003 | GBP Audit | 1-2h | Week 1 | Nothing — start immediately |
| H-004 | Generac RSM Call | 1-2 calls | Week 1 | Nothing — start immediately |
| H-006 | FB vs Nextdoor Data | 1h | Week 1 | Nothing — start immediately |
| H-007 | GBP Post Template Review | 30-45min | Week 2 | Echo delivers C-002 |
| H-008 | Landing Page Content | 1-2h | Week 2 | H-004 (Generac assets) |
| H-011 | Nextdoor Strategy | 1h | Week 4 | H-006 decision |
| H-012 | Weekly Review | 30min/wk | Ongoing | Phase 1 builds live |
| H-013 | Generac Reimbursement | 1h/mo | Monthly | H-004 |

**Total Week 1 effort: ~5-7 hours across all three tasks**
**Ongoing after launch: ~2 hours/week** (weekly review + occasional approvals)

## Ash's Complete Task List

| # | Task | Time | When | Depends On |
|---|------|------|------|------------|
| H-001A | Google Ads Account Bootstrap (no spend) | 30min | Week 1 | Nothing — start immediately |
| H-001B | Google Ads Market Research | 3-4h | Week 1 | H-001A (Keyword Planner access) |
| H-002 | Google Ads Full Setup (billing + dev token) | 1-2h | Week 1 | GATE-01 approval |
| H-005 | CallRail Decision (with Steph) | 30min | Week 1 | Nothing |
| H-009 | Google Ads Credential Handoff | 30min | Week 2 | H-002 |
| H-010 | First Campaign Launch | 2-3h | Week 4 | GATE-02 + C-009 |

**Total Week 1 effort: ~4-6 hours**
**After setup: monitoring via `/marketing-report`**

---

## GitHub Repo: `phoenix-marketing`

**Proposed contributors:**
| GitHub User | Role | Access | Writes To |
|-------------|------|--------|-----------|
| shane7777777777777 | Owner | Admin | Everything |
| stephanie (TBD) | Contributor | Write | `research/`, `decisions/`, `templates/` |
| ash (TBD) | Contributor | Write | `research/` |
| Echo + Codex | Automation | Write via commits | `mcp-servers/`, `landing-pages/`, `templates/` |

**Why GitHub for Stephanie:**
- Her research becomes permanent, version-controlled context
- Echo can read her Generac findings and build accordingly — no copy-paste relay
- Decisions are logged with timestamps — no "I thought we agreed to..." ambiguity
- Shane sees all activity in one place

**Stephanie onboarding:** GitHub Desktop (GUI, no terminal required). She commits markdown files to `research/`. That's it.

---

## Key Principle: No Money Moves Without a Gate

Every dollar of ad spend passes through a Shane-approved gate. The automation handles monitoring, reporting, and proposing — never spending. Even the weather trigger sends an approval request first. Trust is earned over time; guardrails can be relaxed as data proves the system works.

---

## Appendix A: LSA Operational SOP (Codex HIGH-4 Fix)

LSA (Local Services Ads) generates leads directly — phone calls and messages from Google. Unlike regular Google Ads, LSA leads require fast human response.

### Lead Response SLA
| Channel | Target Response Time | Owner |
|---------|---------------------|-------|
| LSA phone call | Answer live or return within 15 minutes | Whoever is on call (Stephanie/Shane) |
| LSA message | Reply within 1 hour during business hours | Stephanie |
| After hours | Next business day by 8 AM | Stephanie |

**Why this matters:** Google ranks LSA listings partly by responsiveness. Slow response = lower placement = wasted spend.

### Dispute/Refund Workflow
- LSA charges per lead, not per click. Bad leads (wrong service area, spam, non-electrical) can be disputed.
- **Owner:** Stephanie reviews leads weekly, disputes invalid ones within Google's 30-day window
- **Process:** Google Ads dashboard > Local Services > Leads > Mark as "Not valid" with reason
- **Track:** Log disputed leads and outcomes in `research/lsa-dispute-log.md`

### Storm Surge Staffing
- When weather trigger activates and LSA budget increases, call volume spikes
- **Overflow process:** If primary can't answer, calls go to voicemail with storm-specific greeting > Stephanie/Shane triages within 1 hour
- **Kill switch:** If nobody can handle the volume, Echo pauses the LSA budget increase immediately via mcp-google-ads

### LSA SOP Owner: Stephanie
Stephanie owns the LSA operational process. Echo automates budget/status monitoring. Stephanie handles the human side — answering, dispatching, disputing.

---

## Appendix B: Security — Credentials & Access (Codex HIGH-5 Fix)

### Credential Inventory
| Credential | Vault Location | Owner | Rotation |
|-----------|---------------|-------|----------|
| Google Ads OAuth Client ID | Azure Key Vault | Shane | Annually or on compromise |
| Google Ads OAuth Client Secret | Azure Key Vault | Shane | Annually or on compromise |
| Google Ads Developer Token | Azure Key Vault | Shane | Does not expire (revoke on compromise) |
| GBP API credentials | Azure Key Vault | Shane | Annually |
| CallRail API Key | Azure Key Vault | Shane | Annually or on compromise |
| NWS API | None needed | N/A | Public API, no auth |

### Least-Privilege Principles
- MCP servers get read-only access by default
- Write actions (budget changes, post publishing) require explicit tool-level approval gates
- No MCP server stores credentials — they read from vault at startup
- Service accounts get minimum required scopes (e.g., Google Ads: `adwords` scope only, not `admin`)

### Break-Glass Procedure
If credentials are compromised:
1. Revoke in Google Cloud Console / CallRail dashboard immediately
2. Rotate in Azure Key Vault
3. Restart affected MCP servers to pick up new credentials
4. Log incident in LEDGER
5. Review access logs for unauthorized actions

### Offboarding
If a contributor (Stephanie, Ash) leaves:
1. Remove GitHub collaborator access
2. Revoke any direct platform access (Google Ads, CallRail)
3. Rotate any credentials they had direct access to
4. Update CODEOWNERS

---

## Appendix C: Stop/Kill Criteria (Codex Missing-5 Fix)

### When to Kill a Campaign
| Signal | Threshold | Action |
|--------|-----------|--------|
| CPL exceeds 2x market average | After 2 weeks of data | Pause campaign, review targeting |
| Zero conversions | After $500 spend | Pause, review landing page + keywords |
| Budget burn rate > 150% of daily target | Any day | Auto-alert via mcp-google-ads, manual review |
| Negative ROI after 30 days | End of month 1 | Shane decides: optimize or kill |
| Lead quality < 30% valid | After 20+ leads | Review targeting, consider LSA disputes |

### Platform-Level Kill Switches
- **Google Ads:** mcp-google-ads `pause-campaign` tool — instant, logged
- **LSA:** Status change via API (pause/enable only — cannot delete)
- **GBP posts:** mcp-gbp can delete/unpublish — but prefer editing over deleting
- **Weather trigger:** TTL auto-expires. Manual kill via storm profile disable.
- **All platforms:** Shane can say "kill everything" and Echo pauses all active campaigns in one orchestrator command

### Monthly Spend Review
First Monday of each month, `/marketing-report` generates full-month summary. Shane reviews. Any platform not meeting minimum ROI threshold gets discussed for continuation.
