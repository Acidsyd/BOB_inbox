import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  INITIAL_LOAD: 3000, // 3 seconds max for initial load
  LARGE_IMPORT: 30000, // 30 seconds max for large imports (100k records)
  SEARCH_RESPONSE: 500, // 500ms max for search operations
  FILTER_RESPONSE: 1000, // 1 second max for filter operations
  SCROLL_RESPONSE: 100, // 100ms max for virtual scroll
  EXPORT_RESPONSE: 10000, // 10 seconds max for export operations
  MEMORY_THRESHOLD: 200 * 1024 * 1024, // 200MB max memory usage
};

const DATASET_SIZES = {
  SMALL: 1000,
  MEDIUM: 10000,
  LARGE: 50000,
  EXTRA_LARGE: 100000
};

// Helper functions for performance measurement
class PerformanceHelper {
  constructor(public page: Page) {}

  async measureLoadTime(operation: () => Promise<void>): Promise<number> {
    const startTime = performance.now();
    await operation();
    const endTime = performance.now();
    return endTime - startTime;
  }

  async measureMemoryUsage(): Promise<number> {
    const metrics = await this.page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    return metrics;
  }

  async generateLargeDataset(size: number) {
    const dataset = [];
    for (let i = 0; i < size; i++) {
      dataset.push({
        firstName: `FirstName${i}`,
        lastName: `LastName${i}`,
        email: `user${i}@example${Math.floor(i / 1000)}.com`,
        company: `Company${Math.floor(i / 100)}`,
        phone: `+1-555-${String(i % 10000).padStart(4, '0')}-${String(Math.floor(i / 10000)).padStart(4, '0')}`,
        title: `Title${i % 50}`,
        industry: `Industry${i % 20}`,
        country: `Country${i % 10}`,
        leadScore: Math.floor(Math.random() * 100),
        lastContact: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    return dataset;
  }

  createCsvContent(data: any[]): string {
    const headers = Object.keys(data[0] || {});
    const csvLines = [headers.join(',')];
    
    for (const item of data) {
      csvLines.push(headers.map(header => `"${item[header]}"`).join(','));
    }
    
    return csvLines.join('\n');
  }

  async waitForTableLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="leads-table"]', { timeout: 60000 });
    await this.page.waitForLoadState('networkidle');
  }

  async simulateImportLargeFile(data: any[]): Promise<number> {
    const csvContent = this.createCsvContent(data);
    
    return await this.measureLoadTime(async () => {
      // Simulate file upload
      await this.page.click('[data-testid="upload-leads-button"]');
      
      // Create temporary file and upload
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      await this.page.setInputFiles('input[type="file"]', {
        name: `large-dataset-${data.length}.csv`,
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      // Wait for processing to complete
      await this.page.waitForSelector('[data-testid="import-complete"]', { timeout: PERFORMANCE_THRESHOLDS.LARGE_IMPORT });
    });
  }
}

// Login helper
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'testuser@example.com');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

test.describe('LEADS Performance Tests', () => {
  let page: Page;
  let performanceHelper: PerformanceHelper;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    performanceHelper = new PerformanceHelper(page);
    await login(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial Load Performance', () => {
    test('should load empty leads page within performance threshold', async () => {
      const loadTime = await performanceHelper.measureLoadTime(async () => {
        await page.goto('/leads');
        await page.waitForSelector('[data-testid="leads-page"]');
      });

      console.log(`Empty leads page load time: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_LOAD);
    });

    test('should load leads page with small dataset efficiently', async () => {
      // Pre-populate with small dataset
      const smallData = await performanceHelper.generateLargeDataset(DATASET_SIZES.SMALL);
      await performanceHelper.simulateImportLargeFile(smallData);
      
      const loadTime = await performanceHelper.measureLoadTime(async () => {
        await page.reload();
        await performanceHelper.waitForTableLoad();
      });

      console.log(`Small dataset (${DATASET_SIZES.SMALL} records) load time: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_LOAD);
    });
  });

  test.describe('Data Import Performance', () => {
    test('should import medium dataset within threshold', async () => {
      test.setTimeout(60000); // Extended timeout
      
      const mediumData = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      
      const importTime = await performanceHelper.simulateImportLargeFile(mediumData);
      
      console.log(`Medium dataset (${DATASET_SIZES.MEDIUM} records) import time: ${importTime.toFixed(2)}ms`);
      expect(importTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_IMPORT);
      
      // Verify data is loaded correctly
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText(String(DATASET_SIZES.MEDIUM));
    });

    test('should handle large dataset import with progress tracking', async () => {
      test.setTimeout(120000); // Extended timeout for large dataset
      
      const largeData = await performanceHelper.generateLargeDataset(DATASET_SIZES.LARGE);
      
      const startTime = performance.now();
      
      // Start import
      const csvContent = performanceHelper.createCsvContent(largeData);
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', {
        name: `large-dataset-${largeData.length}.csv`,
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      // Monitor progress
      let progressUpdates = 0;
      const progressTracker = setInterval(async () => {
        try {
          const progressElement = page.locator('[data-testid="import-progress"]');
          if (await progressElement.isVisible()) {
            progressUpdates++;
            const progress = await progressElement.textContent();
            console.log(`Import progress: ${progress}`);
          }
        } catch (e) {
          // Progress element might not be available yet
        }
      }, 1000);
      
      // Wait for completion
      await page.waitForSelector('[data-testid="import-complete"]', { timeout: PERFORMANCE_THRESHOLDS.LARGE_IMPORT });
      clearInterval(progressTracker);
      
      const endTime = performance.now();
      const importTime = endTime - startTime;
      
      console.log(`Large dataset (${DATASET_SIZES.LARGE} records) import time: ${importTime.toFixed(2)}ms`);
      console.log(`Progress updates received: ${progressUpdates}`);
      
      expect(importTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_IMPORT);
      expect(progressUpdates).toBeGreaterThan(0); // Should show progress
    });
  });

  test.describe('Virtual Scrolling Performance', () => {
    test.beforeEach(async () => {
      // Setup medium dataset for scrolling tests
      const mediumData = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      await performanceHelper.simulateImportLargeFile(mediumData);
      await performanceHelper.waitForTableLoad();
    });

    test('should handle smooth scrolling through large dataset', async () => {
      // Test initial render performance
      const initialMemory = await performanceHelper.measureMemoryUsage();
      
      // Perform multiple scroll operations
      const scrollOperations = 10;
      const scrollTimes = [];
      
      for (let i = 0; i < scrollOperations; i++) {
        const scrollTime = await performanceHelper.measureLoadTime(async () => {
          await page.mouse.wheel(0, 1000); // Scroll down
          await page.waitForTimeout(50); // Small delay for rendering
        });
        scrollTimes.push(scrollTime);
      }
      
      // Check memory after scrolling
      const finalMemory = await performanceHelper.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Performance assertions
      const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      console.log(`Average scroll time: ${avgScrollTime.toFixed(2)}ms`);
      console.log(`Memory increase after scrolling: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      expect(avgScrollTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCROLL_RESPONSE);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      
      // Verify visible rows are reasonable (not rendering everything)
      const visibleRows = await page.locator('[data-testid^="lead-row-"]').count();
      expect(visibleRows).toBeLessThan(100); // Should only render visible rows
      expect(visibleRows).toBeGreaterThan(10); // Should render enough for smooth experience
    });

    test('should maintain performance during rapid scrolling', async () => {
      const rapidScrolls = 20;
      const scrollInterval = 25; // Very fast scrolling
      
      const totalScrollTime = await performanceHelper.measureLoadTime(async () => {
        for (let i = 0; i < rapidScrolls; i++) {
          await page.mouse.wheel(0, 500);
          await page.waitForTimeout(scrollInterval);
        }
      });
      
      const avgTimePerScroll = totalScrollTime / rapidScrolls;
      console.log(`Rapid scrolling - average time per scroll: ${avgTimePerScroll.toFixed(2)}ms`);
      
      expect(avgTimePerScroll).toBeLessThan(PERFORMANCE_THRESHOLDS.SCROLL_RESPONSE);
    });
  });

  test.describe('Search and Filter Performance', () => {
    test.beforeEach(async () => {
      // Setup medium dataset
      const mediumData = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      await performanceHelper.simulateImportLargeFile(mediumData);
      await performanceHelper.waitForTableLoad();
    });

    test('should perform text search within performance threshold', async () => {
      const searchTerms = ['FirstName1000', 'Company50', '@example5.com', 'Title25'];
      
      for (const term of searchTerms) {
        const searchTime = await performanceHelper.measureLoadTime(async () => {
          await page.fill('[data-testid="search-input"]', term);
          await page.waitForSelector('[data-testid="search-results"]');
        });
        
        console.log(`Search for "${term}" took: ${searchTime.toFixed(2)}ms`);
        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE);
        
        // Clear search
        await page.fill('[data-testid="search-input"]', '');
        await page.waitForSelector('[data-testid="all-results"]');
      }
    });

    test('should apply filters efficiently', async () => {
      const filters = [
        { column: 'company', operator: 'contains', value: 'Company1' },
        { column: 'industry', operator: 'equals', value: 'Industry5' },
        { column: 'leadScore', operator: 'greater_than', value: '75' },
        { column: 'country', operator: 'equals', value: 'Country3' }
      ];
      
      for (const filter of filters) {
        const filterTime = await performanceHelper.measureLoadTime(async () => {
          await page.click('[data-testid="add-filter-button"]');
          await page.selectOption('[data-testid="filter-column-select"]', filter.column);
          await page.selectOption('[data-testid="filter-operator-select"]', filter.operator);
          await page.fill('[data-testid="filter-value-input"]', filter.value);
          await page.click('[data-testid="apply-filter-button"]');
          await page.waitForSelector('[data-testid="filtered-results"]');
        });
        
        console.log(`Filter on ${filter.column} took: ${filterTime.toFixed(2)}ms`);
        expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FILTER_RESPONSE);
        
        // Remove filter
        await page.click('[data-testid="remove-filter-button"]');
        await page.waitForSelector('[data-testid="all-results"]');
      }
    });

    test('should handle multiple simultaneous filters', async () => {
      const multiFilterTime = await performanceHelper.measureLoadTime(async () => {
        // Add multiple filters quickly
        await page.click('[data-testid="add-filter-button"]');
        await page.selectOption('[data-testid="filter-column-select"]', 'company');
        await page.selectOption('[data-testid="filter-operator-select"]', 'contains');
        await page.fill('[data-testid="filter-value-input"]', 'Company');
        await page.click('[data-testid="apply-filter-button"]');
        
        await page.click('[data-testid="add-filter-button"]');
        await page.selectOption('[data-testid="filter-column-select"]', 'leadScore');
        await page.selectOption('[data-testid="filter-operator-select"]', 'greater_than');
        await page.fill('[data-testid="filter-value-input"]', '50');
        await page.click('[data-testid="apply-filter-button"]');
        
        await page.waitForSelector('[data-testid="multi-filtered-results"]');
      });
      
      console.log(`Multiple filters applied in: ${multiFilterTime.toFixed(2)}ms`);
      expect(multiFilterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FILTER_RESPONSE * 2);
    });
  });

  test.describe('Export Performance', () => {
    test.beforeEach(async () => {
      // Setup medium dataset for export tests
      const mediumData = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      await performanceHelper.simulateImportLargeFile(mediumData);
      await performanceHelper.waitForTableLoad();
    });

    test('should export CSV within performance threshold', async () => {
      const exportTime = await performanceHelper.measureLoadTime(async () => {
        await page.click('[data-testid="export-button"]');
        await page.click('[data-testid="export-csv"]');
        
        // Wait for download to start
        const downloadPromise = page.waitForEvent('download');
        await downloadPromise;
      });
      
      console.log(`CSV export took: ${exportTime.toFixed(2)}ms`);
      expect(exportTime).toBeLessThan(PERFORMANCE_THRESHOLDS.EXPORT_RESPONSE);
    });

    test('should export Excel efficiently', async () => {
      const exportTime = await performanceHelper.measureLoadTime(async () => {
        await page.click('[data-testid="export-button"]');
        await page.click('[data-testid="export-xlsx"]');
        
        const downloadPromise = page.waitForEvent('download');
        await downloadPromise;
      });
      
      console.log(`Excel export took: ${exportTime.toFixed(2)}ms`);
      expect(exportTime).toBeLessThan(PERFORMANCE_THRESHOLDS.EXPORT_RESPONSE);
    });

    test('should handle partial exports efficiently', async () => {
      // Select subset of data
      await page.click('[data-testid="select-first-100-checkbox"]');
      
      const partialExportTime = await performanceHelper.measureLoadTime(async () => {
        await page.click('[data-testid="export-selected-button"]');
        
        const downloadPromise = page.waitForEvent('download');
        await downloadPromise;
      });
      
      console.log(`Partial export (100 records) took: ${partialExportTime.toFixed(2)}ms`);
      expect(partialExportTime).toBeLessThan(PERFORMANCE_THRESHOLDS.EXPORT_RESPONSE / 10); // Much faster for smaller dataset
    });
  });

  test.describe('Memory Management', () => {
    test('should manage memory efficiently with large datasets', async () => {
      test.setTimeout(180000); // 3 minutes timeout
      
      // Measure baseline memory
      await page.goto('/leads');
      const baselineMemory = await performanceHelper.measureMemoryUsage();
      console.log(`Baseline memory usage: ${(baselineMemory / 1024 / 1024).toFixed(2)}MB`);
      
      // Import progressively larger datasets
      const sizes = [DATASET_SIZES.SMALL, DATASET_SIZES.MEDIUM];
      const memoryMeasurements = [];
      
      for (const size of sizes) {
        const data = await performanceHelper.generateLargeDataset(size);
        await performanceHelper.simulateImportLargeFile(data);
        await performanceHelper.waitForTableLoad();
        
        // Perform typical operations
        await page.mouse.wheel(0, 2000); // Scroll
        await page.fill('[data-testid="search-input"]', 'FirstName');
        await page.waitForTimeout(500);
        await page.fill('[data-testid="search-input"]', '');
        
        const currentMemory = await performanceHelper.measureMemoryUsage();
        memoryMeasurements.push({
          size,
          memory: currentMemory,
          memoryMB: currentMemory / 1024 / 1024
        });
        
        console.log(`Memory after ${size} records: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`);
        
        // Clear data for next test
        await page.click('[data-testid="clear-all-data-button"]');
        await page.click('[data-testid="confirm-clear-data"]');
        await page.waitForSelector('[data-testid="empty-state"]');
      }
      
      // Memory should not exceed threshold for any dataset size
      for (const measurement of memoryMeasurements) {
        expect(measurement.memory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD);
      }
      
      // Memory growth should be reasonable (less than linear)
      if (memoryMeasurements.length >= 2) {
        const memoryGrowthRatio = memoryMeasurements[1].memory / memoryMeasurements[0].memory;
        const dataSizeRatio = sizes[1] / sizes[0];
        
        console.log(`Memory growth ratio: ${memoryGrowthRatio.toFixed(2)}, Data size ratio: ${dataSizeRatio.toFixed(2)}`);
        expect(memoryGrowthRatio).toBeLessThan(dataSizeRatio); // Memory should grow slower than data size
      }
    });

    test('should handle memory cleanup on navigation', async () => {
      // Import data
      const data = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      await performanceHelper.simulateImportLargeFile(data);
      await performanceHelper.waitForTableLoad();
      
      const memoryAfterLoad = await performanceHelper.measureMemoryUsage();
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Trigger garbage collection if possible
      await page.evaluate(() => {
        // @ts-ignore
        if (window.gc) window.gc();
      });
      
      const memoryAfterNavigation = await performanceHelper.measureMemoryUsage();
      
      // Navigate back to leads
      await page.goto('/leads');
      await performanceHelper.waitForTableLoad();
      
      const memoryAfterReturn = await performanceHelper.measureMemoryUsage();
      
      console.log(`Memory after load: ${(memoryAfterLoad / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after navigation: ${(memoryAfterNavigation / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after return: ${(memoryAfterReturn / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory should be cleaned up after navigation
      expect(memoryAfterNavigation).toBeLessThan(memoryAfterLoad * 0.8); // At least 20% cleanup
    });
  });

  test.describe('Concurrent Operations Performance', () => {
    test('should handle multiple users importing simultaneously', async () => {
      test.setTimeout(120000);
      
      // Simulate multiple import operations
      const smallData1 = await performanceHelper.generateLargeDataset(1000);
      const smallData2 = await performanceHelper.generateLargeDataset(1000);
      const smallData3 = await performanceHelper.generateLargeDataset(1000);
      
      // Start multiple imports concurrently (simulate multiple users)
      const concurrentImportTime = await performanceHelper.measureLoadTime(async () => {
        const promises = [
          performanceHelper.simulateImportLargeFile(smallData1),
          performanceHelper.simulateImportLargeFile(smallData2),
          performanceHelper.simulateImportLargeFile(smallData3)
        ];
        
        await Promise.all(promises);
      });
      
      console.log(`Concurrent imports completed in: ${concurrentImportTime.toFixed(2)}ms`);
      
      // Should complete within reasonable time (may be longer due to concurrency)
      expect(concurrentImportTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_IMPORT * 2);
      
      // Verify all data was imported
      await performanceHelper.waitForTableLoad();
      await expect(page.locator('[data-testid="total-leads-count"]')).toContainText('3000');
    });

    test('should maintain performance during heavy filtering activity', async () => {
      // Import data
      const data = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      await performanceHelper.simulateImportLargeFile(data);
      await performanceHelper.waitForTableLoad();
      
      // Simulate rapid filter changes (user exploring data)
      const filterOperations = 20;
      const filterTerms = Array.from({ length: filterOperations }, (_, i) => `Company${i * 50}`);
      
      const heavyFilteringTime = await performanceHelper.measureLoadTime(async () => {
        for (const term of filterTerms) {
          await page.fill('[data-testid="search-input"]', term);
          await page.waitForTimeout(50); // Short wait to simulate user behavior
        }
        
        // Clear search
        await page.fill('[data-testid="search-input"]', '');
        await page.waitForSelector('[data-testid="all-results"]');
      });
      
      const avgFilterTime = heavyFilteringTime / filterOperations;
      console.log(`Heavy filtering - average time per filter: ${avgFilterTime.toFixed(2)}ms`);
      
      expect(avgFilterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE);
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async () => {
      test.setTimeout(120000);
      
      // Throttle network to simulate slow connection
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Add 200ms delay
        await route.continue();
      });
      
      const data = await performanceHelper.generateLargeDataset(DATASET_SIZES.SMALL);
      
      const slowNetworkImportTime = await performanceHelper.measureLoadTime(async () => {
        await performanceHelper.simulateImportLargeFile(data);
      });
      
      console.log(`Import with slow network: ${slowNetworkImportTime.toFixed(2)}ms`);
      
      // Should still complete within extended threshold
      expect(slowNetworkImportTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_IMPORT * 1.5);
      
      // Clear network throttling
      await page.unroute('**/api/**');
    });

    test('should optimize API calls for large operations', async () => {
      // Monitor network requests
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          requests.push(request.url());
        }
      });
      
      const data = await performanceHelper.generateLargeDataset(DATASET_SIZES.MEDIUM);
      await performanceHelper.simulateImportLargeFile(data);
      await performanceHelper.waitForTableLoad();
      
      // Perform various operations
      await page.fill('[data-testid="search-input"]', 'test');
      await page.waitForTimeout(500);
      await page.fill('[data-testid="search-input"]', '');
      
      await page.click('[data-testid="add-filter-button"]');
      await page.selectOption('[data-testid="filter-column-select"]', 'company');
      await page.selectOption('[data-testid="filter-operator-select"]', 'contains');
      await page.fill('[data-testid="filter-value-input"]', 'Company');
      await page.click('[data-testid="apply-filter-button"]');
      
      console.log(`Total API requests made: ${requests.length}`);
      console.log('API requests:', requests.slice(0, 10)); // Log first 10 requests
      
      // Should not make excessive API calls
      expect(requests.length).toBeLessThan(20); // Reasonable number of API calls
      
      // Should batch similar operations
      const searchRequests = requests.filter(url => url.includes('/search'));
      expect(searchRequests.length).toBeLessThan(5); // Should debounce search requests
    });
  });
});

// Additional performance monitoring test
test.describe('Performance Monitoring', () => {
  test('should collect and report performance metrics', async ({ page }) => {
    // Navigate to leads page
    await page.goto('/leads');
    
    // Collect performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        // @ts-ignore
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      };
    });
    
    console.log('Performance Metrics:', {
      domContentLoaded: `${performanceMetrics.domContentLoaded.toFixed(2)}ms`,
      loadComplete: `${performanceMetrics.loadComplete.toFixed(2)}ms`,
      firstPaint: `${performanceMetrics.firstPaint.toFixed(2)}ms`,
      firstContentfulPaint: `${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`,
      memoryUsage: `${(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
    });
    
    // Performance assertions
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
    expect(performanceMetrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB baseline
  });
});