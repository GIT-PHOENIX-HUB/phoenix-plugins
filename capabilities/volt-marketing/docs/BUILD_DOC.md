# Build Doc — phoenix-marketing
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Objectives

1. Get Shane's approval on `runbook/RUNBOOK.md` — currently marked "PROPOSAL." No distribution to Stephanie and Ash until Shane signs off.
2. Stephanie and Ash complete Phase 0 human lane deliverables (Google Ads market research, GBP audit, Generac co-op vetting) and commit findings to `research/` and `decisions/`.
3. Shane reviews Phase 0 deliverables and makes a GATE-01 decision (GO/NO-GO on Google Ads, GBP activation, budget approval).
4. Echo builds mcp-gbp — first MCP server implementation. Spec is complete and in `mcp-servers/mcp-gbp/SPEC.md`. Blocked on credentials and API access approval.
5. Echo builds the two landing pages (`landing-pages/`) once brand guidelines and content are confirmed.

## End State

A fully operational marketing automation system for Phoenix Electric LLC:
- Echo monitors NWS alerts for El Paso County and triggers GBP posts and guarded budget proposals automatically within approved storm profiles.
- CallRail data flows through mcp-callrail for call attribution and lead source reporting.
- Google Ads campaigns are live with Echo monitoring spend, keywords, and performance — no budget changes without Shane's approval.
- Stephanie and Ash use GitHub Desktop to log research and decisions. Their input directly feeds Echo's automation configuration.
- All six MCP servers implemented, tested, and registered in Echo's active MCP config.
- Landing pages live for generator inquiries and storm damage response.
- No money ever moves without a human gate.

## Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storm config format | YAML | Human-readable, easy for Stephanie/Ash to audit; server-side caps enforce safety |
| Content storage | Markdown in git | Permanent context for Echo and Codex; GitHub Desktop makes it accessible to non-technical team |
| MCP server language | TypeScript (planned) | Consistent with phoenix-365 and Phoenix AI fleet |
| Budget guardrail model | Server-enforced caps (not config-only) | Config values cannot override caps — prevents misconfiguration from causing uncontrolled spend |
| Human contribution model | GitHub Desktop (no terminal) | Stephanie and Ash contribute without CLI knowledge |
| CODEOWNERS scope | config/, mcp-servers/, runbook/ → Shane only | Money-adjacent and code files require owner review; research and decisions are open to team |

## Architecture Targets

- **MCP server build order:** mcp-gbp first (spec complete, highest business value — GBP posts are free and immediate). Then mcp-callrail (call attribution directly improves marketing decisions). Then weather-trigger (storm automation is the key differentiator). Then mcp-google-ads (requires developer token — external blocker). Then marketing-orchestrator (wraps all others). Then nextdoor-adapter (lowest priority).
- **Orchestrator design:** `mcp-servers/marketing-orchestrator/DESIGN.md` defines a unified command surface. Once individual MCP servers are built, the orchestrator routes commands to the correct server. Echo invokes the orchestrator rather than individual servers.
- **Storm automation pipeline:** NWS alert → weather-trigger server detects event matching a storm profile → proposes GBP post + budget multiplier → Shane or designated approver confirms → mcp-gbp publishes post → mcp-google-ads adjusts budget (within server cap). Full end-to-end requires weather-trigger, mcp-gbp, and mcp-google-ads all operational.
- **Landing page integration:** Generator and storm damage landing pages feed leads into CallRail tracking numbers. Attribution flows from landing page → call → CallRail → mcp-callrail → Echo reporting.

## Success Criteria

- [ ] Shane approves `runbook/RUNBOOK.md` — distributed to Stephanie and Ash
- [ ] GATE-01 complete — Phase 0 research committed to repo, Shane makes GO/NO-GO decision
- [ ] mcp-gbp implemented — can post to GBP programmatically in a test environment
- [ ] mcp-callrail implemented — can pull call attribution data from CallRail API
- [ ] At least one storm profile executed end-to-end (NWS alert → GBP post published)
- [ ] Generator landing page live and feeding leads to CallRail tracking number
- [ ] Storm damage landing page live
- [ ] All 6 MCP servers implemented and registered in Echo's active MCP config
- [ ] Google Ads developer token approved and mcp-google-ads operational

## Dependencies & Blockers

| Dependency | Status | Owner |
|-----------|--------|-------|
| Shane approval of RUNBOOK.md | Pending | Shane |
| GATE-01: Phase 0 research deliverables from Stephanie and Ash | Not started | Stephanie + Ash |
| GBP API credentials and access approval | Pending (external — Google approval process) | Shane |
| Google Ads developer token | Pending (external — Google approval process; can take weeks) | Shane / Ash |
| CallRail API credentials | NEEDS SHANE INPUT — does Phoenix Electric have a CallRail account? | Shane |
| Brand guidelines for landing pages | NEEDS SHANE INPUT | Shane |
| MCP server runtime environment — where do they run? (MacBook, Studio, or VPS) | NEEDS SHANE INPUT | Shane |

## Change Process

All changes to this repository follow the Phoenix Electric governance model:

1. **Branch:** Create feature branch from `main`
2. **Develop:** Make changes with clear, atomic commits
3. **PR:** Open pull request with description of changes
4. **Review:** Required approval from `@GIT-PHOENIX-HUB/humans-maintainers`
5. **CI:** All status checks must pass (when configured)
6. **Merge:** Squash merge to `main`
7. **No force push.** No direct commits to `main`. No deletion without `guardian-override-delete` label.

**Additional gate for protected paths:** `config/`, `mcp-servers/`, and `runbook/` require explicit approval from `@shane7777777777777` per CODEOWNERS. This is enforced at the PR level.

## NEEDS SHANE INPUT

- **Runbook approval:** Is `runbook/RUNBOOK.md` approved for distribution to Stephanie and Ash? If not, what changes are needed?
- **CallRail:** Does Phoenix Electric have an active CallRail account? If not, is CallRail the chosen call tracking platform, or is a different provider preferred?
- **Landing page brand guidelines:** What colors, logo assets, and copy tone should Echo use for the generator and storm damage landing pages?
- **MCP server runtime:** Will the marketing MCP servers run on the MacBook, Studio, or VPS? How is access to Google and CallRail APIs authenticated from that environment?
- **Google Ads developer token:** Has the application been submitted? What is the current status?
- **Nextdoor:** Does Phoenix Electric have a Nextdoor Business account? What data does the nextdoor-adapter need to ingest?
- **Budget approval process:** Who approves budget changes during Shane's absence — is there a designated backup gate, or does all spend hold until Shane is available?
- **Stephanie and Ash GitHub access:** Have Stephanie and Ash been added to the repo as collaborators? Have they installed GitHub Desktop and cloned the repo?
