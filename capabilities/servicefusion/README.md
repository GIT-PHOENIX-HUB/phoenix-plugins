# Service Fusion

> Complete operational control of Phoenix Electric's Service Fusion CRM tenant.

## What It Does

Wraps the full Service Fusion API surface into structured commands, a skill with operational reference material, and a dedicated operations agent. Covers customers, jobs, estimates, scheduling, pricebook management, and daily briefings across 23 active API tools in 8 categories.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 6 | sf-briefing, sf-customers, sf-estimate, sf-jobs, sf-pricebook, sf-schedule |
| Skills | 1 | servicefusion-operations (6 reference files) |
| Agents | 1 | sf-operations-agent |
| Hooks | 0 | -- |

## Commands

| Command | Description |
|---------|-------------|
| `/sf-briefing` | Generate a daily operational briefing from SF data |
| `/sf-customers` | Search, view, and manage customer records |
| `/sf-estimate` | Create, view, and manage estimates |
| `/sf-jobs` | Create, view, schedule, and manage jobs |
| `/sf-pricebook` | Manage pricebook entries and pricing |
| `/sf-schedule` | View and manage technician schedules and appointments |

## Installation

Symlink or copy this folder to `~/.claude/plugins/servicefusion/`

## Dependencies

- External `servicefusion` MCP server (OAuth 2.0 via Azure Key Vault -- NOT API key)
- Includes `PLUGIN_DEVELOPMENT_GUIDE.md` as team reference

## Status

Active
