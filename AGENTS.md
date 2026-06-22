# AGENTS.md — GTO Wizard Clone

## About
Open-source GTO poker training platform. Equity calculator, CFR solver, training modes, hand history analysis, ICM calculator, push/fold charts, and training courses. Live at `wiz.codeovertcp.com`.

**Status:** Active development — core features exist, polish needed.

## Visual Reference Screenshots

The `docs/` directory contains screenshots of the real GTO Wizard that serve as the design target. When working on any page, the Player MUST:

1. Load the reference screenshot with `vision_analyze` to understand the target design
2. Load the live page with `browser_navigate` and take a screenshot with `browser_vision`
3. Compare the two and identify specific visual gaps
4. Fix gaps iteratively until the live page matches the reference

### Reference Files

| File | Target Page | What to Match |
|------|-------------|---------------|
| `docs/reference-dashboard.png` | `/` | Layout, navigation, cards, colors |
| `docs/reference-study-interface.png` | `/study` (postflop mode) | Board cards, action buttons, GTO frequencies, position columns |
| `docs/reference-study.png` | `/study` (preflop mode) | Hand matrix, position buttons, stack selector, action panel |
| `docs/reference-trainer.png` | `/practice` | Training interface, controls, feedback |
| `docs/reference-equity.png` | `/equity` | Equity calculator UI |
| `docs/reference-icm.png` | `/icm` | ICM calculator UI |
| `docs/reference-courses.png` | `/courses` | Course listing, progress |
| `docs/reference-solutions.png` | `/solutions` | Solutions browser |

### Key Design Patterns (from references)

**Study Page — Preflop Mode:**
- 13×13 hand matrix with color-coded cells (red=raise, blue=call, fold=gray)
- Position buttons (UTG/HJ/CO/BTN/SB/BB) with active position highlighted green
- Stack depth selector (50bb/75bb/100bb/125bb/150bb/200bb)
- Right panel: selected hand info, action buttons (FOLD/CALL/RAISE/ALL IN), GTO frequency comparison
- Action buttons are large, clearly labeled, with GTO frequency % shown as micro-chips
- "Check vs GTO" button after selecting action, shows correct/incorrect feedback
- Hand combo grid below action area showing individual combos with suit colors

**Study Page — Postflop Mode:**
- Board cards rendered as styled playing cards (rank + suit, red for hearts/diamonds)
- Street breadcrumb (PREFLOP → FLOP → TURN → RIVER) with active street highlighted
- Pot size display, active player highlight
- Action buttons grouped by type: CHECK, BET (33%/50%/75%/125%), FOLD, CALL, RAISE, ALL IN
- Each button shows chip amount + pot % + GTO frequency
- GTO comparison overlay after user selects action
- "Configure Spot" panel for setting up custom scenarios

**General Design:**
- Dark theme (#0E0E0E background, #1C1C1C cards, #262626 borders)
- Green (#00C853) for active/selected states
- Red (#E53935) for raise/bet actions
- Blue (#3A6EA5) for call actions
- Gray (#2a2a2a) for fold actions
- Compact, information-dense layout — no wasted space
- shadcn/ui component style with rounded corners and subtle borders

## Architecture

### Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Python 3.12 FastAPI on port 8002
- **Solver**: Python MCCFR engine (apps/solver/) with gRPC
- **Cache**: Redis (fakeredis fallback)
- **Database**: PostgreSQL (Neon) via SQLAlchemy
- **Monorepo**: Nx with TurboRepo

### Key Directories
| Path | Purpose |
|------|---------|
| `apps/web/` | Next.js frontend (22+ page routes) |
| `apps/web/src/app/` | Page routes by path |
| `apps/web/src/components/` | Shared React components (equity, stud, badugi, hh, icm, train) |
| `apps/web/src/lib/` | API client library |
| `apps/api/` | FastAPI backend (11 routers) |
| `apps/api/routers/` | API route handlers |
| `apps/solver/` | MCCFR solver engine |
| `packages/poker-core/` | Shared poker logic (equity, hand eval, range, variants) |
| `packages/ui-components/` | Shared UI components |
| `packages/types/` | TypeScript type definitions |

### Available API Routes
`/api/v1/equity`, `/api/v1/variants`, `/api/v1/solver`, `/api/v1/courses`, `/api/v1/quiz`,
`/api/v1/icm`, `/api/v1/hh`, `/api/v1/strategy`, `/api/v1/plo4`, `/api/v1/omaha`,
`/api/v1/double-board`, `/api/v1/bomb-pot`

### Solver API (for post-flop training)
`POST /api/v1/solver/solve` accepts `board`, `street`, `pot_size`, `stack_depth`, `bet_sizes`, `position` and returns GTO strategy actions with frequencies and EV. This is the backend that powers the interactive study page training mode. Currently supports river solving with a defined board.

## Conventions
- **Setup**: `source .venv/bin/activate && pip install -e packages/poker-core`
- **Backend dev**: `PYTHONPATH=apps/api python -m uvicorn main:app --reload --port 8002`
- **Frontend dev**: `cd apps/web && npm run dev`
- **Tests**: `uv sync` first (pytest not currently in venv), then `python -m pytest packages/poker-core/tests/`
- **Commits**: Conventional commits (`feat:`, `fix:`, `test:`, `docs:`)
- **Python**: 3.12+, ruff linting (line-length 100)

## Skills
These skills are loaded automatically when the Player works on this project:

| Skill | When | Why |
|-------|------|-----|
| `subagent-driven-development` | Complex features with multiple independent components | Parallel delegation for speed |
| `test-driven-development` | Test-heavy tasks (fix-dev-env, add-e2e-tests) | Enforce red-green-refactor discipline |
| `systematic-debugging` | Any task where tests fail or behavior is unexpected | 4-phase root cause debugging |
| `scout-agent` | Insufficient task context — need to research libraries, APIs, or approaches | Bounded 1-page research brief with options and trade-offs |

## Tasks

Ordered by priority. Each task is one unit of work for one player tick.

### Task: keep-api-server-running
- **Description**: The FastAPI backend on port 8000 crashes on container restart or host reboot. Set up a systemd --user service (or screen/tmux wrapper) that auto-restarts the API when it dies. The API runs from the repo root with `PYTHONPATH=apps/api uv run uvicorn main:app --host 0.0.0.0 --port 8000`. Also install fakeredis (already done) and ensure `uv sync --group runtime` has all needed deps.
- **Success criteria**:
  - `curl http://localhost:8000/api/v1/health` returns 200 after the service starts
  - Service auto-restarts if the process crashes
  - Service starts on boot (systemd --user enable)
- **Coach checks**:
  - Verify the service file exists at ~/.config/systemd/user/gto-api.service
  - Test stop/start cycle: `systemctl --user stop gto-api && systemctl --user start gto-api` then curl health
  - Check journalctl for errors

### Task: fix-strategy-lookup
- **Description**: The `GET /api/v1/strategy-lookup` endpoint returns HTTP 500 with error `'dict' object has no attribute 'game_type'`. The root cause is that `get_strategy()` returns a `StoredStrategy` object, but when the strategy is not found in the database and the fallback path (`list_strategies`) is hit, the candidate iteration or subsequent handling produces a dict instead. Fix the type mismatch in `apps/api/routers/strategy_lookup.py` or `apps/api/services/strategy_storage.py` so strategy lookups work correctly.
- **Success criteria**:
  - `curl "http://localhost:8000/api/v1/strategy-lookup?board=preflop&stack_depth=100&position=UTG"` returns a valid JSON response (may be 404 if no seed data — that's acceptable) rather than a 500
  - Strategy lookup with valid parameters returns strategy data
- **Coach checks**:
  - The fix handles both found and not-found paths cleanly
  - No regression in other endpoint behaviour
  - The fix doesn't silently swallow errors

### Task: seed-preflop-strategies
- **Description**: The strategy_lookup endpoint returns 404 because no strategy data exists in the PostgreSQL database. Create a seed script that inserts the pre-computed preflop GTO ranges (UTG, HJ, CO, BTN, SB, BB for 100bb) from the solver output into the strategies table. The seed data should be generated by the solver or sourced from the existing preflop data embedded in the frontend.
- **Success criteria**:
  - `curl "http://localhost:8000/api/v1/strategy-lookup?board=preflop&stack_depth=100&position=UTG"` returns 200 with strategy data
  - All 6 common positions have preflop data
- **Coach checks**:
  - Seed script is idempotent (safe to run multiple times)
  - Strategy data matches expected GTO ranges
  - Seed script is documented in AGENTS.md

### Task: fix-solver-docker-build
- **Description**: `docker compose build solver` fails with a numpy version conflict (`numpy==2.2.3` vs `numba 0.61.0` requiring `numpy<2.2`). The solver Dockerfile at `apps/solver/Dockerfile` or its requirements.txt has pinned version conflicts. Fix the dependency versions so the solver image builds cleanly.
- **Success criteria**:
  - `docker compose build solver` exits 0
- **Coach checks**:
  - Check that the solver starts: `docker compose up -d solver` then check logs
  - Verify the solver gRPC port 50051 is listening

### Task: fix-solver-protobuf-version
- **Description**: The solver Docker image builds but crashes at runtime with `VersionError: Detected incompatible Protobuf Gencode/Runtime versions when loading solver.proto: gencode 6.31.1 runtime 5.29.6`. Pin `protobuf>=6.31.1` or re-pin grpcio-tools to match the runtime protobuf in `apps/solver/requirements.txt` so the solver service starts without crashing.
- **Success criteria**:
  - `docker compose up -d solver` starts without protobuf error
  - `docker logs gto-wizard-clone-solver-1` shows no VersionError
  - `curl http://localhost:8000/api/v1/solver/health` returns 200 or the solver gRPC port 50051 is listening
- **Coach checks**:
  - Verify protobuf version in requirements.txt is compatible with the compiled proto files
  - Verify solver health endpoint responds

### Task: document-seed-script
- **Description**: Add usage instructions for `apps/api/prisma/seed_preflop_strategies.py` to the AGENTS.md Conventions or Seed Data section. Ensure a newcomer can read AGENTS.md and know how to populate the strategy database.
- **Success criteria**:
  - AGENTS.md has explicit instructions for running the seed script
- **Coach checks**:
  - Verify the documentation exists in AGENTS.md
  - Verify the instructions are accurate (run the command and confirm it works)

### Task: automate-seed-on-deploy
- **Description**: Add a Makefile target or post-deploy hook (e.g., in docker-compose or a systemd service unit) that runs `seed_preflop_strategies.py` after database migrations to ensure preflop strategy data exists in all environments (local, preview, production).
- **Success criteria**:
  - Running `make seed-preflop` (or equivalent) seeds strategies without errors
  - Running the command twice is idempotent (same result)
- **Coach checks**:
  - Check the Makefile or deploy script for the new target
  - Run it twice and verify idempotency

### Task: quiz-frontend-page
- **Description**: Create a `/quiz` frontend page at `apps/web/src/app/quiz/page.tsx` that uses the existing `GET /api/v1/quiz/random` and related quiz API endpoints to deliver GTO training spots. The page should fetch a random spot, display the board/hand/options, let the user pick an action, and show the GTO answer with EV comparison.
- **Success criteria**:
  - `curl http://localhost:3000/quiz` returns 200 with rendered HTML
  - Page loads a random spot from the API and displays it
  - User can select an action and see GTO comparison feedback
- **Coach checks**:
  - Verify the page route exists at apps/web/src/app/quiz/page.tsx
  - Load /quiz and confirm no console errors
  - Verify quiz spots load and interaction works

### Task: hand-history-frontend-page
- **Description**: Create a `/hand-history` frontend page at `apps/web/src/app/hand-history/page.tsx` that uses the existing `GET /api/v1/hh/hands` and related HH API endpoints. The page should show a searchable/filterable list of imported hands with key details (position, board, action, EV).
- **Success criteria**:
  - `curl http://localhost:3000/hand-history` returns 200 with rendered HTML
  - Page connects to the HH API and displays hand data
  - Filter/search controls are functional
- **Coach checks**:
  - Verify the page route exists at apps/web/src/app/hand-history/page.tsx
  - Load /hand-history and confirm no console errors
  - Verify the page renders hand data from the API

### Task: plo4-frontend-page
- **Description**: Create a `/plo4` frontend page at `apps/web/src/app/plo4/page.tsx` for Pot-Limit Omaha 4-card equity calculations. The API has a `/api/v1/plo4` router (plo4_equity.py) — wire it up so users can input PLO4 hand combos and see equity results.
- **Success criteria**:
  - `curl http://localhost:3000/plo4` returns 200 with rendered HTML
  - Page loads the PLO4 equity calculator interface
  - Users can input hands and get equity results from the API
- **Coach checks**:
  - Verify the page route exists at apps/web/src/app/plo4/page.tsx
  - Load /plo4 and confirm no console errors
  - Verify a PLO4 equity calculation works end-to-end

### Task: postflop-solver-api-endpoint
- **Description**: Create a dedicated `POST /api/v1/solver/postflop-strategy` endpoint that the study page's interactive training mode will call. Unlike the existing `/solve` endpoint (which runs a live CFR solve — too slow for interactive use), this endpoint returns cached/quick pre-computed strategy data for common postflop spots. Accept `board` (string like "KsKc3s"), `position` (player acting), `street` (flop/turn/river), `pot_size`, `stack_depth`, `hero_hand`. Return top N actions (check, bet sizes, fold, call, raise) with GTO frequency % and EV. The `/solve` endpoint already supports postflop parameters as a fallback — if no cached data exists, fall through to call the live solver engine with a 30-second timeout.
- **Success criteria**:
  - `curl -X POST http://localhost:8000/api/v1/solver/postflop-strategy -H 'Content-Type: application/json' -d '{"board":"KsKc3s","position":"BTN","street":"flop","pot_size":5.5,"stack_depth":97.5}'` returns 200 with action list
  - Each action has `action` (string like "bet_33", "check", "fold"), `frequency` (0-1), `ev` (float)
  - Response includes the strategy source ("cached" vs "live-solver")
- **Coach checks**:
  - Verify the endpoint exists in the API router tree
  - Test with a known board+position combo, confirm response shape matches spec
  - Test with invalid board format, confirm graceful error (not 500)
  - Check the endpoint doesn't block for >5s if live solver is down

### Task: interactive-postflop-study-buttons
- **Description**: Add an interactive postflop training mode to the /study page. The page currently shows a static preflop range viewer. Add a new mode (toggled via a "Postflop Training" / "Preflop Ranges" switch) that shows:
  1. **Board cards** — 3-5 community card slots (flop/turn/river). Parse from a card string like "KsKc3s" and render styled cards with suit colors.
  2. **Pot size** — displays current pot, updates per street.
  3. **Active player highlight** — green-bordered column showing whose turn it is.
  4. **Action history** — for each position still in the hand, show whether they folded or their action so far.
  5. **Interactive action buttons** — user can click an action to make a decision. Buttons should be styled per type: CHECK, BET 33%/50%/75%/125%, FOLD, CALL, RAISE 50%/100%, ALLIN (all-in with remaining stack). Each button shows chip amount + pot %.
  6. **GTO comparison** — after user picks an action, overlay the GTO strategy from the API for each action option as micro-chips (frequency %, EV). Highlight the user's choice vs the GTO-recommended action.
  
  Reference the image at `docs/reference-study-interface.png` for exact layout and styling. The left column should show the strategy matrix (preflop view) or board+actions (postflop view). The right column should always show the GTO action breakdown and EV comparison.
- **Success criteria**:
  - `/study` page loads without console errors
  - Toggle between "Preflop Ranges" and "Postflop Training" modes works
  - Postflop mode shows: board cards, pot size, active player highlight, action history per position
  - All action buttons render: CHECK, BET (33%/50%/75%/125%), FOLD, CALL, RAISE (50%/100%), ALLIN
  - Clicking an action button calls `POST /api/v1/solver/postflop-strategy` and shows GTO comparison feedback
  - Reference screenshot at `docs/reference-study-interface.png` matches the rendered UI layout
- **Coach checks**:
  - Open browser to /study, check for console errors (0 errors)
  - Verify the preflop/postflop toggle exists and switches views
  - Verify board cards render with correct suit symbols and colors
  - Click each action button type — verify API call happens and response renders
  - Compare rendered UI against `docs/reference-study-interface.png`: verify action button layout, bet sizing notation, pot size display, position column layout all match
  - Check mobile/small viewport doesn't break the layout entirely (responsive enough to not lose buttons)

### Task: postflop-spot-configuration
- **Description**: Add a configuration panel to the postflop training mode that lets the user set up a training scenario. Before starting a postflop hand, the user should be able to:
  1. Select which positions are in the hand (e.g., BTN vs BB heads-up, or multi-way)
  2. Input the board cards (3-5 community cards)
  3. Set pot size and stack depths
  4. Choose the street (flop/turn/river)
  5. Optionally input hero's hole cards to see personalized GTO strategy
  
  The configuration should be a collapsible panel that opens with a "Configure Spot" button and collapses after setup. Default configuration: BTN vs BB, K♠K♣3♠ flop, 5.5bb pot, 100bb stacks — matching the reference image at `docs/reference-study-interface.png`.
- **Success criteria**:
  - Configuration panel opens/closes with button toggle
  - User can select positions, enter board cards, set pot/stack
  - Changes take effect and the action buttons update
  - Default config matches the reference image
- **Coach checks**:
  - Open the config panel, change a setting, verify the board/pot/position updates
  - Close and re-open the config panel, verify settings persist
  - Verify the default config renders identically to `docs/reference-study-interface.png`

### Task: postflop-street-navigation
- **Description**: Add street-by-street navigation to the postflop training mode. After the user makes an action on one street (e.g., flop), they should be able to advance to the next street (turn, then river). Each street:
  1. Reveals new community cards
  2. Updates the pot size based on previous action
  3. Generates a new set of GTO action buttons for the active player
  
  Include a hand history breadcrumb at the top showing: Preflop actions → Flop (current) → Turn (locked) → River (locked) — with past streets showing what action was taken.
- **Success criteria**:
  - After selecting an action, user can advance to next street
  - New board cards appear on turn/river
  - Pot size updates correctly
  - New action buttons appear for the active player on each street
  - Street breadcrumb shows past actions per street
- **Coach checks**:
  - Advance through flop → turn → river, verify each street shows correct board + pot
  - Verify the street breadcrumb updates correctly
  - Verify the action buttons change per street (more options on river with all-in)

## Coach Configuration
- **Review scope**: git diff of latest commit, test output, success criteria from AGENTS.md task, console errors from frontend pages (check via curl/browser)
- **Pass conditions**: All success criteria for the task are met. No regression in previously passing tests. No console errors introduced.
- **Fail actions** (descending severity):
  1. Coach creates a corrective commit fixing the issue directly
  2. Coach reverts the commit and creates a fix task pinned to the issue
  3. For ambiguous or high-risk failures, coach blocks and tags for human review

**Reference for visual comparison**: The file `docs/reference-study-interface.png` is a screenshot of the target interactive postflop training interface. When reviewing tasks `interactive-postflop-study-buttons`, `postflop-spot-configuration`, and `postflop-street-navigation`, the coach SHOULD load this image via `vision_analyze` to compare the player's rendered output against the visual reference. Specific visual elements to match:
- Action button layout (BET sizes as 33%/50%/75%/125% of pot)
- Position column layout (UTG/HJ/CO/BTN/SB/BB in that order, with green highlight on active)
- Board card display (centered, with suit colors)
- Pot size notation (e.g., "5.5" next to "FLOP" label)
- Street breadcrumb style (tabs with active street highlighted)

## Seed Data
- **Run (preflop only)**: `cd /home/sc/repos/gto-wizard-clone && PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_preflop_strategies.py`
- **Run (all: preflop + flop)**: `cd /home/sc/repos/gto-wizard-clone && PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_all_strategies.py`
- **Make target**: `make seed-all` (seeds preflop + flop at 50, 100, 150, 200bb) or `make seed-preflop` (preflop only)
- **Note**: Idempotent — safe to run multiple times. Seeds strategies at all common stack depths (50, 100, 150, 200bb). Requires the venv (`.venv`) with asyncpg installed (run `uv sync --group runtime` first if needed).
- **Docker**: The `docker compose up -d` seed service runs the combined seed automatically via `seed_all_strategies.py`.
- **Verify**: After seeding, test with `curl 'http://localhost:8000/api/v1/strategy-lookup?board=preflop&stack_depth=100&position=UTG'`

### Task: fix-omaha-api-url
- **Description**: The `/omaha` frontend page calls `/api/omaha/plo5/equity`, `/api/omaha/hi-lo/equity`, and `/api/omaha/shortdeck/equity` but the backend serves these at `/omaha/plo5/equity/calculate`, `/omaha/hi-lo/equity/calculate`, `/omaha/shortdeck/equity/calculate`. Fix the API URLs in `apps/web/src/app/omaha/page.tsx` — remove the `/api` prefix and add the `/calculate` suffix.
- **Success criteria**: Clicking "Calculate Equity" on the Omaha page for any variant (PLO5, Hi-Lo, Shortdeck) returns results instead of a 404 error. Confirm with `curl http://localhost:8000/omaha/plo5/equity/calculate -X POST -H 'Content-Type: application/json' -d '{"hand1": "AhKhQsJd", "hand2": "KsQsJhTd"}'` returns 200.
- **Coach checks**: Load `/omaha` page, submit an Omaha equity calculation, verify response renders correctly. Check browser console for 404 errors on API calls.

### Task: fix-bomb-pot-api-url
- **Description**: The `/bomb-pot` frontend page calls `/api/bomb-pot/game-state` and `/api/bomb-pot/equity` but the backend serves these at `/bomb-pot/game-state` and `/bomb-pot/equity` (no `/api` prefix). Fix the fetch URLs in `apps/web/src/app/bomb-pot/page.tsx` to remove the `/api` prefix from the paths.
- **Success criteria**: Clicking "Create Game" on the bomb-pot page creates a game state instead of getting a 404. Confirm with `curl http://localhost:8000/bomb-pot/game-state -X POST -H 'Content-Type: application/json' -d '{}'` returns a valid game state object.
- **Coach checks**: Load `/bomb-pot` page, try creating a game state, verify game renders. Check console for 404 errors.

### Task: fix-double-board-api-url
- **Description**: The `/double-board` frontend page calls `/api/double-board/equity` but the backend serves this at `/double-board/equity` (no `/api` prefix). Fix the fetch URL in `apps/web/src/app/double-board/page.tsx` to remove the `/api` prefix.
- **Success criteria**: Clicking "Calculate Equity" on the double-board page returns equity results instead of a 404. Confirm with `curl http://localhost:8000/double-board/equity -X POST -H 'Content-Type: application/json' -d '{"hero": "AhKh", "villain": "QsQd", "board1": ["Ks", "7c", "2d"], "board2": ["3h", "9d"]}'` — adjust field names as needed to match the API schema.
- **Coach checks**: Load `/double-board` page, submit a calculation, verify results render. Check console for 404 errors.

### Task: fix-strategies-api-url-prefix
- **Description**: The `/strategies` frontend page defines `API_BASE = "http://localhost:8080"` and then constructs URLs like `${API_BASE}/api/v1/strategy/lookup`. This results in double-prefix URLs that break in production (calls `http://localhost:8080/api/v1/...` directly instead of using the Next.js proxy). Fix by removing the hardcoded API_BASE and using relative paths (`/api/v1/strategy/lookup` etc.) so the Next.js rewrite proxy handles routing. Update `apps/web/src/app/strategies/page.tsx`.
- **Success criteria**: The strategies page loads strategy data via the Next.js proxy instead of bypassing it. `curl http://localhost:3000/strategies` returns a page that successfully loads strategy data from the API.
|- **Coach checks**: Load `/strategies` page, verify strategy data loads (no 404 or connection refused errors in browser console). Verify all three API calls (strategy lookup, solver solve, solver WS) use relative paths.

### Task: fix-strategy-route-order
- **Description**: The `GET /api/v1/strategy/{key}` route in `apps/api/routers/strategy.py` (line 185) is defined before `GET /api/v1/strategy/lookup` (line 228), causing `/api/v1/strategy/lookup` requests to be intercepted by `/{key}` with `key="lookup"`, which then fails `parse_strategy_key("lookup")` with `Invalid strategy key format: lookup`. Move the `/lookup` route before `/{key}` in strategy.py so the static path matches first. Verify with `curl http://localhost:8000/api/v1/strategy/lookup?game_type=nlh&players=2&board=preflop&stack_depth=100` returns a valid response (not the `Invalid strategy key format` error).
- **Success criteria**: `curl "http://localhost:8000/api/v1/strategy/lookup?game_type=nlh&players=2&board=preflop&stack_depth=100"` returns a strategy response or 404 (not 400 with "Invalid strategy key format"). The `/api/v1/strategy/{key}` endpoint still works for valid keys.
- **Coach checks**: Run the lookup curl and verify no "Invalid strategy key format" error. Also test `GET /api/v1/strategy/nlh:2:preflop::100` still returns proper response or 404 (not shadowed by lookup). Check that all 368 tests still pass.

### Task: add-strategies-page-e2e-test
- **Description**: The `/strategies` page currently shows "0 spots found" because the strategy lookup API call fails with the route shadowing bug. After `fix-strategy-route-order` is deployed, the strategies page should be able to load strategy data. Add a basic e2e smoke test that loads `/strategies` and verifies the page renders the strategy browser UI without console errors. The test can be a simple Playwright or curl-based check.
- **Success criteria**: `curl http://localhost:3000/strategies` returns 200 with the HTML strategy browser UI. Loading the page in a browser shows no console errors. The "0 spots found" text appears if no seed data exists (expected), not because of API errors.
- **Coach checks**: Load `/strategies` page. Check console for errors. Verify the board card inputs, position selector, and "Solve New Spot" button all render.

### Task: add-deploy-health-monitoring
- **Description**: Add a simple deploy monitoring script that checks key API endpoints and frontend pages are returning 200 after deployment. Create `scripts/deploy-health-check.sh` that curls: `GET /api/v1/health` (backend), `GET /` (frontend), `GET /study` (study page), `POST /api/v1/solver/postflop-strategy` (solver endpoint). Exit 0 only if all checks pass. Integrate into a Makefile `make health-check` target.
- **Success criteria**: `bash scripts/deploy-health-check.sh` exits 0 and checks at least 4 endpoints. `make health-check` works.
- **Coach checks**: Run the script, verify all checks pass. Run `make health-check` and verify the target exists.

### Task: start-solver-docker-service
- **Description**: The solver Docker image was built (via `fix-solver-docker-build` and `fix-solver-protobuf-version`) but the solver container is not running. Only PostgreSQL and Redis are up. Build and start the solver container: `docker compose build solver && docker compose up -d solver`. Verify the solver gRPC port 50051 is listening and the solver health endpoint returns success.
- **Success criteria**: `docker compose ps` shows the solver container as "Up". `curl http://localhost:8000/api/v1/solver/health` returns 200. `curl -s --max-time 5 http://localhost:50051` connects (or returns gRPC response).
- **Coach checks**: Check `docker compose ps` for solver container. Verify solver health endpoint. Check `docker logs gto-wizard-clone-solver-1` for errors.

### Task: add-periodic-health-check-cron
- **Description**: Create a Hermes cron job that runs `make health-check` (or `bash scripts/deploy-health-check.sh`) every 6 hours to proactively detect service degradation. The cron job should report the health check results to the user's origin channel. Name the cron job "gto-wizard-health-check", schedule `0 */6 * * *`.
- **Success criteria**: Cron job exists with name "gto-wizard-health-check", schedule `0 */6 * * *`, pinned to deepseek-v4-flash/opencode-go, delivers to origin.
- **Coach checks**: List cron jobs — verify entry exists with correct schedule and delivery.

### Task: add-solver-e2e-test
- **Description**: Add a playwright e2e test that navigates to the study page, configures a postflop spot (board KsKc3s, position BTN, street flop), clicks "Solve", and verifies the solver response is rendered (action frequencies, EV values). This validates the full stack: frontend → API → solver. Follow the existing e2e test pattern in `apps/web/e2e/`.
- **Success criteria**: `cd apps/web && npx playwright test` includes a passing solver test. The test verifies that solver strategy actions appear in the rendered output.
- **Coach checks**: Run the e2e tests. Verify the solver test specifically passes.

### Task: re-seed-strategy-data
- **Description**: The PostgreSQL database was recreated and the preflop strategy seed data is gone. The strategies page shows "0 spots found" because the strategy lookup returns `Strategy not found` for all queries. Re-run the existing seed script at `apps/api/prisma/seed_preflop_strategies.py` (docs in AGENTS.md Seed Data section) and verify strategy data is available.
- **Success criteria**: `curl "http://localhost:8000/api/v1/strategy/lookup?board=preflop&stack_depth=100&position=UTG"` returns 200 with strategy data (not "Strategy not found"). The `/strategies` page shows available strategies instead of "0 spots found".
- **Coach checks**: Run the seed script, verify the strategy lookup returns real data. Check the strategies page renders data.

### Task: add-push-fold-charts-page
- **Description**: Create a push/fold Nash equilibrium charts page at `/push-fold` that displays standard tournament push/fold ranges by position and stack depth. Use the existing equity calculation infrastructure. Include a table showing push ranges for positions (UTG through SB) at common stack depths (5-20bb). The page should let users select stack depth and position and see the recommended push/fold range.
- **Success criteria**: `curl http://localhost:3000/push-fold` returns 200 with a rendered page showing push/fold chart UI. Navigation has a link to the new page.
- **Coach checks**: Load `/push-fold` page, check for console errors. Verify push/fold ranges are shown for at least 3 stack depths (5bb, 10bb, 15bb).

### Task: add-range-explorer-page
- **Description**: The `RangeGrid.tsx` component exists at `apps/web/src/components/equity/RangeGrid.tsx` but there's no route that uses it. Create a `/range-explorer` page that renders the range matrix with frequency overlay and allows users to explore GTO ranges by position, stack depth, and board texture. Use the existing RangeGrid component and wire it to the strategy-lookup API.
- **Success criteria**: `curl http://localhost:3000/range-explorer` returns 200. The page renders the range grid with frequency colors for at least one position-stack combination.
|- **Coach checks**: Load `/range-explorer` page, verify the range grid renders with frequency coloring. Check for console errors. Verify position selector works.
|
|### Task: auto-seed-strategy-on-db-restart
|- **Description**: The PostgreSQL database loses preflop strategy data when recreated (`docker compose down` + `up`), requiring a manual `make seed-preflop` to restore it. Add a docker-compose init container or a systemd Oneshot service that runs the seed script automatically after PostgreSQL starts. The existing seed script at `apps/api/prisma/seed_preflop_strategies.py` is already idempotent and works — just needs automated invocation.
|- **Success criteria**: After `docker compose down && docker compose up -d`, `curl "http://localhost:8000/api/v1/strategy/lookup?board=preflop&stack_depth=100&position=UTG"` returns strategy data (200) without any manual seeding step.
|- **Coach checks**: Run `docker compose down && docker compose up -d`, then immediately curl the strategy-lookup endpoint and confirm data is populated. Verify the solution doesn't block PostgreSQL startup if the seed fails.
|
|### Task: add-e2e-tests-for-new-pages
|- **Description**: The `/push-fold` and `/range-explorer` pages have no e2e smoke tests. Add Playwright tests in `apps/web/e2e/` following the existing test pattern — at minimum verify each page returns 200 and has no console errors. Name the test files `push-fold.spec.ts` and `range-explorer.spec.ts`.
|- **Success criteria**: `cd apps/web && npx playwright test` includes passing tests for both `/push-fold` and `/range-explorer`. Tests verify pages load with no console errors.
|- **Coach checks**: Run the e2e tests. Verify the new tests pass. Check that the tests follow the existing pattern (matching selector conventions, wait strategies).
|
|### Task: fix-strategy-key-bet-size-parsing
|- **Description**: The `GET /api/v1/strategy/{key}` endpoint in `apps/api/routers/strategy.py` fails with `invalid literal for int() with base 10: '0.5'` when the bet_size component in the strategy key is a float (e.g., `nlh:2:preflop:utg:0.5:100`). The `parse_strategy_key()` function at line 117 naively calls `int(x)` on bet size components. Fix to handle float bet sizes by using `float()` instead of `int()` where appropriate, or by changing the key format to store bet_size as an integer (e.g., 50 for 0.5 = 50% pot).
|- **Success criteria**: `curl http://localhost:8000/api/v1/strategy/nlh:2:preflop:utg:0.5:100` returns strategy data (or appropriate 404) instead of HTTP 500 or "invalid literal for int()". Both integer bet sizes (e.g., 100) and float sizes (0.5) work.
|- **Coach checks**: Test with `/strategy/nlh:2:preflop:utg:0.5:100` and `/strategy/nlh:2:preflop:utg:100:` — both should parse without error. Verify `/api/v1/strategy/lookup` still works (no regression).

### Task: seed-all-stack-depths
- **Description**: The `_auto_seed_strategies()` background task in `apps/api/main.py` only seeds 100bb preflop data. The `seed_preflop_strategies.py` script supports a `stack_depth` argument but isn't called for 50bb, 150bb, or 200bb. Update the auto-seed logic (or add a separate startup task) to seed all common stack depths (50, 100, 150, 200) so the strategy lookup works at multiple stack depths without manual intervention.
- **Success criteria**:
  - After API restart, `curl 'http://localhost:8000/api/v1/strategy-lookup?board=preflop&stack_depth=50&position=UTG'` returns strategy data
  - Same for stack_depth=150 and stack_depth=200
- **Coach checks**:
  - Verify curl returns data for each stack depth after restart
  - Verify the seed is idempotent (safe to re-run on every startup)
  - Check the API startup log for seed confirmation at each depth

### Task: seed-flop-strategies
- **Description**: The strategy lookup endpoint only returns preflop data. Seed GTO strategies for common flop boards (monotone, paired, rainbow, wet, dry) at 100bb. Use the solver engine or hardcoded GTO ranges stored in `apps/api/data/`. The seed script `apps/api/prisma/seed_preflop_strategies.py` should be extended or a new flop seed script created.
- **Success criteria**:
  - `curl 'http://localhost:8000/api/v1/strategy-lookup?board=Kd7h2c&stack_depth=100&position=BTN'` returns strategy data for at least 3 distinct flop boards
- **Coach checks**:
  - Verify the seed script exists and runs without error
  - Verify curl returns actual range data (not 404) for each seeded board
  - Verify the lookup endpoint handles postflop board hashing correctly

### Task: add-missing-stack-depth-to-frontend-position-buttons
- **Description**: The `/study` page position buttons currently show only the effective stack for 100bb (UTG shows "100", SB shows "99.5" for posted blind). The strategy lookup backend now supports 50bb and 150bb. Add a stack depth selector to the study page toolbar so users can switch between common stack depths (50, 100, 150, 200) without needing an API key or URL parameter. Use the existing `GET /api/v1/strategy-lookup/stack-depths` endpoint to list available depths.
- **Success criteria**:
  - The study page has a visible stack depth selector (dropdown or button group) in the toolbar area
  - Selecting 50bb reloads the strategy heatmap with 50bb data
- **Coach checks**:
  - Load the study page and verify the stack depth selector is visible
  - Switch to 50bb and verify the position buttons update their stack labels
  - Check browser console for errors

### Task: seed-flop-strategies-all-depths
- **Description**: The flop strategy seed script (`apps/api/prisma/seed_flop_strategies.py`) only seeds at 100bb. The frontend now has a stack depth selector that lets users pick 50, 100, 150, 200bb, but flop data only exists for 100bb (the strategy lookup returns 100bb data as the closest match when other depths are requested). Extend the seed script to seed flop strategies at 50, 150, and 200bb stack depths as well. Follow the same pattern as the preflop seed script which seeds all depths.
- **Success criteria**:
  - `curl 'http://localhost:8000/api/v1/strategy-lookup?board=Kd7h2c&stack_depth=50&position=BTN'` returns strategy data with `"stack_depth":50`
  - Same for stack_depth=150 and stack_depth=200
- **Coach checks**:
  - Verify the seed is idempotent (safe to re-run)
  - Verify curl returns strategy data with the correct stack_depth for each depth
  - Verify the existing 100bb data isn't duplicated or corrupted

### Task: fix-postflop-street-progression
- **Description**: The postflop training component (`apps/web/src/components/study/PostflopTraining.tsx`) has street navigation (flop→turn→river) but the solver API returns `"Invalid board/street"` when asked to solve for turn with only a 3-card flop board. The component needs to pass the correct board state (4 cards for turn, 5 for river) when advancing streets. Either auto-generate a random next card or let the user select which card comes on the next street.
- **Success criteria**:
  - Postflop training can advance from flop to turn and get solver output for the turn street
  - Postflop training can advance from turn to river and get solver output for the river street
- **Coach checks**:
  - POST `/api/v1/solver/postflop-strategy` with a 4-card board and `street=turn` returns valid actions
  - POST with a 5-card board and `street=river` returns valid actions
  - The UI shows the new board card when advancing streets

### Task: seed-flop-boards-expanded
- **Description**: Only 7 flop boards are currently seeded. Add 10 more flop boards covering a wider variety of textures (high-card, low-card, connected, wet monotone, dry paired, flush draw boards) to give users more training variety. Follow the existing pattern in `apps/api/prisma/seed_flop_strategies.py` — add new board strings to the `FLOP_BOARDS` list and re-run the seed. The solver or hardcoded GTO ranges will generate data for each new board.
- **Success criteria**:
  - `curl 'http://localhost:8000/api/v1/strategy-lookup?board=Ah8h3h&stack_depth=100&position=BTN'` (or any new board) returns strategy data with `"status":"found"`
  - At least 17 total flop boards are seeded (7 original + 10 new)
- **Coach checks**:
  - Verify the seed script runs without error after adding new boards
  - Verify curl returns data for at least 3 of the new boards
  - Verify existing boards still return data (no regression)

### Task: study-page-postflop-e2e-test
- **Description**: After the postflop street progression is fixed, add a Playwright e2e test that validates the full postflop training workflow: load /study page, toggle to postflop mode, configure a spot (board KsKc3s, BTN vs BB, 100bb), solve the spot, verify action buttons render with GTO frequencies, then advance to the turn and verify the board updates. Follow the existing test pattern in `apps/web/e2e/`.
- **Success criteria**:
  - `cd apps/web && npx playwright test` includes a passing postflop study test
  - The test validates: spot configuration, solve response rendering, action button visibility, street advancement
- **Coach checks**:
  - Run the e2e tests and verify the new postflop test passes
  - Check that the test doesn't depend on external solver availability (uses cached strategy data)
  - Verify no console errors appear during the test

### Task: study-page-console-error-audit
- **Description**: The study page loads but may have JavaScript console errors that degrade the user experience. Open the /study page in a headless browser (via Playwright or Puppeteer), capture all console messages (errors, warnings, uncaught exceptions), and fix any that appear. Common issues: missing React keys, undefined API response fields, CSS class mismatches after Tailwind v4 upgrade, deprecated lifecycle method warnings.
- **Success criteria**:
  - Loading `/study` in a headless browser produces 0 console errors
  - 0 uncaught promise rejections
  - Fixes are minimal (no architecture changes)
- **Coach checks**:
  - Run the audit script after fix and verify 0 console errors
  - Check that the preflop/postflop toggle, position buttons, and action buttons all render without errors

---

## Next Batch — Generated by Coach (2026-06-18)

### Task: study-preflop-action-feedback-flow
- **Description**: The preflop study mode has an ActionSelector but the "Check vs GTO" flow is incomplete — after selecting an action and clicking "Check vs GTO", the feedback should show not just correct/incorrect but also the full GTO frequency breakdown (what % of the time GTO takes each action). Add a feedback panel below the action buttons that shows: (1) whether the user's pick matches the GTO action, (2) the full GTO frequency distribution across all actions for reference, and (3) a "Try Again" button that resets the selection.
- **Success criteria**:
  - After selecting an action and clicking "Check vs GTO", a feedback panel appears showing correct/incorrect + full GTO frequency breakdown
  - "Try Again" button resets the selection
  - GTO frequencies are displayed as percentage bars or chips, not just raw numbers
- **Coach checks**:
  - Open /study, click a hand (e.g., AA), select "raise", click "Check vs GTO" → verify feedback shows correct with GTO frequency bars
  - Select "fold" for AA → verify feedback shows incorrect
  - "Try Again" resets to initial state

### Task: study-postflop-gto-comparison-overlay
- **Description**: The postflop training mode's GTO comparison is minimal — after clicking an action, the strategy response should be visually compared side-by-side with the user's choice. Add an overlay or panel that shows: (1) the user's selected action highlighted, (2) the GTO-recommended action with its frequency %, (3) EV difference between user's choice and GTO, (4) color-coding (green = correct, red = suboptimal). This matches the reference image at `docs/reference-study-interface.png` which shows GTO frequencies as micro-chips alongside action buttons.
- **Success criteria**:
  - After selecting a postflop action, a GTO comparison panel appears showing the user's pick vs GTO recommendation
  - GTO frequencies displayed as percentage chips next to each action
  - Visual color coding (green = matches GTO, red = doesn't match)
  - EV difference shown
- **Coach checks**:
  - Navigate to /study → Postflop Training → click "Get GTO Strategy" → select an action → verify GTO comparison renders
  - Verify the GTO comparison panel matches the layout in `docs/reference-study-interface.png`

### Task: study-page-hotkeys
- **Description**: Add keyboard shortcuts for common actions on the study page to speed up training: (1) number keys 1-9 for selecting actions, (2) Space/Enter to check vs GTO, (3) Escape to reset/try again, (4) Arrow keys to navigate the hand matrix. Display a small "Press ? for hotkeys" hint that shows a shortcut overlay when clicked.
- **Success criteria**:
  - Pressing number keys triggers action selection in both preflop and postflop modes
  - Space/Enter triggers "Check vs GTO"
  - Escape resets the current selection
  - Arrow keys move the selected cell in the preflop matrix
  - Hotkey overlay shows all shortcuts
- **Coach checks**:
  - Test each hotkey in preflop mode
  - Test each hotkey in postflop mode
  - Verify the overlay appears on "?" press

### Task: study-session-spot-generator
- **Description**: Add a "Random Spot" button to the study page that generates a random poker scenario for training: (1) random board cards (for postflop), (2) random hero hand, (3) random position, (4) random pot/stack configuration. This lets users do endless training without manually configuring each spot. The generated spot should be solvable by the existing API (either from cached data or the solver).
- **Success criteria**:
  - "Random Spot" button visible in the study toolbar
  - Clicking it generates and loads a random solvable spot
  - The board, hero cards, position, and pot/stack are all populated
  - Action buttons remain functional for the generated spot
- **Coach checks**:
  - Click "Random Spot" → verify a new hand loads with cards, position, and action buttons
  - Click "Random Spot" again → verify a different hand loads
  - Select an action and verify GTO comparison works for the random spot

### Task: study-progress-tracking
- **Description**: Track user performance during study sessions: (1) correct vs incorrect answers, (2) accuracy % per position, (3) accuracy % per action type (bet, call, fold, raise), (4) streak counter, (5) session summary at the end. Store progress in localStorage (no backend needed). Display a small stats panel in the study page toolbar: "15/20 correct (75%) • Streak: 5".
- **Success criteria**:
  - Stats panel visible in the study toolbar showing accuracy and streak
  - Correct/incorrect answers increment the stats
  - Stats persist across page reloads (localStorage)
  - Stats reset when starting a new session (button or after 30min inactivity)
  - Breakdown by position and action type accessible via a "Stats" tab
- **Coach checks**:
  - Answer 5 hands correctly → verify "5/5 correct (100%) • Streak: 5"
  - Answer 1 incorrectly → verify "6/6 correct (83%) • Streak: 0"
  - Reload page → verify stats persist
  - Click "New Session" → verify stats reset to 0

---

## Visual Comparison Tasks (do these FIRST — they unblock everything)

### Task: visual-study-preflop-match-reference
- **Description**: Load `docs/reference-study.png` via `vision_analyze` to understand the target preflop study interface. Then load `https://wiz.codeovertcp.com/study` via `browser_navigate` and take a screenshot with `browser_vision`. Compare the two and fix ALL visual gaps. Key elements the reference likely includes:
  1. **Styled card suits** — hearts/diamonds in red, spades/clubs in white/black on dark background
  2. **Proper hand matrix** — 13×13 grid with clear color coding, proper font sizes, hover states
  3. **Position buttons — large, clear labels**, active position with green border/highlight
  4. **Stack depth selector — pill buttons** with active state
  5. **Right panel — "Your Action" section** with large FOLD/CALL/RAISE/ALL IN buttons
  6. **Action buttons should show GTO frequency micro-chips** (small colored badges with %)
  7. **Hand combo grid** showing individual card combos with styled suits
  8. **Check vs GTO flow** working end-to-end
  9. **Overall spacing and typography** matching the reference density
  
  Make as many commits as needed — each visual fix should be a separate commit.
- **Success criteria**:
  - Live `/study` page visually matches `docs/reference-study.png` for the preflop mode
  - All interactive elements (buttons, matrix, action selector) work correctly
  - No elements are cut off or below the fold
- **Coach checks**:
  - `vision_analyze` the reference screenshot and the live page side by side
  - Verify color coding, spacing, button sizes, card rendering all match
  - Test the full interaction flow: click hand → select action → check vs GTO → feedback

### Task: visual-study-postflop-match-reference
- **Description**: Load `docs/reference-study-interface.png` via `vision_analyze`. Switch `/study` to "Postflop Training" mode via browser. Compare and fix ALL visual gaps. Key elements:
  1. **Board cards** — styled playing cards with rank + suit, proper colors
  2. **Street breadcrumb** — PREFLOP → FLOP → TURN → RIVER with active street highlighted
  3. **Action buttons** — CHECK, BET 33%/50%/75%/125%, FOLD, CALL, RAISE 50%/100%, ALL IN
  4. **Each button shows** chip amount + pot % + GTO frequency
  5. **Position column** with active player green highlight
  6. **GTO comparison overlay** after selecting an action
  7. **Configure Spot panel** for custom scenarios
- **Success criteria**:
  - Live `/study` postflop mode visually matches `docs/reference-study-interface.png`
  - All action buttons render with correct labels and GTO frequencies
  - Board cards render as styled playing cards
- **Coach checks**:
  - `vision_analyze` reference vs live page
  - Test full postflop flow: configure spot → get GTO → select action → compare

---

## Next Batch — Generated by Coach (2026-06-19)

### Task: solutions-frontend-page
- **Description**: Create a `/solutions` frontend page at `apps/web/src/app/solutions/page.tsx`. The reference image at `docs/reference-solutions.png` shows the target layout. The Solutions page should provide a browsable library of pre-computed GTO solutions organized by game type (NLH, PLO, etc.), position, and board texture. Use the existing strategy API (`GET /api/v1/strategy/lookup`) to list available solutions. Include: (1) a search/filter bar, (2) a grid or list of solution cards showing board, position, stack depth, and key actions, (3) click-to-expand for full strategy details.
- **Success criteria**:
  - `curl http://localhost:3000/solutions` returns 200 with rendered HTML
  - Page renders a solutions browser UI with search/filter controls
  - Solution cards display board, position, and stack depth
  - No console errors
- **Coach checks**:
  - Load `/solutions` page, verify it returns 200
  - Check for console errors
  - Verify the page matches the general layout of `docs/reference-solutions.png`
  - Verify search/filter controls render

### Task: equity-variant-2-7td-page
- **Description**: Replace the stub at `apps/web/src/app/equity/2-7td/page.tsx` with a functional Deuce-to-Seven Triple Draw equity calculator. The stub currently shows "under development" via the `VariantStubPage` component. Build a proper calculator that: (1) accepts two 2-7 TD hand inputs (5 cards each, comma-separated), (2) calls the backend equity API or uses client-side calculation, (3) displays equity % for each hand, (4) shows hand rankings. Reference the existing `/equity` page for the general calculator layout pattern.
- **Success criteria**:
  - `curl http://localhost:3000/equity/2-7td` returns 200 with a functional calculator UI
  - Users can input two hands and see equity results
  - No "under development" stub text
- **Coach checks**:
  - Load `/equity/2-7td`, input two hands, verify equity calculation works
  - Check for console errors
  - Verify the page follows the same design pattern as other equity pages

### Task: equity-variant-2-7sd-page
- **Description**: Replace the stub at `apps/web/src/app/equity/2-7sd/page.tsx` with a functional Deuce-to-Seven Single Draw equity calculator. Same pattern as 2-7td but for single draw variant. Build a proper calculator with hand inputs, equity display, and hand rankings.
- **Success criteria**:
  - `curl http://localhost:3000/equity/2-7sd` returns 200 with a functional calculator UI
  - Users can input two hands and see equity results
  - No "under development" stub text
- **Coach checks**:
  - Load `/equity/2-7sd`, input two hands, verify equity calculation works
  - Check for console errors

### Task: equity-variant-plo5-page
- **Description**: Replace the stub at `apps/web/src/app/equity/plo5/page.tsx` with a functional 5-card PLO equity calculator. The existing `/equity/omaha/page.tsx` can serve as a reference for the general Omaha calculator layout. Build a proper calculator that accepts two PLO5 hands (5 cards each) and a board, and displays equity % for each hand.
- **Success criteria**:
  - `curl http://localhost:3000/equity/plo5` returns 200 with a functional calculator UI
  - Users can input two PLO5 hands and see equity results
  - No "under development" stub text
- **Coach checks**:
  - Load `/equity/plo5`, input two hands, verify equity calculation works
  - Check for console errors
  - Verify the page follows the same design pattern as other equity pages

### Task: analyze-viewer-functional-page
- **Description**: The `/analyze/viewer` page at `apps/web/src/app/analyze/viewer/page.tsx` is a 39-line stub with no real functionality. Build a functional hand history viewer that: (1) accepts hand history text input (paste or file upload), (2) parses the hand history to extract key details (players, actions, board, pot), (3) displays the hand in a structured format with street-by-street breakdown, (4) integrates with the existing analyze API endpoints if available. Reference the existing `/analyze/hands/page.tsx` for the general analyze page design pattern.
- **Success criteria**:
  - `curl http://localhost:3000/analyze/viewer` returns 200 with a functional hand viewer UI
  - Users can paste a hand history and see it parsed into a structured display
  - Street-by-street breakdown shows actions, pot sizes, and board cards
  - No "No hand selected" placeholder as the only content
- **Coach checks**:
  - Load `/analyze/viewer`, paste a sample hand history, verify it parses and displays
  - Check for console errors
  - Verify the page design matches the analyze section style

### Task: equity-variant-omaha8-page
- **Description**: Replace the stub at `apps/web/src/app/equity/omaha/page.tsx` with a functional Omaha Hi-Lo 8-or-Better equity calculator. The existing `/equity/plo5/page.tsx` can serve as a reference for the general equity calculator layout. Build a proper calculator that accepts two Omaha hands (4 cards each) and a board, and displays equity % for each hand (with hi/lo split display).
- **Success criteria**:
  - `curl http://localhost:3000/equity/omaha` returns 200 with a functional calculator UI
  - Users can input two Omaha hands and see equity results
  - No "under development" stub text
  - Hi/lo equity split is displayed
- **Coach checks**:
  - Load `/equity/omaha`, input two hands, verify equity calculation works
  - Check for console errors
  - Verify the page follows the same design pattern as other equity pages

### Task: equity-variant-stud8-page
- **Description**: Replace the stub at `apps/web/src/app/equity/stud8/page.tsx` with a functional Seven Card Stud Hi-Lo equity calculator. Reference the existing equity calculator pages for layout. Build a calculator that accepts two Stud hands and displays equity % with hi/lo split.
- **Success criteria**:
  - `curl http://localhost:3000/equity/stud8` returns 200 with a functional calculator UI
  - Users can input two Stud hands and see equity results
  - No "under development" stub text
- **Coach checks**:
  - Load `/equity/stud8`, input two hands, verify equity calculation works
  - Check for console errors
  - Verify the page follows the same design pattern as other equity pages

### Task: analyze-leaks-functional-page
- **Description**: The `/analyze/leaks` page exists but may have limited functionality. Review the page at `apps/web/src/app/analyze/leaks/page.tsx` and enhance it to provide meaningful leak detection analysis. Features: (1) connect to the analyze API to identify common leaks, (2) display leak categories with severity indicators, (3) show specific hand examples where leaks occurred, (4) provide actionable improvement suggestions. Reference the existing analyze section design patterns.
- **Success criteria**:
  - `curl http://localhost:3000/analyze/leaks` returns 200 with functional leak analysis UI
  - Page displays leak categories with severity indicators
  - Users can see specific examples and improvement suggestions
- **Coach checks**:
  - Load `/analyze/leaks`, verify leak categories render
  - Check for console errors
  - Verify the page design matches the analyze section style

---

## Next Batch — Generated by Coach (2026-06-19)

### Task: trainer-functional-page
- **Description**: Create a `/trainer` frontend page at `apps/web/src/app/trainer/page.tsx`. The reference image at `docs/reference-trainer.png` shows the target layout. The Trainer page should provide an interactive GTO training experience distinct from the study mode — focused on timed drills, spaced repetition, and skill assessment. Use the existing quiz API (`GET /api/v1/quiz/random`) or strategy API to generate training spots. Include: (1) a mode selector (timed drill, untimed practice, assessment), (2) progressive difficulty, (3) performance scoring and streaks, (4) session summary with areas for improvement.
- **Success criteria**:
  - `curl http://localhost:3000/trainer` returns 200 with rendered HTML
  - Page renders a trainer interface with mode selector and training spots
  - No console errors
- **Coach checks**:
  - Load `/trainer` page, verify it returns 200
  - Check for console errors
  - Verify the page matches the general layout of `docs/reference-trainer.png`
  - Verify mode selector renders

### Task: equity-razz-functional-page
- **Description**: Review the `/equity/razz` page at `apps/web/src/app/equity/razz/page.tsx` against the reference image at `docs/reference-equity.png`. The Razz (7-card stud low) equity calculator should allow users to input two Razz hands and see equity results. Ensure the page has proper hand input, equity calculation, and visual display matching the project's design patterns.
- **Success criteria**:
  - `curl http://localhost:3000/equity/razz` returns 200 with a functional calculator UI
  - Users can input two Razz hands and see equity results
  - No console errors
- **Coach checks**:
  - Load `/equity/razz`, verify calculator works
  - Check for console errors
  - Verify the page follows the same design pattern as other equity pages

### Task: practice-page-enhancement
- **Description**: Review and enhance the `/practice` page at `apps/web/src/app/practice/page.tsx` against the reference image at `docs/reference-practice.png`. The practice page should offer structured GTO training exercises with progress tracking. Identify gaps between the current implementation and the reference, and fix them. Focus on: (1) training exercise variety, (2) progress indicators, (3) feedback quality, (4) navigation between exercise types.
- **Success criteria**:
  - `curl http://localhost:3000/practice` returns 200 with enhanced practice UI
  - Page shows training exercises with progress indicators
  - No console errors
- **Coach checks**:
  - Load `/practice`, verify training exercises render
  - Check for console errors
  - Compare against `docs/reference-practice.png`
---

## Next Batch — Generated by Player Recovery (2026-06-19)

### Task: fix-solver-postflop-response-dedup
- **Description**: The `POST /api/v1/solver/postflop-strategy` endpoint returns 1170+ duplicate action entries instead of ~6 unique actions. The solver iterates over all infosets and emits a `StrategyAction` for every (infoset, action) pair, producing massive duplication. Fix by deduplicating actions by name after solving — keep the maximum frequency for each unique action name. Also deduplicate the cached responses.
- **Success criteria**:
  - `curl -s -X POST http://localhost:8000/api/v1/solver/postflop-strategy -H 'Content-Type: application/json' -d '{"board":"KsKc3s","position":"BTN","street":"flop","pot_size":5.5,"stack_depth":97.5}'` returns ≤20 unique actions
  - Each action has a unique `action` field value (no duplicates)
  - Both "cached" and "live-solver" sources return deduplicated results
- **Coach checks**:
  - Verify the response contains ≤20 actions
  - Verify no duplicate action names exist
  - Verify the endpoint still returns valid data for river and turn streets

### Task: update-features-yaml-to-match-reality
- **Description**: FEATURES.yaml has 25 entries marked `status: missing` that are actually implemented. Update to reflect reality: PLO4 page works, Hand History page works (1044 lines), PostflopTraining.tsx exists (935 lines) with all sub-features, POST /api/v1/solver/postflop-strategy works, equity variant pages (2-7td, 2-7sd, plo5, stud8, razz) all functional. Verify each with curl before marking present.
- **Success criteria**:
  - FEATURES.yaml has 0 `status: missing` entries
  - Each page marked `present` returns 200 via curl
  - `last_audited` field updated to 2026-06-19
- **Coach checks**:
  - Verify FEATURES.yaml has no `missing` entries
  - Spot-check 3 pages marked present with curl

### Task: study-page-postflop-visual-polish
- **Description**: The PostflopTraining component exists but needs visual polish to match `docs/reference-study-interface.png`. Load the reference image, compare with live `/study` in postflop mode, fix visual gaps: board card styling, action button layout, street breadcrumb, pot size display, GTO comparison overlay.
- **Success criteria**:
  - Postflop mode board cards render with styled suits
  - Action buttons clearly laid out with proper spacing
  - Street breadcrumb shows PREFLOP → FLOP → TURN → RIVER
  - No console errors in postflop mode
- **Coach checks**:
  - Load `/study` in postflop mode, verify visual quality
  - Compare against reference screenshot

### Task: update-features-yaml-hand-history
- **Description**: FEATURES.yaml marks `/hand-history` and all its components as `status: missing`, but the page exists (1044 lines at `apps/web/src/app/hand-history/page.tsx`), returns HTTP 200, and has working API endpoints (`POST /api/v1/hh/import` present). Update FEATURES.yaml to mark `/hand-history` and its components (hand-table, batch-import, hand-viewer, search-filter) as `present`. Also update `POST /api/v1/solver/postflop-strategy` from `missing` to `present` (the dedup fix is complete). Verify each with curl before marking.
- **Success criteria**:
  - `/hand-history` route in FEATURES.yaml changed from `missing` to `present`
  - All 4 hand-history components marked `present`
  - `POST /api/v1/solver/postflop-strategy` marked `present`
  - `last_audited` field updated to today's date
- **Coach checks**:
  - Verify FEATURES.yaml changes are correct
  - Spot-check hand-history page returns 200

### Task: e2e-test-coverage-expansion
- **Description**: The project has Playwright configured but E2E test coverage is sparse. Add E2E tests for key user flows that have none: (1) `/study` preflop flow — click a position, select a stack depth, verify hand matrix renders; (2) `/hand-history` page — verify page renders with hand table; (3) `/quiz` page — verify quiz interface loads. Each test should navigate to the page, verify key elements exist via snapshot, and check for console errors.
- **Success criteria**:
  - At least 3 new E2E test files added (or existing ones extended)
  - Tests pass with `npx playwright test --reporter=list`
  - Each test verifies page renders (no blank/error state) and checks console for errors
- **Coach checks**:
  - Verify tests actually run (not skipped due to config issues)
  - Check tests use relative selectors, not hardcoded pixel coordinates
  - Verify no vitest/Playwright runner conflict in test files

### Task: study-page-mobile-responsive
- **Description**: The study page (`/study`) works on desktop but needs mobile responsive verification and fixes. The nav bar uses `gap-4px` with many items causing horizontal overflow on small screens. The 13×13 hand matrix and action buttons may not fit on mobile viewports. Test at 375px and 768px breakpoints, fix overflow issues, ensure touch targets are ≥44px.
- **Success criteria**:
  - `/study` renders without horizontal overflow at 375px width
  - Hand matrix scales or scrolls gracefully on mobile
  - Action buttons are tappable (≥44px touch targets)
  - No console errors at mobile viewport
- **Coach checks**:
  - Verify responsive fixes don't break desktop layout
  - Check that the nav bar doesn't overflow on mobile

### Task: push-fold-page-functional
- **Description**: The `/push-fold` page returns 200 but needs verification that the push/fold Nash equilibrium table actually renders data. Check if the page displays the interactive push/fold chart with position buttons and stack depth selector, or if it's a data-empty shell. If data is missing, wire up the solver endpoint or seed data to populate the table.
- **Success criteria**:
  - Push/fold table renders with actual Nash equilibrium data (not empty)
  - Position buttons (all 9 positions) and stack depth selector work
  - No console errors
- **Coach checks**:
  - Verify the page shows real data, not an empty table
  - Test interaction: click a position, verify the table updates

### Task: range-explorer.page-functional
- **Description**: The `/range-explorer` page returns 200 but needs verification that the interactive range builder works. Check if the 13×13 grid responds to clicks (toggle hands in/out of range), if the range string input works, and if the equity calculation triggers. Fix any broken interactions.
- **Success criteria**:
  - Hand grid cells toggle between in-range/out-of-range on click
  - Range string input updates the grid display
  - Equity calculation triggers when board cards are provided
  - No console errors
- **Coach checks**:
  - Verify grid interaction works
  - Check that range string parsing handles standard notation (AA, AKs, etc.)

### Task: study-postflop-board-display
- **Description**: The `/study` page postflop mode is missing the board card display component. Add a board card renderer that shows styled playing cards (rank + suit, red for hearts/diamonds, black for spades/clubs) for the flop (3 cards), turn (4 cards), and river (5 cards). The board should render below the street breadcrumb and above the action buttons. Use the existing card rendering utilities in `packages/poker-core/` for suit/rank display.
- **Success criteria**:
  - Board cards render as styled playing cards on the `/study` postflop view
  - Cards display correct rank and suit with appropriate colors (red for ♥♦, black for ♠♣)
  - Board updates when street advances (flop→turn→river)
  - No console errors
- **Coach checks**:
  - Verify board cards render with correct suit colors
  - Check that the board updates correctly on street progression
  - Verify the component doesn't break preflop mode

### Task: study-postflop-action-buttons
- **Description**: The `/study` page postflop mode needs action buttons: CHECK, BET (33%/50%/75%/125% pot), FOLD, CALL, RAISE (50%/100%), ALL IN. Each button should display the action label, chip amount, pot %, and GTO frequency micro-chip. Buttons should be grouped by type (check/fold/call vs bet vs raise vs all-in) with appropriate colors (green=check, red=bet, blue=call, orange=raise, purple=all-in). Wire up click handlers that record the user's action and trigger the GTO comparison overlay.
- **Success criteria**:
  - All action buttons render on the `/study` postflop view
  - Each button shows label + chip amount + pot % + GTO frequency
  - Clicking a button records the action and shows the GTO comparison overlay
  - Buttons are color-coded per the design spec
  - No console errors
- **Coach checks**:
  - Verify all 11 action buttons render (CHECK, BET×4, FOLD, CALL, RAISE×2, ALL IN)
  - Test that clicking an action triggers the comparison overlay
  - Check button layout matches the reference screenshot spacing

### Task: study-postflop-street-navigation
- **Description**: The `/study` page postflop mode needs a street breadcrumb navigation bar showing PREFLOP → FLOP → TURN → RIVER with the active street highlighted in green (#00C853). Clicking a completed street should navigate back to that street's state. The breadcrumb should sit above the board display and below the pot size indicator.
- **Success criteria**:
  - Street breadcrumb renders with all 4 streets on the `/study` postflop view
  - Active street is highlighted in green
  - Clicking a completed street navigates back to that state
  - Breadcrumb is hidden in preflop mode (or shows only PREFLOP as active)
  - No console errors
- **Coach checks**:
  - Verify breadcrumb renders correctly in postflop mode
  - Test street navigation (click FLOP after reaching TURN, verify state)
  - Check that preflop mode doesn't show the breadcrumb (or shows minimal version)

### Task: study-postflop-gto-comparison-overlay
- **Description**: After the user selects an action on the postflop study page, show a GTO comparison overlay that displays: (1) the user's chosen action, (2) the GTO optimal action with frequency %, (3) whether the user's action matches GTO (green checkmark) or not (red X), (4) the EV difference. The overlay should appear as a modal or slide-up panel. This is the core feedback mechanism for the training mode.
- **Success criteria**:
  - GTO comparison overlay appears after user selects any action
  - Overlay shows user action, GTO optimal action, correct/incorrect indicator, and EV diff
  - Overlay can be dismissed (click outside or X button) to continue to next street/hand
  - No console errors
- **Coach checks**:
  - Verify overlay appears after clicking an action button
  - Check that correct/incorrect indicator matches the GTO data
  - Test overlay dismissal and continuation flow

### Task: study-postflop-pot-and-history
- **Description**: Add two supporting UI elements to the postflop study page: (1) a pot size tracker that displays the current pot size and effective stack depth, positioned above the street breadcrumb; (2) an action history timeline showing the sequence of actions taken in the current hand (e.g., "PREFLOP: UTG raises 2.5bb → BTN calls" → "FLOP: UTG bets 33% → BTN calls"). These elements complete the postflop study interface.
- **Success criteria**:
  - Pot size display shows current pot and effective stack depth
  - Action history timeline updates after each action with street + player + action + sizing
  - Both elements are positioned correctly per the reference design
  - No console errors
- **Coach checks**:
  - Verify pot size updates correctly after each action
  - Check action history shows correct sequence with proper formatting

### Task: fix-equity-calculator-timeout
- **Description**: The `POST /api/v1/equity/calculate` and `GET /api/v1/equity/calculate` endpoints time out (15s+) because the Monte Carlo equity calculation runs synchronously, blocking the FastAPI event loop. Fix by making the equity calculation async (using `asyncio.to_thread` or `run_in_executor`) so the API responds within a reasonable time (<5s).
- **Success criteria**:
  - `curl -X POST http://localhost:8000/api/v1/equity/calculate -H "Content-Type: application/json" -d '{"hero":"AhKh","villain":"JJ,AKs","board":""}'` returns a valid JSON response within 5 seconds
  - `curl "http://localhost:8000/api/v1/equity/calculate?hero=AhKh&villain=JJ,AKs"` returns within 5 seconds
  - Response contains `equity`, `wins`, `ties`, `total` fields
- **Coach checks**:
  - Time the curl command: should complete in <5s
  - Verify response structure matches EquityResponse schema
  - Check that concurrent requests don't block each other

### Task: fix-e2e-test-runner
- **Description**: All 16 Playwright E2E test files fail with "Playwright Test did not expect test.describe() to be called here" because the test files import vitest globals (`describe`, `it`, `expect`) which conflict with Playwright's runner. Fix by separating the Playwright test configuration from vitest, ensuring Playwright tests use `@playwright/test` imports only.
- **Success criteria**:
  - `npx playwright test --reporter=list` runs without the `test.describe()` error
  - At least the study page E2E test passes (navigates to /study, interacts with the page)
  - `npx vitest run` still works for any unit tests
- **Coach checks**:
  - Run `npx playwright test --reporter=list` and verify no `test.describe()` errors
  - Check that Playwright test files import from `@playwright/test` not `vitest`
  - Verify vitest config excludes e2e directory

### Task: study-page-accessibility-audit
- **Description**: The study page (/study) has no accessibility features — no ARIA labels, no keyboard navigation, no screen reader support. Add proper ARIA attributes to all interactive elements (position buttons, hand matrix cells, action buttons, street breadcrumb), implement keyboard navigation (Tab/Enter/Space to interact), and ensure focus indicators are visible.
- **Success criteria**:
  - All interactive elements have descriptive `aria-label` or `aria-labelledby`
  - Hand matrix cells are navigable with arrow keys, selectable with Enter/Space
  - Action buttons reachable via Tab key, with visible focus ring
  - Street breadcrumb has `role="navigation"` and `aria-label="Street navigation"`
  - No new console errors
- **Coach checks**:
  - Tab through the study page — verify all interactive elements are reachable
  - Check aria-labels on position buttons, action buttons, hand cells
  - Verify keyboard can select a hand and choose an action

### Task: api-response-time-optimization
- **Description**: Several API endpoints are slow due to synchronous computation. Profile the slowest endpoints (equity calc, solver, strategy lookup) and optimize: add Redis caching for repeated queries, use connection pooling for database queries, and ensure all I/O-bound operations are async. Target: all GET endpoints respond <200ms for cached data.
- **Success criteria**:
  - `GET /api/v1/strategy-lookup` responds <200ms (cached)
  - `GET /api/v1/courses` responds <100ms
  - `GET /api/v1/quiz/random` responds <100ms
  - Redis caching is configured and working (verify with repeated queries)
- **Coach checks**:
  - Time repeated calls to strategy-lookup (second call should be faster)
  - Check Redis is running and caching keys exist
  - Verify no regression in response correctness

### Task: course-lesson-content-management
- **Description**: The courses page shows course listings but clicking a course doesn't show lesson content. Build the course detail view: when a user clicks a course card, navigate to `/courses/{id}` which shows the course overview, lesson list with progress indicators, and a "Start Lesson" button. Each lesson should have a simple content view (text + embedded quiz spot from the quiz API).
- **Success criteria**:
  - `/courses/{id}` page exists and shows course details + lesson list
  - Lessons show completion status (from UserProgress API)
  - Clicking "Start Lesson" shows lesson content (can be text/markdown placeholder)
  - Progress updates when user completes a lesson
- **Coach checks**:
  - Navigate to `/courses` → click a course → verify detail page loads
  - Check lesson list shows correct count matching API data
  - Verify progress tracking works (complete a lesson, check progress updates)
  - Verify layout doesn't overflow on standard desktop viewport (1280px+)

### Task: fix-course-detail-api-500
- **Description**: The `GET /api/v1/courses/{id}` endpoint returns HTTP 500 with error `sqlite3.OperationalError: no such column: lessons.video_url`. The `Lesson` model in `apps/api/models/course_models.py` has a `video_url` column, but the SQLite database schema is missing it. Fix by either: (a) adding the missing column via ALTER TABLE, or (b) rebuilding the database with the correct schema, or (c) making the column nullable with a default. The fix should make `curl http://localhost:8000/api/v1/courses/{id}` return a valid JSON response with course details and lessons array.
- **Success criteria**:
  - `curl http://localhost:8000/api/v1/courses/{id}` returns 200 with valid JSON
  - Response includes `lessons` array with lesson data
  - The `/courses/{id}` frontend page loads and displays course content (not the error state)
- **Coach checks**:
  - Verify the API returns 200 with course data for a known course ID
  - Check the lessons array is populated
  - Verify the frontend page renders course content without error

### Task: fix-lessons-table-schema
- **Description**: The `lessons` table in the SQLite database is out of sync with the SQLAlchemy model. The model defines columns (`video_url`, `quiz_data`, etc.) that don't exist in the actual database. Write and run a schema migration script that adds all missing columns to the `lessons` table. Check all other tables (`courses`, `user_progress`, etc.) for similar mismatches. The script should be idempotent (safe to run multiple times).
- **Success criteria**:
  - All model columns exist in the database schema
  - `GET /api/v1/courses/{id}` returns 200 with lessons
  - `GET /api/v1/courses/lessons/{lesson_id}` returns 200
  - No data loss — existing data is preserved
- **Coach checks**:
  - Run the migration script and verify it completes without errors
  - Check all course-related endpoints return 200
  - Verify existing course/lesson data is intact

### Task: study-postflop-visual-match-reference
- **Description**: Compare the live `/study` page (postflop mode) against `docs/reference-study-interface.png`. The reference shows: board cards as styled playing cards (rank + suit, red for hearts/diamonds), street breadcrumb (PREFLOP → FLOP → TURN → RIVER), pot size display, action buttons with chip amount + pot % + GTO frequency, and GTO comparison overlay. Identify specific visual gaps and fix them iteratively.
- **Success criteria**:
  - Board cards render as styled playing cards with correct colors (red for hearts/diamonds)
  - Street breadcrumb shows all 4 streets with active street highlighted
  - Action buttons show chip amount + pot % + GTO frequency
  - GTO comparison overlay appears after user selects an action
  - Layout matches reference spacing and sizing
- **Coach checks**:
  - Navigate to `/study`, switch to postflop mode, deal a flop
  - Verify board cards look like playing cards (not plain text)
  - Click an action button and verify GTO comparison overlay appears
  - Check street breadcrumb highlights active street

### Task: courses-page-visual-match-reference
- **Description**: Compare the live `/courses` page against `docs/reference-courses.png`. The reference shows course cards with specific layout: thumbnail area, title, description, progress bar, difficulty badge, and metadata. Identify gaps and fix them. Also verify the course detail page (`/courses/{id]}`) layout matches the reference once the API is fixed.
- **Success criteria**:
  - Course cards match reference layout (thumbnail, title, description, progress, metadata)
  - Difficulty badges show correct colors (green=beginner, yellow=intermediate, red=advanced)
  - Progress bars render correctly
  - Course detail page has proper header, lesson sidebar, and content area
- **Coach checks**:
  - Navigate to `/courses` and compare card layout against reference
  - Click a course and verify detail page layout
  - Check difficulty badge colors match spec

### Task: fix-icm-api-route-prefix
- **Description**: The ICM API router is mounted at `/icm` but the frontend calls `/api/v1/icm/calculate`. The router in `apps/api/routers/icm.py` has `prefix="/icm"` but needs `prefix="/api/v1/icm"` to match the frontend's `useICMCalculator.ts` which calls `/api/v1/icm/calculate`. Other routers (equity, solver, etc.) include `/api/v1` in their prefix — ICM is the outlier.
- **Success criteria**:
  - `curl -X POST http://localhost:8000/api/v1/icm/calculate -H "Content-Type: application/json" -d '{"prizes":[1000,600,400],"stacks":[10000,8000,7000,5000]}'` returns a valid ICM calculation response (not 404)
  - The `/icm` page on the live site can call the API without 404
- **Coach checks**:
  - Verify the route prefix is `/api/v1/icm` in `apps/api/routers/icm.py`
  - Test the calculate endpoint returns ICM results
  - Confirm no other routes broke (check equity, solver still work)

### Task: icm-page-visual-match-reference
- **Description**: Compare the live `/icm` page against `docs/reference-icm.png`. The reference shows: prize pool panel, chip stack display, bubble pressure indicator, ICM results table with $EV and chip EV columns. Identify gaps and fix them.
- **Success criteria**:
  - Prize pool panel matches reference layout
  - ICM results table shows $EV and chip EV columns
  - Bubble pressure indicator renders correctly
  - Page is responsive on mobile
- **Coach checks**:
  - Navigate to `/icm` and compare against reference
  - Verify ICM calculation works end-to-end (API + frontend)
  - Check results table formatting

### Task: fix-e2e-test-runner
- **Description**: All 16 Playwright E2E test files fail with `Playwright Test did not expect test.describe() to be called here` — a vitest/Playwright globals conflict. The E2E test files import `describe`, `it`, `expect` from vitest instead of Playwright's test runner. Fix the test setup so E2E tests can actually run.
- **Success criteria**:
  - `npx playwright test --reporter=list` runs without crashing
  - At least the basic smoke tests pass (home page loads, study page loads)
  - E2E test files use Playwright's `test.describe`/`test` not vitest's `describe`/`it`
- **Coach checks**:
  - Run `npx playwright test --reporter=list` and verify tests execute
  - Check that test files import from `@playwright/test` not `vitest`
  - Verify at least 3 tests pass

### Task: solutions-page-visual-match-reference
- **Description**: Compare the live `/solutions` page against `docs/reference-solutions.png`. The reference shows: solution cards with board display, position badge, stack depth, spot category, and GTO action breakdown. Identify gaps and fix them.
- **Success criteria**:
  - Solution cards match reference layout (board display, position badge, stack depth)
  - Spot category filters work
  - GTO action breakdown shows frequencies
  - Search functionality works
- **Coach checks**:
  - Navigate to `/solutions` and compare against reference
  - Test search and filter functionality
  - Verify GTO action breakdown renders correctly

---

## Next Batch — Generated by Player Recovery (2026-06-23)

### Task: practice-page-replace-mock-data
- **Description**: The `/practice` page at `apps/web/src/app/practice/page.tsx` uses a `mockSpot()` function that generates entirely random data — GTO frequencies, EV values, board cards, hero hands are all `Math.random()` placeholders. Replace with real data from the quiz API (`GET /api/v1/quiz/random`) and strategy API (`POST /api/v1/solver/postflop-strategy`). The page should fetch real training spots from the backend instead of generating fake ones. Keep the UI/UX as-is — only replace the data source.
- **Success criteria**:
  - `mockSpot()` function is removed from the page
  - Practice page fetches spots from `GET /api/v1/quiz/random` API
  - GTO frequencies and EV values come from real solver/quiz data, not Math.random()
  - Board cards and hero hands come from real quiz spot data
  - If quiz API is unavailable, show a loading/error state (not fake data)
  - 0 console errors
- **Coach checks**:
  - Load `/practice` page and verify spots show real data (not random)
  - Verify GTO frequencies look realistic (e.g., 80%+ for obvious plays, not random 30-80%)
  - Check that board cards match what the quiz API returns
  - Verify 0 console errors in browser

### Task: study-page-equity-chart-real-values
- **Description**: The study page (`apps/web/src/app/study/page.tsx` line 2001) uses `Math.random()` for bar heights in the equity chart visualization below the hand matrix. Replace with real equity values from the solver API response. The bar chart should show actual per-combo equity breakdown, not random heights.
- **Success criteria**:
  - Bar heights in equity chart come from real solver equity data
  - Chart updates when switching hands/positions
  - Shows "—" or empty state when solver data is loading
  - No regression in other study page features
- **Coach checks**:
  - Navigate to `/study`, select a hand, verify equity chart bars look consistent (not random on each render)
  - Switch hands and verify chart updates with new data
  - Check 0 console errors

---

## Next Batch — Generated by Coach Review (2026-06-20)

### Task: fix-quiz-spots-table-missing
- **Description**: The `quiz_spots` table does not exist in the PostgreSQL database, causing 500 errors on `GET /api/v1/quiz/random`, `GET /api/v1/quiz/categories`, and `GET /api/v1/spots`. The `fix_tables.py` script uses SQLite (wrong database), and `seed.py` creates `quiz_spots` with empty parentheses (no columns). Create the `quiz_spots` table in PostgreSQL with the correct schema (id, game_type, category, difficulty, board, position, pot_size, stack_depth, street, correct_action, action_frequencies, ev_data, created_at) and populate it with seed data.
- **Success criteria**:
  - `curl http://localhost:8000/api/v1/quiz/random` returns 200 with a valid quiz spot
  - `curl http://localhost:8000/api/v1/quiz/categories` returns 200 with category list
  - `curl "http://localhost:8000/api/v1/spots?limit=1"` returns 200 (depends on community_spots too)
  - At least 5 quiz spots seeded
- **Coach checks**:
  - Verify quiz/random returns a spot with correct_action and action_frequencies
  - Check that quiz/categories returns all categories
  - Confirm no 500 errors on quiz endpoints

### Task: fix-community-spots-table-missing
- **Description**: The `community_spots` table does not exist in the PostgreSQL database, causing 500 on `GET /api/v1/spots`. The model exists at `apps/api/models/spots.py` (id, title, description, board, board_type, position, pot_size, stack_depth, game_type, author_id, author_name, likes, forks, is_published, created_at, updated_at) but the table was never created. Create the table in PostgreSQL and seed 2-3 sample community spots.
- **Success criteria**:
  - `curl "http://localhost:8000/api/v1/spots?limit=1"` returns 200 with a list of spots
  - Community spots table exists in PostgreSQL
  - At least 2 sample spots seeded
- **Coach checks**:
  - Verify /api/v1/spots returns spots array (not 500)
  - Check that spot detail endpoint works: GET /api/v1/spots/{id}
  - Confirm the table schema matches the SQLAlchemy model

---

## Next Batch — Generated by Coach Review (2026-06-20)

### Task: start-solver-container
- **Description**: The solver service is defined in docker-compose.yml but the container is not running. Only postgres and redis are up. The solver provides live CFR solving via gRPC on port 50051. Build and start the solver container: `cd /home/sc/repos/gto-wizard-clone && docker compose build solver && docker compose up -d solver`. Verify with `docker compose ps` that the solver container shows "Up".
- **Success criteria**:
  - `docker compose ps` shows solver container as "Up"
  - `curl -s --max-time 5 http://localhost:50051` connects (or returns gRPC response)
  - The solver health endpoint responds: `curl http://localhost:8000/api/v1/solver/health` returns 200
- **Coach checks**:
  - Check `docker compose ps` for solver container status
  - Verify solver health endpoint returns 200
  - Check `docker logs gto-wizard-clone-solver-1` for startup errors
  - If the Dockerfile build fails, check for missing system deps (gcc, g++, cmake) and Python package conflicts (protobuf version)

### Task: fix-e2e-test-runner-execution
- **Description**: The Playwright E2E tests still don't execute properly — `npx playwright test` times out after 120s. The `fix-e2e-test-runner` task was marked complete but the tests still hang. Investigate the root cause: check if the Playwright config has a global timeout issue, if the web server isn't starting for tests, or if there's a hanging test. Fix so that `npx playwright test --reporter=list` completes within 60s and produces a test report.
- **Success criteria**:
  - `cd apps/web && npx playwright test --reporter=list` completes within 120s
  - Test report shows pass/fail counts (not a timeout)
  - At least the home page smoke test passes
- **Coach checks**:
  - Run `npx playwright test --reporter=list` and verify it completes
  - Check that Playwright config (playwright.config.ts) has reasonable timeouts
  - Verify the web server starts correctly for E2E tests (baseURL is reachable)
  - Check for hanging async operations in test files

### Task: seed-quiz-spots-with-board-data
- **Description**: The `GET /api/v1/quiz/random` endpoint returns quiz spots but the `board` field is null for all spots. This means the quiz training mode can't show board cards or postflop scenarios. Update the quiz spot seed data to include board cards for postflop quiz spots (e.g., "KsKc3s" for flop, "KsKc3s7h" for turn). At least 5 quiz spots should have non-null board data covering flop and turn scenarios.
- **Success criteria**:
  - `curl http://localhost:8000/api/v1/quiz/random` returns a spot where `board` is not null
  - At least 5 quiz spots in the database have board data
  - Board data covers at least 2 different flop textures and 1 turn scenario
- **Coach checks**:
  - Call quiz/random multiple times and verify some spots have board data
  - Check the seed script includes board cards for postflop spots
  - Verify the quiz page renders board cards when board data is present

### Task: dashboard-page-visual-match-reference
- **Description**: Compare the live `/` (home) page against `docs/reference-dashboard.png`. The reference shows the target dashboard layout with hero section, feature grid, quick stats, and navigation. Identify gaps in layout, spacing, component rendering, and visual design. Fix them iteratively.
- **Success criteria**:
  - Live `/` page visually matches `docs/reference-dashboard.png`
  - Hero section renders with proper sizing and call-to-action buttons
  - Feature grid shows all key features with icons
  - Quick stats section displays correctly
  - No console errors
- **Coach checks**:
  - Navigate to `/` and compare against reference screenshot
  - Verify hero section, feature grid, and quick stats all render
  - Check for console errors
  - Verify responsive behavior at 1280px and 375px widths

### Task: equity-page-visual-match-reference
- **Description**: Compare the live `/equity` page against `docs/reference-equity.png`. The reference shows the target equity calculator layout with hand inputs, board input, calculate button, and equity results display. Identify gaps and fix them.
- **Success criteria**:
  - Live `/equity` page visually matches `docs/reference-equity.png`
  - Hand input fields, board input, and calculate button render correctly
  - Equity results display with proper formatting (percentage, wins/ties/total)
  - No console errors
- **Coach checks**:
  - Navigate to `/equity` and compare against reference
  - Test an equity calculation end-to-end
  - Verify results display matches reference formatting

### Task: practice-page-visual-match-reference
- **Description**: Compare the live `/practice` page against `docs/reference-practice.png`. The reference shows the target practice/training interface with exercise types, progress indicators, and training controls. Identify gaps and fix them.
- **Success criteria**:
  - Live `/practice` page visually matches `docs/reference-practice.png`
  - Exercise type selector renders correctly
  - Progress indicators show training progress
  - Training controls (start, pause, next) work
  - No console errors
- **Coach checks**:
  - Navigate to `/practice` and compare against reference
  - Test exercise selection and progress tracking
  - Verify the page doesn't have empty/placeholder sections

### Task: update-features-yaml-courses-detail
- **Description**: FEATURES.yaml marks `GET /api/v1/courses/{id}` as `status: broken`, but the endpoint actually works (returns 200 with course data including lessons). Update FEATURES.yaml to mark this endpoint as `status: present`. Also verify all other `status: present` entries are actually working by spot-checking 3-5 endpoints with curl.
- **Success criteria**:
  - `GET /api/v1/courses/{id}` marked as `status: present` in FEATURES.yaml
  - `last_audited` field updated to 2026-06-20
  - All spot-checked endpoints return expected responses
- **Coach checks**:
  - Verify the endpoint returns 200 with course data
  - Check FEATURES.yaml is valid YAML after edit
  - Spot-check 2-3 other endpoints marked as present

### Task: fix-course-detail-api-500
- **Description**: `GET /api/v1/courses/{id}` returns HTTP 500 on the live site. The API router code looks correct (uses SQLAlchemy with selectinload), so the issue is likely a database column mismatch — the Course model has columns (short_description, thumbnail_url, duration_minutes, etc.) that don't exist in the production database. Inspect the actual database schema, create an Alembic migration or manual ALTER TABLE to add missing columns, or strip the model down to match the existing schema.
- **Success criteria**:
  - `curl "https://wiz.codeovertcp.com/api/v1/courses/16ac4d4a-e659-4429-9573-d308270b41b4"` returns 200 with course data including lessons array
  - The course detail page at `/courses/[id]` loads with actual course data (not "Loading course..." forever)
- **Coach checks**:
  - Verify the endpoint returns 200 with JSON containing id, title, description, lessons array
  - Check the course detail page renders course title and lesson list
  - Verify the fix doesn't break the list endpoint (`GET /api/v1/courses`)

### Task: fix-strategy-lookup-dsn-format
- **Description**: The strategy lookup endpoint works on the live site but the `strategy_storage.py` DSN handling is fragile — it passes `postgresql+asyncpg://` directly to `asyncpg.create_pool()` which only accepts `postgresql://` or `postgres://`. Currently the live site works because the DATABASE_URL env var is likely already in the right format, but this is a latent bug that breaks on restart if the env var changes. Fix the DSN normalization in `apps/api/services/strategy_storage.py` to strip `+asyncpg` before passing to asyncpg.
- **Success criteria**:
  - `apps/api/services/strategy_storage.py` contains `replace('+asyncpg', '')` or equivalent DSN normalization
  - Strategy lookup still works after the change
- **Coach checks**:
  - Verify the DSN normalization code exists in strategy_storage.py
  - Confirm strategy lookup endpoint still returns 200 with data
  - Check that the fix handles edge cases (no +asyncpg suffix, already correct format)

### Task: seed-quiz-spots-with-board-data
- **Description**: The quiz_spots table has basic data but lacks realistic board data (flop/turn/river cards, board textures). Create a seed script that populates quiz_spots with realistic board scenarios including suited/connected/rainbow textures, proper card representations, and spot configurations that exercise the solver.
- **Success criteria**:
  - At least 10 quiz spots with full board data (flop cards as JSON array like ["Ah", "Kd", "7c"])
  - Board textures cover: suited, connected, rainbow, paired
  - `GET /api/v1/quiz/spots` returns spots with board_data populated
- **Coach checks**:
  - Verify quiz spots include board_data field with card arrays
  - Check at least 3 different board textures are represented
  - Confirm the quiz page can display spots with board cards

### Task: add-hand-history-parsing
- **Description**: The hand-history-frontend-page task was marked complete but `/hand-history` route doesn't exist in `apps/web/src/app/`. Create the page with a text input area where users can paste a poker hand history (from PokerStars, GGPoker, etc.) and parse it into a structured format. Display parsed hands with street-by-street action breakdown.
- **Success criteria**:
  - `/hand-history` route exists and renders 200
  - Page has a textarea for pasting hand history text
  - Submitting a hand history parses and displays street-by-street actions
  - At least PokerStars format is supported
- **Coach checks**:
  - Verify `/hand-history` page loads 200
  - Paste a sample PokerStars hand and verify it parses correctly
  - Check that parsed output shows Preflop/Flop/Turn/River actions

### Task: add-plo4-frontend-page
- **Description**: The `plo4-frontend-page` task is listed in AGENTS.md but the page doesn't exist. Create `/equity/plo4` as a 4-card PLO equity calculator reusing the existing EquityCalculator component pattern but configured for 4-card hands.
- **Success criteria**:
  - `/equity/plo4` route exists and renders 200
  - Page has inputs for 4-card PLO hands (2-4 hole cards per player)
  - Board input and calculate button
  - Results display with equity percentages
- **Coach checks**:
  - Verify `/equity/plo4` page loads 200
  - Check that it accepts 4-card hand inputs
  - Verify calculation returns results (may use existing equity API with PLO4 config)

---

## Next Batch — Generated by Coach Review (2026-06-22)

### Task: study-position-player-tiles
- **Description**: The study page position selector currently uses numbered buttons (UTG/HJ/CO/BTN/SB/BB). The reference GTO Wizard design shows player tiles with stack sizes displayed next to each position (e.g., "UTG 100bb", "HJ 100bb"). Replace the numbered button selector with player tiles that show the player name and stack depth, matching the reference study interface layout. Tiles should be visually distinct (different background colors per position) with the active position highlighted in the brand green (#00C853).
- **Success criteria**:
  - Position selector renders as horizontal tiles with stack depth labels (e.g., "UTG · 100bb", "BTN · 100bb")
  - Active position tile shows green (#00C853) highlight/glow effect
  - Inactive tiles are subdued dark gray (#2A2A2A) with white text
  - Clicking a tile updates the hand matrix and action panel correctly
  - 0 console errors
  - Responsive: tiles wrap gracefully on viewports < 1024px
- **Coach checks**:
  - Navigate to `/study` and verify tiles render with stack labels
  - Click each tile and verify position change propagates to hand matrix
  - Check CSS for the correct highlight color (#00C853)
  - Verify 0 JS errors in browser console

### Task: study-top-bar-design
- **Description**: The study page is missing the top bar that appears in the GTO Wizard reference. Add a horizontal top bar above the main study content containing: game type selector ("Cash"), stack depth display ("100bb"), spots remaining counter, and an "Upgrade" CTA button. The bar should be fixed at the top of the study content area (below main nav), with dark background (#1A1A1A), subtle bottom border (#333), and responsive sizing.
- **Success criteria**:
  - Top bar renders with: game type label (Cash), stack depth display, spots counter, Upgrade button
  - Bar spans full content width below the main navigation
  - Stack depth is selectable/dropdown with common depths (30bb, 50bb, 75bb, 100bb, 150bb, 200bb)
  - Spots counter shows "2,000+ spots" or similar with correct count
  - Upgrade button links to # (pricing/upgrade placeholder) with green outline styling
  - No layout shift when toggling study modes (preflop/postflop)
  - 0 console errors
- **Coach checks**:
  - Navigate to `/study` and verify top bar elements render
  - Change stack depth in the bar and verify it updates the strategy solver
  - Verify Upgrade button has correct styling and is clickable
  - Check no layout shift when switching preflop/postflop modes

### Task: study-action-prompts-per-position
- **Description**: The study page shows action buttons (Check/Call/Bet/Fold/Raise) but lacks the per-position action prompts and frequency display that the GTO Wizard reference shows in a header row above the hand matrix. Add a position-specific action prompts row below the position selector and above the hand matrix that shows: the current action needed ("Your action: Bet 33%" or "Your action: Call"), the GTO action frequency for that position, and the pot/stack context. This header row should update dynamically when switching positions.
- **Success criteria**:
  - Action prompt header row shows below position tiles, above hand matrix
  - Displays: "Your action: [action name]" with the GTO-recommended action and frequency
  - Shows pot size and effective stack for context
  - Row updates when switching positions, board cards, or streets
  - Styled consistently with the GTO Wizard reference (light text on dark background, subtle border-bottom)
  - 0 console errors
- **Coach checks**:
  - Navigate to `/study`, switch to postflop mode, deal a flop
  - Verify action prompt row appears with correct action recommendation
  - Switch positions and verify prompt updates
  - Switch board/street and verify context updates
  - Check 0 console errors during all interactions

---

## Next Batch — Generated by Coach Review (2026-06-22) [Batch 2]

### Task: study-filters-sub-tab
- **Description**: The Filters sub-tab in the study page right sidebar currently shows "Hand/blocker filters coming soon" — a placeholder. Replace it with actual filter controls that allow users to filter the hand matrix by hand class (pairs, suited, offsuit, broadway, aces, etc.), by suit, and by rank range. Use the interaction spec at `docs/reference-study-interaction-spec.md` as reference for the expected filter categories.
- **Success criteria**:
  - Filters sub-tab shows real filter controls, not placeholder text
  - At minimum: filter by hand type (pairs/suited/offsuit), filter by minimum rank, filter by suit
  - Matrix updates in real-time as filters are applied
  - Filter count/badge shows how many combos match current filters
  - Reset/clear filters button
  - 0 console errors
  - No changes to other sub-tabs or study page layout
- **Coach checks**:
  - Navigate to `/study`, click the Filters sub-tab in the right sidebar
  - Verify filter controls render (not "coming soon" text)
  - Apply a filter (e.g., only pairs) and verify matrix updates
  - Clear filters and verify matrix restores
  - Check 0 console errors

### Task: study-blockers-sub-tab
- **Description**: The right sidebar in study mode is missing a Blockers sub-tab. The GTO Wizard reference (docs/reference-study-interaction-spec.md) lists Blockers as a sub-tab that shows card removal analysis: which cards are blocked by the board, by known hands, and how many combos remain for each hand class. Add a `blockers` option to the `rightSubTab` state and implement the analysis panel showing combo counts per hand class with blocker-aware calculations.
- **Success criteria**:
  - "Blockers" tab appears in the right sidebar sub-tab list (after Filters)
  - Selecting Blockers shows card removal analysis: total combos remaining, combos per hand class
  - Shows which specific cards are blocked (board cards, dead cards)
  - In postflop mode, shows how board cards remove combos
  - Combo counts are accurate (e.g., AA from 6 down to 3 if one ace is on board)
  - Styled consistently with other sub-tabs (dark bg, light text, 10px font for detail)
  - 0 console errors
- **Coach checks**:
  - Navigate to `/study`, click Blockers sub-tab
  - Verify combo counts are displayed and show realistic values

---

## Next Batch — Manual Intervention (2026-06-22) — Visual Fidelity Tasks

These tasks identified by comparing the live page at `https://wiz.codeovertcp.com/study` against `docs/reference-study-interface.png` via vision_analyze. The structural layout matches but specific visual elements are missing.

### Task: gto-frequency-microchips-on-action-buttons
- **Description**: Postflop action buttons show bet size and pot% (e.g., "BET 33%: 2.0 (36%)") but the reference shows GTO frequency chips alongside each action. For example, "BET 1.8 (33%)" should also display "GTO: 45%" in a colored micro-chip. Add a frequency chip overlay to each action button showing the GTO-recommended action frequency. Reference: `docs/reference-study-interface.png` shows action buttons with compact bet size + pot% + GTO frequency on one line.
- **Success criteria**:
  - Each action button shows: [action name] [size in bb] (pot%) [GTO frequency chip]
  - GTO frequency chip is colored: green if GTO recommends this action >20% freq, yellow if 5-20%, gray if <5%
  - Frequencies come from the solver API response (`POST /api/v1/solver/postflop-strategy`)
  - Frequency updates when user changes position/board/street and re-fetches
  - 0 console errors
- **Coach checks**:
  - Load /study, switch to Postflop Training, click Get GTO Strategy
  - Verify each action button shows a GTO frequency chip with correct color
  - Click a button, verify frequency persists in the comparison view
  - Load reference image `docs/reference-study-interface.png` via vision_analyze — compare button layout against live

### Task: post-action-gto-comparison-overlay
- **Description**: After the user selects a postflop action (e.g., clicks "BET 33%"), no comparison feedback appears. The reference shows: (1) user's selected action highlighted, (2) GTO-recommended action highlighted in green, (3) EV difference between user's choice and GTO, (4) correct/incorrect indicator. Add an overlay panel below the action buttons that renders immediately after the user picks an action. Reference: `docs/reference-study-interface.png` shows a comparison panel with the user's pick vs GTO recommendation.
- **Success criteria**:
  - After clicking any action button, a feedback panel appears below the action bar
  - Panel shows: user's action highlighted, GTO-recommended action highlighted in green
  - Shows EV difference (user's EV vs GTO EV) with green/red coloring
  - Shows "✓ Correct" or "✗ Suboptimal" with the frequency gap
  - "Try Again" button that resets to action selection state
  - Matches reference layout in `docs/reference-study-interface.png`
  - 0 console errors
- **Coach checks**:
  - Load /study, Postflop Training, get strategy, click any action
  - Verify comparison overlay renders immediately with correct/incorrect feedback
  - Verify EV difference is shown
  - Click "Try Again" — verify action buttons re-enable and overlay hides
  - Load reference image and compare overlay layout

### Task: preflop-hand-matrix-blue-call-color
- **Description**: The preflop hand matrix uses red=raise and dark gray=fold, but the reference (and standard GTO wizard convention) uses a third color for mixed strategies where CALL is the primary action. Add blue (#3A6EA5) coloring for cells whose primary action is CALL. The matrix currently shows all folded hands as dark gray — some of these should be blue for hands that mix call/fold. Check the strategy API response — if `action: "call"` is the top action by frequency for a cell, color it blue instead of gray.
- **Success criteria**:
  - Hand matrix cells where the primary action is "call" display with blue background (#3A6EA5)
  - Cells where primary action is "raise" remain red
  - Cells where primary action is "fold" remain gray
  - Legend updates to show blue = "Call" alongside existing red/gray
  - Text contrast is readable on blue background
  - 0 console errors
- **Coach checks**:
  - Load /study, verify some cells show blue background (hands like small pocket pairs that mix call/fold)
  - Legend shows "Call" with blue indicator
  - Blue cells have readable text
  - Switch to 50bb — verify blue appears where calling is more frequent at lower stacks
  - Verify board card removal is reflected (e.g., if 5♠ on board, 55 combos reduced)
  - Check 0 console errors

### Task: study-oop-ev-real-values
- **Description**: The Table tab in the study right sidebar shows an "OOP EV" column that currently uses `Math.random().toFixed(1)` — a placeholder producing random values. Replace it with actual solver EV values for the out-of-position player. The solver API already returns EV values in its response (the `ev` field per action). Extract the weighted-average EV for the OOP player from the preflop-range or postflop-strategy API response and display it in the table instead of random data. If solver data is loading or unavailable, show "—" instead of a random number.
- **Success criteria**:
  - OOP EV column shows real values from solver data, not Math.random()
  - EV values are weighted averages across all actions for the OOP player
  - Display format: "+X.X" in green (positive EV) or "-X.X" in red (negative EV)
  - Shows "—" when solver data is loading or unavailable
  - No regression in other table columns (Position, Stack, Combos)
  - 0 console errors
- **Coach checks**:
  - Navigate to `/study`, click the Table tab in the right sidebar
  - Verify OOP EV shows a real-looking value (not random) — e.g., "+1.2" not random float
  - Verify value updates when switching positions
  - Verify "—" shows when solver is loading
  - Check 0 console errors

### Task: fix-e2e-test-runner-version-conflict
- **Description**: The Playwright E2E test runner crashes with "Playwright Test did not expect test.describe() to be called here" due to a version conflict. Root cause: there are two copies of `@playwright/test` (1.61.0) in the project — one in root `node_modules/@playwright/test` and one in `apps/web/e2e/node_modules/@playwright/test`. When Node resolves imports from the e2e config, it finds the root copy first, which conflicts. Fix: remove the conflicting root `node_modules/@playwright/test` directory and verify the e2e tests can run.
- **Success criteria**:
  - `npx playwright test --list` from `apps/web/e2e/` lists all test files without error
  - All 6+ smoke e2e tests pass
  - Root `node_modules/@playwright/test` either removed or made inert
  - No breakage in the frontend build (`npm run build` still succeeds)
- **Coach checks**:
  - Run `npx playwright test --list` from `apps/web/e2e/` — verify no error
  - Run `npx vitest run` from `apps/web/` — verify existing tests still pass
  - Run the frontend build — verify no breakage

---

## Next Batch — Generated by Coach (2026-06-23)

### Task: fix-spots-page-nan-values
- **Description**: The `/spots` page strategy heatmap shows "Avg Freq:NaN%" and "Avg EV:NaN" instead of real computed values. Root cause: the heatmap component's average calculation (`sum(values) / values.length`) produces NaN when the data structure for community spots differs from the main study page's data format (e.g., frequency values may be undefined/null/empty for cells that have no data). Fix the average calculation in `apps/web/src/app/spots/page.tsx` to (a) filter out null/undefined/NaN values before computing, (b) show "—" when no valid data exists instead of NaN, and (c) handle the edge case where all cells in the selected action category have no data.
- **Success criteria**:
  - `curl http://localhost:3000/spots` returns 200
  - Loading `/spots` in a browser shows "Avg Freq:—%" (or a real percentage) instead of "Avg Freq:NaN%"
  - Same for "Avg EV:—" (or a real value) instead of "Avg EV:NaN"
  - Switching between action types (Raise/Call/Fold, Bet/Call/Check, Push/Fold, Bet/Raise/Call/Check) doesn't show NaN for any action type
  - No console errors
- **Coach checks**:
  - Load `/spots` in browser, click a spot card to select it, verify the heatmap shows real Avg Freq and Avg EV values or "—" (never NaN)
  - Switch action types in the dropdown and verify no NaN appears
  - Verify 0 console errors

### Task: fix-web-search-billing-expired
- **Description**: The coach's web search tool (Firecrawl) returns "Payment Required — Insufficient available balance" on every search attempt. This blocks the coach's Phase 2.6 external discovery and web research capabilities. Fix by either: (a) topping up the Firecrawl subscription balance via the Nous Research portal, or (b) switching the Hermes web search backend to a free/alternative provider (e.g., DuckDuckGo, Bing Search API free tier), or (c) configuring a local search fallback. Check `cat ~/.hermes/providers.yaml | grep search` for current web search provider config.
- **Success criteria**:
  - `web_search(query="test query", limit=1)` returns actual search results (not a payment error)
  - Coach can successfully discover external features and references using web search
- **Coach checks**:
  - Run a test web_search call and verify it returns non-error results
  - Update the providers config if needed to use an alternative backend

### Task: re-audit-features-yaml
- **Description**: FEATURES.yaml was last audited on 2026-06-20 and is 3 days stale. Since then, several pages were visually polished (solutions, courses, ICM, equity, practice, dashboard), the postflop solver dedup fix was deployed, and the study page gained many new components (filters, position tiles, top bar, OOP EV, action prompts). Re-verify every page and endpoint in FEATURES.yaml with curl against the live site (https://wiz.codeovertcp.com). Update any `status: present` entries that may have changed, add entries for newly discovered components, and set `last_audited` to today's date.
- **Success criteria**:
  - All `status: present` entries verified with live curl
  - No components marked `present` that return 404/500
  - `last_audited` updated to 2026-06-23
- **Coach checks**:
  - Spot-check 5 random pages from FEATURES.yaml with curl
  - Verify the YAML file is still valid after edits

### Task: study-progress-persistence-backend
- **Description**: The study page tracks per-session stats (correct/incorrect count, accuracy %) in React state only — these are lost on page reload. The real GTO Wizard persists all training history with user accounts for long-term progress tracking. Build a lightweight progress persistence layer:
  1. Create a POST /api/v1/study/progress endpoint that accepts `{hand, position, stack_depth, action_chosen, action_gto, correct, timestamp}`
  2. Create a GET /api/v1/study/progress endpoint that returns aggregated stats (total hands, accuracy by position, accuracy by action type, recent sessions)
  3. Store progress in PostgreSQL (use existing DB connection in apps/api/)
  4. On the frontend, save study session actions to the API after each "Check vs GTO" interaction
  5. Add a "My Progress" page at `/progress` that shows: overall accuracy %, accuracy by position (bar chart), accuracy by action type, recent session history, and a streak counter
  6. Use a simple user identity: generate a UUID on first visit, store in localStorage, send as X-User-Id header
- **Success criteria**:
  - `curl -X POST http://localhost:8000/api/v1/study/progress -H 'Content-Type: application/json' -d '{"hand":"AA","position":"UTG","stack_depth":100,"action_chosen":"raise_2.5bb","action_gto":"raise_2.5bb","correct":true}'` returns 201 with `{id, created_at}`
  - `curl 'http://localhost:8000/api/v1/study/progress?user_id=test-user'` returns aggregated stats JSON
  - `/progress` page loads at `http://localhost:3000/progress` and shows stats with bar charts
  - After studying 5 hands on `/study` and clicking "Check vs GTO", refreshing the page shows the accumulated stats on `/progress`
  - No console errors
- **Coach checks**:
  - Verify the API endpoints exist and return correct shapes
  - POST 3 progress records, GET aggregated stats, verify accuracy and counts match
  - Load `/progress` page, verify stats render with charts
  - Run the full flow: study 5 hands on /study, check `/progress` shows the data
