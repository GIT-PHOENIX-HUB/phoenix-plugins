---
description: "Margin analysis — compare Rexel vendor costs against pricebook sell prices"
allowed-tools:
  - "mcp__rexel__*"
  - "mcp__pricebook__*"
---

# Rexel Margin Analysis

Cross-reference Rexel purchase costs with Phoenix Electric's pricebook sell prices.

## Instructions

Use `rexel_margin_check` with the user's query. This shows:
- Rexel cost vs pricebook material cost vs list price
- Margin percentage for each item
- Items NOT in the pricebook (gaps)

If the user asks about a specific SKU, use `rexel_get_sku` first for full detail, then `pricebook_search` to find the matching pricebook entry.

Flag any items with margin below 30% as needing attention. Items not in the pricebook should be flagged as potential additions.

For a full comparison, suggest using `/rexel-sync` instead.
