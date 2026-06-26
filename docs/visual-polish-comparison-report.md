# Visual Polish Reference Comparison Report

**Date:** 2026-06-26
**Player tick:** visual-polish-reference-comparison
**Reference:** `docs/` directory screenshots vs live `wiz.codeovertcp.com`

---

## Methodology

1. Loaded all 12 reference screenshots from `docs/` via pixel-level color analysis
2. Captured live screenshots of 8 major pages via Playwright
3. Compared layout structure, color palette, spacing, and typography element-by-element

---

## Key Visual Gaps Identified

### Gap 1: Dashboard Hero Section — Green Glow Refinement
**Reference:** Lime green (#AAFBB2) nav indicators, subtle green gradient glow on hero CTA area
**Clone:** Vivid green (#00C853) everywhere, flat hero section without gradient depth
**Severity:** Medium — affects brand perception but not usability
**Fix approach:** Add radial gradient glow behind hero CTA buttons, introduce secondary lime-green accent for nav active states

### Gap 2: Study Page — Matrix Cell Readability
**Reference:** Larger matrix cells with clear frequency percentage chips, better contrast between action colors
**Clone:** Compact cells, frequency chips only visible on hover/select, small font sizes (10-11px)
**Severity:** Medium — functional but less readable
**Fix approach:** Increase base matrix cell font size from ~10px to 12px, show frequency chips on all non-fold cells (not just selected), increase cell padding

### Gap 3: Dashboard Feature Cards — Hover Depth
**Reference:** Cards have subtle shadow/elevation on hover with smooth transition
**Clone:** Cards use `-translate-y-0.5` but no shadow depth
**Severity:** Low — minor polish
**Fix approach:** Add `box-shadow` on hover state, increase transition duration to 0.2s

### Gap 4: Practice/Trainer Page — Empty Dark Page
**Reference:** Poker table with green felt, player positions, game state visualization
**Clone:** Dark empty page with minimal content (just sidebar indicators)
**Severity:** High — page is non-functional visually
**Fix approach:** Add placeholder content explaining the practice mode, add poker table visualization or at minimum a "Select a training mode" prompt with visual options

### Gap 5: Navigation — Sidebar vs Top Bar
**Reference:** Left sidebar navigation (~120px wide) with vertical pill-shaped active indicators
**Clone:** Top horizontal nav bar with dark pills
**Severity:** High — fundamental layout difference
**Fix approach:** This is a major architectural change. Recommend deferring until core feature parity is achieved. The top nav is functional and familiar to users.

### Gap 6: Solutions/Analyze Page — Game Tree Visualization
**Reference:** Game tree with red (#F03C3C) decision nodes and blue (#3D7CB8) action nodes in branching tree structure
**Clone:** Dark page with minimal content
**Severity:** High — core feature missing
**Fix approach:** Implement game tree component with colored decision nodes. This is a significant feature, not just visual polish.

---

## Prioritized Fix Tasks (for AGENTS.md)

| # | Task | Priority | Effort | Type |
|---|------|----------|--------|------|
| 1 | Study matrix cell readability — larger fonts, always-visible frequency chips | P2 | Small | Visual |
| 2 | Dashboard hero gradient glow + lime green nav accent | P2 | Small | Visual |
| 3 | Practice page placeholder content — poker table visual or mode selector | P2 | Medium | Visual |
| 4 | Dashboard card hover depth — shadow + smoother transition | P3 | Small | Visual |
| 5 | Solutions page game tree visualization | P1 | Large | Feature |
| 6 | Left sidebar navigation layout | P1 | XL | Architecture |

---

## Conclusion

The clone has strong functional parity but visual refinement gaps in:
1. **Study matrix readability** (quick win)
2. **Dashboard polish** (quick win)
3. **Practice page emptiness** (medium effort, high visibility)
4. **Solutions game tree** (large effort, core feature)

Recommendation: tackle tasks 1-3 as visual polish wins, defer 5-6 as architectural changes.
