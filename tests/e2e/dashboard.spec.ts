import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, TEST_URLS } from '../fixtures/test-data';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(TEST_URLS.login);
    await page.fill('input[name="email"], input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // Dashboard should have some content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should display key metrics', async ({ page }) => {
    // Look for common dashboard elements (cards, stats, etc.)
    const hasContent = await page.locator('[class*="card"], [class*="stat"], [class*="metric"]').count() > 0 ||
                       await page.locator('h1, h2, h3').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should have navigation sidebar', async ({ page }) => {
    // Check for navigation elements
    const navLinks = page.locator('nav a, aside a, [class*="sidebar"] a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to quotes page', async ({ page }) => {
    await page.click('a[href*="quotes"]');
    await expect(page).toHaveURL(/quotes/);
  });

  test('should navigate to jobs page', async ({ page }) => {
    await page.click('a[href*="jobs"]');
    await expect(page).toHaveURL(/jobs/);
  });

  test('should navigate to invoices page', async ({ page }) => {
    await page.click('a[href*="invoices"]');
    await expect(page).toHaveURL(/invoices/);
  });

  test('should navigate to customers page', async ({ page }) => {
    await page.click('a[href*="customers"]');
    await expect(page).toHaveURL(/customers/);
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.click('a[href*="reports"]');
    await expect(page).toHaveURL(/reports/);
  });
});
