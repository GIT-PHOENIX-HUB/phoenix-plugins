# Phoenix Electric Margin Rules

## Pricebook Tiers

Phoenix Electric uses 7 pricing tiers in Service Fusion:

| Tier | Code | Description |
|------|------|-------------|
| New Construction | NC | New home builds |
| Remodel | RM | Renovation/remodel work |
| Commercial | COM | Commercial projects |
| Commercial Remodel | COMRM | Commercial renovation |
| Flat Price | FP | Fixed-price services |
| Service/Maintenance | SMP | Service calls and maintenance |
| General | GEN | Default/catch-all tier |

## Margin Targets

| Margin Level | Percentage | Action |
|-------------|-----------|--------|
| Critical Low | <20% | Immediate price review needed |
| Low | 20-30% | Flag for review |
| Acceptable | 30-40% | Monitor |
| Target | 40-60% | Ideal range |
| High | >60% | Good margin |

## Price Points (per pricebook item)

1. **Phoenix Cost** — Internal cost (material + labor)
2. **Premium Price** — Top-tier customer price
3. **Member Price** — Membership plan customer price
4. **List Price** — Standard customer price
5. **Add-On Price** — Additional work price
6. **After-Hours Rate** — Emergency/after-hours price

## Margin Calculation

```
Margin % = (List Price - Rexel Unit Cost) / List Price * 100
```

When comparing, use the **last unit price** from Rexel (most recent purchase) against the **list price** from the pricebook. Material cost in the pricebook may be outdated — Rexel cost is the real current cost.

## Material Markup

Standard Phoenix Electric material markup varies by category:
- Wire & Cable: Typically 2x-3x cost
- Devices (switches, outlets): 3x-5x cost
- Panels & Breakers: 2x-3x cost
- Lighting: 2x-4x cost
- Specialty: Varies
