# Visual Comparison Report — Study Page (Preflop + Postflop)

**Date:** 2026-06-29  
**Reference:** `docs/reference-study.png` (preflop), `docs/reference-study-interface.png` (postflop)  
**Clone:** https://wiz.codeovertcp.com/study (live capture)  
**Method:** Vision analysis of reference screenshots vs browser capture of live clone  
**Reference live site:** app.gtowizard.com/study — blocked by auth wall (login required)

## Preflop Mode Comparison

### Matrix Cell Coloring (🆕 P1 — NEW GAP)
- **Reference:** BLUE = raise/play hands. RED = fold hands. Split gray/blue = mixed frequency.
- **Clone:** RED = raise/play. Gray/white = fold. The color convention is **inverted**.
- **Impact:** Standard poker training tools universally use blue/green for "good/play" and red for "bad/fold." The clone's red-for-raise is counterintuitive to poker players.
- **Recommended fix:** Swap matrix cell colors — blue/cyan for raise, red/crimson for fold.

### Mode Selector (P3 — known)
- **Reference:** "Strategy ↓" dropdown + Ranges/Breakdown/Reports:Flops tabs
- **Clone:** Preflop Ranges / Postflop Training toggle buttons
- **Status:** Functional difference, not a visual bug. Clone uses toggle; reference uses dropdown.

### Position Tile Layout (P3 — known)
- **Reference:** Position tiles inline in top bar (e.g., "UTG 100 Take action")
- **Clone:** Position tiles in separate row below mode toggle
- **Status:** Layout difference. Clone approach is arguably better for touch/mobile.

### Top Bar Session Info (P3 — NEW)
- **Reference:** "Cash 100bb 2/100" displayed inline as session metadata
- **Clone:** "Cash" dropdown + "100bb" dropdown + "2,000+ spots" static text
- **Gap:** Reference shows blinds (2/100). Clone does not.
- **Recommended fix:** Add blinds display (e.g., "2/100") alongside game type/stack depth.

### F/C/R Strategy Summary Strips — Clone Improvement
- **Reference:** No aggregate action frequency strips per position
- **Clone:** F/C/R percentage strips below each position (e.g., "UTG F:9% C:0% R:3%")
- **Status:** Clone improvement — not a gap.

### Right Sidebar Tabs (P3 — known)
- **Reference:** Overview/Table/Equity Chart top tabs, Hands/Summary/Filters/Actions sub-tabs
- **Clone:** Strategy/Ranges/Breakdown at matrix level, Overview sidebar with Hand/Summary/Filters/Actions sub-tabs
- **Status:** Different structure but equivalent functionality. Clone's sub-tabs match reference closely.

### Right Sidebar Content (Match ✅)
- **Reference:** Hand action breakdown per suit combination (e.g., AA with ♥♠♣)
- **Clone:** ComboGrid component with colored suit symbols and weight percentages
- **Status:** Close match. ComboGrid was implemented in Phase 4.

### Bottom Bar (P3 — NEW)
- **Reference:** Footer control bar (hamburger menu, session icons, visibility toggle)
- **Clone:** Duplicate top navigation bar
- **Gap:** Reference has dedicated footer controls. Clone duplicates nav.
- **Recommended fix:** Consider replacing duplicate nav with a slim footer bar (low priority).

### Accent Color — Intentional Design Choice
- **Reference:** Blue as primary accent
- **Clone:** Green as primary accent (#00C853, #AAFBB2 lime)
- **Status:** Intentional design choice — not a gap. Clone adopted green to differentiate from reference.

### Navigation Architecture — Deferred
- **Reference:** Left sidebar (~120px) with vertical pills
- **Clone:** Top horizontal nav bar
- **Status:** Known architectural difference, documented in spec_gaps. Deferred.

## Postflop Mode Comparison

### Overall Layout Architecture (Deferred)
- **Reference:** Horizontal linear flow: preflop action panels (left) → FLOP board cards (center) → postflop action panels (right)
- **Clone:** Vertical flow: preflop position cards (top) → board visualization + table (center) → action bar (bottom)
- **Status:** The reference uses a game tree visualization paradigm. The clone uses a training mode with poker table. Different use cases — reference is analysis, clone is practice.

### Board Visualization (Match ✅)
- **Reference:** K♥ K♠ 3♦, pot 5.5, green border on FLOP label
- **Clone:** K♣ K♣ 3♣ visible, pot 5.5, circular pot icon
- **Status:** Close match. Board cards and pot size displayed correctly.

### Preflop Action Panels (Layout difference)
- **Reference:** Vertical panels per position with grey highlight bar on taken action
- **Clone:** Horizontal cards with frequency percentages, green highlight on active position
- **Status:** Layout paradigm difference. Reference is pure analysis; clone adds interactivity.

### Postflop Action Panels (Layout difference)
- **Reference:** Right-side vertical panels with frequency percentages in parentheses
- **Clone:** Bottom action bar with GTO frequency percentages (e.g., "Call 93% GTO")
- **Status:** Clone's bottom bar provides the same data but in a more interactive format.

### Game Tree Visualization (Deferred)
- **Reference:** Sequential position actions showing full action tree (BB → BTN → BB response)
- **Clone:** "Random Spot" training mode — single position at a time
- **Status:** Known gap — "Missing game tree visualization" in spec_gaps. Deferred as architectural.

### Training Features (Clone Advantage)
- **Clone has:** Random Spot, Refresh, Configure Spot buttons, street tracker (PREFLOP→FLOP→TURN→RIVER)
- **Reference:** Pure static analysis view
- **Status:** Value-add features not present in reference. Not gaps.

## Summary of Findings

### P1 Gaps (Actionable)
| ID | Description | New? |
|---|---|---|
| fix-study-matrix-cell-colors | Invert matrix colors: blue=raise, red=fold (currently inverted) | 🆕 YES |

### P2 Gaps (Actionable)
| ID | Description | New? |
|---|---|---|
| — | None new. Existing game tree/postflop visualization gap already deferred. | — |

### P3 Gaps (Actionable)
| ID | Description | New? |
|---|---|---|
| fix-study-top-bar-blinds | Add blinds display (e.g., "2/100") alongside game type/stack | 🆕 YES |
| fix-study-bottom-bar | Replace duplicate nav with slim footer bar | 🆕 YES |

### Already Documented / Deferred
- Left sidebar vs top nav (architectural, deferred)
- Missing game tree visualization (architectural, deferred)  
- Mode selector style (functional, not visual)
- Right sidebar tab structure (functional match)
- Position tile layout (clone improvement)

### Confirmed Fixed (No Gap)
- Matrix cell readability (font size, freq chips) ✅
- Action letter suffix ("75% R" format) ✅
- Range % on position tiles ✅
- ComboGrid suit icons ✅
- GTO feedback overlay ✅
- Solver status indicator ✅
