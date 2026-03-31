---
description: "Start a file triage session on a directory — scan, categorize, identify duplicates and files needing organization"
argument-hint: "<DIRECTORY_PATH>"
allowed-tools:
  - Bash
  - Glob
  - Read
---

# File Triage Session

Scan a directory, categorize files, identify what needs attention.

## Arguments

Target directory: $ARGUMENTS
If empty, ask the user which directory to triage.

## Instructions

1. **Validate** the directory exists
2. **Scan** all files (non-recursive first, then subdirectories):
   - List files with sizes and dates
   - Count total files and total size
3. **Categorize** each file:
   - **Compliant** — matches `class__scope__subject__date.ext` convention
   - **Needs naming** — doesn't match convention
   - **Duplicate candidate** — similar name/size to another file
   - **Stale** — not modified in 90+ days
   - **Unknown** — needs Shane's decision
4. **Present** the triage report:
   - File count per category
   - Largest files (top 10)
   - Oldest files (top 10)
   - Suspected duplicates
5. **Ask** Shane which category to address first

## Rules

- **Non-destructive.** Scan and report only. No moving, no renaming.
- **Dispatch file-clerk agent** for actual operations after Shane approves.
- **One directory at a time.** Don't recurse into subdirectories without asking.
