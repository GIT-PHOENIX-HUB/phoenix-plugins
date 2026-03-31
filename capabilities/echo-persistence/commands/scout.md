---
description: "Scout for new plugins, skills, and capabilities across all marketplaces"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Skill Scout

Discover what plugins and capabilities are available but not yet installed.

## Instructions

1. Dispatch the `skill-scout` agent to scan all marketplaces
2. The agent will:
   - Read current installed plugins from `~/.claude/plugins/installed_plugins.json`
   - Scan marketplace directories for available-but-not-installed plugins
   - Evaluate each discovery for Phoenix Electric business value
   - Check if capabilities are already covered by existing plugins
3. Present findings with clear INSTALL / SKIP / EVALUATE recommendations
4. Highlight the top 3 most valuable finds

## Arguments

If the user provided arguments ($ARGUMENTS), use them to narrow the search:
- "slack" → focus on communication/messaging plugins
- "testing" → focus on testing/QA plugins
- "all" → full marketplace scan (default)
