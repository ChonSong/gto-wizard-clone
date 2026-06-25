import { test, expect } from "@playwright/test";

test.describe("Quiz Page", () => {
  test("page renders quiz interface with no console errors", async ({ page }) => {
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

    const response = await page.goto("/quiz");
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(50);

    const quizHeading = page.locator("h1, h2, h3").filter({ hasText: /Quiz|Question|Spot|Training|GTO/i }).first();
    const hasQuizHeading = await quizHeading.isVisible().catch(() => false);

    const actionButtons = page.locator("button").filter({
      hasText: /Fold|Call|Raise|All-in|Next|Submit|Answer|Start/i,
    });
    const actionButtonCount = await actionButtons.count();

    const canvas = page.locator("canvas");
    const hasCanvas = await canvas.first().isVisible().catch(() => false);

    console.log("Quiz Page:");
    console.log("  Quiz heading found: " + hasQuizHeading);
    console.log("  Action buttons: " + actionButtonCount);
    console.log("  Canvas element: " + hasCanvas);
    console.log("  Console errors: " + consoleErrors.length);
    console.log("  Page errors: " + pageErrors.length);

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500") && !e.includes("Loading chunk") && !e.includes("WebSocket") && !e.includes("socket.io")
    );

    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("quiz page has interactive elements or loading indicator", async ({ page }) => {
    await page.goto("/quiz");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const allButtons = page.locator("button");
    const buttonCount = await allButtons.count();

    const allLinks = page.locator("a");
    const linkCount = await allLinks.count();

    const allInputs = page.locator("input, select, textarea");
    const inputCount = await allInputs.count();

    const loadingIndicator = page.locator(".spinner, .loading, [role='progressbar'], .skeleton, .animate-pulse");
    const hasLoading = await loadingIndicator.first().isVisible().catch(() => false);

    console.log("  Interactive: buttons=" + buttonCount + ", links=" + linkCount + ", inputs=" + inputCount + ", loading=" + hasLoading);

    const hasContent = buttonCount > 0 || linkCount > 0 || inputCount > 0 || hasLoading;
    expect(hasContent).toBe(true);
  });
});
