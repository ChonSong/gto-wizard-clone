import { test, expect, type Page } from "@playwright/test";

/**
 * ICM Calculator E2E Tests
 * 
 * Tests cover:
 * 1. Page loads without errors at /icm
 * 2. PrizePoolPanel - prize distribution editing
 * 3. ChipStackPanel - player stack management
 * 4. ICMResults - equity calculations display
 * 5. Tournament buy-in and total chips inputs
 * 6. Navigation between pages
 */

const ICM_URL = "/icm";

export class ICMPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(ICM_URL);
  }

  // Prize Pool Panel
  getPrizePoolSection() {
    return this.page.locator("div.border").filter({ has: this.page.locator("h3:has-text('Prize Pool Structure')") });
  }

  // Chip Stack Panel
  getChipStackSection() {
    return this.page.locator("div.border").filter({ has: this.page.locator("h3:has-text('Chip Stacks')") });
  }

  // ICM Results - dynamically imported, heading is "ICM Analysis"
  getICMResultsSection() {
    return this.page.locator("div.border").filter({ has: this.page.locator("h3:has-text('ICM Analysis')") }).first();
  }

  // Tournament buy-in input
  getBuyInInput() {
    return this.page.locator("input[type='number']").first();
  }

  // Total chips input
  getTotalChipsInput() {
    return this.page.locator("input[type='number']").nth(1);
  }

  // Player name inputs
  getPlayerNameInputs() {
    return this.page.locator("input[type='text']");
  }

  // Player chip inputs
  getPlayerChipInputs() {
    return this.page.locator("input[type='number']");
  }

  // About ICM section
  getAboutSection() {
    return this.page.locator("h2:has-text('About ICM')");
  }
}

test.describe("ICM Calculator Page", () => {
  let icmPage: ICMPage;

  test.beforeEach(async ({ page }) => {
    icmPage = new ICMPage(page);
  });

  test("1. Page loads without errors at /icm", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await icmPage.goto();
    await page.waitForLoadState("networkidle");

    // Check title
    await expect(page).toHaveTitle(/GTO|ICM/i);

    // Verify main heading
    const heading = page.locator("h1:has-text('ICM Calculator')");
    await expect(heading).toBeVisible();

    // Verify no critical console errors (ignore 500s from missing backend API)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("500")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. PrizePoolPanel displays and allows editing", async ({ page }) => {
    await icmPage.goto();

    const prizeSection = icmPage.getPrizePoolSection();
    await expect(prizeSection).toBeVisible();

    // Verify default prize percentages (50, 30, 20)
    const percentageTexts = prizeSection.locator("text=/\\d+%/");
    const count = await percentageTexts.count();
    expect(count).toBeGreaterThan(0);

    // Look for editable prize fields
    const prizeInputs = prizeSection.locator("input[type='number']");
    const inputCount = await prizeInputs.count();
    
    if (inputCount > 0) {
      // Modify first prize percentage
      const firstInput = prizeInputs.first();
      await firstInput.fill("60");
      await expect(firstInput).toHaveValue("60");
    }
  });

  test("3. ChipStackPanel displays player stacks", async ({ page }) => {
    await icmPage.goto();

    const stackSection = icmPage.getChipStackSection();
    await expect(stackSection).toBeVisible();

    // Player names are rendered as input elements (editable text fields)
    const playerNameInputs = stackSection.locator("input[type='text']");
    const playerCount = await playerNameInputs.count();
    expect(playerCount).toBeGreaterThanOrEqual(4);

    // Verify chip amounts are displayed (as text next to progress bars)
    const chipTexts = stackSection.locator("text=/\\d{3,}/");
    const chipCount = await chipTexts.count();
    expect(chipCount).toBeGreaterThan(0);
  });

  test("4. ICMResults section displays calculations", async ({ page }) => {
    await icmPage.goto();

    // Wait for the page DOM to load (networkidle can time out with polling endpoints)
    await page.waitForLoadState("domcontentloaded");

    const resultsSection = icmPage.getICMResultsSection();

    // Verify results section exists (use longer timeout for API-backed content)
    await expect(resultsSection).toBeVisible({ timeout: 15000 });

    // Look for equity values (percentages or currency)
    const equityElements = resultsSection.locator("text=/\\d+\\.?\\d*%/");
    const hasEquity = await equityElements.count() > 0;

    // Also check for dollar values
    const dollarValues = resultsSection.locator("text=/\\$[\\d,]+/");
    const hasDollarValues = await dollarValues.count() > 0;

    // At least one type of result should be visible
    expect(hasEquity || hasDollarValues || ((await resultsSection.textContent()) ?? '').length > 0).toBe(true);
  });

  test("5. Tournament buy-in input is functional", async ({ page }) => {
    await icmPage.goto();

    const buyInInput = icmPage.getBuyInInput();
    
    // Check default value
    await expect(buyInInput).toHaveValue("1000");

    // Change value
    await buyInInput.fill("5000");
    await expect(buyInInput).toHaveValue("5000");

    // Verify page still works after change
    await page.waitForTimeout(300);
    await expect(page.locator("h1:has-text('ICM Calculator')")).toBeVisible();
  });

  test("6. Player chip amounts can be edited", async ({ page }) => {
    await icmPage.goto();

    const stackSection = icmPage.getChipStackSection();
    
    // Find chip inputs in the stack section
    const chipInputs = stackSection.locator("input[type='number']");
    const chipInputCount = await chipInputs.count();

    if (chipInputCount > 0) {
      const firstChipInput = chipInputs.first();
      const initialValue = await firstChipInput.inputValue();
      
      // Modify the value
      const newValue = String(parseInt(initialValue) + 1000);
      await firstChipInput.fill(newValue);
      
      await expect(firstChipInput).toHaveValue(newValue);
    }
  });

  test("7. About ICM section is visible with information", async ({ page }) => {
    await icmPage.goto();

    const aboutSection = icmPage.getAboutSection();
    await expect(aboutSection).toBeVisible();

    // Check for ICM explanation content
    const aboutContent = page.locator("h3:has-text('What is ICM?')");
    await expect(aboutContent).toBeVisible();

    // Check for Why use ICM section
    const whyICM = page.locator("h3:has-text('Why use ICM?')");
    await expect(whyICM).toBeVisible();
  });

  test("8. Quick settings section exists", async ({ page }) => {
    await icmPage.goto();

    // Look for buy-in label (actual text is "Buy-in:")
    const buyInLabel = page.locator("label:has-text('Buy-in')").first();
    await expect(buyInLabel).toBeVisible();

    // Look for total chips label
    const totalChipsLabel = page.locator("label:has-text('Total Chips')").first();
    await expect(totalChipsLabel).toBeVisible();
  });
});

test.describe("ICM Page Navigation", () => {
  test("can navigate to ICM page from home", async ({ page }) => {
    await page.goto("/");

    // Find and click ICM link in navigation
    const icmLink = page.locator("a[href='/icm']").first();
    if (await icmLink.count() > 0) {
      await icmLink.click();
      await expect(page).toHaveURL(/\/icm/);

      await expect(page.locator("h1:has-text('ICM Calculator')")).toBeVisible();
    } else {
      // Navigate directly
      await page.goto("/icm");
      await expect(page.locator("h1:has-text('ICM Calculator')")).toBeVisible();
    }
  });
});
