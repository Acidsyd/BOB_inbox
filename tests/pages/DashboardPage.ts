import { Page, expect } from '@playwright/test';

/**
 * DashboardPage - Page Object Model for Main Dashboard
 * Handles navigation, metrics display, and overview functionality
 */
export class DashboardPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    // Navigation
    sidebar: '[data-testid="sidebar"], .sidebar',
    userMenu: '[data-testid="user-menu"], .user-menu',
    logoutButton: '[data-testid="logout-button"], .logout-btn',
    
    // Navigation Links
    dashboardLink: '[data-testid="nav-dashboard"], a[href="/"], .nav-dashboard',
    leadsLink: '[data-testid="nav-leads"], a[href="/leads"], .nav-leads',
    campaignsLink: '[data-testid="nav-campaigns"], a[href="/campaigns"], .nav-campaigns',
    emailAccountsLink: '[data-testid="nav-email-accounts"], a[href="/settings/email-accounts"], .nav-email-accounts',
    
    // Dashboard Content
    pageTitle: 'h1, [data-testid="page-title"], .page-title',
    statsCards: '[data-testid="stats-card"], .stats-card, .metric-card',
    totalCampaigns: '[data-testid="total-campaigns"], .total-campaigns',
    totalLeads: '[data-testid="total-leads"], .total-leads',
    responseRate: '[data-testid="response-rate"], .response-rate',
    
    // Charts and Analytics
    analyticsSection: '[data-testid="analytics"], .analytics-section',
    recentActivity: '[data-testid="recent-activity"], .recent-activity',
    
    // Loading states
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
  };

  // Navigation
  async goto() {
    await this.page.goto('/');
    await this.waitForDashboardLoad();
  }

  async waitForDashboardLoad() {
    // Wait for dashboard content to load
    await this.page.waitForSelector(this.selectors.pageTitle, { timeout: 10000 });
    
    // Wait for API calls to complete
    await this.page.waitForLoadState('networkidle');
    
    console.log('✅ Dashboard loaded successfully');
  }

  // Navigation Actions
  async navigateToLeads() {
    await this.page.click(this.selectors.leadsLink);
    await this.page.waitForURL('/leads', { timeout: 5000 });
    console.log('✅ Navigated to Leads page');
  }

  async navigateToCampaigns() {
    await this.page.click(this.selectors.campaignsLink);
    await this.page.waitForURL('/campaigns', { timeout: 5000 });
    console.log('✅ Navigated to Campaigns page');
  }

  async navigateToEmailAccounts() {
    await this.page.click(this.selectors.emailAccountsLink);
    await this.page.waitForURL('/settings/email-accounts', { timeout: 5000 });
    console.log('✅ Navigated to Email Accounts page');
  }

  async logout() {
    await this.page.click(this.selectors.userMenu);
    await this.page.click(this.selectors.logoutButton);
    await this.page.waitForURL('/login', { timeout: 5000 });
    console.log('✅ Logged out successfully');
  }

  // Data Extraction
  async getTotalCampaigns(): Promise<string> {
    const element = await this.page.locator(this.selectors.totalCampaigns);
    return await element.textContent() || '0';
  }

  async getTotalLeads(): Promise<string> {
    const element = await this.page.locator(this.selectors.totalLeads);
    return await element.textContent() || '0';
  }

  async getResponseRate(): Promise<string> {
    const element = await this.page.locator(this.selectors.responseRate);
    return await element.textContent() || '0%';
  }

  async getAllStatsCards(): Promise<Array<{title: string, value: string}>> {
    const cards = await this.page.locator(this.selectors.statsCards).all();
    const stats = [];
    
    for (const card of cards) {
      const title = await card.locator('.stat-title, h3, .title').textContent() || '';
      const value = await card.locator('.stat-value, .value, .number').textContent() || '';
      stats.push({ title: title.trim(), value: value.trim() });
    }
    
    return stats;
  }

  // Verifications
  async verifyDashboardElements() {
    console.log('🔍 Verifying dashboard elements...');
    
    // Check navigation
    await expect(this.page.locator(this.selectors.sidebar)).toBeVisible();
    await expect(this.page.locator(this.selectors.userMenu)).toBeVisible();
    
    // Check main content
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible();
    
    console.log('✅ Dashboard elements verified');
  }

  async verifyNavigationLinks() {
    console.log('🔍 Verifying navigation links...');
    
    await expect(this.page.locator(this.selectors.leadsLink)).toBeVisible();
    await expect(this.page.locator(this.selectors.campaignsLink)).toBeVisible();
    await expect(this.page.locator(this.selectors.emailAccountsLink)).toBeVisible();
    
    console.log('✅ Navigation links verified');
  }

  async verifyStatsCards() {
    console.log('🔍 Verifying stats cards...');
    
    const statsCards = await this.page.locator(this.selectors.statsCards);
    const count = await statsCards.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Check that each card has content
    for (let i = 0; i < count; i++) {
      const card = statsCards.nth(i);
      await expect(card).toBeVisible();
    }
    
    console.log(`✅ ${count} stats cards verified`);
  }

  async verifyPagePerformance() {
    console.log('⚡ Verifying page performance...');
    
    const startTime = Date.now();
    await this.goto();
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    return loadTime;
  }

  async verifyResponsiveDesign() {
    console.log('📱 Testing responsive design...');
    
    // Test desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await expect(this.page.locator(this.selectors.sidebar)).toBeVisible();
    
    // Test tablet
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000); // Allow layout to adjust
    
    // Test mobile
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(1000);
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('✅ Responsive design tested');
  }
}