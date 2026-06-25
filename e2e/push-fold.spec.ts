import { test, expect } from "@playwright/test";

/**
 * Push/Fold Charts E2E Tests
 *
 * Tests cover:
 * 1. Page loads without errors at /push-fold
 * 2. Page title and description render
 * 3. Position selector buttons exist (UTG through BB)
 * 4. Stack depth selector buttons exist (5bb through 20bb)
 * 5. Range grid renders with hand data
 * 6. Stats sidebar renders with range breakdown
 * 7. All-positions comparison table renders
 * 8. Legend section renders
 * 9. Info/About section renders
 */

const BASE_URL = "http://localhost:3000";

test.describe("Push/Fold Charts Page", () => {
  test("1. Page loads without errors at /push-fold", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    // Verify main heading
    const heading = page.locator("h1:has-text('Push/Fold Nash Charts')");
    await expect(heading).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Page description text renders", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const description = page.locator("text=Pre-computed Nash equilibrium push/fold ranges");
    await expect(description).toBeVisible();
  });

  test("3. Position selector buttons exist for all 6 positions", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const expectedPositions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
    for (const pos of expectedPositions) {
      const btn = page.locator(`button:has-text('${pos}')`).first();
      await expect(btn).toBeVisible();
    }
  });

  test("4. Stack depth selector buttons exist", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const stackDepths = ["5bb", "6bb", "7bb", "8bb", "9bb", "10bb", "12bb", "15bb", "20bb"];
    for (const depth of stackDepths) {
      const btn = page.locator(`button:has-text('${depth}')`);
      await expect(btn.first()).toBeVisible();
    }
  });

  test("5. Range grid renders with hand data", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    // The RangeGrid should render — look for the title in the range grid
    const rangeTitle = page.locator("text=Push Range").first();
    await expect(rangeTitle).toBeVisible({ timeout: 5000 });
  });

  test("6. Stats sidebar shows Range Breakdown", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const breakdownHeading = page.locator("h3:has-text('Range Breakdown')");
    await expect(breakdownHeading).toBeVisible();

    // Stats should include total combos and % of hands
    const totalCombos = page.locator("text=Total combos");
    await expect(totalCombos).toBeVisible();
    const percentHands = page.locator("text=% of hands");
    await expect(percentHands).toBeVisible();
  });

  test("7. All-positions comparison table renders", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const allPosHeading = page.locator("h3:has-text('All Positions')");
    await expect(allPosHeading).toBeVisible();

    // Table should have position, range %, and combos columns
    const table = page.locator("table");
    await expect(table).toBeVisible();
  });

  test("8. Legend section displays", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const legendHeading = page.locator("h3:has-text('Legend')");
    await expect(legendHeading).toBeVisible();

    // Legend should mention push/call and fold
    const pushCall = page.locator("text=Push/Call");
    await expect(pushCall).toBeVisible();
    const foldText = page.locator("text=Fold (dark)");
    await expect(foldText).toBeVisible();
  });

  test("9. About Push/Fold section renders at bottom", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    const aboutHeading = page.locator("h2:has-text('About Push/Fold Nash Charts')");
    await expect(aboutHeading).toBeVisible();

    // Sub-sections should render
    await expect(page.locator("text=What are Push/Fold Charts?")).toBeVisible();
    await expect(page.locator("text=How to Use")).toBeVisible();
    await expect(page.locator("text=ICM Adjustments")).toBeVisible();
    await expect(page.locator("text=Position Naming")).toBeVisible();
  });

  test("10. Active position highlights when clicked", async ({ page }) => {
    await page.goto("/push-fold");
    await page.waitForLoadState("networkidle");

    // Click on CO position
    const coBtn = page.locator("button:has-text('CO')").first();
    await coBtn.click();
    await page.waitForTimeout(300);

    // Range title should update to show CO
    const rangeTitle = page.locator("text=CO Push Range").first();
    await expect(rangeTitle).toBeVisible();
  });
});
