---
description: "Full Rexel-to-pricebook sync report — gap analysis, low margins, missing items"
allowed-tools:
  - "mcp__rexel__*"
  - "mcp__pricebook__*"
---

# Rexel Pricebook Sync

Generate a comprehensive sync report comparing all Rexel purchase history against the pricebook.

## Instructions

Use `rexel_build_sync_report` to generate the full report. This shows:
1. **Gap Analysis** — SKUs bought from Rexel with no pricebook match, ranked by spend
2. **Low Margin Items** — Matched items with margin below 40%
3. **Category Breakdown** — Missing items grouped by category

After presenting the report, ask Shane:
- "Want me to look up any of these items in detail?"
- "Should I check the pricebook for similar items that might match?"
- "Want me to flag the top gaps for pricebook addition?"

**Important:** This is a read-only analysis. Do NOT create or modify pricebook entries without explicit confirmation.
