import { Page, expect } from '@playwright/test';

/**
 * Test Helper Utilities for Mailsender Platform
 * Reusable functions for authentication, navigation, and data operations
 */

export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User'
};

export const API_BASE_URL = 'http://localhost:4000/api';

/**
 * Authentication helpers
 */
export async function loginUser(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  console.log(`🔐 Logging in user: ${email}`);
  
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login redirect
  await page.waitForURL('/', { timeout: 10000 });
  
  // Verify login success
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  console.log('✅ Login successful');
}

export async function logout(page: Page) {
  console.log('🚪 Logging out user');
  
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  
  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 5000 });
  console.log('✅ Logout successful');
}

/**
 * Navigation helpers
 */
export async function navigateToPage(page: Page, route: string) {
  console.log(`🧭 Navigating to: ${route}`);
  
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  
  console.log(`✅ Navigated to ${route}`);
}

export async function navigateViaMenu(page: Page, menuItem: string) {
  console.log(`🧭 Navigating via menu: ${menuItem}`);
  
  const menuSelector = `[data-testid="nav-${menuItem.toLowerCase()}"]`;
  await page.click(menuSelector);
  await page.waitForLoadState('networkidle');
  
  console.log(`✅ Navigated via menu to ${menuItem}`);
}

/**
 * API helpers
 */
export async function makeAPIRequest(method: string, endpoint: string, data?: any, token?: string) {
  const fetch = (await import('node-fetch')).default;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  return {
    status: response.status,
    data: await response.json(),
    ok: response.ok
  };
}

/**
 * Wait helpers
 */
export async function waitForApiResponse(page: Page, endpoint: string, timeout: number = 10000) {
  console.log(`⏳ Waiting for API response: ${endpoint}`);
  
  await page.waitForResponse(
    response => response.url().includes(endpoint) && response.status() === 200,
    { timeout }
  );
  
  console.log(`✅ API response received: ${endpoint}`);
}

export async function waitForElementVisible(page: Page, selector: string, timeout: number = 10000) {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Data verification helpers
 */
export async function verifyPageTitle(page: Page, expectedTitle: string) {
  await expect(page).toHaveTitle(expectedTitle);
  console.log(`✅ Page title verified: ${expectedTitle}`);
}

export async function verifyPageUrl(page: Page, expectedUrl: string) {
  expect(page.url()).toContain(expectedUrl);
  console.log(`✅ Page URL verified: ${expectedUrl}`);
}

/**
 * Performance helpers
 */
export async function measurePageLoadTime(page: Page): Promise<number> {
  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  const endTime = Date.now();
  
  const loadTime = endTime - startTime;
  console.log(`📊 Page load time: ${loadTime}ms`);
  
  return loadTime;
}

export async function verifyApiPerformance(page: Page, endpoint: string, maxTime: number = 1000) {
  const startTime = Date.now();
  
  const response = await page.waitForResponse(
    response => response.url().includes(endpoint),
    { timeout: 10000 }
  );
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  console.log(`📊 API response time for ${endpoint}: ${responseTime}ms`);
  expect(responseTime).toBeLessThan(maxTime);
  
  return responseTime;
}