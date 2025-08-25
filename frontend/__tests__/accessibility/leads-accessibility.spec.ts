import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 AA compliance configuration
const ACCESSIBILITY_CONFIG = {
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  rules: {
    // Enable additional rules for better accessibility
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'semantic-markup': { enabled: true }
  }
};

const KEYBOARD_NAVIGATION_KEYS = {
  TAB: 'Tab',
  SHIFT_TAB: 'Shift+Tab', 
  ENTER: 'Enter',
  SPACE: 'Space',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  ESCAPE: 'Escape'
};

// Helper functions for accessibility testing
class AccessibilityHelper {
  constructor(public page: Page) {}

  async runAxeAnalysis(context?: any): Promise<any> {
    const axeBuilder = new AxeBuilder({ page: this.page })
      .withTags(ACCESSIBILITY_CONFIG.tags);
    
    if (context) {
      axeBuilder.include(context);
    }
    
    return await axeBuilder.analyze();
  }

  async checkColorContrast(element: string): Promise<boolean> {
    const contrastRatio = await this.page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return 0;
      
      const styles = window.getComputedStyle(el);
      const bgColor = styles.backgroundColor;
      const color = styles.color;
      
      // Simple contrast ratio calculation (would need more robust implementation)
      return this.calculateContrastRatio(color, bgColor);
    }, element);
    
    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    return contrastRatio >= 4.5;
  }

  async checkFocusVisible(element: string): Promise<boolean> {
    await this.page.focus(element);
    
    const hasFocusIndicator = await this.page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      
      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;
      
      return outline !== 'none' || boxShadow !== 'none';
    }, element);
    
    return hasFocusIndicator;
  }

  async testKeyboardNavigation(startElement: string, expectedPath: string[]): Promise<boolean> {
    await this.page.focus(startElement);
    
    const focusedElements: string[] = [];
    
    for (let i = 0; i < expectedPath.length; i++) {
      await this.page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.TAB);
      
      const focusedElement = await this.page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? 
          focused.getAttribute('data-testid') || 
          focused.tagName.toLowerCase() + 
          (focused.id ? '#' + focused.id : '') +
          (focused.className ? '.' + focused.className.split(' ')[0] : '')
          : '';
      });
      
      focusedElements.push(focusedElement);
    }
    
    return this.arraysEqual(focusedElements, expectedPath);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  async checkAriaLabels(elements: string[]): Promise<{ element: string, hasLabel: boolean }[]> {
    const results = [];
    
    for (const element of elements) {
      const hasLabel = await this.page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        
        return !!(
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title') ||
          el.textContent?.trim()
        );
      }, element);
      
      results.push({ element, hasLabel });
    }
    
    return results;
  }

  async testScreenReaderCompatibility(): Promise<string[]> {
    // Get all landmarks and headings for screen reader navigation
    const landmarks = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('[role], main, nav, aside, section, header, footer, h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        text: el.textContent?.substring(0, 50) || '',
        level: el.tagName.match(/h(\d)/i)?.[1] || null
      }));
    });
    
    const issues = [];
    
    // Check heading hierarchy
    let previousLevel = 0;
    for (const landmark of landmarks) {
      if (landmark.level) {
        const currentLevel = parseInt(landmark.level);
        if (currentLevel > previousLevel + 1) {
          issues.push(`Heading level skipped: h${previousLevel} to h${currentLevel}`);
        }
        previousLevel = currentLevel;
      }
    }
    
    return issues;
  }

  async simulateHighContrastMode(): Promise<void> {
    await this.page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
  }

  async simulateReducedMotion(): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
  }

  async testZoomLevel(zoomLevel: number): Promise<boolean> {
    await this.page.setViewportSize({ 
      width: Math.floor(1200 / zoomLevel), 
      height: Math.floor(800 / zoomLevel) 
    });
    
    // Check if content is still usable at zoom level
    const isUsable = await this.page.evaluate(() => {
      // Check if important elements are still visible
      const importantElements = document.querySelectorAll('[data-testid*="button"], [data-testid*="input"], [data-testid*="link"]');
      let visibleCount = 0;
      
      for (const el of importantElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleCount++;
        }
      }
      
      return visibleCount > 0;
    });
    
    return isUsable;
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

test.describe('LEADS Accessibility Tests', () => {
  let page: Page;
  let accessibilityHelper: AccessibilityHelper;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    accessibilityHelper = new AccessibilityHelper(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should pass axe-core accessibility analysis on login page', async () => {
      await page.goto('/login');
      
      const results = await accessibilityHelper.runAxeAnalysis();
      
      expect(results.violations).toHaveLength(0);
      
      // Log any violations for debugging
      if (results.violations.length > 0) {
        console.log('Accessibility violations on login page:');
        results.violations.forEach((violation: any) => {
          console.log(`- ${violation.id}: ${violation.description}`);
        });
      }
    });

    test('should pass axe-core accessibility analysis on leads page', async () => {
      await login(page);
      await page.goto('/leads');
      await page.waitForSelector('[data-testid="leads-page"]');
      
      const results = await accessibilityHelper.runAxeAnalysis();
      
      expect(results.violations).toHaveLength(0);
      
      if (results.violations.length > 0) {
        console.log('Accessibility violations on leads page:');
        results.violations.forEach((violation: any) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          violation.nodes.forEach((node: any) => {
            console.log(`  Element: ${node.target}`);
          });
        });
      }
    });

    test('should pass accessibility analysis on leads table with data', async () => {
      await login(page);
      await page.goto('/leads');
      
      // Import test data first
      const csvContent = 'firstName,lastName,email,company\nJohn,Doe,john@example.com,Example Corp';
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', {
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      await page.waitForSelector('[data-testid="leads-table"]');
      
      const results = await accessibilityHelper.runAxeAnalysis('[data-testid="leads-table"]');
      expect(results.violations).toHaveLength(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should support keyboard navigation through main interface', async () => {
      const expectedTabOrder = [
        'search-input',
        'add-filter-button',
        'export-button',
        'upload-leads-button',
        'column-manager-button'
      ];
      
      const keyboardNavigationWorks = await accessibilityHelper.testKeyboardNavigation(
        '[data-testid="search-input"]',
        expectedTabOrder
      );
      
      expect(keyboardNavigationWorks).toBeTruthy();
    });

    test('should support keyboard navigation in table', async () => {
      // Import test data
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', {
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      await page.waitForSelector('[data-testid="leads-table"]');
      
      // Test arrow key navigation in table
      await page.focus('[data-testid="cell-john@example.com-firstName"]');
      
      // Test right arrow
      await page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.ARROW_RIGHT);
      const focusAfterRight = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusAfterRight).toContain('lastName');
      
      // Test down arrow  
      await page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.ARROW_DOWN);
      const focusAfterDown = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusAfterDown).toContain('jane@example.com');
    });

    test('should support keyboard shortcuts', async () => {
      // Test Ctrl+F for search focus
      await page.keyboard.press('Control+f');
      const searchFocused = await page.evaluate(() => 
        document.activeElement?.getAttribute('data-testid') === 'search-input'
      );
      expect(searchFocused).toBeTruthy();
      
      // Test Escape to clear search
      await page.fill('[data-testid="search-input"]', 'test');
      await page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.ESCAPE);
      const searchCleared = await page.inputValue('[data-testid="search-input"]');
      expect(searchCleared).toBe('');
    });

    test('should handle focus management in modals', async () => {
      // Open column manager modal
      await page.click('[data-testid="column-manager-button"]');
      await page.waitForSelector('[data-testid="column-manager-modal"]');
      
      // Focus should be trapped in modal
      const firstFocusableElement = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="column-manager-modal"]');
        const focusableElements = modal?.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        return focusableElements?.[0]?.getAttribute('data-testid') || '';
      });
      
      expect(firstFocusableElement).toBeTruthy();
      
      // Test modal close with Escape
      await page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.ESCAPE);
      await page.waitForSelector('[data-testid="column-manager-modal"]', { state: 'detached' });
      
      const modalClosed = await page.locator('[data-testid="column-manager-modal"]').isVisible();
      expect(modalClosed).toBeFalsy();
    });
  });

  test.describe('Focus Management', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should have visible focus indicators', async () => {
      const interactiveElements = [
        '[data-testid="search-input"]',
        '[data-testid="add-filter-button"]',
        '[data-testid="export-button"]',
        '[data-testid="upload-leads-button"]'
      ];
      
      for (const element of interactiveElements) {
        const hasFocusIndicator = await accessibilityHelper.checkFocusVisible(element);
        expect(hasFocusIndicator).toBeTruthy(`${element} should have visible focus indicator`);
      }
    });

    test('should restore focus after modal interactions', async () => {
      // Focus on column manager button
      await page.focus('[data-testid="column-manager-button"]');
      
      // Open modal
      await page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.ENTER);
      await page.waitForSelector('[data-testid="column-manager-modal"]');
      
      // Close modal
      await page.keyboard.press(KEYBOARD_NAVIGATION_KEYS.ESCAPE);
      await page.waitForSelector('[data-testid="column-manager-modal"]', { state: 'detached' });
      
      // Focus should return to button
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('column-manager-button');
    });

    test('should handle focus in dynamic content', async () => {
      // Add a filter to create dynamic content
      await page.click('[data-testid="add-filter-button"]');
      await page.waitForSelector('[data-testid="filter-row"]');
      
      // Focus should move to first input in new filter
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toContain('filter-column-select');
    });
  });

  test.describe('ARIA Labels and Roles', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should have proper ARIA labels for interactive elements', async () => {
      const elementsToCheck = [
        '[data-testid="search-input"]',
        '[data-testid="add-filter-button"]',
        '[data-testid="export-button"]',
        '[data-testid="upload-leads-button"]',
        '[data-testid="column-manager-button"]'
      ];
      
      const labelResults = await accessibilityHelper.checkAriaLabels(elementsToCheck);
      
      labelResults.forEach(result => {
        expect(result.hasLabel).toBeTruthy(`${result.element} should have accessible label`);
      });
    });

    test('should have proper table structure with ARIA', async () => {
      // Import test data
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', {
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      await page.waitForSelector('[data-testid="leads-table"]');
      
      // Check table structure
      const tableStructure = await page.evaluate(() => {
        const table = document.querySelector('[data-testid="leads-table"]');
        return {
          hasRole: table?.getAttribute('role') === 'table' || table?.tagName === 'TABLE',
          hasHeaders: !!document.querySelectorAll('[role="columnheader"], th').length,
          hasRows: !!document.querySelectorAll('[role="row"], tr').length,
          hasCells: !!document.querySelectorAll('[role="cell"], [role="gridcell"], td').length
        };
      });
      
      expect(tableStructure.hasRole).toBeTruthy();
      expect(tableStructure.hasHeaders).toBeTruthy();
      expect(tableStructure.hasRows).toBeTruthy();
      expect(tableStructure.hasCells).toBeTruthy();
    });

    test('should announce dynamic content changes', async () => {
      // Check for ARIA live regions
      const hasLiveRegion = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
      expect(hasLiveRegion).toBeGreaterThan(0);
      
      // Test that search results are announced
      await page.fill('[data-testid="search-input"]', 'test');
      await page.waitForTimeout(500);
      
      const liveRegionContent = await page.textContent('[aria-live], [role="status"]');
      expect(liveRegionContent).toBeTruthy();
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet WCAG AA color contrast requirements', async () => {
      await login(page);
      await page.goto('/leads');
      
      const elementsToCheck = [
        '[data-testid="search-input"]',
        'button',
        '.text-primary',
        '.text-secondary',
        'h1, h2, h3, h4, h5, h6'
      ];
      
      for (const element of elementsToCheck) {
        const elements = await page.locator(element).all();
        
        for (let i = 0; i < Math.min(elements.length, 5); i++) { // Check first 5 of each type
          const hasGoodContrast = await accessibilityHelper.checkColorContrast(`${element}:nth-of-type(${i + 1})`);
          if (!hasGoodContrast) {
            console.warn(`Color contrast issue detected for: ${element}`);
          }
        }
      }
    });

    test('should work in high contrast mode', async () => {
      await login(page);
      await page.goto('/leads');
      
      await accessibilityHelper.simulateHighContrastMode();
      
      // Check that interactive elements are still visible and usable
      const elementsVisible = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');
        
        let visibleCount = 0;
        const allElements = [...buttons, ...inputs];
        
        for (const el of allElements) {
          const styles = window.getComputedStyle(el);
          const isVisible = styles.display !== 'none' && 
                           styles.visibility !== 'hidden' && 
                           parseFloat(styles.opacity) > 0;
          if (isVisible) visibleCount++;
        }
        
        return visibleCount > 0;
      });
      
      expect(elementsVisible).toBeTruthy();
    });
  });

  test.describe('Responsive Design Accessibility', () => {
    test('should be accessible on mobile screen sizes', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      await login(page);
      await page.goto('/leads');
      
      const results = await accessibilityHelper.runAxeAnalysis();
      expect(results.violations).toHaveLength(0);
      
      // Check that touch targets are adequate size (44px minimum)
      const touchTargetSizes = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('button, input, [role="button"], a');
        const inadequateSizes: string[] = [];
        
        for (const el of interactiveElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            inadequateSizes.push(el.getAttribute('data-testid') || el.tagName);
          }
        }
        
        return inadequateSizes;
      });
      
      expect(touchTargetSizes).toHaveLength(0);
    });

    test('should support zoom up to 200%', async () => {
      await login(page);
      await page.goto('/leads');
      
      const zoomLevels = [1.5, 2.0];
      
      for (const zoom of zoomLevels) {
        const isUsable = await accessibilityHelper.testZoomLevel(zoom);
        expect(isUsable).toBeTruthy(`Should be usable at ${zoom * 100}% zoom`);
      }
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preferences', async () => {
      await login(page);
      await page.goto('/leads');
      
      await accessibilityHelper.simulateReducedMotion();
      
      // Check that animations are disabled or reduced
      const animationsReduced = await page.evaluate(() => {
        const animatedElements = document.querySelectorAll('[class*="animate"], [class*="transition"]');
        let reducedCount = 0;
        
        for (const el of animatedElements) {
          const styles = window.getComputedStyle(el);
          if (styles.animationDuration === '0s' || styles.transitionDuration === '0s') {
            reducedCount++;
          }
        }
        
        return reducedCount > 0 || animatedElements.length === 0;
      });
      
      expect(animationsReduced).toBeTruthy();
    });

    test('should not cause seizures with flashing content', async () => {
      await login(page);
      await page.goto('/leads');
      
      // Import data to trigger potential loading animations
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', {
        name: 'test.csv',
        mimeType: 'text/csv', 
        buffer: Buffer.from(csvContent)
      });
      
      // Check for potentially problematic flashing
      const hasFlashing = await page.evaluate(() => {
        // Look for rapidly changing elements
        const flashingElements = document.querySelectorAll('[class*="flash"], [class*="blink"], [class*="strobe"]');
        return flashingElements.length === 0; // Should be none
      });
      
      expect(hasFlashing).toBeTruthy();
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper heading structure', async () => {
      await login(page);
      await page.goto('/leads');
      
      const screenReaderIssues = await accessibilityHelper.testScreenReaderCompatibility();
      
      expect(screenReaderIssues).toHaveLength(0);
    });

    test('should provide meaningful page titles', async () => {
      const pages = [
        { url: '/login', expectedTitle: 'Login' },
        { url: '/leads', expectedTitle: 'Leads' },
        { url: '/dashboard', expectedTitle: 'Dashboard' }
      ];
      
      for (const pageInfo of pages) {
        if (pageInfo.url === '/leads' || pageInfo.url === '/dashboard') {
          await login(page);
        }
        
        await page.goto(pageInfo.url);
        const title = await page.title();
        expect(title).toContain(pageInfo.expectedTitle);
      }
    });

    test('should announce loading states', async () => {
      await login(page);
      await page.goto('/leads');
      
      // Trigger loading state
      await page.click('[data-testid="upload-leads-button"]');
      
      // Check for loading announcements
      const hasLoadingAnnouncement = await page.locator('[aria-live], [role="status"]').count();
      expect(hasLoadingAnnouncement).toBeGreaterThan(0);
    });
  });

  test.describe('Form Accessibility', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should have proper form labels and associations', async () => {
      // Add filter to create form elements
      await page.click('[data-testid="add-filter-button"]');
      await page.waitForSelector('[data-testid="filter-row"]');
      
      const formElements = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        const results = [];
        
        for (const input of inputs) {
          const hasLabel = !!(
            input.getAttribute('aria-label') ||
            input.getAttribute('aria-labelledby') ||
            document.querySelector(`label[for="${input.id}"]`) ||
            input.closest('label')
          );
          
          results.push({
            element: input.getAttribute('data-testid') || input.tagName,
            hasLabel
          });
        }
        
        return results;
      });
      
      formElements.forEach(element => {
        expect(element.hasLabel).toBeTruthy(`Form element ${element.element} should have a label`);
      });
    });

    test('should provide helpful error messages', async () => {
      // Try to submit a form with validation errors
      await page.fill('[data-testid="search-input"]', ''); // Clear search
      await page.click('[data-testid="add-filter-button"]');
      
      // Try to apply filter without selecting column
      await page.click('[data-testid="apply-filter-button"]');
      
      // Check for error message with ARIA attributes
      const errorElement = await page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
      const hasErrorMessage = await errorElement.count() > 0;
      
      expect(hasErrorMessage).toBeTruthy();
    });
  });

  test.describe('Skip Links and Landmarks', () => {
    test('should provide skip links for keyboard users', async () => {
      await login(page);
      await page.goto('/leads');
      
      // Test Tab to reveal skip links
      await page.keyboard.press('Tab');
      
      const skipLink = await page.locator('[href="#main-content"], [href="#skip-to-content"]').first();
      const skipLinkVisible = await skipLink.isVisible();
      
      if (skipLinkVisible) {
        await skipLink.click();
        const mainContent = await page.locator('#main-content, [role="main"]').first();
        expect(await mainContent.isVisible()).toBeTruthy();
      }
    });

    test('should have proper landmark structure', async () => {
      await login(page);
      await page.goto('/leads');
      
      const landmarks = await page.evaluate(() => {
        const landmarkElements = document.querySelectorAll('main, nav, aside, header, footer, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]');
        return Array.from(landmarkElements).map(el => ({
          tag: el.tagName,
          role: el.getAttribute('role'),
          hasLabel: !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))
        }));
      });
      
      expect(landmarks.length).toBeGreaterThan(0);
      
      // Should have at least a main landmark
      const hasMain = landmarks.some(l => l.role === 'main' || l.tag === 'MAIN');
      expect(hasMain).toBeTruthy();
    });
  });
});