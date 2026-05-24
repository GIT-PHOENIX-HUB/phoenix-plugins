# Repeatable Swarm Kit

This folder is the reusable home for:

1. The verified swarm pattern that already worked.
2. The template set we can reuse without rebuilding the system from scratch.
3. The future scripts area, which stays doc-only until Shane approves wiring.

## Purpose

The goal is to stop recreating the same coordination system every time a multi-agent push starts.

This kit separates:

- `01_verified_pattern/`: what was proven to work
- `02_templates/`: reusable docs we can stamp into a mission folder or repo
- `03_scripts/`: reserved for future automation after review

## Review-First Boundary

This branch intentionally stops at the template layer.

What is included now:

- source-of-truth references
- distilled operating rules
- canonical template docs
- scripts placeholder only

What is not included yet:

- bootstrap scripts
- watchers
- ledger auto-seeding
- agent launch automation
- repo mutation beyond this scaffold

## Folder Map

```text
docs/repeatable-swarm-kit/
├── README.md
├── 01_verified_pattern/
│   ├── SOURCE_DOC_INDEX.md
│   └── WORKING_PATTERN_DISTILLED.md
├── 02_templates/
│   ├── ADVERSARIAL_VERDICT_TEMPLATE.md
│   ├── AGENT_BRIDGE_LEDGER_TEMPLATE.md
│   ├── INTEGRATION_GATE_TEMPLATE.md
│   ├── MISSION_REPORT_TEMPLATE.md
│   ├── SHARED_OPS_LEDGER_TEMPLATE.md
│   ├── SWARM_MASTER_GAMEPLAN_TEMPLATE.md
│   └── SWARM_TRIGGER_PACKET_TEMPLATE.md
└── 03_scripts/
    └── README.md
```

## How To Use

1. Review `01_verified_pattern/` first.
2. Approve any changes to the operating model.
3. Copy or adapt the templates in `02_templates/`.
4. Only after approval, add automation into `03_scripts/`.

## Current Source Basis

The current verified pattern was pulled from:

- `PHOENIX_UNIFIED_PROD_REPO` swarm trigger packet
- `PHOENIX_UNIFIED_PROD_REPO` master game plan
- canonical bridge ledger
- shared ops ledger
- adversarial verdict
- integration gate verdict

That source map is documented in `01_verified_pattern/SOURCE_DOC_INDEX.md`.
