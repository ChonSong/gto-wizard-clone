# GTO Wizard Clone - WIP

**Open-source GTO poker training platform** — equity calculator, CFR solver, PLO4 tools, double board / bomb pot solver, training modes, hand history analysis, ICM calculator, push/fold charts, training courses, and community spots.

## Supported Game Variants

| Variant | Status | Notes |
|---------|--------|-------|
| No-Limit Hold'em (NLH) | ✅ Built | OMPEval (C++) |
| Pot-Limit Omaha 4 (PLO4) | ✅ Built | PokerHandEvaluator (C++/Python) |
| PLO5 (5-card Omaha) | ✅ Built | 4-card from 5 eval |
| Omaha Hi/Lo (8-or-better) | ✅ Built | Split pot, 8-qualifier |
| Shortdeck (6+ Hold'em) | ✅ Built | Flush > full house |
| **Double Board PLO** | ✅ Built (novel) | Two boards, scoop/chop scoring |
| **Bomb Pot** | ✅ Built (novel) | Action-first betting, straddle games |

## Key Libraries

| Library | Stars | Use |
|---------|-------|-----|
| [HenryRLee/PokerHandEvaluator](https://github.com/HenryRLee/PokerHandEvaluator) | 501 | PLO4/PLO5/Hi-Lo hand evaluation |
| [zekyll/OMPEval](https://github.com/zekyll/OMPEval) | 224 | NLH hand evaluator (C++) |
| [siavashg87/poker-odds-calc](https://github.com/siavashg87/poker-odds-calc) | 99 | Multi-variant equity (Hold'em, Omaha, Shortdeck) |
| [ksoeze/OmahaRangeExplorer](https://github.com/ksoeze/OmahaRangeExplorer) | 4 | Python PLO4 range builder |

## Architecture

```
apps/web/        Next.js 15 frontend
apps/api/        FastAPI backend
apps/solver/     Python MCCFR engine (gRPC)
packages/
  poker-core/    Shared poker math (Python + TypeScript)
  types/         Shared TypeScript types
  ui-components/ React component library
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind v4 |
| Backend | FastAPI, Pydantic v2, WebSockets, Celery |
| Solver | Python 3.12, NumPy, Numba, MCCFR |
| PLO4/Omaha | PokerHandEvaluator (C++/Python) |
| Database | PostgreSQL (Neon serverless) |
| Cache | Redis |

## Quick Start

```bash
git clone https://github.com/ChonSong/gto-wizard-clone.git
cd gto-wizard-clone
docker compose up
```

## Development Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation (monorepo, Docker, CI/CD) | ✅ Complete |
| Phase 2a | NLH Equity Calculator | ✅ Complete |
| Phase 2b | PLO4 Support | ✅ Complete |
| Phase 2c | Omaha Variants + Shortdeck | ✅ Complete |
| Phase 2d | Double Board + Bomb Pot (novel) | ✅ Complete |
| Phase 3 | GTO Solver (MCCFR) | ✅ Complete |
| Phase 4 | Training Mode | ✅ Complete |
| Phase 5 | Hand History Analysis | ✅ Complete |
| Phase 6 | ICM + Polish | ✅ Complete |

## Skills Integration

| Skill | Phase | Purpose |
|-------|-------|---------|
| `repo-transmute` | 2b, 2c | Adapt external poker lib code into codebase |
| `test-driven-development` | 2b, 2c, 2d | Tests before each evaluator implementation |
| `blueprint` | 2d | Plan novel double-board + bomb-pot architecture |
| `docker-patterns` | 1, 2b | Docker Compose for solver service |
| `e2e-testing` | all | Playwright E2E tests per feature |

## License

MIT

---

## Phase 6: ICM Calculator & Polish

### ICM Calculator (`/icm`)

ICM (Independent Chip Model) calculator for tournament equity calculations. Supports prize pool distribution, chip stack management, and tournament equity calculations.

**Features:**
- Prize Pool Panel — Configure tournament payouts (% and amounts)
- Chip Stack Panel — Add/remove players with chip amounts
- Tournament Settings — Buy-in and total chips
- ICM Results — Equity percentages and expected values
- About ICM — Educational section explaining ICM concepts

**Navigation:** `/icm`

### Push/Fold Charts (`/strategies`)

Nash-equilibrium push/fold charts for tournament situations. Pre-generated charts for common stack sizes and positions.

**Features:**
- Filterable charts by stack depth and position
- Open push and call charts
- ICM-adjusted recommendations
- Export functionality

**Navigation:** `/strategies`

### Training Courses (`/courses`)

Pre-built training courses with structured lessons, progress tracking, and multiple difficulty levels.

**Features:**
- Course categories: Preflop, Postflop, ICM, GTO Fundamentals
- Difficulty levels: Beginner, Intermediate, Advanced
- Progress tracking with completion percentages
- Quick Stats dashboard
- Continue Training button for resuming courses

**Navigation:** `/courses`

### Community Spots (`/spots`)

Share and discover community strategy spots. View, like, and practice community-contributed spots.

**Features:**
- Filter by position (BTN, SB, BB, CO, etc.)
- Filter by board type (dry, wet, paired, rainbow)
- Search functionality
- Sort by recent or popular
- Like/unlike spots
- Share new spot functionality
- Strategy heatmap for selected spots
- Practice this spot button

**Navigation:** `/spots`

---

## PWA Installation

GTO Wizard Clone supports Progressive Web App (PWA) installation on desktop and mobile devices.

**Installation Steps:**

**Desktop (Chrome/Edge/Brave):**
1. Visit the application URL
2. Click the install icon in the address bar (or overflow menu)
3. Click "Install" in the prompt
4. App will be installed and available in your app launcher

**Desktop (Firefox):**
1. Visit the application URL
2. Click the menu (≡) button
3. Select "Install" or "Save Application"
4. Follow the prompts

**Mobile (iOS Safari):**
1. Visit the application URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. App icon will appear on your home screen

**Mobile (Android Chrome):**
1. Visit the application URL
2. Tap the menu (⋮) button
3. Tap "Install app" or "Add to Home screen"
4. Follow the prompts

**PWA Features:**
- Offline support (service worker)
- App shortcuts for quick navigation
- Standalone display mode
- Theme-aware status bar
- 192x192 and 512x512 icons for all devices

**PWA Shortcuts:**
- ICM Calculator → `/icm`
- Courses → `/courses`
- Spots → `/spots`
- Equity Calculator → `/equity`
