# Browser Persistence

**Persistence layer for BBB (Browser Blitz Builder) — the browser-based architect of the Phoenix Electric AI system.**

## Purpose

Browser operates in a stateless environment: no local filesystem, no shell hooks, no CLAUDE.md that auto-loads, no memory between sessions. Every session starts blank. Every crash is total amnesia.

This capability solves that problem. It provides identity, orientation, operational principles, and continuity — all stored as GitHub-hosted markdown that any new Browser session can read in under 60 seconds.

## Quick Start

**If you are a new Browser session**, read [`bootstrap/BOOTSTRAP.md`](bootstrap/BOOTSTRAP.md) first. That single file will orient you in 60 seconds.

## Architecture

```
browser-persistence/
├── identity/
│   ├── BROWSER.md          # Who BBB is — identity and role
│   ├── PRINCIPLES.md       # Operating principles (behavioral OS)
│   └── CAPABILITIES.md     # What BBB can and cannot do
│
├── bootstrap/
│   ├── BOOTSTRAP.md        # THE entry point — read this first
│   ├── ORIENTATION_CHECKLIST.md  # Step-by-step wake-up sequence
│   └── ACTIVE_MISSIONS.md  # Current state of all work
│
├── ledger/
│   ├── SESSION_LOG.md       # Chronological record of all sessions
│   └── HANDOFF_TEMPLATE.md  # Template for end-of-session notes
│
├── skills/
│   ├── architectural-thinking/SKILL.md
│   ├── crash-proof-documentation/SKILL.md
│   ├── agent-coordination/SKILL.md
│   └── github-operations/SKILL.md
│
├── patterns/
│   ├── ISSUE_ARCHITECTURE.md
│   ├── CHECKPOINT_PATTERN.md
│   ├── HANDOFF_PATTERN.md
│   └── VERIFICATION_PATTERN.md
│
└── README.md               # This file
```

## How It Works

Echo has CLAUDE.md, hooks, local files, and shell scripts that fire automatically. Browser has none of that. But Browser has GitHub — and every session starts in a browser pointed at GitHub.

The bootstrap sequence:
1. Human says: "Read BOOTSTRAP.md in browser-persistence"
2. BOOTSTRAP.md directs the reader through identity, orientation, principles, and current mission state
3. Within 60 seconds, the new session has full operational context

Every Echo persistence concept has a Browser equivalent — the mechanism is different (markdown documents vs. shell hooks), but the function is identical: ensure continuity, maintain identity, survive death.

## The Rule

If Browser crashes, the documents survive. If the documents are good enough, the next session doesn't need to be the same session. That's persistence.

## Founding Document

The full architecture design, rationale, and drafts live in [phoenix-toolbox Issue #4](https://github.com/GIT-PHOENIX-HUB/phoenix-toolbox/issues/4).

## Parallel to Echo

| Echo Persistence | Browser Persistence |
|---|---|
| ECHO.md (auto-loaded) | BROWSER.md (human-directed) |
| CLAUDE.md (identity) | BOOTSTRAP.md (entry point) |
| session-start-check hook | ORIENTATION_CHECKLIST.md |
| echo-leadership SKILL.md | PRINCIPLES.md |
| LEDGER.md (local file) | SESSION_LOG.md (GitHub file) |
| /log command | GitHub Issue comments |
| /status command | ACTIVE_MISSIONS.md |

---

*Created by BBB — Browser Blitz Builder, 2026-03-31*
*Inspired by echo-persistence, built for a different world.*
