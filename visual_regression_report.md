# Visual Regression Report — GTO Wizard Clone

**Date:** 2026-06-26  
**Tester:** Automated visual regression check  
**Live URL:** https://wiz.codeovertcp.com  
**Reference screenshots:** `docs/reference-study.png`, `docs/reference-study-interface.png`, `docs/reference-solutions.png`

---

## Summary

| Metric | Result |
|--------|--------|
| Pages visited | 4 (study preflop, study postflop, solutions, strategies) |
| JS errors | **0** across all pages ✅ |
| Open spec_gaps | **4** (matrix legend, strategies placeholders, solutions text, SB range %) |
| Regressions vs last cycle | **None** — all previously-working features remain functional |
| Regressions vs known spec_gaps | **All 4 open spec_gaps remain open** — no fixes deployed |

---

## Page 1: `/study` — Preflop Mode

**Status:** Functional, 0 JS errors ✅

### Checks

| Check | Result | Evidence |
|-------|--------|----------|
| **Matrix legend** | ❌ MISSING | No "Red=Raise, Blue=Call, Dark=Fold" legend text visible below the hand matrix. Vision analysis interpreted color coding but no explicit legend exists in the DOM. **SPEC_GAP REMAINS OPEN** |
| **Suit colors** | ✅ CORRECT | Spades/clubs in white, hearts/diamonds in red (standard poker colors). Fixed in commit 0b9cab5. |
| **Position cards — range %** | ❌ PARTIAL FAIL | UTG: `12.7%` ✅, HJ: `12.7%` ✅, CO: `12.7%` ✅, BTN: `12.7%` ✅, BB: `12.7%` ✅, **SB: `99.5bb`** ❌ — shows stack instead of range %. **SPEC_GAP REMAINS OPEN** |
| **Summary strip (F/C/R)** | ✅ PRESENT | All 6 positions show Fold/Call/Raise % with combo counts. Fixed in commit c70b45f. |
| **Stack selector** | ✅ PRESENT | 50bb/75bb/100bb/125bb/150bb/200bb buttons present and interactive. |
| **Hand matrix** | ✅ PRESENT | 13×13 grid with color-coded cells (red=raise, gray=fold). Clickable cells with action menus. |

### Screenshot
`/home/sc/.hermes/cache/screenshots/browser_screenshot_f78948284bd6448a9cc28dd9011f3dd0.png`

---

## Page 2: `/study` — Postflop Training Mode

**Status:** Functional, 0 JS errors ✅

### Checks

| Check | Result | Evidence |
|-------|--------|----------|
| **Matrix legend** | N/A | Not applicable in postflop mode (no hand matrix). Action buttons use standard colors. |
| **Suit colors** | ✅ CORRECT | Clubs shown in white on K♣ K♣ 3♣ board. (No red suits visible to verify hearts/diamonds.) |
| **Action button heights** | ✅ UNIFORM | All 10 action buttons (CHECK, BET 33/50/75/125%, FOLD, CALL, RAISE 50/100%, ALL IN) appear same height. **SPEC_GAP CLOSED** (fixed in commit a87e39e). |
| **Position cards** | N/A | Show "—" in postflop mode — no range % or stack bb displayed. Correct for this mode. |
| **Summary strip** | ❌ NOT SHOWN | No F/C/R summary strip visible in postflop training mode. This is expected — the summary strip is a preflop feature. |
| **Street breadcrumb** | ✅ PRESENT | PREFLOP → FLOP → TURN → RIVER navigation visible. |
| **Configure Spot panel** | ✅ PRESENT | Parameters for setting up custom postflop scenarios. |

### Screenshot
`/home/sc/.hermes/cache/screenshots/browser_screenshot_3cd450d1226146ea94b848ea6f862fd8.png`

---

## Page 3: `/solutions`

**Status:** Functional, 0 JS errors ✅

### Checks

| Check | Result | Evidence |
|-------|--------|----------|
| **Duplicated board cards** | ❌ BROKEN | Every solution card shows board cards TWICE consecutively (e.g., `"9♠ 9♥ 4♦ 9♠ 9♥ 4♦"`). **All 7 cards affected.** **SPEC_GAP REMAINS OPEN** |
| **Concatenated labels** | ❌ BROKEN | Position+street labels concatenated without spaces: `"BBflopflop"`, `"BTNriverriver"`, `"UTGflopflop"`, `"COturnturn"`, `"SBflopflop"`, `"BTNflopflop"`. **All cards affected.** **SPEC_GAP REMAINS OPEN** |
| **Search/filter bar** | ✅ PRESENT | Search box, Position, Board Type, Street, Sort dropdowns all present and interactive. |
| **Solution detail panel** | ✅ PRESENT | Click-to-expand detail panel with GTO strategy breakdown, EV values, Practice This Spot button. |
| **Page heading** | ✅ PRESENT | "Solutions" h1 with "Browse pre-computed GTO solutions for common spots" description. |
| **Solution count** | ✅ PRESENT | Shows "7solutions" counter. |

### Sample broken card text (from DOM snapshot)
```
9♠ 9♥ 4♦ 9♠ 9♥ 4♦BBflopflop BB vs BTN Paired Board 100bb·Pot: 7.5·❤️ 23
K♠ Q♦ 4♣ 2♥ 7♠ K♠ Q♦ 4♣ 2♥ 7♠BTNriverriver BTN vs BB River Value Bet 85bb·Pot: 18·❤️ 45
A♠ 8♦ 3♣ A♠ 8♦ 3♣UTGflopflop UTG vs MP Dry Board 100bb·Pot: 7.5·❤️ 19
Q♥ J♦ 4♠ Q♥ J♦ 4♠COturnturn CO vs BTN 3-Bet Pot (Turn) 80bb·Pot: 32·❤️ 31
9♥ 8♥ 4♠ 9♥ 8♥ 4♠BBflopflop BB Defense vs BTN Open 100bb·Pot: 7.5·❤️ 27
J♠ T♠ 3♣ J♠ T♠ 3♣SBflopflop SB vs BTN 3-Bet Pot 95bb·Pot: 24·❤️ 38
K♠ 7♦ 2♣ K♠ 7♦ 2♣BTNflopflop BTN vs BB Dry Flop Spot 100bb·Pot: 7.5·❤️ 42
```

### Screenshot
`/home/sc/.hermes/cache/screenshots/browser_screenshot_57654fcc1b74492788612e9b776af52a.png`

---

## Page 4: `/strategies`

**Status:** Functional, 0 JS errors ✅

### Checks

| Check | Result | Evidence |
|-------|--------|----------|
| **Duplicate flop placeholders** | ❌ BROKEN | All 3 flop card inputs show `"Kd"` (King of diamonds). **Impossible board state** — same card appearing 3 times. **SPEC_GAP REMAINS OPEN** |
| **Turn/River placeholders** | ⚠️ DIFFERENT | Turn: `"7h"`, River: `"2c"` — these are distinct from each other and from flop cards. |
| **"0 spots found"** | ⚠️ EXPECTED | Shows "0 spots found" because the duplicate Kd flop cards create an invalid board, preventing any strategy lookup. |
| **"Solve New Spot" button** | ⚠️ DISABLED | Correctly disabled because the board state is invalid. |
| **Filter controls** | ✅ PRESENT | Position (Button), Stack Depth (100bb), Bet Size (50% pot) dropdowns all present and interactive. |
| **Clear board button** | ✅ PRESENT | "Clear board" link to reset all card inputs. |

### Screenshot
`/home/sc/.hermes/cache/screenshots/browser_screenshot_73b3a4d00c9f4a149f954a00e9b34a4a.png`

---

## Console Error Summary

| Page | JS Errors | Console Messages |
|------|-----------|-----------------|
| `/study` (preflop) | **0** ✅ | 0 |
| `/study` (postflop) | **0** ✅ | 0 |
| `/solutions` | **0** ✅ | 0 |
| `/strategies` | **0** ✅ | 0 |
| **TOTAL** | **0** ✅ | 0 |

---

## Known Spec Gaps Re-check

| # | Gap | Previous Status | Current Status | Change? |
|---|-----|-----------------|----------------|---------|
| 1 | Matrix legend missing | OPEN | ❌ **STILL MISSING** | No change |
| 2 | Strategies page duplicate "Kd" placeholders | OPEN | ❌ **STILL BROKEN** | No change |
| 3 | Solutions page duplicated/jumbled card text | OPEN | ❌ **STILL BROKEN** | No change |
| 4 | SB position shows stack bb instead of range % | OPEN | ❌ **STILL BROKEN** | No change |
| 5 | E2E test runner nested node_modules conflict | OPEN | ⚠️ **STILL OPEN** (not directly verifiable via browser) | No change |

## Previously-Fixed Items Still Working (no regression)

- ✅ Action button uniform heights (postflop) — fixed in commit a87e39e
- ✅ Suit colors standard poker — fixed in commit 0b9cab5
- ✅ Summary strip 6-position aggregate — fixed in commit c70b45f
- ✅ Position card range % (all except SB) — fixed in commit 8e563b7
- ✅ Postflop street advancement — fixed in commit 1782548
- ✅ All pages return 200 with 0 JS errors — health verified

---

## Issues Found

### Critical (non-functional)
None — all pages load, no JS errors, core interactions work.

### Major (visual/spec gaps)
1. **Solutions page card text is nearly unreadable** — all 7 cards have duplicated board text and concatenated labels. Makes the solutions browser look broken.
2. **Strategies page default state shows impossible board** — three Kd flop cards prevent any meaningful use of the page without manually clearing inputs.

### Minor
3. **SB position shows stack bb (99.5bb) instead of range %** — inconsistent with all other positions. Root cause: API has no SB preflop range data, triggering the stack bb fallback.
4. **Matrix legend missing below hand matrix** — users must infer color meanings from context. Re-implement "Red=Raise, Blue=Call, Dark=Fold" legend.

### No Regressions vs Last Cycle
Everything that was working before (action buttons, suit colors, summary strip, position range %, street advancement) remains working. No new regressions detected.
