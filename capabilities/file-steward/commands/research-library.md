---
description: "Browse and manage the research library — view index, add findings from haiku research agents"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Research Library Browser

Browse the research library index and manage entries.

## Instructions

1. **Load the index:**
   - Read: `~/Phoenix_Local/_GATEWAY/RESEARCH_LIBRARY/LIBRARY_INDEX.md`
   - Present entry count, topics covered, last updated

2. **Show library contents:**
   - Run: `ls -lh ~/Phoenix_Local/_GATEWAY/RESEARCH_LIBRARY/*.md`
   - Group by topic prefix

3. **Present options:**
   - Browse a specific topic
   - Add a new finding (dispatch file-clerk agent to write)
   - Dispatch a haiku research agent on a new topic

## Adding New Findings

When adding:
1. Collect: topic, subject, key findings, sources
2. Generate filename: `research__<topic>__<subject>__<date>.md`
3. Confirm with Shane before writing
4. Update LIBRARY_INDEX.md after adding

## Rules

- **Check before researching** — topic may already exist in the library
- **Haiku agents for research** — never use Opus for research tasks
- **Every finding gets indexed** — no orphan research files
