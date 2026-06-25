import { test, expect } from "@playwright/test";

/**
 * Range Explorer E2E Tests
 *
 * Tests cover:
 * 1. Page loads without errors at /range-explorer
 * 2. Page title and description render
 * 3. Position selector buttons exist (BTN through BB)
 * 4. Stack depth selector buttons exist (50bb through 200bb)
 * 5. Board preset buttons exist
 * 6. Custom board input exists
 * 7. "Fetch from API" button exists
 * 8. RangeGrid renders with hand data (demo data by default)
 * 9. Demo data info banner shows
 * 10. Display mode toggle exists (ModeToggle)
 */

const BASE_URL = "http://localhost:3000";

test.describe("Range Explorer Page", () => {
  test("1. Page loads without errors at /range-explorer", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    // Verify main heading
    const heading = page.locator("h1:has-text('Range Explorer')");
    await expect(heading).toBeVisible();

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Page description text renders", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const description = page.locator("text=Explore GTO ranges by position, stack depth, and board texture");
    await expect(description).toBeVisible();
  });

  test("3. Position selector buttons exist for all 6 positions", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const expectedPositions = ["BTN", "CO", "HJ", "LJ", "SB", "BB"];
    for (const pos of expectedPositions) {
      const btn = page.locator(`button:has-text('${pos}')`).first();
      await expect(btn).toBeVisible();
    }
  });

  test("4. Stack depth selector buttons exist", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const stackDepths = ["50bb", "75bb", "100bb", "125bb", "150bb", "200bb"];
    for (const depth of stackDepths) {
      const btn = page.locator(`button:has-text('${depth}')`);
      await expect(btn.first()).toBeVisible();
    }
  });

  test("5. Board preset buttons exist", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const boardPresets = ["Preflop", "QJ4r", "AK2r", "AK2 Two-Tone", "QJ9r"];
    for (const preset of boardPresets) {
      const btn = page.locator(`button:has-text('${preset}')`).first();
      await expect(btn).toBeVisible();
    }
  });

  test("6. Custom board input field exists", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const customInput = page.locator("input[placeholder='Custom (e.g. AhKd2c)']");
    await expect(customInput).toBeVisible();
  });

  test("7. Fetch from API button exists", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const fetchButton = page.locator("button:has-text('Fetch from API')");
    await expect(fetchButton).toBeVisible();
  });

  test("8. Range grid renders with demo hand data", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    // The RangeGrid should render — look for the range title
    const rangeTitle = page.locator("text=Range @").first();
    await expect(rangeTitle).toBeVisible({ timeout: 5000 });
  });

  test("9. Demo data info banner shows", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const demoBanner = page.locator("text=Showing generated demo data");
    await expect(demoBanner).toBeVisible();

    // Should mention Fetch from API option
    const fetchText = page.locator("button:has-text('Fetch from API')");
    await expect(fetchText).toBeVisible();
  });

  test("10. About Range Explorer section renders at bottom", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    const aboutHeading = page.locator("h2:has-text('About Range Explorer')");
    await expect(aboutHeading).toBeVisible();

    // Sub-sections should render
    await expect(page.locator("text=What is Range Explorer?")).toBeVisible();
    await expect(page.locator("text=How to Use")).toBeVisible();
    await expect(page.locator("text=Understanding the Colors")).toBeVisible();
    await expect(page.locator("text=Range Builder")).toBeVisible();
  });

  test("11. Active position highlights when clicked", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    // Click on CO position
    const coBtn = page.locator("button:has-text('CO')").first();
    await coBtn.click();
    await page.waitForTimeout(300);

    // Range title should update to show CO
    const rangeTitle = page.locator("text=CO Range @").first();
    await expect(rangeTitle).toBeVisible();
  });

  test("12. Stack depth selector highlights when clicked", async ({ page }) => {
    await page.goto("/range-explorer");
    await page.waitForLoadState("networkidle");

    // Click on 150bb
    const stackBtn = page.locator("button:has-text('150bb')").first();
    await stackBtn.click();
    await page.waitForTimeout(300);

    // Range title should update to show 150bb
    const rangeTitle = page.locator("text=@ 150bb").first();
    await expect(rangeTitle).toBeVisible();
  });
});
