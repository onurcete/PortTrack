---
name: frontend-design
version: "2.0"
tags: [frontend, design, ui, ux, accessibility, responsive, dashboard, finance]
description: "Design and implement context-fit frontend interfaces with deliberate art direction, accessible interaction, responsive behavior, complete states, and rendered verification. Use when creating or substantially reworking pages, components, product workspaces, dashboards, marketing sites, editorial surfaces, commerce flows, or justified immersive experiences."
license: "MIT AND Apache-2.0"
---

# Frontend Design (PracticalSwan Specification & PortTrack Adaptation)

Create interfaces that are fit for their users, tasks, content, product category, and technical constraints. "Best" means fitness for context, not adherence to one visual style.

Accessibility, functional correctness, valid implementation examples, and usable responsive behavior are hard gates. Do not approve a visually impressive result that creates keyboard traps, inaccessible controls, unreadable content, broken states, severe responsive defects, or unjustified performance costs.

---

## Operational Decision Rubric

Use these weights to compare viable design choices. They are an operational decision rubric, not a universal mathematical standard, and they never compensate for a hard-gate failure.

| Criterion | Weight | Key Focus |
|---|---:|---|
| **User and task fit** | 20% | Does this help the investor quickly see portfolio performance, PnL and distribution? |
| **Accessibility** | 20% | WCAG 2.2 AA, colorblind-safe cues (arrows `▲`/`▼` + badges, not just red/green), tabular figures |
| **Usability and information architecture** | 15% | Logical hierarchy, 5-second scan rule, drill-down clarity |
| **Visual coherence & appropriate distinctiveness** | 15% | Cohesive typography, dark/light theme tokens, subtle hairline borders, restrained chrome |
| **Responsive and adaptive behavior** | 10% | Seamless desktop grid to mobile edge-to-edge layout |
| **Performance and resilience** | 10% | Zero layout shifts, light bundles, instant reactive updates |
| **Interaction and state completeness** | 5% | Complete Loading, Empty, Error and Stale-data states |
| **Maintainability and verification** | 5% | Clean component boundaries, TypeScript safety |

---

## Compact Workflow

1. **Inspect:** Existing product, project conventions, design system, components, content, and constraints.
2. **Identify:** Target users (investors/traders), primary task (portfolio tracking/PnL), content type, platform requirements.
3. **Select Mode:** Choose primary design mode (**Data / Dashboard** & **Product / Workspace**).
4. **Information Plan:** Establish clear content hierarchy without artificial card bloat.
5. **Reuse:** Leverage project's established design tokens (`--color-profit`, `--color-loss`, `--color-surface`, `tabular-nums`).
6. **Implement States:** Build complete states (Loading skeleton, Empty placeholders, Stale-data timestamps, Error fallbacks).
7. **Verify:** Check desktop and mobile rendering, ensure lint and builds pass.

---

## Design Mode: Data & Dashboard (Fintech Standard)

- **Information Density:** Optimize scanning, comparison, and status visibility without visual fatigue.
- **Decision-Centric Structure:** Structure filters, tables, charts, and drill-down paths around user decisions.
- **Freshness & Units:** Explicitly display data timestamps (`Son: 10:14`), currency tags (`TRY`, `USD`), and percentages.
- **Card Discipline:** Avoid decorative dashboard-card mosaics. Group related metrics into continuous cohesive sections.
- **Tabular Precision:** Always enforce `tabular-nums` on financial columns to prevent numeric misalignment.
