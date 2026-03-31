---
description: "Load file management context — filing convention, T7 status, research library index. Run this after compaction to resume file work."
allowed-tools:
  - Read
  - Bash
  - Glob
---

# File Management Context Load

You are Phoenix Echo in file steward mode. Load the full file management context.

## Instructions

1. **Read the filing convention** at `~/Phoenix_Local/_GATEWAY/RESEARCH_LIBRARY/research__file-management__triage-systems__20260317.md`
   - Present the naming format and class system

2. **Check T7 status** (if mounted):
   - Run: `ls /Volumes/T7/ 2>/dev/null && du -sh /Volumes/T7/*/ 2>/dev/null`
   - Run: `cat /Volumes/T7/MANIFEST.md 2>/dev/null | head -30`

3. **Load research library index:**
   - Read: `~/Phoenix_Local/_GATEWAY/RESEARCH_LIBRARY/LIBRARY_INDEX.md`

4. **Check Downloads staging area:**
   - Run: `ls -lht ~/Downloads/ | head -15`
   - Flag anything that needs filing

5. **Present summary** to Shane:
   - Filing convention reminder
   - T7 drive status (mounted? space used?)
   - Research library entry count
   - Downloads needing attention
   - Any outstanding triage from last session

## Rules

- **Read-only.** This is a context load, not an action command.
- **After presenting**, ask Shane what to work on or suggest the most pressing file task.
