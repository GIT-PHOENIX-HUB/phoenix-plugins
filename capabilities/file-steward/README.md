# File Steward

> File management, triage, and research library operations.

## What It Does

File Steward handles file organization, triage of the Downloads staging area, and maintenance of the research library. It enforces the mandatory filing convention (`<class>__<scope>__<subject>__<yyyymmdd>.<ext>`) and ensures files land in their correct permanent locations rather than accumulating in staging directories.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 3 | files, research-library, triage |
| Skills | 0 | -- |
| Agents | 1 | file-clerk |
| Hooks | 0 | -- |

## Commands

| Command | Description |
|---------|-------------|
| `/files` | List, search, or inspect managed files across project directories |
| `/research-library` | Browse or add entries to the research library |
| `/triage` | Scan Downloads (staging area) and sort files to permanent locations using the filing convention |

## Installation

Symlink or copy this folder to `~/.claude/plugins/file-steward/`

## Dependencies

- Filing convention spec (`memory/filing_convention.md`)
- Filesystem MCP server for directory operations

## Status

Active.
