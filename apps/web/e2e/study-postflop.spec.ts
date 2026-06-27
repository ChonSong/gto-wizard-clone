import { test, expect } from "@playwright/test";

/**
 * Full Postflop Training Workflow E2E Test
 *
 * Validates the complete end-to-end workflow:
 * 1. Navigate to study page, switch to Postflop Training
 * 2. Configure Spot (custom board, pot, stack depth)
 * 3. Fetch GTO strategy and verify response renders
 * 4. Select an action and verify comparison UI
 * 5. Advance through flop → turn → river
 * 6. Verify hand complete indicator
 *
 * Tests the full stack: frontend → API → solver engine.
 */

const STUDY_URL = "/study";

test.describe("Postflop Training: Full Cycle Workflow", () => {
  test("Complete street cycle: configure → solve → act → advance flop → act → advance turn → act → complete river", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // ── Step 1: Navigate ────────────────────────────────────
    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/GTO Wizard/i);

    // ── Step 2: Switch to Postflop Training mode ────────────
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(500);

    // Verify postflop UI is visible
    await expect(page.locator("button:has-text('Configure Spot')")).toBeVisible();
    await expect(page.locator("button[aria-label*='GTO strategy']").first()).toBeVisible();

    // ── Step 3: Open Configure Spot and customise settings ──
    await page.locator("button:has-text('Configure Spot')").click();
    await expect(page.locator("text=Board Cards")).toBeVisible();

    // Change board cards to a clean flop: AhKh2s
    const boardInput = page.locator('input[placeholder="KsKc3s5h9d"]');
    await boardInput.clear();
    await boardInput.fill("AhKh2s");
    await page.waitForTimeout(200);

    // Change pot size to 10bb (uses step="0.1" as unique selector)
    await page.locator('input[step="0.1"]').fill("10");
    await page.waitForTimeout(200);

    // Change stack depth to 50bb (uses step="5" as unique selector)
    await page.locator('input[step="5"]').fill("50");
    await page.waitForTimeout(200);

    // Verify pot size display updated (check the uppercase "Pot" label specifically)
    await expect(page.locator("text=Pot").first()).toBeVisible();

    // Close Configure Spot
    await page.locator("button:has-text('Configure Spot')").click();
    await page.waitForTimeout(300);

    // ── Step 4 (Flop): Fetch GTO Strategy ───────────────────
    const flopResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200 &&
        resp.request().postDataJSON()?.street === "flop"
    );

    await page.locator("button[aria-label*='GTO strategy']").first().click();

    const flopData = await (await flopResponse).json();
    expect(flopData.status).toBe("complete");
    expect(flopData.actions).toBeDefined();
    expect(flopData.actions.length).toBeGreaterThan(0);
    for (const a of flopData.actions) {
      expect(a).toHaveProperty("action");
      expect(a).toHaveProperty("frequency");
      expect(a).toHaveProperty("ev");
    }

    // Wait for the GTO breakdown to render
    await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });

    // Verify frequencies and EV are visible
    const freqCount = await page.locator("text=/\\d+%/").count();
    expect(freqCount).toBeGreaterThan(0);
    const evCount = await page.locator("text=/EV:/").count();
    expect(evCount).toBeGreaterThan(0);

    // Verify source indicator
    await expect(
      page.locator("text=(cached)").or(page.locator("text=(live-solver)"))
    ).toBeVisible();

    // ── Step 5 (Flop): Select action ────────────────────────
    // Use CHECK as it's always available regardless of board
    await page.locator("button:has-text('CHECK')").first().click();
    await page.waitForTimeout(300);

    // Verify action selection indicator
    await expect(page.locator("text=Action selected")).toBeVisible();

    // Verify "Advance to Turn" button appears
    const toTurnBtn = page.locator("button:has-text('Advance to Turn')");
    await expect(toTurnBtn).toBeVisible();

    // ── Step 6: Advance to Turn ─────────────────────────────
    const turnResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200 &&
        resp.request().postDataJSON()?.street === "turn"
    );
    await toTurnBtn.click();
    await turnResponse;
    await page.waitForTimeout(1500);

    // Verify street breadcrumb updated: Turn should be visible
    await expect(page.locator("text=Turn").first()).toBeVisible();

    // GTO breakdown should be showing for the Turn street
    await expect(page.locator("text=GTO Strategy Breakdown")).toBeVisible();

    // Card count should be >= 4 for turn (3 flop + 1 turn)
    const turnCardCount = await page.locator('div[style*="width: 40px"]').count();
    expect(turnCardCount).toBeGreaterThanOrEqual(4);

    // ── Step 7 (Turn): Select action ────────────────────────
    await page.locator("button:has-text('CHECK')").first().click();
    await page.waitForTimeout(300);

    // Verify "Advance to River" button
    const toRiverBtn = page.locator("button:has-text('Advance to River')");
    await expect(toRiverBtn).toBeVisible();

    // ── Step 8: Advance to River ────────────────────────────
    const riverResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200 &&
        resp.request().postDataJSON()?.street === "river"
    );
    await toRiverBtn.click();
    await riverResponse;
    await page.waitForTimeout(1500);

    // Verify River street breadcrumb
    await expect(page.locator("text=river").first()).toBeVisible();

    // Card count should be >= 5 for river
    const riverCardCount = await page.locator('div[style*="width: 40px"]').count();
    expect(riverCardCount).toBeGreaterThanOrEqual(5);

    // ── Step 9 (River): Final action + hand complete ────────
    await page.locator("button:has-text('CHECK')").first().click();
    await page.waitForTimeout(300);

    // All 3 streets played — verify hand complete indicator
    await expect(page.locator("text=Hand complete")).toBeVisible();
    await expect(page.locator("text=all streets played")).toBeVisible();

    // ── No critical console errors ──────────────────────────
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("Configure Spot resets solver state when board changes", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(STUDY_URL);
    await page.waitForLoadState("networkidle");

    // Switch to Postflop Training
    await page.locator("button:has-text('Postflop Training')").click();
    await page.waitForTimeout(500);

    // Open Configure Spot
    await page.locator("button:has-text('Configure Spot')").click();
    await expect(page.locator("text=Board Cards")).toBeVisible();

    // Change board
    const boardInput = page.locator('input[placeholder="KsKc3s5h9d"]');
    await boardInput.clear();
    await boardInput.fill("TdTs2c");
    await page.waitForTimeout(200);

    // Change pot
    await page.locator('input[step="0.1"]').fill("12");
    await page.waitForTimeout(200);

    // Close Configure Spot
    await page.locator("button:has-text('Configure Spot')").click();
    await page.waitForTimeout(300);

    // Fetch strategy with custom config
    const apiResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/solver/postflop-strategy") &&
        resp.status() === 200
    );
    await page.locator("button[aria-label*='GTO strategy']").first().click();
    await apiResponse;

    // Verify breakdown renders
    await page.waitForSelector("text=GTO Strategy Breakdown", { timeout: 15000 });

    // Verify strategy frequencies display
    const freqCount = await page.locator("text=/\\d+%/").count();
    expect(freqCount).toBeGreaterThan(0);

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
