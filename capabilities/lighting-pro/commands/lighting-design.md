# /lighting-design — Full Lighting System Design Command

> Slash command for LightingPro capability — complete lighting system design, specification, and NEC 2023 code compliance review.

## Usage

```
/lighting-design [project description]
```

## Description

Triggers a full lighting system design analysis using the LightingPro skill. Accepts a natural-language project description and produces:

1. **Analysis** — Environment classification, applicable NEC articles, zone definitions
2. **Specification** — Products, models, part numbers, quantities, ratings
3. **Code Compliance** — NEC 2023 citations, GFCI/AFCI requirements, wire sizing, bonding
4. **System Configuration** — DMX universes, Control4 scenes, REV LC zones, dimming chains
5. **Installation Notes** — Step-by-step considerations, safety warnings, commissioning
6. **Bill of Materials** — Itemized list with quantities, part numbers, estimated pricing

## Input Variables (Auto-Detected)

The command parses the project description to extract:

| Variable | Values | Description |
|---|---|---|
| `PROJECT_TYPE` | residential, commercial, hospitality, entertainment, outdoor/landscape | Type of project |
| `LOCATION_TYPE` | dry, damp, wet, submersible, outdoor-exposed, near-pool/spa | Environment classification |
| `CONTROL_SYSTEM` | Control4, REV-LC, DMX-standalone, hybrid | Control system platform |
| `FIXTURE_TYPE` | LED tape, downlight, linear, pendant, landscape, underwater, accent | Fixture type(s) |
| `COLOR_SPEC` | single-CCT, tunable-white, RGB, RGBW, RGBWW, pixel-addressable | Color specification |
| `VOLTAGE_SYSTEM` | 12VDC, 24VDC, 48VDC, 120VAC, 277VAC | Voltage system |
| `AREA_DIMENSIONS` | length, width, height in feet | Space dimensions |
| `SPECIAL_REQUIREMENTS` | hot-tub-adjacent, marine, high-humidity, UV-exposure, explosion-proof | Special conditions |

## Examples

```
/lighting-design Hot tub pergola with RGBW LED tape, Control4 EA-3, REV LC dimmers, 24VDC, wet location, 8x8 hot tub, 12x12 pergola

/lighting-design Commercial lobby 40x60ft, 12ft ceilings, tunable white downlights on DALI, DMX accent wall washer, Control4

/lighting-design Outdoor restaurant patio 30x50ft, IP65 string lights + RGB tape under bar, DMX standalone Pharos controller
```

## Calculations Performed

Every design includes calculated values for:
- Voltage drop (Vd formula with 3%/5% limits)
- LED driver sizing (load × 1.2 safety factor)
- DMX channel count and universe allocation
- Circuit load and amperage (80% continuous rule per NEC 210.20)
- Wire sizing (NEC 310.16 ampacity tables)
- Luminaire spacing ratios

## Safety Flags

The command automatically flags:
- ⚠️ CODE VIOLATION — NEC 680 zone violations, missing GFCI, inadequate bonding
- ⚠️ SAFETY CONCERN — IP rating mismatches, voltage risks, overloaded circuits

## Related Commands

- `/nec-lookup` — Quick NEC 2023 article reference
- `/dmx-config` — DMX universe and channel mapping utility
- `/driver-calc` — LED driver sizing calculator
