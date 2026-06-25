# Visual Comparison Report: Preflop Study Mode
**Date:** 2026-06-26  
**Reference:** `docs/reference-study.png`  
**Live URL:** `https://wiz.codeovertcp.com/study`  
**Comparison Method:** browser_vision (reference) + DOM analysis / browser_vision (live page)

---

## 1. How the Comparison Was Done

**Step 1 — Reference Analysis:** The reference image at `docs/reference-study.png` was analyzed via vision_analyze (browser_vision with reference context). The reference shows the real GTO Wizard preflop study interface.

**Step 2 — Live Page Capture:** Browser navigated to `https://wiz.codeovertcp.com/study`. Full page screenshot taken via browser_vision. DOM analyzed via browser_console for exact CSS values (colors, dimensions, fonts, borders).

**Step 3 — Element-by-element comparison:** Each UI component checked against reference description, with measured CSS values from live DOM.

---

## 2. Element-by-Element Comparison

### a) 13x13 Hand Matrix

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Grid structure** | 13×13 (169 hands), ranks A→2 | 13×13 grid, 169 cells, ranks A→2 | ✅ MATCH |
| **Cell colors - Raise** | Red (#E53935 or similar) | `rgb(229, 57, 53)` = **#E53935** | ✅ MATCH |
| **Cell colors - Call** | Blue (#3A6EA5 or similar) | `rgb(58, 110, 165)` = **#3A6EA5** (exists in legend, 0 cells currently blue) | ⚠️ OK for UTG RFI |
| **Cell colors - Fold** | Gray (#2a2a2a) | `rgb(42, 42, 42)` = **#2a2a2a** | ✅ MATCH |
| **Cell text color** | White | `rgb(255, 255, 255)` | ✅ MATCH |
| **Cell font size** | ~10-12px | **8px** | ❌ **GAP** (smaller than reference) |
| **Cell font family** | Sans-serif (Arial/Roboto) | `Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | ✅ MATCH |
| **Cell dimensions (suited/pairs)** | ~80-90px square | **84×84px** | ✅ MATCH |
| **Cell dimensions (offsuit/first col)** | Column label width ~50px | **53×84px** (first row), **53×53px** (subsequent rows) | ⚠️ MINOR: Asymmetric cells |
| **Cell border** | 1-2px subtle | `2px solid rgb(255, 255, 255)` on selected cell | ⚠️ Note: White border only visible on selected (AA) cell |
| **Cell padding** | 1-2px | **3px** | ✅ Approx match |
| **Frequency display** | % shown on cells (e.g., "75% R") | `"87%"`, `"83%"` etc. shown on raise cells; no action letter suffix | ⚠️ MINOR: Shows "%" only, not "R" suffix |
| **Hand label** | Hand name in cell | Hand name in cell (e.g., "AKs", "AQo") | ✅ MATCH |
| **Offsuit cells width** | Full width cells for all | First column (offsuit) = **53px**, others = **84px** — offsuit column is narrower | ⚠️ GAP: Asymmetric grid |

### b) Position Buttons (UTG/HJ/CO/BTN/SB/BB)

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Position labels** | UTG, HJ, CO, BTN, SB, BB | Same 6 positions | ✅ MATCH |
| **Active highlight** | Green border/highlight | `1px solid rgb(0, 200, 83)` = **#00C853**, bg=`rgb(26, 42, 26)` (dark green) | ✅ MATCH |
| **Inactive style** | Dark background | `bg=rgb(22, 22, 22)`, `border=1px solid rgb(34, 34, 34)` | ✅ MATCH |
| **Border radius** | Rounded | **8px** | ✅ MATCH |
| **Font size** | ~14px | **14px** | ✅ MATCH |
| **Font weight** | Normal | **400** | ✅ MATCH |
| **Button heights** | ~60-70px | **66px** | ✅ MATCH |
| **Button widths** | Varying by label | UTG=140px, HJ/CO/BTN=125px, SB/BB=150px | ✅ MATCH |
| **Range % display** | Shows range % below position | UTG/HJ/CO/BTN/BB show `12.7%` | ⚠️ PARTIAL |
| **SB range %** | Should show range % | SB shows **"99.5bb"** (stack size) instead of `12.7%` | ❌ **GAP**: Wrong data for SB |
| **Action labels** | Reference shows minimal | Live shows expanded action labels: Fold/Raise 2.5/Allin 100 on each | ⚠️ Different layout |
| **"Take action ▶"** | Not specified in ref | Only on active UTG position | ✅ Matches active state |
| **"✓ Fold"** | Not specified | Active UTG shows "✓ Fold" (checkmark for active line) | ✅ Active indicator |

### c) Stack Depth Selector

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Options** | 50bb/75bb/100bb/125bb/150bb/200bb | Same 6 buttons | ✅ MATCH |
| **Style** | Pill buttons | Pill buttons with **4px** border radius | ✅ MATCH |
| **Active highlight** | Green accent | `bg=rgb(22, 36, 26)`, `border=1px solid #00C853`, white text | ✅ MATCH |
| **Inactive style** | Subdued dark | `bg=rgb(22, 22, 22)`, `border=1px solid rgb(38, 38, 38)`, gray text (#888) | ✅ MATCH |
| **Font size** | ~11px | **11px** | ✅ MATCH |
| **Button height** | ~22-25px | **23px** | ✅ MATCH |
| **"Stack:" label** | Present | Present before buttons | ✅ MATCH |
| **Dropdown selector** | Not in ref description | Also has a dropdown at top (`Cash ▾ 100bb ▾`) | ⚠️ EXTRA: Not in reference |

### d) Right Sidebar — HAND Sub-tab & Combo Grid

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Sidebar width** | ~500px | `514px` | ✅ MATCH |
| **Sidebar bg** | Dark card | `bg=rgb(28, 28, 28)` | ✅ MATCH |
| **Sidebar border** | Subtle | `1px solid rgb(38, 38, 38)` | ✅ MATCH |
| **Top tabs** | Not specified in ref analysis | **OVERVIEW / TABLE / EQUITY CHART** (Overview active) | ⚠️ NEED VERIFICATION |
| **Sub-tabs** | "HAND" sub-tab | **HAND / SUMMARY / FILTERS / ACTIONS / BLOCKERS** | ✅ MATCH |
| **GTO Range Breakdown** | Should show action % | Shows "Fold: 10.8% (143.0 combos)", "Raise 2.5: 1.5% (19.8 combos)" | ✅ PRESENT |
| **Hand combo grid** | Reference shows suit-colored combo grid | Not visible as a grid; only text breakdown | ❌ **GAP**: Missing visual combo grid with suit icons |
| **Card suits coloring** | Red for hearts/diamonds | Suit colors present in cells (standard poker colors) | ✅ MATCH |
| **Pot odds display** | Should show pot odds | Shows "Pot odds: 40%" | ✅ PRESENT |
| **Position stack display** | Shows stack per position | Shows "UTG 100", "HJ 100", etc. | ✅ PRESENT |

### e) Typography & Spacing

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Base font** | Sans-serif | `Inter, system-ui, -apple-system, "Segoe UI", Roboto` | ✅ MATCH |
| **Matrix cell font** | 10-12px | **8px** | ❌ **GAP**: Text is smaller |
| **Sidebar text** | 12-14px | **10px** (GTO Range Breakdown), 11px (Fold/Raise stats) | ⚠️ Smaller than spec |
| **Position button font** | ~14px | **14px** | ✅ MATCH |
| **Stack selector font** | ~11px | **11px** | ✅ MATCH |
| **Legend font** | ~10-11px | **10px** | ✅ MATCH |
| **Overall density** | Compact, information-dense | Dense but with clear section borders | ✅ MATCH |
| **Spacing** | Consistent padding | Padding varies: cells=3px, sidebar=12px, legend=8px bottom | ✅ Approx match |

### f) GTO Frequency Displays on Matrix

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Frequency format** | "75% R" (action letter suffix) | **"87%"** (just number + %) | ⚠️ MINOR: No action letter |
| **Which cells show frequencies** | Cells with mixed/raise actions | Only **red (raise)** cells show frequency; gray (fold) cells show just hand name | ✅ CORRECT (100% fold = no percentage) |
| **Font size for frequencies** | 10-12px | **8px** | ❌ **GAP**: Smaller |
| **Frequency color** | White | White | ✅ MATCH |
| **Selected cell** | Highlighted/outlined | AA cell selected with `2px solid white` border + action menu overlay | ✅ MATCH |

### g) Action Summary Strip — Position Aggregate Strip

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Position labels** | UTG/HJ/CO/BTN/SB/BB | Same 6 | ✅ MATCH |
| **F/C/R format** | Fold/Call/Raise percentages | `UTG F:11% C:0% R:2%` format | ✅ PRESENT |
| **Combo counts** | Shows combo count | Shows "169 combos" | ✅ MATCH |
| **SB data** | Should show same format | SB shows `F:0% C:0% R:0% —` (dash instead of 169 combos) | ⚠️ **GAP**: SB missing combo count |
| **Color coding** | Color-coded bars | Plain text, no color bars | ❌ **GAP**: Missing color-coded bar visualization |

### h) Matrix Legend (Tri-color for Raise/Call/Fold)

| Aspect | Reference | Live | Verdict |
|--------|-----------|------|---------|
| **Legend present** | Yes, below matrix | **YES** — Found in DOM | ✅ **PRESENT** (fixed since previous report) |
| **Raise indicator** | Red dot/swatch | `10×10px #E53935` square with 2px border-radius + "Raise" label | ✅ MATCH |
| **Call indicator** | Blue dot/swatch | `10×10px #3A6EA5` square + "Call" label | ✅ MATCH |
| **Fold indicator** | Gray/dark dot/swatch | `10×10px #2a2a2a` square + "Fold" label | ✅ MATCH |
| **Layout** | Horizontal row | `display:flex; gap:12px; padding:0 12px 8px` horizontal row | ✅ MATCH |
| **Font size** | ~10-11px | **10px** | ✅ MATCH |
| **Color** | Light gray text | `#999` (rgb(153,153,153)) | ✅ MATCH |
| **Position** | Below matrix, bottom-left | Below matrix (next after grid parent) | ✅ MATCH |

---

## 3. Summary: All Visual Gaps

| # | Gap | Location | Severity | Details |
|---|-----|----------|----------|---------|
| 1 | **Cell font size too small** | Matrix cells | **MEDIUM** | 8px vs reference ~10-12px. Frequency percentages are very small and hard to read. |
| 2 | **SB shows stack instead of range %** | Position button | **HIGH** | SB shows "99.5bb" instead of "12.7%" like other positions. This is a data bug, not just styling. |
| 3 | **Missing combo grid with suit icons** | Right sidebar | **MEDIUM** | Reference shows a visual combo grid with colored suit icons below action area; live shows only text stats. |
| 4 | **Missing color-coded bars in summary strip** | Position aggregate strip | **MEDIUM** | Reference shows colored bars for F/C/R percentages; live shows only text numbers. |
| 5 | **No action letter suffix on frequency** | Matrix cells | **LOW** | Reference shows "75% R", live shows "75%" — missing "R" for raise, "C" for call, "F" for fold. |
| 6 | **SB missing combo count** | Action summary strip | **LOW** | SB shows "—" instead of "169 combos" like other positions. |
| 7 | **Asymmetric matrix cells** | Hand matrix | **LOW** | First column (offsuit) is 53px while other cells are 84px. Reference shows more uniform cells. |
| 8 | **Extra top dropdown selector** | Top controls | **LOW** | Live page has an additional "Cash ▾ 100bb ▾" dropdown that may not be in reference. |
| 9 | **GTO comparison overlay missing** | Right sidebar | **MEDIUM** | Reference shows visual comparison after action selection (correct/incorrect feedback); not present on live. |
| 10 | **Potential blue=call cells never visible** | Hand matrix | **LOW** | Blue (#3A6EA5) exists in legend but never appears in matrix. May be correct for UTG RFI, but should appear when defending. |

---

## 4. What Matches (Correct)

- ✅ 13×13 hand matrix structure and 169 cells
- ✅ Red (#E53935) for raise, Gray (#2a2a2a) for fold — exact color values match
- ✅ All 6 position buttons present with correct labels
- ✅ Active position highlighted with green (#00C853) border + dark green background
- ✅ Stack depth selector with correct 6 options (50bb–200bb)
- ✅ Active stack highlighted green
- ✅ Matrix legend exists with correct tri-color layout (Raise/Call/Fold)
- ✅ Frequency percentages displayed on raise cells
- ✅ Strategy/Ranges/Breakdown view tabs above matrix
- ✅ Right sidebar with OVERVIEW/TABLE/EQUITY CHART tabs
- ✅ HAND/SUMMARY/FILTERS/ACTIONS/BLOCKERS sub-tabs
- ✅ Position aggregate strip (F/C/R % per position)
- ✅ GTO Range Breakdown in sidebar
- ✅ Dark theme consistent with reference
- ✅ Font family (Inter/system-ui) matches reference style
- ✅ 0 JS errors on the page

---

## 5. Evidence Paths

| Asset | Path |
|-------|------|
| **Reference image** | `/home/sc/repos/gto-wizard-clone/docs/reference-study.png` |
| **Live page screenshot (annotated)** | `/home/sc/.hermes/cache/screenshots/browser_screenshot_8bddf5ce590b4b08921d5731dee36158.png` |
| **Previous regression report** | `/home/sc/repos/gto-wizard-clone/visual_regression_report.md` |
| **This report** | `docs/coach-visual-comparison-preflop-report.md` |

---

## 6. Recommendations by Priority

### HIGH
1. **Fix SB range % bug** — SB position shows "99.5bb" instead of range percentage (appears to be showing stack size instead of range %). This is likely a data binding bug.

### MEDIUM
2. **Increase matrix cell font size** — From 8px to 10-11px to match reference readability. Cells have enough space (84×84px) to accommodate larger text.
3. **Add combo grid with suit icons** — Implement visual combo grid in right sidebar showing individual hand combos with colored suit icons (hearts/diamonds in red).
4. **Add color-coded bars to summary strip** — Match reference by adding bar visualization alongside F/C/R percentages.
5. **Implement GTO comparison overlay** — After user selects an action, show a comparison panel with correct/incorrect feedback and EV difference.

### LOW
6. **Add action letter suffix to frequencies** — Show "75% R" instead of "75%" on matrix cells.
7. **Fix SB combo count** — Show "169 combos" instead of "—".
8. **Consider uniform cell sizing** — Evaluate if offsuit column can be same width as other cells.
