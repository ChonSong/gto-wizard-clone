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

### Task: fix-dashboard-hero-polish
**Priority:** P2
**Description:** Add radial gradient glow behind hero CTA buttons (reference shows subtle green depth). Introduce secondary lime-green (#AAFBB2) accent for active nav states alongside primary #00C853. Add box-shadow on feature card hover (reference shows elevation depth, clone only has -translate-y-0.5).
**Success criteria:**
- Hero section has visible radial gradient glow
- Active nav items use #AAFBB2 lime green indicator
- Feature cards have box-shadow on hover
**Coach checks:** Browser screenshot of dashboard — verify depth and glow

### Task: fix-practice-page-placeholder
**Priority:** P2
**Description:** Practice/trainer page at `/practice` shows an empty dark page with only sidebar indicators. Reference shows a poker table with green felt. Add a visual placeholder: "Select a training mode" panel with mode options (Preflop Ranges, Postflop Scenarios, Spaced Repetition) as styled cards. Include a subtle poker table texture/gradient background.
**Success criteria:**
- Practice page shows meaningful content (not empty)
- At least 3 training mode options visible
- Green subtle felt/gradient background
**Coach checks:** Browser screenshot of /practice — verify content visible

### Task: tandem-reference-comparison-gtowizard
**Priority:** P2
**Description:** Load the original GTO Wizard (app.gtowizard.com/study) via Tandem browser at localhost:3099 alongside wiz.codeovertcp.com. Compare real behavior — range data, street transitions, GTO frequencies, quiz API responses. This is Tier 1 reference verification that catches semantic bugs no test spec can encode.
**Success criteria:**
- Tandem browser session launched
- Side-by-side comparison of key workflows (position select → matrix update → action selection → GTO feedback)
- Each behavioral difference documented as a fix task
**Coach checks:** Run Tandem comparison, document findings.

### Task: e2e-test-suite-validation
**Priority:** P3
**Description:** Run the full Playwright E2E test suite and fix any failures. The test specs exist but some may be brittle (CSS class selectors) or rely on features that have changed. Target: all stable POM-based specs (study, practice, smoke, study-console-audit) pass 100%.
**Success criteria:**
- `cd apps/web && npx playwright test` exits 0
- Stable specs (study.spec.ts, practice.spec.ts, smoke.spec.ts, study-console-audit.spec.ts) pass
- Brittle specs (workflows.spec.ts, study-preflop-flow.spec.ts) either fixed or replaced
**Coach checks:** Run playwright test, report pass/fail counts.

### Task: remove-stale-agents-md-tasks (Coaching Meta)
**Priority:** Done
**Description:** AGENTS.md was cleaned up by Coach cycle 2026-06-26 09:05 AEST. Removed ~1800 lines of stale/completed tasks (matrix legend, suit colors, postflop training, quiz/hand-history/plo4/omaha/bomb-pot/double-board/strategies pages, strategy-lookup, seed-data, route-order, all Phase 2 tasks). Replaced with this clean Phase 3 backlog.
**Success criteria:** AGENTS.md is clean, accurate, and actionable.
