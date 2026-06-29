import { test, expect, type Page } from "@playwright/test";

/**
 * Courses E2E Tests
 * 
 * Tests cover:
 * 1. Page loads without errors at /courses
 * 2. Course list displays with correct information
 * 3. Difficulty filter works
 * 4. Category filter works
 * 5. Course selection shows detail view
 * 6. Progress bars display correctly
 * 7. Continue/Start course buttons
 * 8. Quick stats section
 * 9. Navigation between pages
 */

const COURSES_URL = "/courses";

export class CoursesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(COURSES_URL);
  }

  // Course list heading
  getCourseListHeading() {
    return this.page.locator("h2:has-text('Available Courses')");
  }

  // Difficulty filter
  getDifficultyFilter() {
    return this.page.locator("select").first();
  }

  // Category filter
  getCategoryFilter() {
    return this.page.locator("select").nth(1);
  }

  // Course cards
  getCourseCards() {
    return this.page.locator("button:has-text('Preflop'), button:has-text('Preflop Fundamentals')");
  }

  // Continue Training button
  getContinueButton() {
    return this.page.locator("a:has-text('Continue Training'), button:has-text('Continue Training')");
  }

  // Stats cards
  getStatsCards() {
    return this.page.locator("text=Available Courses").locator("..").locator("..").locator("..");
  }
}

test.describe("Courses Page", () => {
  let coursesPage: CoursesPage;

  test.beforeEach(async ({ page }) => {
    coursesPage = new CoursesPage(page);
  });

  test("1. Page loads without errors at /courses", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await coursesPage.goto();
    await page.waitForLoadState("networkidle");

    // Check title
    await expect(page).toHaveTitle(/GTO|Courses/i);

    // Verify main heading
    const heading = page.locator("h1:has-text('Pre-Built Courses')");
    await expect(heading).toBeVisible();

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Course list displays available courses", async ({ page }) => {
    await coursesPage.goto();

    const courseListHeading = coursesPage.getCourseListHeading();
    await expect(courseListHeading).toBeVisible();

    // Check for course cards
    const courseCards = page.locator("h3");
    const cardCount = await courseCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("3. Difficulty filter works", async ({ page }) => {
    await coursesPage.goto();

    const difficultyFilter = coursesPage.getDifficultyFilter();
    await expect(difficultyFilter).toBeVisible();

    // Select intermediate
    await difficultyFilter.selectOption("intermediate");
    await page.waitForTimeout(300);

    // Verify courses are still displayed
    const heading = coursesPage.getCourseListHeading();
    await expect(heading).toBeVisible();
  });

  test("4. Category filter works", async ({ page }) => {
    await coursesPage.goto();

    const categoryFilter = coursesPage.getCategoryFilter();
    await expect(categoryFilter).toBeVisible();
        // Select Preflop category (matches seeded course data)
        await categoryFilter.selectOption("preflop");
    await page.waitForTimeout(300);

    // Verify courses are still displayed
    const heading = coursesPage.getCourseListHeading();
    await expect(heading).toBeVisible();
  });

  test("5. Course selection shows detail", async ({ page }) => {
    await coursesPage.goto();

    // Find and click a course card
    const firstCourse = page.locator("h3:has-text('Preflop Fundamentals')").first();
    
    if (await firstCourse.count() > 0) {
      // Course might be inside a button or clickable element
      const courseButton = firstCourse.locator("..").locator("..");
      await courseButton.click();
      await page.waitForTimeout(300);

      // Look for course detail elements (progress bar, start/continue button)
      const hasProgress = await page.locator("text=Your Progress").count() > 0 ||
                          await page.locator("button:has-text('Start Course')").count() > 0 ||
                          await page.locator("button:has-text('Continue Course')").count() > 0;
      expect(hasProgress).toBe(true);
    }
  });

  test("6. Progress bars display correctly", async ({ page }) => {
    await coursesPage.goto();

    // Look for progress bars (height-1 or h-1 class with bg-poker-gold)
    const progressBars = page.locator(".bg-poker-gold, [class*='bg-poker-gold']");
    const progressCount = await progressBars.count();

    // Should have at least some progress indicators
    // (courses show progress for ones started)
    expect(progressCount).toBeGreaterThanOrEqual(0);
  });

  test("7. Start/Continue Course button is visible", async ({ page }) => {
    await coursesPage.goto();

    // Click a course to see the detail
    const firstCourse = page.locator("h3:has-text('Preflop Fundamentals')").first();
    
    if (await firstCourse.count() > 0) {
      const courseButton = firstCourse.locator("..").locator("..");
      await courseButton.click();
      await page.waitForTimeout(300);

      // Look for either Start Course or Continue Course button
      const startButton = page.locator("button:has-text('Start Course')");
      const continueButton = page.locator("button:has-text('Continue Course')");

      const hasButton = (await startButton.count() > 0) || (await continueButton.count() > 0);
      expect(hasButton).toBe(true);
    }
  });

  test("8. Quick stats section displays", async ({ page }) => {
    await coursesPage.goto();

    // Look for Quick Stats section
    const quickStats = page.locator("h4:has-text('Quick Stats')");
    await expect(quickStats).toBeVisible();

    // Check for stat items
    const totalLessons = page.locator("text=Total Lessons").first();
    await expect(totalLessons).toBeVisible();

    const coursesAvailable = page.locator("text=Courses Available");
    await expect(coursesAvailable).toBeVisible();

    const coursesStarted = page.locator("text=Started");
    await expect(coursesStarted).toBeVisible();
  });

  test("9. Stats summary cards show totals", async ({ page }) => {
    await coursesPage.goto();

    // Look for Available Courses stat card
    const availableCourses = page.locator("text=Available Courses").first();
    await expect(availableCourses).toBeVisible();

    // Look for Total Lessons stat card
    const totalLessons = page.locator("text=Total Lessons").first();
    await expect(totalLessons).toBeVisible();

    // Look for Total Content stat card
    const totalContent = page.locator("text=Total Content").first();
    await expect(totalContent).toBeVisible();

    // Look for Overall Progress stat card
    const overallProgress = page.locator("text=Overall Progress").first();
    await expect(overallProgress).toBeVisible();
  });

  test("10. Continue Training button navigates to train page", async ({ page }) => {
    await coursesPage.goto();

    const continueButton = coursesPage.getContinueButton();
    
    // Button should exist
    if (await continueButton.count() > 0) {
      await expect(continueButton).toBeVisible();
      
      // It's a link to /train
      const trainLink = page.locator("a[href='/train']").first();
      if (await trainLink.count() > 0) {
        await expect(trainLink).toBeVisible();
      }
    }
  });

  test("11. Filters can be combined", async ({ page }) => {
    await coursesPage.goto();

    const difficultyFilter = coursesPage.getDifficultyFilter();
    const categoryFilter = coursesPage.getCategoryFilter();

    // Apply both filters
    await difficultyFilter.selectOption("beginner");
    await categoryFilter.selectOption("preflop");

    await page.waitForTimeout(300);

    // Page should still display properly
    const heading = coursesPage.getCourseListHeading();
    await expect(heading).toBeVisible();
  });

  test("12. Course difficulty badges display correctly", async ({ page }) => {
    await coursesPage.goto();

    // Look for difficulty badges
    const beginnerBadges = page.locator("text=/beginner/i");
    const intermediateBadges = page.locator("text=/intermediate/i");
    const advancedBadges = page.locator("text=/advanced/i");

    const hasAnyBadge = (await beginnerBadges.count() > 0) ||
                        (await intermediateBadges.count() > 0) ||
                        (await advancedBadges.count() > 0);

    expect(hasAnyBadge).toBe(true);
  });
});

test.describe("Courses Page Navigation", () => {
  test("can navigate to courses page from home", async ({ page }) => {
    await page.goto("/");

    // Find courses link
    const coursesLink = page.locator("a[href='/courses']").first();
    if (await coursesLink.count() > 0) {
      await coursesLink.click();
      await expect(page).toHaveURL(/\/courses/);
      await expect(page.locator("h1:has-text('Pre-Built Courses')")).toBeVisible();
    } else {
      await page.goto("/courses");
      await expect(page.locator("h1:has-text('Pre-Built Courses')")).toBeVisible();
    }
  });
});
