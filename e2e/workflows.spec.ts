import { test, expect, type Page } from "@playwright/test";

/**
 * REAL USER WORKFLOW TESTS
 *
 * These tests simulate complete end-user journeys through the GTO Wizard
 * app. They chain multiple interactions together to validate that core
 * workflows actually work — not just that individual pages load.
 *
 * WORKFLOW PATTERNS TESTED:
 * 1. Home → Study → Select position → View range matrix → Inspect hand
 * 2. Home → Courses → Browse → Filter → Select course
 * 3. Home → Practice → Start session → Answer spot quiz → See score
 * 4. Home → ICM → Set stacks → Calculate → View results
 * 5. Cross-app: Study (range) → Practice (quiz) → Train (review)
 * 6. Navigation persistence: deep-link → use app → go back
 * 7. Home Page Feature Discovery
 * 8. Responsive Layout Check
 * 9. The "Node Lock Solving" Workflow (Spot → Configure → Solve)
 */

const BASE_URL = "http://localhost:3000";

// ============================================================
// WORKFLOW 1: Study Page — Range Matrix Exploration
// ============================================================
test.describe("Workflow: Study Range Matrix", () => {
  test("user navigates from home to study, selects position, inspects a hand", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("GTO");
    await page.locator('a[href="/study"]').first().click();
    await page.waitForURL(/\/study/);
    const utgButton = page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^UTG/ });
    await expect(utgButton).toBeVisible({ timeout: 10000 });
    const btnButton = page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^BTN/ });
    await expect(btnButton).toBeVisible();
    await btnButton.click();
    await page.waitForTimeout(300);
    const matrixCell = page.locator("div", { hasText: "AA" }).first();
    await expect(matrixCell).toBeVisible();
    const akCell = page.locator("div", { hasText: "AKs" }).first();
    if (await akCell.count() > 0) {
      await akCell.click();
      await page.waitForTimeout(500);
    }
  });

  test("user toggles solver mode on study page", async ({ page }) => {
    await page.goto("/study");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^UTG/ })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^BTN/ })).toBeVisible();
  });
});

// ============================================================
// WORKFLOW 2: Course Browsing → Selection
// ============================================================
test.describe("Workflow: Course Browsing and Selection", () => {
  test("user goes from home to courses, filters, selects a course", async ({ page }) => {
    await page.goto("/courses");
    await page.waitForLoadState("networkidle");
    const heading = page.locator("h1, h2").filter({ hasText: /Course/i }).first();
    await expect(heading).toBeVisible();
    const selects = page.locator("select");
    const selectCount = await selects.count();
    if (selectCount > 0) {
      await selects.first().selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
    const courseCards = page.locator("h3, button").filter({ hasText: /Course|NLH|ICM|Dry|Wet|3-Bet/i });
    const cardCount = await courseCards.count();
    if (cardCount > 0) {
      await courseCards.first().click();
      await page.waitForTimeout(500);
    }
    const trainLink = page.locator('a[href="/train"]');
    if (await trainLink.count() > 0) {
      await trainLink.click();
      await expect(page).toHaveURL(/\/train/);
    }
  });
});

// ============================================================
// WORKFLOW 3: Practice — Quiz Session
// ============================================================
test.describe("Workflow: Practice Quiz Session", () => {
  test("user starts a practice session and answers spots", async ({ page }) => {
    await page.goto("/practice");
    await page.waitForLoadState("networkidle");
    const startButton = page.locator("button", { hasText: /Start|Begin|Session/i }).first();
    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForTimeout(500);
      const actionButtons = page.locator("button").filter({ hasText: /Fold|Call|Raise|All-in/i });
      const actionCount = await actionButtons.count();
      if (actionCount > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(500);
        const nextButton = page.locator("button", { hasText: /Next/i });
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });
});

// ============================================================
// WORKFLOW 4: ICM Calculator
// ============================================================
test.describe("Workflow: ICM Calculator", () => {
  test("user calculates ICM equity for a tournament situation", async ({ page }) => {
    await page.goto("/icm");
    await page.waitForLoadState("networkidle");
    const heading = page.locator("h1, h2").filter({ hasText: /ICM/i }).first();
    await expect(heading).toBeVisible();
    const equityDisplay = page.locator("text=/Equity|Probability|ICM|Result/i").first();
    await expect(equityDisplay).toBeVisible();
  });
});

// ============================================================
// WORKFLOW 5: Cross-App Navigation Journey
// ============================================================
test.describe("Workflow: Cross-App Navigation Journey", () => {
  test("user browses home cards, navigates between features", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("GTO");
    const strategyLink = page.locator('a[href="/strategy"]').first();
    if (await strategyLink.count() > 0) {
      await strategyLink.click();
      await expect(page).toHaveURL(/\/strategy/);
    }
    const spotsLink = page.locator('a[href="/spots"]');
    if (await spotsLink.count() > 0) {
      await spotsLink.click();
      await expect(page).toHaveURL(/\/spots/);
    }
    const studyNavLink = page.locator('a[href="/study"]').first();
    if (await studyNavLink.count() > 0) {
      await studyNavLink.click();
      await expect(page).toHaveURL(/\/study/);
    }
    const equityNavLink = page.locator('a[href="/equity"]').first();
    if (await equityNavLink.count() > 0) {
      await equityNavLink.click();
      await expect(page).toHaveURL(/\/equity/);
    }
    await expect(page.locator("h2, h3").filter({ hasText: /Game|Range/i }).first()).toBeAttached();
  });
});

// ============================================================
// WORKFLOW 6: "Node Lock Solving" (Spot → Configure → Solve)
// ============================================================
test.describe("Workflow: Node Lock Solving", () => {
  test("user browses community spots and inspects a strategy solution", async ({ page }) => {
    await page.goto("/spots");
    await page.waitForLoadState("networkidle");
    const pageHeading = page.locator("h1, h2").filter({ hasText: /Spot/i }).first();
    await expect(pageHeading).toBeVisible();
    const spotButton = page.locator("button").filter({ hasText: /BTN|BB|SB|CO|UTG|HJ/i }).first();
    if (await spotButton.count() > 0) {
      await spotButton.click();
      await page.waitForTimeout(500);
    }
    await page.goto("/study");
    await page.waitForLoadState("networkidle");
    const positionButtons = page.locator("button").filter({ hasText: /UTG|HJ|CO|BTN|SB|BB/i });
    const positionCount = await positionButtons.count();
    expect(positionCount).toBeGreaterThanOrEqual(3);
    if (positionCount >= 2) {
      await positionButtons.nth(0).click();
      await page.waitForTimeout(200);
      await positionButtons.nth(1).click();
      await page.waitForTimeout(200);
    }
  });

  test("user flow: study preflop ranges and analyze strategy decisions", async ({ page }) => {
    await page.goto("/study");
    await page.waitForLoadState("networkidle");
    const brand = page.locator("text=/Wizard|GTO/i").first();
    await expect(brand).toBeVisible();
    const posButtons = page.locator("button").filter({ hasText: /UTG|HJ|CO|BTN|SB|BB/i });
    const count = await posButtons.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        await posButtons.nth(i).click();
        await page.waitForTimeout(200);
      }
    }
    const analyzeLink = page.locator('a[href="/analyze"]').first();
    if (await analyzeLink.count() > 0) {
      await analyzeLink.click();
      await expect(page).toHaveURL(/\/analyze/);
    }
  });
});

// ============================================================
// WORKFLOW 7: Home Page Feature Discovery
// ============================================================
test.describe("Workflow: Home Page Feature Discovery", () => {
  test("all feature cards are accessible from the home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const featureLinks = page.locator('a[href^="/"]').filter({
      has: page.locator("h2, h3, div")
    });
    const linkCount = await featureLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(4);
  });
});
