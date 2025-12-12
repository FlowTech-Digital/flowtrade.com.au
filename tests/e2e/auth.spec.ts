import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, TEST_URLS } from '../fixtures/test-data';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto(TEST_URLS.login);
    await expect(page).toHaveTitle(/FlowTrade|Login/i);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto(TEST_URLS.login);
    
    await page.fill('input[name="email"], input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(TEST_URLS.login);
    
    await page.fill('input[name="email"], input[type="email"]', 'wrong@email.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should stay on login page or show error
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasError = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').count() > 0;
    
    expect(url.includes('login') || hasError).toBeTruthy();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    
    await page.goto(TEST_URLS.dashboard);
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('should display signup page', async ({ page }) => {
    await page.goto(TEST_URLS.signup);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
