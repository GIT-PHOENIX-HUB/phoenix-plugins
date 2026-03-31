---
name: rexel-operations
description: This skill should be used when the user asks about "Rexel prices", "what did we pay for", "material cost", "vendor cost", "margin analysis", "Rexel SKU", "pricebook sync", "pricebook gap", "how much did we spend on", "purchase history", "top materials", "what do we buy from Rexel", or any Rexel vendor/material pricing task. Provides complete Rexel purchase history lookup, margin analysis, and pricebook gap analysis for Phoenix Electric.
---

# Rexel Operations

Complete operational skill for Phoenix Electric's Rexel purchase history. Covers SKU lookup, pricing, margin analysis, spend tracking, and pricebook synchronization across 1,600+ SKUs and $1M+ in historical invoice data.

## Data Sources

- **Rexel SKU Data:** 1,624 unique SKUs processed from 10 CSV invoice batches (11,672 deduped line items)
- **Total Spend:** $1,011,282 across all invoices
- **Pricebook Cross-Reference:** 1,040 items across 7 tiers (NC, RM, COM, COMRM, FP, SMP, GEN)
- **Date Range:** Historical invoices through 2025-12-17

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `rexel_lookup` | Search by SKU, item #, description keyword, or brand |
| `rexel_get_sku` | Full detail for one SKU — price range, history, jobs, pricebook match |
| `rexel_margin_check` | Cross-ref: Rexel cost vs pricebook sell prices (all 6 price points) |
| `rexel_top_items` | Top N by frequency, quantity, or spend |
| `rexel_category_summary` | Spend by category (Wire, Lighting, Breakers, etc.) |
| `rexel_build_sync_report` | Full comparison: all SKUs vs pricebook with gap analysis |

## Common Workflows

### Quick Pricing Lookup
User asks: "What did we pay for 14-2 Romex?" or "How much is RMX142WG250CL?"
1. `rexel_lookup` with the search term
2. If one result, follow up with `rexel_get_sku` for full detail
3. Present: last price, price range, purchase count, total spend

### Margin Analysis
User asks: "What's our margin on GFCI outlets?" or "Are we making money on Romex?"
1. `rexel_margin_check` with the search term
2. Shows: Rexel cost vs pricebook material cost vs list price vs margin %
3. Flag low margins (<30%) and items not in pricebook

### Pricebook Gap Analysis
User asks: "What Rexel items aren't in our pricebook?" or "Run a sync report"
1. `rexel_build_sync_report` for full analysis
2. Shows: missing items ranked by spend, low margin items, category breakdown
3. Suggest top items to add to pricebook

### Top Items / Spend Analysis
User asks: "What do we buy most from Rexel?" or "Show me our top wire purchases"
1. `rexel_top_items` with appropriate sort and category filter
2. `rexel_category_summary` for overall breakdown
3. Present insights about spending patterns

## Tool Conventions

- **All tools are read-only** — no write operations on Rexel data
- Prices are per-unit with 5-decimal precision (e.g., $0.28352/FT)
- SKU format varies: alphanumeric codes from Rexel's catalog
- Unit types: EA (each), FT (feet), CL (coil), BX (box)
- Job references come from PO numbers on invoices

## Additional Resources

### Reference Files
- **`references/sku-reference.md`** — SKU format conventions and search tips
- **`references/margin-rules.md`** — Phoenix Electric markup and margin targets
- **`references/data-sources.md`** — CSV source files and ETL process
- **`references/future-phases.md`** — SFTP auto-fetch, Firecrawl photos, requisitions

## Important Notes

- **Phoenix Electric is an ELECTRICAL company, NOT HVAC**
- Rexel is the primary electrical materials distributor
- The pricebook has 7 tiers for different customer types (New Construction, Remodel, Commercial, etc.)
- Material costs from Rexel feed into the pricebook's materialCost field
- Margin = (listPrice - rexelCost) / listPrice
