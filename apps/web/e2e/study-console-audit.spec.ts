import { test, expect } from "@playwright/test";

/**
 * Study Page Console Error Audit
 *
 * Opens /study in both preflop and postflop modes,
 * captures ALL console messages (errors, warnings, uncaught exceptions),
 * and reports them for fixing.
 */

const STUDY_URL = "/study";

// Known backend API errors returned when solver/quiz containers are offline
const BACKEND_API_PATTERN = /400.*Bad Request|Failed to load resource.*400/;

test.describe("Study Page Console Error Audit", () => {
  test("Preflop mode: 0 console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const unhandledRejections: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "warning") consoleWarnings.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      unhandledRejections.push(`[PAGE_ERROR] ${err.message}`);
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check page loaded with correct title
    await expect(page).toHaveTitle(/GTO Wizard/i);

    // Check for preflop matrix cells (AA, KK, etc.)
    const hasMatrix = await page.locator("text=AA").first().isVisible().catch(() => false);

    console.log(`=== Preflop Mode Audit ===`);
    console.log(`Matrix rendered: ${hasMatrix}`);
    console.log(`Console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
    console.log(`Console warnings (${consoleWarnings.length}):`);
    for (const w of consoleWarnings) console.log(`  WARN: ${w}`);
    console.log(`Unhandled rejections (${unhandledRejections.length}):`);
    for (const r of unhandledRejections) console.log(`  REJECTION: ${r}`);

    // Filter known noise
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !BACKEND_API_PATTERN.test(e)
    );

    expect(criticalErrors).toHaveLength(0);
    expect(unhandledRejections).toHaveLength(0);
  });

  test("Postflop mode: 0 console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const unhandledRejections: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "warning") consoleWarnings.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      unhandledRejections.push(`[PAGE_ERROR] ${err.message}`);
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Switch to Postflop Training mode
    const postflopBtn = page.locator("button:has-text('Postflop Training')");
    await expect(postflopBtn).toBeVisible({ timeout: 10000 });
    await postflopBtn.click();
    await page.waitForTimeout(1000);

    // Check postflop UI elements
    const configBtn = page.locator("button:has-text('Configure Spot')");
    const hasConfigBtn = await configBtn.isVisible().catch(() => false);
    const solveBtn = page.locator("button:has-text('Get GTO Strategy')");
    const hasSolveBtn = await solveBtn.isVisible().catch(() => false);

    console.log(`=== Postflop Mode Audit ===`);
    console.log(`Configure Spot visible: ${hasConfigBtn}`);
    console.log(`Get GTO Strategy visible: ${hasSolveBtn}`);
    console.log(`Console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
    console.log(`Console warnings (${consoleWarnings.length}):`);
    for (const w of consoleWarnings) console.log(`  WARN: ${w}`);
    console.log(`Unhandled rejections (${unhandledRejections.length}):`);
    for (const r of unhandledRejections) console.log(`  REJECTION: ${r}`);

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !BACKEND_API_PATTERN.test(e)
    );

    expect(criticalErrors).toHaveLength(0);
    expect(unhandledRejections).toHaveLength(0);
  });

  test("Postflop mode with solver: 0 console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const unhandledRejections: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "warning") consoleWarnings.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      unhandledRejections.push(`[PAGE_ERROR] ${err.message}`);
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Switch to Postflop Training
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(2000);

    // The PostflopTraining component auto-fetches strategy on mount (useEffect).
    // The button text changes from "Get GTO Strategy" → "⟳ Refresh" once a strategy loads.
    // If solver is offline, it stays as "Get GTO Strategy" (no strategy set).
    // Handle both cases.
    const apiResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    // Button text: "Get GTO Strategy" when no strategy loaded, "⟳ Refresh" when strategy exists.
    // The aria-label is "Get GTO strategy" / "Refresh GTO strategy" respectively.
    // Use aria-label for stable matching since visible text contains unicode glyphs.
    const gtoBtn = page.locator("button[aria-label='Get GTO strategy']");
    const refreshBtn = page.locator("button[aria-label='Refresh GTO strategy']");

    // Wait for either button to appear (auto-fetch may complete instantly if strategy cached)
    const strategyBtn = (await gtoBtn.count()) > 0 ? gtoBtn : refreshBtn;
    // Click whichever button is present (force: true to handle scroll-container clipping)
    await strategyBtn.click({ timeout: 10000, force: true });
    const response = await apiResponsePromise;

    if (response) {
      // Wait for GTO breakdown to render
      await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });
      await page.waitForTimeout(500);
    } else {
      // Solver API offline — wait for button to settle and check console anyway
      await page.waitForTimeout(3000);
      test.info().annotations.push({
        type: 'finding',
        description: 'Solver API did not respond — skipping GTO breakdown render check'
      });
      console.warn('⚠️  Solver API offline — skipping response assertions');
    }

    console.log(`=== Postflop Mode + Solver Audit ===`);
    console.log(`API status: ${response ? response.status() : 'unavailable (solver offline)'}`);
    console.log(`Console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
    console.log(`Console warnings (${consoleWarnings.length}):`);
    for (const w of consoleWarnings) console.log(`  WARN: ${w}`);
    console.log(`Unhandled rejections (${unhandledRejections.length}):`);
    for (const r of unhandledRejections) console.log(`  REJECTION: ${r}`);

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !BACKEND_API_PATTERN.test(e)
    );

    expect(criticalErrors).toHaveLength(0);
    expect(unhandledRejections).toHaveLength(0);
  });
});
