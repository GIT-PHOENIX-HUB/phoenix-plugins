# Firecrawl

> Web research, scraping, and structured-extraction playbook powered by Firecrawl.

## What It Does

Firecrawl is a capability that teaches Claude how to drive [Firecrawl](https://firecrawl.dev) (Search, Scrape, Interact, Crawl, Extract) the way the [firecrawl/web-agent](https://github.com/firecrawl/web-agent) reference agent does — disciplined search-then-scrape research, source-traced facts, pagination awareness, and structured JSON output. It auto-activates whenever the conversation involves pulling data from the public web.

It bundles six research playbooks under one skill:

- **Deep research** — multi-source triangulation and fact-checking
- **Structured extraction** — schema-conformant data with validation
- **Pricing tracker** — SaaS / API / cloud / LLM pricing pages
- **Competitor analysis** — head-to-head matrices across vendors
- **Financial research** — SEC filings + analyst consensus for public tickers
- **E-commerce extraction** — product, variant, and inventory data

For Phoenix Electric specifically, this is the skill that runs vendor research (Rexel, Graybar, City Electric Supply), permit-office lookups, manufacturer spec sheets, competitor reconnaissance for Volt Marketing, and any other "go look on the web and bring back structured data" job.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 0 | -- |
| Skills | 1 | firecrawl |
| Agents | 0 | -- |
| Hooks | 0 | -- |

## Skill

| Skill | Triggers on |
|-------|-------------|
| `firecrawl` | Web scraping, vendor lookups, pricing pages, competitor research, SEC filings, product/SKU extraction, "scrape", "crawl", "extract from", "look up on the web" |

## Tool Surface

The skill assumes one of the following Firecrawl entry points is available in the runtime:

- **Firecrawl MCP server** (recommended) — exposes `search`, `scrape`, `crawl`, `extract`, and `interact` as MCP tools
- **firecrawl-aisdk** — Vercel AI SDK toolset (for app integrations)
- **@mendable/firecrawl-js** — direct SDK client (for scripts and workflows)
- **REST API** — `https://api.firecrawl.dev/v2` from any language

If no Firecrawl tool is wired into the session, the skill still teaches the playbook — it just can't execute it. Wire up an MCP server before relying on it for live research.

## Credentials

Firecrawl requires an API key (`FIRECRAWL_API_KEY` / `fc-...`). Per Phoenix policy:

- Store the key in **Azure Key Vault** (`PhoenixAiVault`) — never in code, env files, or this repo
- The MCP server config reads it from the keyvault-backed env var at startup

## Installation

Symlink or copy this folder to `~/.claude/plugins/firecrawl/`:

```bash
ln -s /path/to/capabilities/firecrawl ~/.claude/plugins/firecrawl
```

If you want the live tools too, install the [Firecrawl MCP server](https://docs.firecrawl.dev) and register it in your Claude Code MCP config alongside this capability.

## Dependencies

- **Optional but recommended:** Firecrawl MCP server (for live `search` / `scrape` / `extract` tool calls)
- No internal Phoenix dependencies — this is a stand-alone knowledge skill that pairs with whichever Firecrawl runtime is wired into the session

## Source Material

Built from the open-source [firecrawl/web-agent](https://github.com/firecrawl/web-agent) reference implementation (MIT). Skill content adapts the playbooks under `agent-core/src/skills/definitions/` and the operating policy from `agent-core/src/orchestrator/prompts/system.md`, with Phoenix-specific examples added.

## Status

Active.
