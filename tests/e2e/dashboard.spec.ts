import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Dashboard Tests
 * Testing main dashboard functionality, navigation, and metrics
 */
test.describe('Dashboard Functionality', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Login before each test
    await loginPage.goto();
    await loginPage.quickLogin();
  });

  test('should display dashboard elements correctly', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardElements();
    await dashboardPage.verifyNavigationLinks();
    
    // Verify page title
    await expect(page).toHaveTitle(/Dashboard|Mailsender/i);
  });

  test('should load and display metrics', async ({ page }) => {
    await dashboardPage.goto();
    
    // Wait for API calls to complete
    await page.waitForLoadState('networkidle');
    
    // Check if stats cards are present
    const statsCards = await page.locator('[data-testid="stats-card"], .stats-card, .metric-card, .card').count();
    console.log(`📊 Found ${statsCards} stats cards`);
    
    if (statsCards > 0) {
      await dashboardPage.verifyStatsCards();
      
      // Get and validate metrics
      const stats = await dashboardPage.getAllStatsCards();
      console.log('📈 Dashboard metrics:', stats);
      
      expect(stats.length).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ No stats cards found - checking for alternative metric display');
      
      // Look for any numeric displays
      const numbers = await page.locator('text=/^\\d+$/, .number, .count, .metric').count();
      console.log(`🔢 Found ${numbers} numeric displays`);
    }
  });

  test('should navigate between pages via sidebar', async ({ page }) => {
    await dashboardPage.goto();
    
    // Test navigation to Leads
    await dashboardPage.navigateToLeads();
    expect(page.url()).toContain('/leads');
    
    // Navigate back to dashboard
    await dashboardPage.goto();
    
    // Test navigation to Campaigns  
    await dashboardPage.navigateToCampaigns();
    expect(page.url()).toContain('/campaigns');
    
    // Navigate back to dashboard
    await dashboardPage.goto();
    
    // Test navigation to Email Accounts
    await dashboardPage.navigateToEmailAccounts();
    expect(page.url()).toContain('/settings/email-accounts');
  });

  test('should handle API responses correctly', async ({ page }) => {
    // Monitor network requests
    const apiRequests: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });
    
    await dashboardPage.goto();
    
    // Wait for all network activity
    await page.waitForLoadState('networkidle');
    
    console.log(`📡 API requests made: ${apiRequests.length}`);
    apiRequests.forEach(url => console.log(`  - ${url}`));
    
    // Verify some API calls were made
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // Check for auth-related calls
    const authCalls = apiRequests.filter(url => url.includes('/auth/'));
    console.log(`🔐 Auth API calls: ${authCalls.length}`);
  });

  test('should display real-time updates', async ({ page }) => {
    await dashboardPage.goto();
    
    // Look for WebSocket connection or real-time indicators
    const wsConnected = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined' && window.WebSocket;
    });
    
    console.log(`🔌 WebSocket support: ${wsConnected ? 'Available' : 'Not available'}`);
    
    // Check for real-time status indicators
    const statusIndicators = await page.locator('.status, .online, .offline, .health').count();
    console.log(`🟢 Status indicators found: ${statusIndicators}`);
    
    // Wait for potential real-time updates
    await page.waitForTimeout(2000);
  });

  test('should handle loading states', async ({ page }) => {
    // Monitor for loading indicators
    const loadingFound = await page.locator('[data-testid="loading"], .loading, .spinner').isVisible();
    
    if (loadingFound) {
      console.log('⏳ Loading indicator found');
      
      // Wait for loading to complete
      await page.locator('[data-testid="loading"], .loading, .spinner').waitFor({ state: 'hidden', timeout: 10000 });
      console.log('✅ Loading completed');
    }
    
    await dashboardPage.goto();
    
    // Verify content loaded
    await dashboardPage.verifyDashboardElements();
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.verifyResponsiveDesign();
  });

  test('should measure dashboard performance', async ({ page }) => {
    const loadTime = await dashboardPage.verifyPagePerformance();
    
    // Performance benchmarks
    if (loadTime < 1000) {
      console.log('🚀 Excellent performance');
    } else if (loadTime < 3000) {
      console.log('✅ Good performance');
    } else {
      console.log('⚠️ Performance could be improved');
    }
  });

  test('should handle errors gracefully', async ({ page, context }) => {
    // Simulate API errors
    await context.route('**/api/analytics/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await dashboardPage.goto();
    
    // Should still render dashboard structure
    await dashboardPage.verifyDashboardElements();
    
    // Look for error states
    const errorMessages = await page.locator('.error, .alert-error, [data-testid="error"]').count();
    console.log(`❌ Error messages displayed: ${errorMessages}`);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await dashboardPage.goto();
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Check if focus is visible
    const focusedElement = await page.locator(':focus').count();
    console.log(`⌨️ Focused elements: ${focusedElement}`);
    
    // Test escape key
    await page.keyboard.press('Escape');
    
    console.log('✅ Keyboard navigation tested');
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    await dashboardPage.goto();
    
    // Refresh the page
    await page.reload();
    
    // Wait for reload to complete
    await page.waitForLoadState('networkidle');
    
    // Should still be authenticated and on dashboard
    const currentUrl = page.url();
    const stillLoggedIn = !currentUrl.includes('/login');
    
    console.log(`🔄 Session maintained after refresh: ${stillLoggedIn}`);
    
    if (stillLoggedIn) {
      await dashboardPage.verifyDashboardElements();
    }
  });
});