# study/page.tsx — Current Architecture (2,274 lines)

## Functional Sections

| Section | Lines | Concern |
|---------|-------|---------|
| Helpers (constants, utils) | 1–127 | Hand matrix data, suit utils, action colors, per-position action configs |
| **State declarations** | 129–166 | 20+ state variables |
| **Data fetching effects** | 178–295 | fetchDepths, fetchRange, reset-on-depth-change, fetchAllPositions |
| Event handlers | 298–324 | handleActionClick |
| **Computed values** | 326–461 | positionAggregates, getCellColor, getCellOpacity, actionSummary, oopEV, handFilters, blockers |
| URL param parsing | 463–494 | Auto-configure from query string |
| Board card handlers | 496–516 | generateFlop, advanceStreet, resetBoard |
| **Hotkey system** | 518–610 | keydown listener, navigateMatrix, toast/popup close |
| **RENDER: Inline CSS** | 624–748 | 120+ lines of responsive styles |
| RENDER: Hotkey toast | 749–768 | Fixed-position toast overlay |
| RENDER: Top Bar | 770–833 | Game type selector + stack depth + spots |
| RENDER: Mode toggle | 834–848 | Preflop Ranges button |
| RENDER: Hotkey button | 849–888 | ? button + popup overlay |
| RENDER: Action Prompt | 890–928 | Tree breadcrumb + context description |
| RENDER: Stack selector | 931–948 | Depth buttons (30–200bb) |
| RENDER: Player tiles | 949–1022 | 6 position cards with action buttons |
| RENDER: Aggregate strip | 1024–1063 | Per-position F/C/R% bar |
| RENDER: Matrix grid | 1066–1302 | 13×13 hand matrix + tab switching + legend |
| RENDER: Details Panel | 1304–2264 | Right sidebar: 3 top-tabs × 9 sub-tabs |
| RENDER: Postflop mode | 2266–2272 | Delegates to <PostflopTraining /> |

## State Sharing Pattern

Top-level page holds ALL state. Every section reads/writes shared state directly.
No component extraction, no context, no custom hooks.

## Proposed Split

```
page.tsx (orchestrator — slim, ~200 lines)
├── hooks/useStudyState.ts      — all state + effects + computed values
├── hooks/useHotkeys.ts         — keyboard navigation hook
├── components/StudyTopBar.tsx          — game type, stack depth
├── components/StudyActionPrompt.tsx     — tree breadcrumb
├── components/StudyPlayerTiles.tsx      — position cards + action buttons
├── components/StudyAggregateStrip.tsx   — F/C/R% per position
├── components/StudyMatrixGrid.tsx       — 13×13 hand matrix + tabs + legend
├── components/StudyBoardSection.tsx     — board cards + street nav
├── components/StudyFilters.tsx          — hand filter checkboxes + blocker buttons
├── components/StudyBreakdown.tsx        — breakdown tab stats
├── components/StudyHandDetails.tsx      — selected hand GTO data
├── components/StudyDetailsPanel.tsx     — right sidebar (3 top tabs × 9 sub-tabs)
└── components/StudyHotkeyHelp.tsx       — toast + popup
```
