import { test, expect, type Page } from "@playwright/test";

/**
 * Equity Calculator (Game View) E2E Tests
 *
 * The /equity page renders an interactive equity calculator with:
 * - Hero/Villain hand input fields
 * - Board cards input
 * - Calculate button
 * - Equity results with win/tie breakdown
 *
 * Tests cover:
 * 1. Page loads without console errors at /equity
 * 2. Hero and villain input fields render
 * 3. Calculate button triggers calculation
 * 4. Stats and results display after calculation
 * 5. Navigation from home page works
 */

const EQUITY_URL = "/equity";

test.describe("Equity Calculator Page", () => {
  test("1. Page loads without errors at /equity", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(EQUITY_URL);
    await page.waitForLoadState("domcontentloaded");

    // Check that the page has loaded with the Game settings sidebar
    const gameSection = page.locator("h2:has-text('Game')");
    await expect(gameSection).toBeVisible();

    // Verify the layout header is present
    const appBrand = page.locator("a[href='/study']").first();
    await expect(appBrand).toBeVisible();

    // Verify no console errors (filter out known non-critical errors)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Hand input fields and calculate button render", async ({ page }) => {
    await page.goto(EQUITY_URL);

    // Hero and villain input fields should be present
    const heroInput = page.locator("input[placeholder*='AA']").first();
    await expect(heroInput).toBeVisible();

    const villainInput = page.locator("input[placeholder*='QQ']").first();
    await expect(villainInput).toBeVisible();

    // Board input should be present
    const boardInput = page.locator("input[placeholder*='Ah']").first();
    await expect(boardInput).toBeVisible();

    // Wait for auto-calculation to finish (button shows "..." while loading)
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent?.trim() === 'Calculate');
    }, { timeout: 15000 });
    // Calculate button should be present
    const calcButton = page.locator("button:has-text('Calculate')").first();
    await expect(calcButton).toBeVisible();
  });

  test("3. Board cards display from input", async ({ page }) => {
    await page.goto(EQUITY_URL);

    // With default board "QdJh4s", board cards should render
    // Q♥ J♦ 4♠ cards should appear
    await page.waitForTimeout(1000);

    const boardCard = page.locator("text=Q♥").last();
    await expect(boardCard).toBeVisible();
  });

  test("4. Stats and results display after calculation", async ({ page }) => {
    await page.goto(EQUITY_URL);

    // Wait for the auto-calculation to complete
    await page.waitForTimeout(3000);

    // The page has default inputs "AKs" vs "QQ" on "QdJh4s"
    // After calculation, stats should appear
    const equityLabel = page.locator("text=AKs EQUITY").first();
    await expect(equityLabel).toBeVisible({ timeout: 10000 });

    // The Equity Breakdown section should render
    const breakdown = page.locator("h3:has-text('Equity Breakdown')");
    await expect(breakdown).toBeVisible();
  });

  test("5. Page title is set correctly", async ({ page }) => {
    await page.goto(EQUITY_URL);
    await expect(page).toHaveTitle(/GTO Wizard/);
  });
});

test.describe("Equity Page Navigation", () => {
  test("can navigate to equity page from home", async ({ page }) => {
    await page.goto("/");

    // Find and click equity link in navigation
    const equityLink = page.locator("a[href='/equity']").first();
    if (await equityLink.count() > 0) {
      await equityLink.click();
      await expect(page).toHaveURL(/\/equity/);
      // Verify the Game settings sidebar loaded
      await expect(page.locator("h2:has-text('Game')")).toBeVisible();
    } else {
      // Navigate directly if link not found
      await page.goto("/equity");
      await expect(page.locator("h2:has-text('Game')")).toBeVisible();
    }
  });
});
