/**
 * Practice Page — Executable Workflow Tests
 * 
 * Uses the PracticePage POM to execute the full state machine:
 * exercise types, category/difficulty selectors, and session start.
 * 
 * Run: npx playwright test --config=e2e/playwright.config.ts e2e/practice.spec.ts
 * From apps/web: npm run test:e2e -- e2e/practice.spec.ts
 */

import { test, expect } from '@playwright/test';
import { PracticePage } from './pages/PracticePage';

// ── Helpers ────────────────────────────────────────────────────

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

function setupErrorCapture(page: import('@playwright/test').Page) {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
}

// ── Workflow 1: Primary — Full State Machine ────────────────────

test.describe('Practice — Primary Workflow', () => {
  test('P1: navigate and default state is GTO Quiz', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    expect(await pom.getActiveExerciseType()).toBe('GTO Quiz');
    expect(pageErrors).toHaveLength(0);
  });

  test('P2: switch to Timed Drill reveals Timer Duration', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    await pom.selectExerciseType('Timed Drill');
    await pom.assertTimerDurationVisible();
    expect(pageErrors).toHaveLength(0);
  });

  test('P3: select 30s timer in Timed Drill mode', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    await pom.selectExerciseType('Timed Drill');
    await pom.selectTimerDuration('30s');
    expect(pageErrors).toHaveLength(0);
  });

  test('P4: switch to Spaced Repetition shows stats', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    await pom.selectExerciseType('Spaced Repetition');
    await pom.assertSpacedRepetitionStatsVisible();
    expect(pageErrors).toHaveLength(0);
  });

  test('P5: switch back to GTO Quiz hides conditional sections', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    await pom.selectExerciseType('Timed Drill');
    await pom.selectExerciseType('GTO Quiz');
    await pom.assertTimerDurationHidden();
    expect(pageErrors).toHaveLength(0);
  });

  test('P6: select category and difficulty without error', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    await pom.selectCategory('Paired board');
    await pom.selectDifficulty('Intermediate');
    expect(pageErrors).toHaveLength(0);
  });

  test('P7: start session renders overlay and detects API status', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    const result = await pom.startSession();
    await pom.assertSessionStarted(result);

    if (result.apiError) {
      console.log('⚠️  Quiz API unavailable — session UI works but backend is down');
      test.info().annotations.push({
        type: 'finding',
        description: `Quiz API down: ${result.apiError}`
      });
    }
    if (result.sessionStats) {
      console.log(`Session stats: ${result.sessionStats.spots} spots, ${result.sessionStats.accuracy}% accuracy`);
    }
    expect(pageErrors).toHaveLength(0);
  });
});

// ── Workflow 2: Timed Drill — Full Config ───────────────────────

test.describe('Practice — Timed Drill Workflow', () => {
  test('T1: configure Timed Drill with 120s, Wet board, Advanced, and start', async ({ page }) => {
    setupErrorCapture(page);
    const pom = new PracticePage(page);
    await pom.navigate();
    await pom.selectExerciseType('Timed Drill');
    await pom.assertTimerDurationVisible();
    await pom.selectTimerDuration('120s');
    await pom.selectCategory('Wet board');
    await pom.selectDifficulty('Advanced');

    const result = await pom.startSession();
    expect(result.sessionOverlayVisible).toBe(true);
    expect(pageErrors).toHaveLength(0);
  });
});

// ── Workflow 3: Exercise Type Smoke Test ────────────────────────

test.describe('Practice — Exercise Type Smoke Test', () => {
  const types: ExerciseType[] = ['GTO Quiz', 'Timed Drill', 'Spaced Repetition'];

  for (const type of types) {
    test(`S: ${type} loads without error`, async ({ page }) => {
      setupErrorCapture(page);
      const pom = new PracticePage(page);
      await pom.navigate();
      await pom.selectExerciseType(type);
      await pom.assertExerciseTypeChangesTo(type);
      expect(pageErrors).toHaveLength(0);
    });
  }
});
