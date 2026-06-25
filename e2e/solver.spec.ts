import { test, expect } from "@playwright/test";

/**
 * Solver Integration E2E Tests
 *
 * Tests verify the full stack: frontend → API → solver engine.
 * They navigate to the study page, switch to Postflop Training mode,
 * request GTO strategy from the solver, and verify the response renders
 * with action frequencies and EV values.
 */

const STUDY_URL = "/study";

test.describe("Solver Integration: Postflop Training", () => {
  test("1. Study page loads with preflop and postflop mode toggle", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");

    // Verify page loaded with GTO Wizard branding
    await expect(page).toHaveTitle(/GTO Wizard/i);

    // Verify mode toggle buttons exist
    const preflopBtn = page.locator("button:has-text('Preflop Ranges')");
    await expect(preflopBtn).toBeVisible();

    const postflopBtn = page.locator("button:has-text('Postflop Training')");
    await expect(postflopBtn).toBeVisible();

    // Verify preflop matrix is visible by default
    const matrixCell = page.locator("text=AA").first();
    await expect(matrixCell).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Switch to Postflop Training mode shows board display and action buttons", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");

    // Switch to Postflop Training mode
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(500);

    // Verify postflop UI elements are visible
    // Configure Spot button should exist
    const configBtn = page.locator("button:has-text('Configure Spot')");
    await expect(configBtn).toBeVisible();

    // Board display should show community cards
    const boardLabel = page.locator("text=flop").first();
    await expect(boardLabel).toBeVisible();

    // Pot size display
    const potLabel = page.locator("text=Pot").first();
    await expect(potLabel).toBeVisible();

    // Action buttons should be present
    const checkBtn = page.locator("button:has-text('CHECK')");
    await expect(checkBtn).toBeVisible();

    const bet33Btn = page.locator("button:has-text('BET 33%')");
    await expect(bet33Btn).toBeVisible();

    const foldBtn = page.locator("button:has-text('FOLD')");
    await expect(foldBtn).toBeVisible();

    const callBtn = page.locator("button:has-text('CALL')");
    await expect(callBtn).toBeVisible();

    // Get GTO Strategy button should exist
    const solveBtn = page.locator("button:has-text('Get GTO Strategy')");
    await expect(solveBtn).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("3. Clicking 'Get GTO Strategy' fetches solver response and displays action frequencies + EV", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");

    // Switch to Postflop Training
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(300);

    // Intercept the solver API call
    const apiResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200
    );

    // Click "Get GTO Strategy" button
    await page.locator("button:has-text('Get GTO Strategy')").click();

    // Wait for the API response
    const response = await apiResponse;
    const body = await response.json();
    expect(body.status).toBe("complete");
    expect(body.actions).toBeDefined();
    expect(Array.isArray(body.actions)).toBe(true);
    expect(body.actions.length).toBeGreaterThan(0);
    expect(body.source).toBeDefined();

    // Verify action shape: each action has action, frequency, ev
    for (const action of body.actions) {
      expect(action).toHaveProperty("action");
      expect(action).toHaveProperty("frequency");
      expect(action).toHaveProperty("ev");
    }

    // Wait for the GTO strategy breakdown to render
    await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });

    // Verify the breakdown section displays action cards with frequencies
    const gtoSection = page.locator("text=GTO Strategy Breakdown").first().locator("..");
    await expect(gtoSection).toBeVisible();

    // Frequencies are shown as percentages (e.g. "93%")
    const freqVisible = await page.locator("text=/\\d+%/").count();
    expect(freqVisible).toBeGreaterThan(0);

    // EV values are shown (e.g. "EV: 2.75")
    const evVisible = await page.locator("text=/EV:/").count();
    expect(evVisible).toBeGreaterThan(0);

    // Strategy source indicator — shows as "(cached)" or "(live-solver)" in the GTO section
    const sourceText = page.locator("text=(cached)").or(page.locator("text=(live-solver)"));
    await expect(sourceText).toBeVisible();

    // Button text should now show "⟳ Refresh"
    await expect(page.locator("button:has-text('Refresh')")).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("4. User can select an action and see GTO comparison with frequency and EV", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");

    // Switch to Postflop Training
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(300);

    // Get strategy first
    const apiResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200
    );
    await page.locator("button:has-text('Get GTO Strategy')").click();
    await apiResponse;
    await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });

    // Click the CALL button (one of the action buttons)
    const callBtn = page.locator("button:has-text('CALL')").first();
    await callBtn.click();
    await page.waitForTimeout(300);

    // Verify "✓ Action selected" indicator appears
    const actionSelected = page.locator("text=Action selected");
    await expect(actionSelected).toBeVisible();

    // Verify "Advance to Turn" button appears (since action is taken on flop)
    const advanceBtn = page.locator("button:has-text('Advance to')");
    await expect(advanceBtn).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("5. Street navigation advances from flop to turn and updates strategy", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");

    // Switch to Postflop Training
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(300);

    // Get strategy
    const apiResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200
    );
    await page.locator("button:has-text('Get GTO Strategy')").click();
    await apiResponse;
    await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });

    // Select an action (CHECK)
    const checkBtn = page.locator("button:has-text('CHECK')").first();
    await checkBtn.click();
    await page.waitForTimeout(300);

    // Click "Advance to Turn"
    const advanceBtn = page.locator("button:has-text('Advance to')");
    await advanceBtn.click();

    // Wait for the turn strategy to load
    await page.waitForTimeout(1000);

    // Verify the street breadcrumb updated — should now say "Flop" completed and "Turn" active
    const turnLabel = page.locator("text=Turn").first();
    await expect(turnLabel).toBeVisible();

    // The board should now show at least 3 community cards
    // Cards are rendered as CardDisplay components (div with width:40 containing rank + suit)
    const cardDisplays = page.locator('div[style*="width: 40px"]');
    const cardCount = await cardDisplays.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
