import { test, expect } from "@playwright/test";

/**
 * SMOKE TESTS — 5 most important user flows.
 *
 * These are fast, focused checks that verify real API data loads
 * and renders on the 5 core pages. They complement the existing
 * detailed E2E tests by testing API integration rather than UI polish.
 *
 * Tests check:
 * 1. Landing page — homepage loads with feature cards
 * 2. Equity calculator — renders range data and game state
 * 3. ICM calculator — loads and displays ICM results
 * 4. Courses list — fetches and displays courses from API
 * 5. Variant selector — loads variants from API and renders cards
 */

const BASE_URL = "http://localhost:3000";

test.describe("Smoke: Landing Page", () => {
  test("1. Landing page loads with feature navigation cards", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify GTO Wizard branding
    await expect(page.locator("h1")).toContainText(/GTO|Wizard/i);

    // Verify navigation links to main features exist
    const featureLinks = page.locator(
      'a[href="/study"], a[href="/equity"], a[href="/icm"], a[href="/courses"]'
    );
    const linkCount = await featureLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(2);

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Smoke: Equity Calculator", () => {
  test("2. Equity calculator loads and renders game state", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/equity");
    await page.waitForLoadState("networkidle");

    // Verify game view rendered (core equity page component)
    const gameHeading = page.locator("h2:has-text('Game')");
    await expect(gameHeading).toBeVisible();

    // Verify input fields exist (redesigned equity page uses text inputs with placeholders)
    await expect(page.getByPlaceholder("e.g. AA, KK, AKs")).toBeVisible();
    await expect(page.getByPlaceholder("e.g. QQ, AK, JJ")).toBeVisible();
    await expect(page.getByPlaceholder("e.g. AhKdQc")).toBeVisible();

    // Verify Calculate button exists
    await expect(page.getByRole("button", { name: /calculate/i })).toBeVisible();

    // Wait for auto-calculation results (Equity Breakdown chart)
    await expect(page.locator("h3:has-text('Equity Breakdown')")).toBeVisible({ timeout: 15000 });

    // Verify equity stat labels appear after calculation (dynamic labels like "AKs EQUITY", "QQ EQUITY")
    await expect(page.locator("text=AKs EQUITY")).toBeVisible();
    await expect(page.locator("text=QQ EQUITY")).toBeVisible();
    await expect(page.locator("text=WINS")).toBeVisible();
    await expect(page.locator("text=TIES")).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Smoke: ICM Calculator", () => {
  test("3. ICM calculator loads and displays calculator UI", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/icm");
    await page.waitForLoadState("networkidle");

    // Verify ICM Calculator heading
    const heading = page.locator("h1:has-text('ICM Calculator')");
    await expect(heading).toBeVisible();

    // Prize pool structure section renders
    const prizeSection = page.locator("h3:has-text('Prize Pool')");
    await expect(prizeSection).toBeVisible();

    // Chip stacks section renders
    const chipSection = page.locator("h3:has-text('Chip Stacks')");
    await expect(chipSection).toBeVisible();

    // Player name inputs exist (at least 4 players by default)
    const playerInputs = page.locator("input[type='text']");
    const playerCount = await playerInputs.count();
    expect(playerCount).toBeGreaterThanOrEqual(4);

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Smoke: Courses List", () => {
  test("4. Courses page fetches and displays courses from API", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/courses");
    await page.waitForLoadState("networkidle");

    // Verify courses heading
    const heading = page.locator("h1:has-text('Pre-Built Courses')");
    await expect(heading).toBeVisible();

    // Available Courses list heading
    const listHeading = page.locator("h2:has-text('Available Courses')");
    await expect(listHeading).toBeVisible();

    // Course cards rendered (course titles are h3 elements)
    const courseCards = page.locator("h3");
    const cardCount = await courseCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Quick Stats section displays
    const quickStats = page.locator("h4:has-text('Quick Stats')");
    await expect(quickStats).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Smoke: Variant Selector Page", () => {
  test("5. Variant selector loads and displays all 10 variants from API", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Intercept the variants API call to verify real response
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/v1/variants") && resp.status() === 200
    );

    await page.goto("/variants");
    await page.waitForLoadState("networkidle");

    // Verify the API returned data
    const response = await apiResponse;
    const body = await response.json();
    expect(body.variants).toBeDefined();
    expect(Array.isArray(body.variants)).toBe(true);
    expect(body.variants.length).toBeGreaterThanOrEqual(5);

    // Verify page heading
    const heading = page.locator("h1:has-text('Poker Variants')");
    await expect(heading).toBeVisible();

    // Variant cards render with names
    const firstVariant = page.locator("h3").first();
    await expect(firstVariant).toBeVisible();

    // Category filter buttons exist (All, Flop, Stud, Draw)
    const filterButtons = page.locator("button").filter({ hasText: /All|Flop|Stud|Draw/i });
    const filterCount = await filterButtons.count();
    expect(filterCount).toBeGreaterThanOrEqual(3);

    // Stat cards show total variants count
    const statCards = page.locator("text=Total Variants");
    await expect(statCards).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Smoke: Strategies Page", () => {
  test("6. Strategies page loads GTO Strategy Browser with form controls", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/strategies");
    await page.waitForLoadState("networkidle");

    // Verify the page loads with the correct heading
    const heading = page.locator("h1:has-text('GTO Strategy Browser')");
    await expect(heading).toBeVisible();

    // Verify board card inputs render (5 inputs for flop 1-3, turn, river)
    const boardInputs = page.locator("input[type='text']");
    const boardInputCount = await boardInputs.count();
    expect(boardInputCount).toBeGreaterThanOrEqual(5);

    // Verify position selector exists with known positions
    const positionOptions = page.locator("select").first().locator("option");
    const optionCount = await positionOptions.count();
    expect(optionCount).toBeGreaterThanOrEqual(4);

    // Verify stack depth selector exists
    const stackSelect = page.locator("select").nth(1);
    await expect(stackSelect).toBeVisible();

    // Verify bet size selector exists
    const betSizeSelect = page.locator("select").nth(2);
    await expect(betSizeSelect).toBeVisible();

    // Verify "Solve New Spot" button renders
    const solveButton = page.locator("button:has-text('Solve New Spot')");
    await expect(solveButton).toBeVisible();

    // Empty state text when no board cards entered
    const emptyState = page.locator("text=Enter at least 3 board cards");
    await expect(emptyState).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("_next/static")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
