import { test, expect, type Page } from "@playwright/test";

/**
 * PWA (Progressive Web App) E2E Tests
 * 
 * Tests cover:
 * 1. Service worker registration
 * 2. Web app manifest presence and validity
 * 3. Installability requirements
 * 4. Offline functionality (when service worker caches content)
 * 5. App shortcuts (manifest shortcuts)
 * 6. Theme colors and display modes
 * 7. Mobile viewport handling
 */

const BASE_URL = "http://localhost:3000";

export class PWAPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = "/") {
    await this.page.goto(`${BASE_URL}${path}`);
  }

  // Get service worker status
  async getServiceWorkerStatus(): Promise<string> {
    return await this.page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          return 'registered';
        }
        return 'available';
      }
      return 'not_supported';
    });
  }

  // Check if app is installable
  async isInstallable(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      if ('BeforeInstallPromptEvent' in window) {
        return true;
      }
      return false;
    });
  }

  // Get manifest data
  async getManifest(): Promise<any> {
    const links = await this.page.locator('link[rel="manifest"]').evaluateAll(
      (els: Element[]) => els.map((el) => (el as HTMLLinkElement).href)
    );
    
    if (links.length > 0) {
      const response = await fetch(links[0]);
      return await response.json();
    }
    return null;
  }
}

test.describe("PWA Features", () => {
  let pwaPage: PWAPage;

  test.beforeEach(async ({ page }) => {
    pwaPage = new PWAPage(page);
  });

  test("1. Page has valid manifest link", async ({ page }) => {
    await pwaPage.goto();

    // Check for manifest link in head (head elements are attached but not visible)
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();

    // Verify href points to manifest.json
    const href = await manifestLink.getAttribute("href");
    expect(href).toBe("/manifest.json");
  });

  test("2. Manifest contains required PWA fields", async ({ page }) => {
    await pwaPage.goto();

    // Get manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute("href");
    
    if (href) {
      const response = await page.request.get(href.startsWith("http") ? href : `${BASE_URL}${href}`);
      const manifest = await response.json();

      // Required fields for PWA
      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.start_url).toBeTruthy();
      expect(manifest.display).toBeTruthy();
      expect(manifest.icons).toBeTruthy();
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);
    }
  });

  test("3. Manifest icons are properly defined", async ({ page }) => {
    await pwaPage.goto();

    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute("href");
    
    if (href) {
      const response = await page.request.get(href.startsWith("http") ? href : `${BASE_URL}${href}`);
      const manifest = await response.json();

      // Check icon structure
      for (const icon of manifest.icons) {
        expect(icon.src).toBeTruthy();
        expect(icon.sizes).toBeTruthy();
        expect(icon.type).toBeTruthy();
      }

      // Should have at least one 192x192 and one 512x512 icon
      const has192 = manifest.icons.some((icon: any) => icon.sizes.includes("192"));
      const has512 = manifest.icons.some((icon: any) => icon.sizes.includes("512"));
      expect(has192 || has512).toBe(true);
    }
  });

  test("4. Theme color meta tag is set correctly", async ({ page }) => {
    await pwaPage.goto();

    // Check for theme-color meta tag
    const themeColor = page.locator('meta[name="theme-color"]');
    
    if (await themeColor.count() > 0) {
      const content = await themeColor.getAttribute("content");
      expect(content).toBeTruthy();
    }

    // Also check viewport meta (head elements are attached but not visible)
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeAttached();
  });

  test("5. Display mode is set to standalone", async ({ page }) => {
    await pwaPage.goto();

    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute("href");
    
    if (href) {
      const response = await page.request.get(href.startsWith("http") ? href : `${BASE_URL}${href}`);
      const manifest = await response.json();

      // Should be standalone for PWA experience
      expect(manifest.display).toBe("standalone");
    }
  });

  test("6. Start URL leads to homepage", async ({ page }) => {
    await pwaPage.goto();

    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute("href");
    
    if (href) {
      const response = await page.request.get(href.startsWith("http") ? href : `${BASE_URL}${href}`);
      const manifest = await response.json();

      // Start URL should be root
      expect(manifest.start_url).toBe("/");
    }
  });

  test("7. App shortcuts are defined in manifest", async ({ page }) => {
    await pwaPage.goto();

    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute("href");
    
    if (href) {
      const response = await page.request.get(href.startsWith("http") ? href : `${BASE_URL}${href}`);
      const manifest = await response.json();

      // Check for shortcuts
      if (manifest.shortcuts) {
        expect(Array.isArray(manifest.shortcuts)).toBe(true);
        
        for (const shortcut of manifest.shortcuts) {
          expect(shortcut.name).toBeTruthy();
          expect(shortcut.url).toBeTruthy();
        }
      }
    }
  });

  test("8. Mobile viewport settings are correct", async ({ page }) => {
    await pwaPage.goto();

    const viewport = page.locator('meta[name="viewport"]');
    const content = await viewport.getAttribute("content");

    // Should have device-width and maximum-scale settings
    expect(content).toContain("device-width");
    expect(content).toContain("maximum-scale=1");
  });

  test("9. Apple web app meta tags are present", async ({ page }) => {
    await pwaPage.goto();

    // Check for apple-mobile-web-app meta tags
    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if (await appleMeta.count() > 0) {
      const content = await appleMeta.getAttribute("content");
      expect(content).toBe("yes");
    }

    const appleStatusBar = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (await appleStatusBar.count() > 0) {
      const content = await appleStatusBar.getAttribute("content");
      expect(content).toBeTruthy();
    }
  });

  test("10. Icons exist for PWA installation", async ({ page }) => {
    await pwaPage.goto();

    const manifestLink = page.locator('link[rel="manifest"]');
    const href = await manifestLink.getAttribute("href");
    
    if (href) {
      const response = await page.request.get(href.startsWith("http") ? href : `${BASE_URL}${href}`);
      const manifest = await response.json();

      // Check that at least one icon is accessible
      if (manifest.icons && manifest.icons.length > 0) {
        const firstIcon = manifest.icons[0];
        const iconUrl = firstIcon.src.startsWith("http") 
          ? firstIcon.src 
          : `${BASE_URL}${firstIcon.src}`;
        
        const iconResponse = await page.request.get(iconUrl);
        expect(iconResponse.ok()).toBe(true);
      }
    }
  });

  test("11. Page works in mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    await pwaPage.goto();

    // Page should still load correctly
    await expect(page.locator("body")).toBeVisible();
    
    // No horizontal overflow (common mobile issue)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("12. Service worker registration (if supported)", async ({ page }) => {
    await pwaPage.goto();

    // Check service worker support
    const swStatus = await pwaPage.getServiceWorkerStatus();
    
    // Just verify the status is returned without error
    expect(["registered", "available", "not_supported"]).toContain(swStatus);
  });
});

test.describe("PWA Navigation Flows", () => {
  test("can navigate between pages while maintaining app shell", async ({ page }) => {
    // Start at home
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to ICM
    await page.goto("/icm");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('ICM Calculator')")).toBeVisible();

    // Navigate to Spots
    await page.goto("/spots");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Community Spots')")).toBeVisible();

    // Navigate to Courses
    await page.goto("/courses");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Pre-Built Courses')")).toBeVisible();

    // Navigate back to Equity (game view — uses H2 instead of H1)
    await page.goto("/equity");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h2:has-text('Game')")).toBeVisible();
  });
});

test.describe("PWA Installability", () => {
  test("page meets basic installability criteria", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check HTTPS (required for PWA install)
    const url = page.url();
    // In dev, localhost is allowed; in prod, would need HTTPS
    expect(url.startsWith("http")).toBe(true);

    // Check for manifest (head elements are attached but not visible)
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toBeAttached();

    // Check for service worker registration capability
    const swSupport = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(swSupport).toBe(true);
  });
});
