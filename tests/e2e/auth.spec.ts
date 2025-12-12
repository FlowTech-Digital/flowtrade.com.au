import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, URLS, SELECTORS } from '../fixtures/test-data';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto(URLS.login);
    
    await page.fill(SELECTORS.emailInput, TEST_CREDENTIALS.email);
    await page.fill(SELECTORS.passwordInput, TEST_CREDENTIALS.password);
    await page.click(SELECTORS.submitButton);
    
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(URLS.login);
    
    await page.fill(SELECTORS.emailInput, 'wrong@email.com');
    await page.fill(SELECTORS.passwordInput, 'wrongpassword');
    await page.click(SELECTORS.submitButton);
    
    // Should stay on login page or show error
    await expect(page.locator(SELECTORS.errorMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto(URLS.dashboard);
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should allow logout', async ({ page }) => {
    // Login first
    await page.goto(URLS.login);
    await page.fill(SELECTORS.emailInput, TEST_CREDENTIALS.email);
    await page.fill(SELECTORS.passwordInput, TEST_CREDENTIALS.password);
    await page.click(SELECTORS.submitButton);
    await page.waitForURL('**/dashboard**');
    
    // Find and click logout (adjust selector based on actual UI)
    await page.click('[data-testid="user-menu"], [data-testid="logout-button"]');
    
    // If there's a dropdown menu
    const logoutButton = page.locator('text=Logout, text=Sign out, [data-testid="logout"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 });
  });
});
