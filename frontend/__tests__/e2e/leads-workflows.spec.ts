import { test, expect, Page, Browser } from '@playwright/test';
import path from 'path';

// Test configuration
const TEST_TIMEOUT = 60000;
const WAIT_TIMEOUT = 30000;

// Test data
const testUser = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

const testOrganization = {
  name: 'Test Organization',
  domain: 'testorg.com'
};

const sampleLeadData = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Example Corp',
    phone: '+1-555-123-4567',
    title: 'Software Engineer'
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@techcorp.com',
    company: 'TechCorp Inc',
    phone: '+1-555-987-6543',
    title: 'Product Manager'
  },
  {
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@startup.io',
    company: 'Startup.io',
    phone: '+1-555-456-7890',
    title: 'Founder & CEO'
  }
];

// Helper functions
class LeadsPageHelper {
  constructor(public page: Page) {}

  async navigateToLeads() {
    await this.page.goto('/leads');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadCsvFile(csvContent: string) {
    // Create temporary CSV file
    const csvPath = path.join(__dirname, '../fixtures/test-leads.csv');
    await require('fs').writeFileSync(csvPath, csvContent);
    
    // Click upload button
    await this.page.click('[data-testid="upload-leads-button"]');
    
    // Upload file
    await this.page.setInputFiles('input[type="file"]', csvPath);
    
    // Wait for upload to complete
    await this.page.waitForSelector('[data-testid="upload-success"]', { timeout: WAIT_TIMEOUT });
  }

  async createCsvContent(leads: typeof sampleLeadData): string {
    const headers = ['firstName', 'lastName', 'email', 'company', 'phone', 'title'];
    const csvLines = [headers.join(',')];
    
    for (const lead of leads) {
      csvLines.push([
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.company,
        lead.phone,
        lead.title
      ].join(','));
    }
    
    return csvLines.join('\n');
  }

  async waitForLeadsToLoad() {
    await this.page.waitForSelector('[data-testid="leads-table"]', { timeout: WAIT_TIMEOUT });
    await this.page.waitForLoadState('networkidle');
  }

  async selectLead(email: string) {
    await this.page.click(`[data-testid="lead-row-${email}"] [data-testid="lead-checkbox"]`);
  }

  async selectMultipleLeads(emails: string[]) {
    for (const email of emails) {
      await this.selectLead(email);
    }
  }

  async openCellEditor(email: string, columnId: string) {
    await this.page.dblclick(`[data-testid="cell-${email}-${columnId}"]`);
  }

  async editCellValue(value: string) {
    await this.page.fill('[data-testid="cell-editor-input"]', value);
    await this.page.press('[data-testid="cell-editor-input"]', 'Enter');
  }

  async applyFilter(columnId: string, operator: string, value: string) {
    await this.page.click('[data-testid="add-filter-button"]');
    await this.page.selectOption('[data-testid="filter-column-select"]', columnId);
    await this.page.selectOption('[data-testid="filter-operator-select"]', operator);
    await this.page.fill('[data-testid="filter-value-input"]', value);
    await this.page.click('[data-testid="apply-filter-button"]');
  }

  async clearAllFilters() {
    await this.page.click('[data-testid="clear-all-filters-button"]');
  }

  async searchLeads(searchTerm: string) {
    await this.page.fill('[data-testid="search-input"]', searchTerm);
    await this.page.waitForTimeout(1000); // Wait for debounce
  }

  async exportLeads(format: 'csv' | 'xlsx' | 'json') {
    await this.page.click('[data-testid="export-button"]');
    await this.page.click(`[data-testid="export-${format}"]`);
    
    // Wait for download
    const downloadPromise = this.page.waitForEvent('download');
    const download = await downloadPromise;
    
    return download;
  }

  async openColumnManager() {
    await this.page.click('[data-testid="column-manager-button"]');
    await this.page.waitForSelector('[data-testid="column-manager-modal"]');
  }

  async addCustomColumn(name: string, type: string) {
    await this.page.click('[data-testid="add-column-button"]');
    await this.page.click(`[data-testid="column-type-${type}"]`);
    await this.page.fill('[data-testid="column-name-input"]', name);
    await this.page.click('[data-testid="save-column-button"]');
  }

  async createFormula(expression: string) {
    await this.page.click('[data-testid="formula-builder-button"]');
    await this.page.fill('[data-testid="formula-input"]', expression);
    await this.page.click('[data-testid="apply-formula-button"]');
  }
}

// Authentication helper
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

test.describe('LEADS System - Complete Workflows', () => {
  let browser: Browser;
  let page: Page;
  let leadsHelper: LeadsPageHelper;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    page = await browser.newPage();
    leadsHelper = new LeadsPageHelper(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Clear local storage and cookies
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Login before each test
    await login(page);
  });

  test.describe('Lead Import Workflow', () => {
    test('should import leads from CSV file successfully', async () => {
      test.setTimeout(TEST_TIMEOUT);
      
      await leadsHelper.navigateToLeads();
      
      // Create CSV content
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
      
      // Upload CSV file
      await leadsHelper.uploadCsvFile(csvContent);
      
      // Verify leads are imported
      await leadsHelper.waitForLeadsToLoad();
      
      // Check that all leads are visible
      for (const lead of sampleLeadData) {
        await expect(page.locator(`text=${lead.email}`)).toBeVisible();
        await expect(page.locator(`text=${lead.firstName} ${lead.lastName}`)).toBeVisible();
      }
      
      // Verify total count
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('3');
    });

    test('should handle CSV import with field mapping', async () => {
      test.setTimeout(TEST_TIMEOUT);
      
      // Create CSV with different column names
      const customHeaders = ['first_name', 'last_name', 'email_address', 'company_name', 'phone_number', 'job_title'];
      const csvContent = [customHeaders.join(',')].concat(
        sampleLeadData.map(lead => [
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.company,
          lead.phone,
          lead.title
        ].join(','))
      ).join('\n');
      
      await leadsHelper.navigateToLeads();
      
      // Upload with custom headers
      await leadsHelper.uploadCsvFile(csvContent);
      
      // Handle field mapping
      await page.waitForSelector('[data-testid="field-mapping-modal"]');
      
      // Map custom fields to standard fields
      await page.selectOption('[data-testid="map-first_name"]', 'firstName');
      await page.selectOption('[data-testid="map-last_name"]', 'lastName');
      await page.selectOption('[data-testid="map-email_address"]', 'email');
      await page.selectOption('[data-testid="map-company_name"]', 'company');
      await page.selectOption('[data-testid="map-phone_number"]', 'phone');
      await page.selectOption('[data-testid="map-job_title"]', 'title');
      
      await page.click('[data-testid="confirm-mapping-button"]');
      
      // Verify import success
      await leadsHelper.waitForLeadsToLoad();
      
      for (const lead of sampleLeadData) {
        await expect(page.locator(`text=${lead.email}`)).toBeVisible();
      }
    });

    test('should handle import errors gracefully', async () => {
      test.setTimeout(TEST_TIMEOUT);
      
      // Create invalid CSV content
      const invalidCsv = 'invalid,csv,format\nno,email,field\n';
      
      await leadsHelper.navigateToLeads();
      await leadsHelper.uploadCsvFile(invalidCsv);
      
      // Should show error message
      await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-error"]')).toContainText('Invalid CSV format');
    });
  });

  test.describe('Clay-style Spreadsheet Interface', () => {
    test.beforeEach(async () => {
      // Import sample data first
      await leadsHelper.navigateToLeads();
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
      await leadsHelper.uploadCsvFile(csvContent);
      await leadsHelper.waitForLeadsToLoad();
    });

    test('should display leads in spreadsheet format', async () => {
      // Verify table structure
      await expect(page.locator('[data-testid="leads-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-header"]')).toBeVisible();
      
      // Check column headers
      const expectedColumns = ['First Name', 'Last Name', 'Email', 'Company', 'Phone', 'Title'];
      for (const column of expectedColumns) {
        await expect(page.locator(`[data-testid="column-header-${column}"]`)).toBeVisible();
      }
      
      // Check data rows
      for (const lead of sampleLeadData) {
        await expect(page.locator(`[data-testid="lead-row-${lead.email}"]`)).toBeVisible();
      }
    });

    test('should support cell editing', async () => {
      const testEmail = sampleLeadData[0].email;
      const newCompanyName = 'Updated Company Name';
      
      // Double click to edit cell
      await leadsHelper.openCellEditor(testEmail, 'company');
      
      // Edit the value
      await leadsHelper.editCellValue(newCompanyName);
      
      // Verify the change
      await expect(page.locator(`[data-testid="cell-${testEmail}-company"]`)).toContainText(newCompanyName);
    });

    test('should support row selection', async () => {
      // Select first lead
      await leadsHelper.selectLead(sampleLeadData[0].email);
      
      // Verify row is selected
      await expect(page.locator(`[data-testid="lead-row-${sampleLeadData[0].email}"]`)).toHaveClass(/selected/);
      
      // Verify selection count
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('1');
      
      // Select multiple leads
      await leadsHelper.selectMultipleLeads([sampleLeadData[1].email, sampleLeadData[2].email]);
      
      // Verify multiple selection
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('3');
    });

    test('should support bulk operations', async () => {
      // Select all leads
      await page.click('[data-testid="select-all-checkbox"]');
      
      // Verify all selected
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('3');
      
      // Bulk delete
      await page.click('[data-testid="bulk-delete-button"]');
      await page.click('[data-testid="confirm-bulk-delete"]');
      
      // Verify deletion
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('0');
    });
  });

  test.describe('Filtering and Search', () => {
    test.beforeEach(async () => {
      await leadsHelper.navigateToLeads();
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
      await leadsHelper.uploadCsvFile(csvContent);
      await leadsHelper.waitForLeadsToLoad();
    });

    test('should filter leads by text search', async () => {
      // Search for specific email
      await leadsHelper.searchLeads('john.doe');
      
      // Should show only John Doe
      await expect(page.locator('[data-testid="filtered-results-count"]')).toContainText('1');
      await expect(page.locator(`text=${sampleLeadData[0].email}`)).toBeVisible();
      await expect(page.locator(`text=${sampleLeadData[1].email}`)).not.toBeVisible();
    });

    test('should apply column filters', async () => {
      // Filter by company
      await leadsHelper.applyFilter('company', 'equals', 'Example Corp');
      
      // Should show only leads from Example Corp
      await expect(page.locator('[data-testid="filtered-results-count"]')).toContainText('1');
      await expect(page.locator(`text=${sampleLeadData[0].email}`)).toBeVisible();
    });

    test('should combine multiple filters', async () => {
      // Apply multiple filters
      await leadsHelper.applyFilter('company', 'contains', 'Corp');
      await leadsHelper.applyFilter('title', 'contains', 'Engineer');
      
      // Should show only software engineers from Corp companies
      await expect(page.locator('[data-testid="filtered-results-count"]')).toContainText('1');
      await expect(page.locator(`text=${sampleLeadData[0].email}`)).toBeVisible();
    });

    test('should clear filters', async () => {
      // Apply filter first
      await leadsHelper.applyFilter('company', 'equals', 'Example Corp');
      await expect(page.locator('[data-testid="filtered-results-count"]')).toContainText('1');
      
      // Clear filters
      await leadsHelper.clearAllFilters();
      
      // Should show all leads
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('3');
    });
  });

  test.describe('Column Management', () => {
    test.beforeEach(async () => {
      await leadsHelper.navigateToLeads();
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
      await leadsHelper.uploadCsvFile(csvContent);
      await leadsHelper.waitForLeadsToLoad();
    });

    test('should add custom columns', async () => {
      await leadsHelper.openColumnManager();
      
      // Add a new text column
      await leadsHelper.addCustomColumn('Lead Score', 'number');
      
      // Verify new column appears
      await expect(page.locator('[data-testid="column-header-Lead Score"]')).toBeVisible();
      
      // Close column manager
      await page.click('[data-testid="close-column-manager"]');
      
      // Verify column is still there
      await expect(page.locator('[data-testid="column-header-Lead Score"]')).toBeVisible();
    });

    test('should reorder columns', async () => {
      await leadsHelper.openColumnManager();
      
      // Drag and drop to reorder columns
      await page.dragAndDrop(
        '[data-testid="column-handle-email"]',
        '[data-testid="column-handle-firstName"]'
      );
      
      await page.click('[data-testid="save-column-order"]');
      await page.click('[data-testid="close-column-manager"]');
      
      // Verify new order
      const headers = await page.locator('[data-testid^="column-header-"]').allTextContents();
      expect(headers[0]).toBe('Email');
      expect(headers[1]).toBe('First Name');
    });

    test('should hide/show columns', async () => {
      await leadsHelper.openColumnManager();
      
      // Hide phone column
      await page.click('[data-testid="toggle-column-phone"]');
      await page.click('[data-testid="close-column-manager"]');
      
      // Verify column is hidden
      await expect(page.locator('[data-testid="column-header-Phone"]')).not.toBeVisible();
      
      // Show column again
      await leadsHelper.openColumnManager();
      await page.click('[data-testid="toggle-column-phone"]');
      await page.click('[data-testid="close-column-manager"]');
      
      // Verify column is visible
      await expect(page.locator('[data-testid="column-header-Phone"]')).toBeVisible();
    });
  });

  test.describe('Formula Builder', () => {
    test.beforeEach(async () => {
      await leadsHelper.navigateToLeads();
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
      await leadsHelper.uploadCsvFile(csvContent);
      await leadsHelper.waitForLeadsToLoad();
    });

    test('should create simple formulas', async () => {
      // Add a new column with formula
      await leadsHelper.openColumnManager();
      await leadsHelper.addCustomColumn('Full Name', 'formula');
      
      // Create formula for full name
      await leadsHelper.createFormula('CONCAT(firstName, " ", lastName)');
      
      // Verify formula results
      for (const lead of sampleLeadData) {
        const fullName = `${lead.firstName} ${lead.lastName}`;
        await expect(page.locator(`[data-testid="cell-${lead.email}-Full Name"]`)).toContainText(fullName);
      }
    });

    test('should create conditional formulas', async () => {
      await leadsHelper.openColumnManager();
      await leadsHelper.addCustomColumn('Lead Type', 'formula');
      
      // Create conditional formula
      await leadsHelper.createFormula('IF(CONTAINS(title, "CEO"), "Executive", "Employee")');
      
      // Verify results
      await expect(page.locator(`[data-testid="cell-${sampleLeadData[2].email}-Lead Type"]`)).toContainText('Executive');
      await expect(page.locator(`[data-testid="cell-${sampleLeadData[0].email}-Lead Type"]`)).toContainText('Employee');
    });

    test('should validate formula syntax', async () => {
      await leadsHelper.openColumnManager();
      await leadsHelper.addCustomColumn('Invalid Formula', 'formula');
      
      // Try invalid formula
      await page.fill('[data-testid="formula-input"]', 'INVALID_FUNCTION(');
      
      // Should show validation error
      await expect(page.locator('[data-testid="formula-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="formula-error"]')).toContainText('Invalid formula');
    });
  });

  test.describe('Data Export', () => {
    test.beforeEach(async () => {
      await leadsHelper.navigateToLeads();
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
      await leadsHelper.uploadCsvFile(csvContent);
      await leadsHelper.waitForLeadsToLoad();
    });

    test('should export leads to CSV', async () => {
      const download = await leadsHelper.exportLeads('csv');
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/leads.*\.csv$/);
      
      // Save and verify content
      const downloadPath = path.join(__dirname, '../downloads/test-export.csv');
      await download.saveAs(downloadPath);
      
      const content = require('fs').readFileSync(downloadPath, 'utf8');
      expect(content).toContain('firstName,lastName,email');
      expect(content).toContain('john.doe@example.com');
    });

    test('should export leads to Excel', async () => {
      const download = await leadsHelper.exportLeads('xlsx');
      
      expect(download.suggestedFilename()).toMatch(/leads.*\.xlsx$/);
    });

    test('should export selected leads only', async () => {
      // Select specific leads
      await leadsHelper.selectMultipleLeads([sampleLeadData[0].email, sampleLeadData[1].email]);
      
      // Export selected
      await page.click('[data-testid="export-selected-button"]');
      const download = await page.waitForEvent('download');
      
      // Verify only selected leads are exported
      const downloadPath = path.join(__dirname, '../downloads/test-selected-export.csv');
      await download.saveAs(downloadPath);
      
      const content = require('fs').readFileSync(downloadPath, 'utf8');
      const lines = content.split('\n');
      expect(lines).toHaveLength(3); // Header + 2 data rows + empty line
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update leads list when new leads are imported', async () => {
      await leadsHelper.navigateToLeads();
      
      // Import initial data
      const csvContent = await leadsHelper.createCsvContent(sampleLeadData.slice(0, 2));
      await leadsHelper.uploadCsvFile(csvContent);
      await leadsHelper.waitForLeadsToLoad();
      
      expect(await page.locator('[data-testid="total-leads-count"]').textContent()).toBe('2');
      
      // Import additional lead (simulate another user importing)
      const additionalCsv = await leadsHelper.createCsvContent([sampleLeadData[2]]);
      await leadsHelper.uploadCsvFile(additionalCsv);
      
      // Should show updated count
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('3');
      await expect(page.locator(`text=${sampleLeadData[2].email}`)).toBeVisible();
    });

    test('should show processing status for ongoing imports', async () => {
      await leadsHelper.navigateToLeads();
      
      // Start import of large file (mock processing state)
      const largeCsv = await leadsHelper.createCsvContent(
        Array.from({ length: 1000 }, (_, i) => ({
          firstName: `User${i}`,
          lastName: `Test${i}`,
          email: `user${i}@test.com`,
          company: `Company ${i}`,
          phone: `+1-555-000-${String(i).padStart(4, '0')}`,
          title: `Title ${i}`
        }))
      );
      
      await leadsHelper.uploadCsvFile(largeCsv);
      
      // Should show processing indicator
      await expect(page.locator('[data-testid="import-processing"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    });
  });

  test.describe('Performance and Large Datasets', () => {
    test('should handle virtual scrolling with large datasets', async () => {
      test.setTimeout(90000); // Extended timeout for large dataset
      
      await leadsHelper.navigateToLeads();
      
      // Create large dataset
      const largeLeadData = Array.from({ length: 10000 }, (_, i) => ({
        firstName: `FirstName${i}`,
        lastName: `LastName${i}`,
        email: `user${i}@example.com`,
        company: `Company${i}`,
        phone: `+1-555-${String(i).padStart(7, '0')}`,
        title: `Title${i}`
      }));
      
      const largeCsv = await leadsHelper.createCsvContent(largeLeadData);
      await leadsHelper.uploadCsvFile(largeCsv);
      await leadsHelper.waitForLeadsToLoad();
      
      // Verify virtual scrolling works
      await expect(page.locator('[data-testid="virtual-scroll-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('10000');
      
      // Test scrolling performance
      const startTime = Date.now();
      await page.mouse.wheel(0, 5000);
      await page.waitForTimeout(100);
      const endTime = Date.now();
      
      // Should scroll smoothly (under 500ms for large scroll)
      expect(endTime - startTime).toBeLessThan(500);
      
      // Verify different leads are visible after scrolling
      await expect(page.locator('text=FirstName0')).not.toBeVisible();
      await expect(page.locator('[data-testid^="lead-row-"]')).toHaveCount(50); // Default viewport size
    });

    test('should maintain performance during filtering operations', async () => {
      test.setTimeout(60000);
      
      await leadsHelper.navigateToLeads();
      
      // Import medium dataset
      const leadData = Array.from({ length: 1000 }, (_, i) => ({
        firstName: `FirstName${i}`,
        lastName: `LastName${i}`,
        email: `user${i}@example.com`,
        company: i % 3 === 0 ? 'TechCorp' : i % 3 === 1 ? 'StartupCo' : 'Enterprise Inc',
        phone: `+1-555-${String(i).padStart(7, '0')}`,
        title: i % 2 === 0 ? 'Developer' : 'Manager'
      }));
      
      const csv = await leadsHelper.createCsvContent(leadData);
      await leadsHelper.uploadCsvFile(csv);
      await leadsHelper.waitForLeadsToLoad();
      
      // Test filter performance
      const startTime = Date.now();
      await leadsHelper.applyFilter('company', 'equals', 'TechCorp');
      await page.waitForSelector('[data-testid="filtered-results-count"]');
      const endTime = Date.now();
      
      // Filter should complete quickly (under 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      
      // Verify filter results
      const expectedCount = Math.floor(1000 / 3);
      await expect(page.locator('[data-testid="filtered-results-count"]')).toContainText(String(expectedCount));
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      await leadsHelper.navigateToLeads();
      
      // Simulate network failure
      await page.route('**/api/leads**', route => route.abort());
      
      // Try to load leads
      await page.reload();
      
      // Should show error state
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Restore network and retry
      await page.unroute('**/api/leads**');
      await page.click('[data-testid="retry-button"]');
      
      // Should recover
      await expect(page.locator('[data-testid="leads-table"]')).toBeVisible();
    });

    test('should handle empty states appropriately', async () => {
      await leadsHelper.navigateToLeads();
      
      // Should show empty state initially
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-cta"]')).toBeVisible();
    });

    test('should validate data integrity during operations', async () => {
      await leadsHelper.navigateToLeads();
      
      // Import data with some invalid emails
      const mixedData = [
        ...sampleLeadData,
        {
          firstName: 'Invalid',
          lastName: 'Email',
          email: 'not-an-email',
          company: 'Test Corp',
          phone: '+1-555-999-0000',
          title: 'Tester'
        }
      ];
      
      const csv = await leadsHelper.createCsvContent(mixedData);
      await leadsHelper.uploadCsvFile(csv);
      
      // Should show validation warnings
      await expect(page.locator('[data-testid="validation-warnings"]')).toBeVisible();
      await expect(page.locator('[data-testid="invalid-email-warning"]')).toBeVisible();
      
      // Valid leads should still be imported
      await expect(page.locator(`text=${sampleLeadData[0].email}`)).toBeVisible();
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('3');
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async () => {
        // This test will run in the current browser context
        // The test runner configuration handles multi-browser testing
        
        await leadsHelper.navigateToLeads();
        const csvContent = await leadsHelper.createCsvContent(sampleLeadData);
        await leadsHelper.uploadCsvFile(csvContent);
        await leadsHelper.waitForLeadsToLoad();
        
        // Test basic functionality
        await expect(page.locator('[data-testid="leads-table"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('3');
        
        // Test interactions
        await leadsHelper.selectLead(sampleLeadData[0].email);
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1');
        
        // Test search
        await leadsHelper.searchLeads('john');
        await expect(page.locator('[data-testid="filtered-results-count"]')).toContainText('1');
      });
    });
  });
});