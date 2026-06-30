# AGENTS.md — GTO Wizard Clone

## About
Open-source GTO poker training platform. Equity calculator, CFR solver, training modes, hand history analysis, ICM calculator, push/fold charts, and training courses. Live at `wiz.codeovertcp.com`.

**Status:** Phase 2 complete ✅ — all 9 right sidebar sub-tabs, player tiles, action prompts, spaced repetition, postflop training mode, strategy API, quiz/hand-history/plo4/omaha/bomb-pot/double-board/strategies pages all implemented and verified live. Moving to Phase 3 (Infrastructure & Visual Polish).

## Visual Reference Screenshots

The `docs/` directory contains screenshots of the real GTO Wizard that serve as the design target:

| File | Target Page |
|------|-------------|
| `docs/reference-dashboard.png` | `/` |
| `docs/reference-study-interface.png` | `/study` (postflop mode) |
| `docs/reference-study.png` | `/study` (preflop mode) |
| `docs/reference-trainer.png` | `/practice` |
| `docs/reference-equity.png` | `/equity` |
| `docs/reference-icm.png` | `/icm` |
| `docs/reference-courses.png` | `/courses` |
| `docs/reference-solutions.png` | `/solutions` |

## Architecture

### Stack
- **Game Engine**: Phaser v3.90.0 (WebGL + Web Audio)
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Python 3.12 FastAPI on port 8001
- **Solver**: Python MCCFR engine (apps/solver/) with gRPC (Docker, not currently running)
- **Cache**: Redis (docker, port 6379)
- **Database**: PostgreSQL 16 (docker, port 5432)
- **Monorepo**: Nx with TurboRepo

### Key Directories
| Path | Purpose |
|------|---------|
| `apps/web/` | Next.js frontend |
| `apps/web/src/app/` | Page routes by path |
| `apps/web/src/components/` | Shared React components |
| `apps/api/` | FastAPI backend on port 8001 |
| `apps/solver/` | MCCFR solver engine (Docker) |
| `packages/poker-core/` | Shared poker logic |
| `packages/ui-components/` | Shared UI components |
| `packages/types/` | TypeScript type definitions |

### Services
| Service | Status | Port |
|---------|--------|------|
| PostgreSQL | ✅ docker, Up | 5432 |
| Redis | ✅ docker, Up | 6379 |
| FastAPI API | ✅ systemd (gto-wizard-api.service) | 8001 |
| Next.js web | ✅ systemd (gto-wizard-web.service) | 3000 |
| Cloudflare Tunnel | ✅ systemd (gto-wizard-tunnel.service) | - |
| Solver (MCCFR) | ❌ docker, not built/running | 50051 (gRPC) |

### Available API Routes
`/api/v1/equity`, `/api/v1/variants`, `/api/v1/solver`, `/api/v1/courses`, `/api/v1/quiz`,
`/api/v1/icm`, `/api/v1/hh`, `/api/v1/strategy`, `/api/v1/plo4`, `/api/v1/omaha`,
`/api/v1/double-board`, `/api/v1/bomb-pot`

### Health Check
- Script: `bash scripts/deploy-health-check.sh` — checks 11 endpoints
- Make target: `make health-check`
- All 11 checks currently passing

## Conventions
- **Setup**: `source .venv/bin/activate && pip install -e packages/poker-core`
- **Tests**: `python -m pytest packages/poker-core/tests/` (368 Python tests)
- **Frontend tests**: `cd apps/web && npx vitest run` (53 tests)
- **E2E tests**: `cd apps/web && npx playwright test`
- **Commits**: Conventional commits (`feat:`, `fix:`, `test:`, `docs:`)
- **Python**: 3.12+, ruff linting (line-length 100)
- **Build**: `cd apps/web && npm run build`

## Seed Data
- **Run (preflop only)**: `PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_preflop_strategies.py`
- **Run (all)**: `PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_all_strategies.py`
- **Make target**: `make seed-all` or `make seed-preflop`
- **Note**: Idempotent — safe to run multiple times.
- **Verify**: `curl 'http://localhost:8001/api/v1/strategy-lookup?board=preflop&stack_depth=100&position=UTG'`

## Phase 3 — Infrastructure & Visual Polish

### Task: start-solver-docker-service ✅
**Priority:** P1 — **Coach verified 2026-06-26T13:21:00Z**
**Status:** Fixed by Player commit `67b5214`. Solver container built and started via docker-compose. gRPC server on port 50051, health endpoint returns 200 with MCCFR engine available. All 11 health checks pass. Container logs show no protobuf/gencode errors.
**Evidence:** `docker compose ps` shows solver as "Up", `curl http://localhost:8001/api/v1/solver/health` returns 200.

### Task: fix-sb-aggregate-stack-depth ✅
**Priority:** P1 — **Coach verified 2026-06-26T10:05:00Z**
**Status:** Fixed by Player commit `8893efd`. `Math.round()` wrapped around `stackDepth - 0.5` on line 238, matching the primary path pattern. Verified live: SB summary strip shows **F:7% C:0% R:6%** with 169 combos on fresh load. Console shows 0 preflop-range 422 errors. All 7 aggregate API calls return 200.
**Evidence:** https://wiz.codeovertcp.com/study — SB position, 100bb, Preflop Ranges mode.

### Task: add-clean-build-npm-script ✅
**Priority:** P2 — **Coach verified 2026-06-26T14:06:00Z**
**Status:** Fixed by Player commit `d85a95b`. `"clean-build": "rm -rf .next && next build"` added to `apps/web/package.json`. Build runs successfully — all pages compile without errors.
**Evidence:** `cd apps/web && npm run clean-build` exits 0. All 11 health checks pass. Study page loads with 0 JS errors.

### Task: add-periodic-health-check-cron ✅
**Priority:** P2 — **Completed 2026-06-19** (commit `0e39c5d`)
**Status:** Cron job `gto-wizard-health-check` exists, schedule `0 */6 * * *`, delivers to origin channel. Cron ID: 5d06462b5271. Note: currently fails with HTTP 401 (billing) — requires opencode.ai balance top-up.
**Coach checks:** List cron jobs — verify entry exists.

### Task: visual-polish-reference-comparison ✅
**Priority:** P2 — **Completed 2026-06-26T16:00:00Z**
**Status:** Comparison complete. See `docs/visual-polish-comparison-report.md` for full analysis. 6 gaps identified, 4 actionable fix tasks generated below (2 deferred as architectural).
**Evidence:** Subagent analysis of 12 reference screenshots + 8 live page captures. All 11 health checks pass.

### Task: fix-study-matrix-readability ✅
**Priority:** P2 — **Coach verified 2026-06-26T19:35:00Z**
**Status:** Fixed by Player commit `503b7fa`. Cell font 10px→12px, freq chips 8px→11px with `rgba(0,0,0,0.45)` bg pill, padding `0`→`4px 2px`, flow layout for freq chip (was absolute). Verified live: matrix cells are readable, frequencies visible on non-fold cells without selection. 0 JS console errors, 11/11 health checks pass.
**Evidence:** Browser screenshot confirms font size, pill backgrounds, cell padding, and frequency visibility.

### Task: fix-dashboard-hero-polish ✅
**Priority:** P2 — **Coach verified 2026-06-27T00:41:17Z**
**Description:** Add radial gradient glow behind hero CTA buttons (reference shows subtle green depth). Introduce secondary lime-green (#AAFBB2) accent for active nav states alongside primary #00C853. Add box-shadow on feature card hover (reference shows elevation depth, clone only has -translate-y-0.5).
**Success criteria:**
- Hero section has visible radial gradient glow
- Active nav items use #AAFBB2 lime green indicator
- Feature cards have box-shadow on hover
**Coach checks:** Browser screenshot of dashboard — verify depth and glow

### Task: fix-practice-page-placeholder ✅
**Priority:** P2 — **Coach verified 2026-06-27T00:41:17Z**
**Description:** Practice/trainer page at `/practice` shows an empty dark page with only sidebar indicators. Reference shows a poker table with green felt. Add a visual placeholder: "Select a training mode" panel with mode options (Preflop Ranges, Postflop Scenarios, Spaced Repetition) as styled cards. Include a subtle poker table texture/gradient background.
**Success criteria:**
- Practice page shows meaningful content (not empty)
- At least 3 training mode options visible
- Green subtle felt/gradient background
**Coach checks:** Browser screenshot of /practice — verify content visible

### Task: fix-solver-status-indicator-flicker ✅
**Priority:** P2 — **Coach verified 2026-06-30T01:18:00Z**
**Status:** Fixed by Player commit `a4a73aa`. `useSolverHealth` now accepts `recheckDeps` parameter — when `treePath.length` or `activePosition` changes, the hook immediately re-checks solver health. Verified live: solver stays "GTO" through UTG→HJ position switch, HJ Raise→CO 3-bet tree navigation, and Preflop→Postflop mode switch. 0 JS console errors across all interactions. 53/53 vitest pass.
**Evidence:** Browser verification at https://wiz.codeovertcp.com/study. Screenshot: `/home/sc/.hermes/reviews/gto-wizard-2026-06-30-solver-health-postflop-verify.png`.

### Task: tandem-reference-comparison-gtowizard ✅
**Priority:** P2 — **Completed 2026-06-28T04:00:00Z**
**Description:** Load the original GTO Wizard (app.gtowizard.com/study) via Tandem browser at localhost:3099 alongside wiz.codeovertcp.com. Compare real behavior — range data, street transitions, GTO frequencies, quiz API responses. This is Tier 1 reference verification that catches semantic bugs no test spec can encode.
**Success criteria:**
- ✅ Tandem browser session launched
- ✅ Side-by-side comparison of key workflows (position select → matrix update → action selection → GTO feedback)
- ✅ Each behavioral difference documented as a fix task
**Status:** Complete. See `docs/reference-comparison-gtowizard.md` for full analysis. 14 visual/functional gaps identified across 4 pages (3 P1, 5 P2, 6 P3). 9 gaps already fixed. Remaining actionable: position tile range % (P1), poker table visualization (P2), combo grid (P2), GTO comparison overlay (P2), frequency action letter (P3).
**Evidence:** Reference screenshots analyzed against live page source, existing live screenshots, and prior DOM-level reports.

### Task: e2e-test-suite-validation ✅
**Priority:** P3 — **Completed 2026-06-28** (commit 9eb4353)
**Description:** Run the full Playwright E2E test suite and fix any failures. The test specs exist but some may be brittle (CSS class selectors) or rely on features that have changed. Target: all stable POM-based specs (study, practice, smoke, study-console-audit) pass 100%.
**Success criteria:**
- Resolved 22 failing E2E tests (118 to 140 passing)
- Added Postflop Training button, fixed RFI position context
**Coach checks:** Run playwright test, report pass/fail counts.

### Task: fix-gitignore-agent-qa-artifacts ✅
**Priority:** P3 — **Already resolved** ( `.agent-qa/` in .gitignore, 0 tracked files)
**Description:** Commit 1579cb4 added 39 .webm test recording files (33MB) from `.agent-qa/artifacts/videos/` to the repo. This directory is not gitignored, causing repository bloat. Add `.agent-qa/` to `.gitignore`, then `git rm --cached` to remove the tracked artifacts without deleting local copies.
**Success criteria:**
- `.agent-qa/` is in `.gitignore` ✅
- `git ls-files .agent-qa/` returns 0 files ✅
**Coach checks:** Check `.gitignore`, run `git ls-files .agent-qa/` to confirm no files tracked.

### Task: fix-utg-range-low-pairs-frequency ✅
**Priority:** P3 — **Completed 2026-06-28** (commit 3e850dd)
**Description:** UTG range at `apps/api/routers/solver.py` opens all pocket pairs (22-AA) at 100% frequency in the `_UTG_RANGE` definition. Real solver output opens low pairs (22-55) at mixed frequencies (15-40%). Moved low pairs (22-55) from `always_raise` to `mixed` with appropriate frequencies.
**Success criteria:**
- API response for UTG@100bb shows low pairs (22-55) with 0.15-0.45 frequency ✅
**Coach checks:** Hit the API for UTG@100bb, verify low pairs have mixed frequencies.

### Task: fix-action-filter-hover-accessibility ✅
**Priority:** P3 — **Completed 2026-06-28** (commit 17f487c)
**Description:** The hover-to-filter feature on action buttons (added in commit dcd713d) uses `onMouseEnter`/`onMouseLeave` which is mouse-only and not accessible to keyboard or screen reader users. Made the action filter toggleable via keyboard (Enter/Space on action button toggles filter). Screen readers announce filter state via aria-pressed and aria-label.
**Success criteria:**
- Keyboard users can activate the action filter on matrix cells without a mouse ✅
- Screen reader announces when filter is active and what action it's filtering by ✅
**Coach checks:** Tab to action button, press Enter — verify filter activates.

### Task: remove-stale-agents-md-tasks (Coaching Meta)
**Priority:** Done
**Description:** AGENTS.md was cleaned up by Coach cycle 2026-06-26 09:05 AEST. Removed ~1800 lines of stale/completed tasks (matrix legend, suit colors, postflop training, quiz/hand-history/plo4/omaha/bomb-pot/double-board/strategies pages, strategy-lookup, seed-data, route-order, all Phase 2 tasks). Replaced with this clean Phase 3 backlog.
**Success criteria:** AGENTS.md is clean, accurate, and actionable.

## Phase 4 — Visual Gap Recovery (Current)

### Status: Tandem Comparison Complete — Recovery Tasks Generated
**Player verified 2026-06-28T07:10:00Z:** Completed tandem-reference-comparison-gtowizard task. Comparison report at `docs/reference-comparison-gtowizard.md` identifies 14 gaps (3 P1, 5 P2, 6 P3), 9 already fixed. Recovery tasks generated below from remaining gaps.

**Current state:** Project is healthy — 368 Python + 53 frontend + 142 E2E tests pass, 11/11 health checks pass.

### Task: fix-position-tile-range-percentage (recovery-generated) ✅
**Priority:** P1 — **Already complete** (commit 20f92f5, 2026-06-28)
**Description:** All position tiles in StudyPlayerTiles show stack size in bb (e.g., "99.5bb" for SB). The reference shows range percentage (e.g., "12.7%") on each position tile. Add range percentage data to position tiles and display it prominently alongside (or instead of) stack size. The position tiles should show range % as the primary metric (visible even when not active), with stack as secondary info.
**Success criteria:**
- Each position tile shows range percentage (e.g., "12.7%") in addition to or instead of just stack size
- Range data comes from the strategy-lookup API response (total_combos / 169 or returned frequency)
- SB specifically shows range %, not just "99.5bb"
- Active position tile shows both range % and stack size
**Coach checks:** Open /study in preflop mode. Check each position tile shows range %. Verify SB shows a meaningful range percentage, not just stack size.

### Task: fix-study-combo-grid-suit-icons (recovery-generated) ✅
**Priority:** P2 — **Already complete** (ComboGrid component in StudyDetailsPanel.tsx lines 251-325)
**Description:** The Hand sub-tab in the right sidebar shows text-only hand stats. The reference shows a visual combo grid with colored suit icons (♠♥♦♣) showing individual combination weights. Add a visual combo grid to the Hand sub-tab that displays each suit combination as a mini-card with colored suit symbols and weight indicators.
**Success criteria:**
- Hand sub-tab shows a 4×4 or equivalent grid of suit combos (e.g., ♠♥, ♠♦, ♠♣, ♥♦, ♥♣, ♦♣ for offsuit; ♠♠, ♥♥, ♦♦, ♣♣ for pairs)
- Each combo has a colored suit icon (red ♥♦, white ♠♣)
- Weight/frequency shown per combo variant
- Clicking a combo highlights the corresponding cell in the matrix
**Coach checks:** Open /study, select a hand in the matrix, check the right sidebar Hand tab shows visual combo grid with suit icons.

### Task: fix-practice-poker-table-visualization (recovery-generated)
**Priority:** P2
**Description:** The /practice page uses a card-based layout for quiz/training. The reference shows a poker table with green felt texture, player positions around the table, and board card visualization. Add a visual poker table component to the practice page with green felt gradient background, position markers around the table, and board card display in the center.
**Success criteria:**
- Practice page shows a visual poker table with green felt gradient background
- Player positions displayed around the table (UTG, HJ, CO, BTN, SB, BB)
- Active position highlighted
- Board cards displayed in center of table when applicable
- Existing quiz/training functionality preserved
**Coach checks:** Open /practice, verify poker table visualization with green felt, player positions, and board cards.

### Task: fix-gto-feedback-allin-raise-family

**Description:** GTO feedback overlay (f44afb1) marks player wrong when GTO action is 'all_in' and player clicks 'Raise' (or vice versa). Root cause: `handleActionWithFeedback` collapses only `raise*` → `'raise'`, but the Allin button has `actionBase='all_in'`. Meanwhile `getGtoActionBase()` also doesn't collapse `all_in` → `'raise'`. Both 'all_in' and 'raise*' belong to the raise family and should be compared as equivalent.

**Success criteria:** On the live study page (wiz.codeovertcp.com/study), when the selected hand's GTO action is 'all_in' and the player clicks any raise button (or vice versa), the feedback overlay shows a green ✓ 'GTO Correct'. Currently it incorrectly shows ✗ 'Not optimal'.

**Coach checks:** Open /study, find a hand where GTO says All-in, click Raise 2.5. Verify green ✓ appears. Then find a hand where GTO says Raise, click Allin 100. Verify green ✓ appears.

### Task: fix-study-frequency-action-letter ✅
**Priority:** P3 — **Completed 2026-06-29** (commit 8a71a4b)
**Description:** Matrix cells show frequency percentages (e.g., "87%") but the reference shows an action letter suffix (e.g., "75% R" for raise, "87% C" for call). Add action letter suffixes to frequency displays in the matrix grid.
**Status:** Fixed. Added `getActionLetter()` helper mapping raise/all_in/bet→R, call/check→C, fold→F. Freq chips now render "75% R" format. 53/53 vitest tests pass.
**Success criteria:**
- Matrix cells show action letter suffix: "R" for raise, "C" for call, "F" for fold ✅
- Format: "75% R" not just "75%" ✅
- Letter uses the same color as the cell background ✅
**Coach checks:** Open /study preflop mode. Verify matrix cells show "R", "C", or "F" after percentage values.

## Phase 5 — Recovery-Generated Tasks (Exhaustion Recovery)

**Generated:** 2026-06-29 ~13:45 by Player exhaustion recovery. All Phase 3 & 4 recovery tasks already complete. Backlog drained.

### Task: fix-solver-status-indicator-flicker (recovery-generated) ✅ — **MERGED into primary task above. Fixed by commit `a4a73aa`.**

### Task: full-e2e-test-validation (recovery-generated)
**Priority:** P3
**Description:** Run the full Playwright E2E test suite (`npx playwright test`) and verify all specs pass. The test specs (study, practice, smoke, study-console-audit) may have brittle selectors or rely on features that have changed. Fix any failures. Target: all stable POM-based specs pass 100%.
**Success criteria:**
- `npx playwright test` returns 0 failures (flaky-allowed at ≤3)
- No new regressions in study page, practice page, or core flows
- Any fixed tests have stable selectors (aria-label, data-testid, role)
**Coach checks:** Run `npx playwright test` and report pass/fail counts.

### Task: visual-comparison-study-reference (recovery-generated) ✅
**Priority:** P2 — **Coach verified 2026-06-30T03:30:00Z**
**Status:** Completed by Player commit `101a186`. Investigation complete. Report at `docs/visual-comparison-study-report.md`. Found 1 P1 gap (matrix colors inverted: red=raise on clone, blue=raise on reference), 2 P3 gaps (blinds display, bottom bar). P1 gap confirmed by Coach browser verification.
**Evidence:** Report docs + Coach browser screenshots.

## Phase 6 — Visual Gap Fixes (Current)

### Task: fix-study-matrix-cell-colors ✅
**Priority:** P1 — **Coach verified 2026-06-30T04:21:50Z**
**Status:** Fixed by Player commit `fb88a3d`. `ACTION_COLORS` swapped: raise/all_in/bet→BLUE (#3A6EA5), call/check→GREEN (#00C853), fold→GRAY (#2a2a2a). Legend squares updated (Raise=blue, Call=green). GTO sizing text changed from RED_BRIGHT to BLUE. 53/53 vitest pass, 0 JS console errors, RefQA 4/4 pass. CFS 0.9994 stable. All 3 workflow interactions verified live (position switch, game tree navigation, solver stays GTO).
**Evidence:** Code diff in `apps/web/src/app/study/constants.ts`, `StudyMatrixGrid.tsx`, `StudyDetailsPanel.tsx`. Live page at https://wiz.codeovertcp.com/study. Player RGB verification: AA rgb(58,110,165), K6s rgb(42,42,42).
**Success criteria:**
- Matrix raise cells are blue (matching reference app.gtowizard.com/study) ✅
- Fold cells are dark/black ✅
- Action legend colors are internally consistent with matrix colors ✅
- No change to data or functionality — visual color mapping only ✅
- 0 JS console errors on study page ✅
**Coach checks:** Verified via code review, live page interactions, and console audit. Vision screenshots unavailable (tool limitation).

### Task: fix-study-top-bar-blinds ✅
**Priority:** P3 — **Coach verified 2026-06-30T05:35:00Z**
**Status:** Fixed by Player commit `2e5fb03`. Added blinds display ('0.5/1') with green circle icon to study page top bar, between stack depth selector and spot count. 53/53 vitest pass. 0 JS console errors. Verified live: blinds persist across position switch (UTG→HJ), hand selection (KK), and mode switch (Preflop→Postflop). RefQA 4/4 pass.
**Evidence:** Browser screenshots at https://wiz.codeovertcp.com/study. CFS 0.9981 stable.

### Task: remove-stashed-backup-file ✅
**Priority:** P3 — **Completed 2026-06-30** (commit `31d8bbf`)
**Status:** Fixed by Player commit `31d8bbf`. Removed `apps/web/public/sw.js~Stashed changes` from git tracking (was accidentally committed in 2e5fb03). Added `*~*` pattern to `.gitignore` to prevent future editor backup file commits. Note: `*~` didn't match because the tilde is mid-filename (sw.js~Stashed changes), so `*~*` was used instead. File deleted from disk, 0 tracked `~` files remain.
**Evidence:** `git ls-files | grep '~'` returns nothing. `.gitignore` includes `*~*`.

## Phase 7 — Core Gameplay Fixes (Current)

**Note:** Exhaustion recovery (auto-generating cosmetic tasks when backlog drains) has been disabled. When the backlog is empty, the system goes silent — it does not invent work. Tasks below are explicitly authored for core gameplay correctness.

### Task: fix-game-tree-equal-action-rule
**Priority:** P1
**Status:** In progress
**Description:** The game tree does not correctly implement poker betting round rules. Three rules must be verified and fixed:

1. **Equal Action Rule:** A betting round only ends when all players have had a chance to act AND all active players have contributed the exact same amount to the pot (or folded).
2. **Street Progression:** Once the equal action rule is met, traverse Pre-Flop → Flop → Turn → River → Showdown in order. Postflop should transition automatically after preflop actions complete — NOT require a separate menu selection.
3. **Short-Circuit Rule:** Skip all remaining streets if (a) all players fold except one — remaining player wins instantly, no more cards dealt, OR (b) players go all-in with no decisions remaining — deal remaining community cards straight to showdown.

**Phase 1 Status (Coach reviewed 2026-06-30T04:12:00Z):** ✅ Preflop round-complete detection (`isPreflopRoundComplete`) added. ⚠️ Auto-transition preflop→postflop works (verified live: street breadcrumb shows "BTN raise 2.5, BB call" → FLOP). ⚠️ PostflopTraining auto-advance timer added but street advancement not confirmed on live page. ⚠️ CI workflow at `.github/workflows/e2e-game-tree.yml` references non-existent spec file.

**Known bugs in Phase 1 (Coach-reported, must fix before Phase 2):**
1. **Fold-before-raise bug** (`isPreflopRoundComplete`): Positions that folded before the last raise are still checked as "must have acted after the raise". If UTG folds and HJ raises, the function incorrectly requires UTG to be in `actedAfter` set, returning `false` for genuinely complete rounds. Fix: skip positions that folded before the last raise.
2. **Auto-advance timer cleanup** (`PostflopTraining.tsx`): `advanceToNextStreet()` doesn't clear `autoAdvanceRef.current`. If the timer fires concurrently with another advance trigger, it can cause a double-advance. Fix: clear timer at start of `advanceToNextStreet()`.

**Success criteria:**
- Preflop: all players act, betting round concludes when equal action met, then auto-transition to Flop ✅ (Partially — fold-before-raise edge case still broken)
- Postflop mode activates automatically ✅
- All-in short-circuits: remaining streets dealt automatically ❌ (Not implemented yet)
- All-fold short-circuits: winner declared immediately ✅ (isAllFold implemented)
- No broken buttons at bottom of page ✅
- 0 JS console errors ✅
- Existing test suite still passes ✅ (53/53 vitest)

**Coach checks:** Open /study. Test scenario: select HJ position, simulate UTG fold → HJ raise → CO call → BTN call → SB call → BB call. Verify auto-transition to postflop. Currently fails due to fold-before-raise bug.

|### Task: fix-git-governance-postflop-training
**Priority:** P1
**Status:** New
**Description:** Git governance integrity issue. Commit `7ad9ad9` claims to fix PostflopTraining.tsx (add overflow-y:auto to root div) but the code change is NOT in git history — the commit only modified .deployed-hash. The root div at line 566 has no overflow property. Either: (a) commit the actual overflow-y:auto change if one was applied server-side (check deployed `/study` Postflop Training action buttons), or (b) if the fix was unnecessary (parent already scrolls via page.tsx line 819 overflow:auto), revert the .deployed-hash and checkpoint metadata to match reality. Investigate why the commit claimed a fix that wasn't tracked — ensure future code changes appear in git diffs.

**Success criteria:**
- `git diff HEAD~1` shows actual PostflopTraining.tsx changes OR comment clarifying the fix was unnecessary
- .checkpoint.json `fix-postflop-action-button-registration` summary matches what's actually in git
- `git status` shows clean working tree (no uncommitted .deployed-hash changes)

**Coach checks:** Run `git diff HEAD~1 -- apps/web/src/components/study/PostflopTraining.tsx` — verify actual code change exists. Verify `.deployed-hash` is committed and matches deployed state. Verify `grep -c 'overflow.*auto' apps/web/src/components/study/PostflopTraining.tsx` shows overflow on root div or documented as unnecessary.

### Task: fix-gto-feedback-allin-raise-family
**Priority:** P2
**Status:** Not started
**Description:** GTO feedback overlay marks player wrong when GTO action is 'all_in' and player clicks 'Raise' (or vice versa). Root cause: `handleActionWithFeedback` collapses only `raise*` → `'raise'`, but the Allin button has `actionBase='all_in'`. Meanwhile `getGtoActionBase()` also doesn't collapse `all_in` → `'raise'`. Both 'all_in' and 'raise*' belong to the raise family and should be compared as equivalent.

**Success criteria:** On the live study page, when the selected hand's GTO action is 'all_in' and the player clicks any raise button (or vice versa), the feedback overlay shows a green ✓ 'GTO Correct'.

**Coach checks:** Open /study, find a hand where GTO says All-in, click Raise. Verify green ✓ appears.

### Task: fix-deployment-hash-tracking
**Priority:** P1
**Status:** New
**Description:** Add pre-commit or CI validation that `.deployed-hash` updates only accompany actual code changes. The current pattern (updating `.deployed-hash` without corresponding source changes in commit `7ad9ad9`) creates audit trail gaps where deployed code doesn't match git history. Implement a check that either: (a) prevents committing `.deployed-hash` changes without source tree modifications, or (b) validates deployed hash points to the actual committed code.

**Success criteria:**
- A check exists (pre-commit hook or CI step) that validates `.deployed-hash` changes are accompanied by non-metadata code changes
- No future commits should modify `.deployed-hash` without corresponding source changes

**Coach checks:** Attempt a `.deployed-hash`-only commit; verify the validation blocks it.

### Task: audit-gitignore-pattern-breadth
**Priority:** P3
**Description:** Commit `31d8bbf` added `*~*` to `.gitignore`. Verify the pattern is not masking legitimate files. Narrow if needed.

## Deferred (will not be autonomously worked — requires manual architectural decision)

- **Left sidebar navigation vs top nav** — architectural UX decision
- **Solutions page game tree visualization** — large feature, requires game tree rules fixed first (see Phase 7 Task 1)
