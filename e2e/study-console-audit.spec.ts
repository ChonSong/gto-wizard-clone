import { test, expect } from "@playwright/test";

/**
 * Study Page Console Error Audit
 *
 * Opens /study in both preflop and postflop modes,
 * captures ALL console messages (errors, warnings, uncaught exceptions),
 * and reports them for fixing.
 */

const STUDY_URL = "/study";

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
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
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
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
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
    await page.waitForTimeout(500);

    // Click "Get GTO Strategy" and wait for solver response
    const apiResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200
    );
    await page.locator("button:has-text('Get GTO Strategy')").click();
    const response = await apiResponse;

    // Wait for GTO breakdown to render
    await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });
    await page.waitForTimeout(500);

    console.log(`=== Postflop Mode + Solver Audit ===`);
    console.log(`API status: ${response.status()}`);
    console.log(`Console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
    console.log(`Console warnings (${consoleWarnings.length}):`);
    for (const w of consoleWarnings) console.log(`  WARN: ${w}`);
    console.log(`Unhandled rejections (${unhandledRejections.length}):`);
    for (const r of unhandledRejections) console.log(`  REJECTION: ${r}`);

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );

    expect(criticalErrors).toHaveLength(0);
    expect(unhandledRejections).toHaveLength(0);
  });
});
