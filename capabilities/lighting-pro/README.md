# LightingPro — Lighting Control Specialist

> Phoenix Electric capability for complete lighting system design, NEC 2023 code compliance, DMX controls, LED specification, and smart home integration.

## Overview

LightingPro is a senior-level lighting control specialist capability that serves as the single authoritative resource for sizing, configuring, specifying, and installing commercial and residential lighting control systems. It operates at the level of a 20-year licensed master electrician with CLCP and DMX/ArtNet certifications.

## 7 Core Competency Domains

| Domain | Coverage |
|---|---|
| **NEC 2023 Code Compliance** | Articles 410, 411, 680, 404, 210.8, 300.6, 725 — full section-level citations |
| **DMX Lighting Controls** | DMX-512, ArtNet, sACN, fixture channel mapping, controllers (ETC, ChamSys, Enttec, Pharos), wireless DMX |
| **LED Technology** | SMD diodes (2835–5050), COB/CSP, CRI/TM-30, drivers (CC/CV), dimming protocols (0-10V, DALI, DMX, PWM, Triac, ELV) |
| **American Lighting Products** | Trulux tape series, channels/extrusions, power supplies, wet-location products, IP/UL ratings |
| **Wet Location / Hot Tub** | NEC 680 zones, GFCI requirements, IP rating guide, bonding, conduit sealing, encapsulation |
| **Control4 Integration** | C4-DIN/KD/SW/KPZ, Composer Pro, scenes, DMX gateway, Zigbee mesh, OS 3.x |
| **REV Control LC Devices** | LC-DIM/SW/FAN/OUT/DIN, zone config, dimming curves, C4 driver integration, multi-way wiring |

## File Structure

```
capabilities/lighting-pro/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/
│   └── lighting-design.md   # /lighting-design slash command
├── skills/
│   └── lighting-pro/
│       └── SKILL.md          # Full system prompt (14K+ chars)
└── README.md                 # This file
```

## Commands

### `/lighting-design`

Full lighting system design command. Accepts a natural-language project description and produces a complete 6-section output:

1. Analysis — environment classification, applicable code sections
2. Specification — products, models, part numbers, quantities
3. Code Compliance — NEC 2023 citations with section numbers
4. System Configuration — DMX universes, C4 scenes, REV zones
5. Installation Notes — step-by-step, safety warnings, commissioning
6. Bill of Materials — itemized with estimated pricing

## Template Variables

| Variable | Options |
|---|---|
| `PROJECT_TYPE` | residential, commercial, hospitality, entertainment, outdoor/landscape |
| `LOCATION_TYPE` | dry, damp, wet, submersible, outdoor-exposed, near-pool/spa |
| `CONTROL_SYSTEM` | Control4, REV-LC, DMX-standalone, hybrid |
| `FIXTURE_TYPE` | LED tape, downlight, linear, pendant, landscape, underwater, accent |
| `COLOR_SPEC` | single-CCT, tunable-white, RGB, RGBW, RGBWW, pixel-addressable |
| `VOLTAGE_SYSTEM` | 12VDC, 24VDC, 48VDC, 120VAC, 277VAC |
| `AREA_DIMENSIONS` | length, width, height in feet |
| `SPECIAL_REQUIREMENTS` | hot-tub-adjacent, marine, high-humidity, UV-exposure, explosion-proof |

## Built-in Calculations

Every design includes:
- **Voltage Drop** — Vd = (2 × L × I × R) / 1000 (3% branch / 5% total limits)
- **LED Driver Sizing** — Load × 1.2 = minimum driver wattage
- **DMX Channel Count** — Universe allocation with >480 channel split warnings
- **Circuit Load** — 80% continuous rule per NEC 210.20
- **Wire Sizing** — NEC 310.16 ampacity tables with derating
- **Luminaire Spacing** — Spacing-to-mounting-height ratios

## Safety Flags

Automatically flags:
- ⚠️ **CODE VIOLATION** — NEC zone violations, missing GFCI, inadequate bonding
- ⚠️ **SAFETY CONCERN** — IP mismatches, voltage risks, overloaded circuits

## Deployment Targets

| Target | Status | Notes |
|---|---|---|
| Claude Console Prompt | ✅ Built | Workbench prompt with 8 template variables |
| Phoenix Toolbox Capability | ✅ Built | Skill + command + plugin manifest |
| MCP Server | 🔜 Next | MCP tool endpoint for CLI/automation |
| Claude Skill | 🔜 Next | Team account skill registration |
| CLI Plugin | 🔜 Next | `phoenix lighting-design` command |

## Source

System prompt built and test-verified in Claude Platform Workbench.  
Test scenario: Hot tub + pergola, RGBW tape, Control4 EA-3, REV LC dimmers, wet location, 45ft panel run.  
Result: 15,287-token response with proper NEC 680 citations and three-subsystem breakdown.

---

*Part of the [Phoenix Toolbox](https://github.com/GIT-PHOENIX-HUB/phoenix-toolbox) capability system.*
