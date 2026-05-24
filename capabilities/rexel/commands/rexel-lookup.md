---
description: "Search Rexel purchase history by SKU, item number, description, or brand"
allowed-tools:
  - "mcp__rexel__*"
---

# Rexel Lookup

Search Phoenix Electric's Rexel purchase history. Takes a search query and finds matching SKUs.

## Instructions

Use `rexel_lookup` with the user's query. If they provide a specific SKU, use `rexel_get_sku` for full detail instead.

Examples:
- `/rexel-lookup romex` → searches for all Romex wire SKUs
- `/rexel-lookup 14-2` → searches for 14-2 gauge items
- `/rexel-lookup Southwire` → searches by brand
- `/rexel-lookup GFCI` → searches for GFCI devices

If no results found, suggest broadening the search or trying alternate terms (e.g., "receptacle" instead of "outlet").

Present results as a clean table. For items with high spend, note their significance.
