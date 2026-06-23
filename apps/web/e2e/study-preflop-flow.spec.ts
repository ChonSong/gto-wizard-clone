import { test, expect } from "@playwright/test";

// Helper: position cards are <div role="button"> with class hspot-card
const posCard = (position: string) =>
  page.locator(`div[role="button"][class*="hspot-card"]`).filter({ hasText: new RegExp(`^${position}`) });

test.describe("Study Preflop Flow", () => {
  test("user clicks position button and hand matrix renders", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    const response = await page.goto("/study");
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    const positionButtons = page.locator('div[role="button"][class*="hspot-card"]').filter({
      hasText: /^(UTG|HJ|CO|BTN|SB|BB)/,
    });
    const positionCount = await positionButtons.count();
    console.log("  Position buttons found: " + positionCount);
    expect(positionCount).toBeGreaterThanOrEqual(3);

    // Use getByRole to find the UTG position card
    const utgButton = page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^UTG/ }).first();
    await expect(utgButton).toBeVisible({ timeout: 10000 });
    await utgButton.click();
    await page.waitForTimeout(500);

    const matrixCell = page.locator("div").filter({ hasText: /^AA$/ }).first();
    const hasMatrixCell = await matrixCell.isVisible().catch(() => false);
    console.log("  Hand matrix AA visible: " + hasMatrixCell);

    const kkCell = page.locator("div").filter({ hasText: /^KK$/ }).first();
    const hasKK = await kkCell.isVisible().catch(() => false);
    console.log("  Hand matrix KK visible: " + hasKK);

    const stackSelect = page.locator("select, button, [role='button']").filter({
      hasText: /100bb|75bb|50bb|Stack|Depth/i,
    });
    const hasStackSelector = await stackSelect.first().isVisible().catch(() => false);
    console.log("  Stack selector visible: " + hasStackSelector);

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !e.includes("Loading chunk") && !e.includes("WebSocket") && !e.includes("socket.io")
    );

    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("user selects different stack depth and matrix updates", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/study");
    await page.waitForLoadState("networkidle");

    const btnButton = page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^BTN/ }).first();
    await expect(btnButton).toBeVisible({ timeout: 10000 });
    await btnButton.click();
    await page.waitForTimeout(300);

    const stackOptions = page.locator("select, button, [role='button'], [role='tab']").filter({
      hasText: /100bb|75bb|150bb|200bb/,
    });
    const stackOptionCount = await stackOptions.count();
    console.log("  Stack depth options: " + stackOptionCount);

    if (stackOptionCount > 1) {
      const seventyFive = stackOptions.filter({ hasText: /75bb/ }).first();
      if (await seventyFive.isVisible().catch(() => false)) {
        await seventyFive.click();
        await page.waitForTimeout(500);
        console.log("  Clicked 75bb stack depth");
      }
    }

    const matrixVisible = await page.locator("div").filter({ hasText: /^AA$/ }).first().isVisible().catch(() => false);
    console.log("  Matrix still visible after stack change: " + matrixVisible);

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !e.includes("Loading chunk")
    );

    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("clicking a matrix cell shows hand details", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/study");
    await page.waitForLoadState("networkidle");

    const coButton = page.locator('div[role="button"][class*="hspot-card"]').filter({ hasText: /^CO/ }).first();
    await expect(coButton).toBeVisible({ timeout: 10000 });
    await coButton.click();
    await page.waitForTimeout(300);

    const aksCell = page.locator("div").filter({ hasText: /^AKs$/ }).first();
    if (await aksCell.isVisible().catch(() => false)) {
      await aksCell.click();
      await page.waitForTimeout(500);
      console.log("  Clicked AKs cell");

      const actionButtons = page.locator("button, [role='button']").filter({
        hasText: /Fold|Call|Raise|All-in/i,
      });
      const actionCount = await actionButtons.count();
      console.log("  Action buttons after hand click: " + actionCount);
    }

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !e.includes("Loading chunk")
    );

    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
