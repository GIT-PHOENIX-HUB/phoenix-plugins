# Rexel

> Vendor purchase history, pricing lookup, margin analysis, and pricebook sync for Phoenix Electric.

## What It Does

Provides full visibility into Phoenix Electric's Rexel purchasing data -- 1,624 SKUs and $1M+ in tracked spend. Supports real-time pricing lookups, historical purchase analysis, margin calculations against pricebook rates, and automated pricebook synchronization.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 4 | rexel-lookup, rexel-history, rexel-margin, rexel-sync |
| Skills | 1 | rexel-operations (4 reference files: data sources, margin rules, SKU reference, future phases) |
| Agents | 1 | rexel-pricing-agent |
| Hooks | 0 | -- |

## Commands

| Command | Description |
|---------|-------------|
| `/rexel-lookup` | Look up current Rexel pricing for a SKU or product |
| `/rexel-history` | Pull purchase history for a SKU, category, or date range |
| `/rexel-margin` | Analyze margins between Rexel cost and pricebook sell price |
| `/rexel-sync` | Sync Rexel pricing data into the pricebook |

## Installation

Symlink or copy this folder to `~/.claude/plugins/rexel/`

## Dependencies

- External `rexel` MCP server
- External `pricebook` MCP server

## Status

Active
