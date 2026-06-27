# RefQA — Reference-Augmented Agentic QA

> A unified QA runner that combines self-healing UI interaction (agent-qa inspired)
> with reference-based semantic verification (Coach inspired).
> One step type. Two execution modes.

## Core Idea

Every test step can optionally be **reference-verified**. Without a reference, it's a
self-healing UI interaction. With a reference, the runner checks both clone and original
and fails if they diverge:

```yaml
steps:
  - Navigate to "https://wiz.codeovertcp.com/study"
  - Click on "UTG" position card
  - Verify cell "AA" shows "raise" with 100% frequency
    reference: app.gtowizard.com
```

That `reference:` makes all the difference. Step 3 means:
1. Fulfill the step against the clone → extract result (AA = raise 100%)
2. Fulfill the same step against the reference → extract result
3. **Fail if results don't match** — semantic drift detected

No separate Coach review. No manual browser comparison. The test itself encodes
the reference check.

## YAML Format

```yaml
test-id: t_<10-id-agent-words>
name: GTO Study Preflop — Range Verification
targets:                   # one or more targets
  primary: gto-wizard      # the app under test
  references:              # optional reference targets
    - gto-wizard-reference
workers: 2                 # parallel browser sessions for reference comparison
steps:
  - Navigate to "/study"

  # Step: simple interaction (no reference check)
  - Click on "UTG" position card

  # Step: interaction + reference verification (parallel)
  - Verify cell "AA" shows "raise" with 100% frequency
    reference: app.gtowizard.com

  # Step: cross-reference comparison (both apps must match)
  - Verify the hand matrix has 169 cells
    reference: app.gtowizard.com

  # Step: console audit (always against primary only)
  - Verify no console errors exist
```

## Execution Flow

```
┌───────────────────────────────────────────────────────────┐
│                       RefQA Runner                         │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  YAML Test ──→ Step Iterator                               │
│                    │                                       │
│          ┌─────────┴──────────┐                            │
│          ▼                    ▼                             │
│   Has reference?        No reference?                      │
│          │                    │                             │
│          ▼                    ▼                             │
│   ┌──────────────┐    ┌──────────────┐                     │
│   │ LLM Resolver  │    │ LLM Resolver  │                    │
│   │ (primary ref) │    │ (primary only)│                    │
│   └──────┬───────┘    └──────┬───────┘                     │
│          │                    │                             │
│          ▼                    ▼                             │
│   ┌──────────────┐    ┌──────────────┐                     │
│   │ LLM Resolver  │    │  Execute +   │                    │
│   │ (reference)   │    │  Self-Heal   │                    │
│   └──────┬───────┘    └──────┬───────┘                     │
│          │                    │                             │
│          ▼                    ▼                             │
│   ┌──────────────┐    ┌──────────────┐                     │
│   │   Compare     │    │    PASS ✓    │                    │
│   │   PASS/FAIL   │    └──────────────┘                     │
│   └──────────────┘                                         │
│                                                            │
│  Delegation: each reference step spawns a parallel          │
│  subagent to resolve against the reference target           │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

## Delegation Model

Designed for parallel execution from step 1:

| Task | Delegation approach |
|------|-------------------|
| **Step resolution** | Each YAML step → subagent with its own browser session. Reference steps get 2 subagents (clone + reference). Results compared by orchestrator. |
| **Self-healing** | On failure, subagent re-observes the page and retries with alternative strategy (agent-qa inspired caching). |
| **Reference comparison** | Runs in parallel with primary step. No extra wall-clock time. |
| **Console audit** | Dedicated subagent checks console errors across all steps. |
| **Post-run classification** | Coach's Step 2.5 methodology gate runs as final subagent: classify failures as test bugs vs methodology failures. |

## Project Structure

```
refqa/
├── refqa/
│   ├── __init__.py
│   ├── runner.py          # Step iterator + delegation orchestrator
│   ├── resolver.py         # LLM step resolution (agent-qa inspired)
│   ├── comparator.py       # Reference comparison logic
│   ├── healer.py           # Self-healing on step failure
│   ├── auditor.py          # Console error audit
│   └── classifier.py       # Methodology gate (Coach step 2.5)
├── tests/
│   ├── gto-study-preflop.yaml
│   ├── gto-study-postflop.yaml
│   ├── gto-practice-smoke.yaml
│   └── polytopia-core-loop.yaml
├── targets/
│   ├── gto-wizard.yaml       # configuration: url, selectors, auth
│   └── polytopia.yaml
├── pyproject.toml
├── AGENTS.md
└── README.md
```

## Phase Plan

### Phase 1: Foundation (this session)
- Create repo skeleton
- Write the YAML schema & parser
- Write the step execution engine (LLM resolves → browser executes)
- Bootstrap: port 1 YAML test from the agent-qa prototype
- Verify it runs on OpenCode Zen (free)

### Phase 2: Reference comparison
- Add reference target resolution (parallel subagent)
- Implement comparator (result matching with LLM judge)
- Port the preflop test with `reference: app.gtowizard.com` on range verifications
- Test: clone has a range bug → test fails correctly

### Phase 3: Self-healing + memory
- SQLite plan cache (agent-qa inspired)
- Auto-retry + re-observation on step failure
- Execution memory across runs

### Phase 4: Coach methodology gate
- Post-run failure classifier (Step 2.5)
- Auto-populate AGENTS.md tasks from failures
- Webhook-driven cron integration

## What Gets Cleaned Up

From `gto-wizard-clone` repo:
```
DELETE:  tests/gto-study-preflop.yaml
DELETE:  tests/gto-study-postflop.yaml
DELETE:  agent-qa.config.yaml           (or revert to pre-experiment state)
DELETE:  hooks.yaml                     (revert to pre-experiment state)
DELETE:  hooks/generate-timestamp.sh
DELETE:  scripts/set-agent-qa-auth.js
DELETE:  agent-rules.md
DELETE:  .env
DELETE:  .env.secrets.local
DELETE:  .agent-qa/
DELETE:  node_modules/agent-qa/         (npm uninstall)
KEEP:   tests/automation-exercise/      (if valuable independently)
KEEP:   suites/automation-exercise.suite.yaml
```

## Decision

**New project**: `/home/sc/repos/refqa` — clean repo, clean context budget, designed for delegation from day one.

**Not a refactor of `gto-wizard-clone`** — that repo has Playwright specs + Coach hooks + agent-qa debris + app code. Mixing a full QA framework into it for context.

**Not a fork of agent-qa** — we're taking the YAML format inspiration and the self-healing concept, but the reference-comparison step type doesn't exist in agent-qa and can't be added as a plugin.
