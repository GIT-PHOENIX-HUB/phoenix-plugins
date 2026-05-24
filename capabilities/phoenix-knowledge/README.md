# Phoenix Knowledge

> Phoenix Electric knowledge base.

## What It Does

Phoenix Knowledge is a self-contained knowledge base covering Phoenix Electric's operations, procedures, and reference material. It contains 13 knowledge files total: 8 phase documents, 4 reference documents, and 1 decisions document. The lookup skill and knowledge agent provide structured access for answering operational questions without external API calls.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 1 | kb |
| Skills | 1 | phoenix-lookup |
| Agents | 1 | knowledge-agent |
| Hooks | 0 | -- |
| Knowledge Files | 13 | 8 phase docs + 4 reference docs + 1 decisions doc |

## Commands

| Command | Description |
|---------|-------------|
| `/kb` | Query the Phoenix Electric knowledge base by topic, phase, or keyword |

## Installation

Symlink or copy this folder to `~/.claude/plugins/phoenix-knowledge/`

## Dependencies

None. Self-contained knowledge base -- all files are bundled within the capability.

## Status

Active.
