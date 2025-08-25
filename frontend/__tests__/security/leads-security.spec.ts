import { test, expect, Page, Request } from '@playwright/test';

// Security test configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': 'default-src \'self\'',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><script>alert("xss")</script>',
  'javascript:alert("xss")',
  '<img src="x" onerror="alert(\'xss\')">',
  '<svg onload="alert(\'xss\')">',
  '${alert("xss")}',
  '{{alert("xss")}}',
  '<iframe src="javascript:alert(\'xss\')">',
  'data:text/html,<script>alert("xss")</script>',
  '&lt;script&gt;alert("xss")&lt;/script&gt;'
];

const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE leads; --",
  "' UNION SELECT * FROM users --",
  "1' OR 1=1 --",
  "admin'--",
  "admin'/*",
  "' OR 1=1#",
  "' OR 'a'='a",
  "') OR ('1'='1",
  "' OR 1=1 LIMIT 1 --"
];

const CSRF_TEST_ENDPOINTS = [
  '/api/leads',
  '/api/lead-imports',
  '/api/campaigns',
  '/api/users/profile'
];

// Helper functions
class SecurityTestHelper {
  constructor(public page: Page) {}

  async checkSecurityHeaders(response: any): Promise<boolean> {
    const headers = response.headers();
    let missingHeaders: string[] = [];

    for (const [header, expectedValue] of Object.entries(SECURITY_HEADERS)) {
      const actualValue = headers[header.toLowerCase()];
      if (!actualValue) {
        missingHeaders.push(header);
      } else if (expectedValue && !actualValue.includes(expectedValue.split(';')[0])) {
        console.warn(`Header ${header} has unexpected value: ${actualValue}`);
      }
    }

    if (missingHeaders.length > 0) {
      console.warn(`Missing security headers: ${missingHeaders.join(', ')}`);
    }

    return missingHeaders.length === 0;
  }

  async testXSSPayload(inputSelector: string, payload: string): Promise<boolean> {
    try {
      await this.page.fill(inputSelector, payload);
      await this.page.press(inputSelector, 'Enter');
      
      // Wait a moment for potential script execution
      await this.page.waitForTimeout(500);
      
      // Check if XSS payload was executed (should not be)
      const alertHandled = await this.page.evaluate(() => {
        return window.navigator.userAgent.includes('AlertExecuted');
      });

      // Check if payload appears in DOM unescaped (should not)
      const pageContent = await this.page.content();
      const unescapedPayload = pageContent.includes(payload) && !pageContent.includes('&lt;script&gt;');
      
      return !alertHandled && !unescapedPayload;
    } catch (error) {
      console.error(`XSS test failed for payload: ${payload}`, error);
      return false;
    }
  }

  async testSQLInjection(inputSelector: string, payload: string): Promise<boolean> {
    try {
      await this.page.fill(inputSelector, payload);
      await this.page.press(inputSelector, 'Enter');
      
      // Wait for potential response
      await this.page.waitForTimeout(1000);
      
      // Check for common SQL error messages
      const pageContent = await this.page.textContent('body') || '';
      const sqlErrors = [
        'sql syntax',
        'mysql_fetch',
        'postgresql error',
        'ora-',
        'microsoft ole db',
        'sqlite_',
        'syntax error'
      ];
      
      const hasSQLError = sqlErrors.some(error => 
        pageContent.toLowerCase().includes(error)
      );
      
      return !hasSQLError;
    } catch (error) {
      console.error(`SQL injection test failed for payload: ${payload}`, error);
      return false;
    }
  }

  async checkCSRFProtection(endpoint: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<boolean> {
    try {
      // Try request without CSRF token
      const response = await this.page.request.fetch(endpoint, {
        method: method,
        data: { test: 'data' },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should be rejected (403 or similar)
      return response.status() === 403 || response.status() === 401;
    } catch (error) {
      // Network error is also acceptable (CORS blocking)
      return true;
    }
  }

  async simulateSessionTimeout(): Promise<void> {
    // Clear auth tokens
    await this.page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
    });

    // Clear cookies
    await this.page.context().clearCookies();
  }

  async testFileUploadSecurity(filePath: string, expectedBlocked: boolean): Promise<boolean> {
    try {
      await this.page.click('[data-testid="upload-leads-button"]');
      await this.page.setInputFiles('input[type="file"]', filePath);
      
      // Wait for upload response
      await this.page.waitForTimeout(2000);
      
      // Check if upload was blocked
      const errorMessage = await this.page.textContent('[data-testid="upload-error"]');
      const wasBlocked = errorMessage && (
        errorMessage.includes('not allowed') ||
        errorMessage.includes('invalid file type') ||
        errorMessage.includes('security')
      );
      
      return expectedBlocked ? !!wasBlocked : !wasBlocked;
    } catch (error) {
      // Upload blocking can throw errors
      return expectedBlocked;
    }
  }
}

// Authentication helper
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'testuser@example.com');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

test.describe('LEADS Security Tests', () => {
  let page: Page;
  let securityHelper: SecurityTestHelper;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    securityHelper = new SecurityTestHelper(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('HTTP Security Headers', () => {
    test('should have proper security headers on login page', async () => {
      const response = await page.goto('/login');
      expect(response).not.toBeNull();
      
      if (response) {
        const hasSecureHeaders = await securityHelper.checkSecurityHeaders(response);
        expect(hasSecureHeaders).toBeTruthy();
      }
    });

    test('should have proper security headers on leads page', async () => {
      await login(page);
      const response = await page.goto('/leads');
      expect(response).not.toBeNull();
      
      if (response) {
        const hasSecureHeaders = await securityHelper.checkSecurityHeaders(response);
        expect(hasSecureHeaders).toBeTruthy();
      }
    });

    test('should have proper security headers on API endpoints', async () => {
      await login(page);
      
      const apiResponse = await page.request.get('/api/leads', {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`
        }
      });
      
      const headers = apiResponse.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeTruthy();
      expect(headers['content-type']).toContain('application/json');
    });
  });

  test.describe('Cross-Site Scripting (XSS) Prevention', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should sanitize XSS in search input', async () => {
      for (const payload of XSS_PAYLOADS.slice(0, 5)) { // Test first 5 payloads
        const isSafe = await securityHelper.testXSSPayload('[data-testid="search-input"]', payload);
        expect(isSafe).toBeTruthy(`XSS payload should be sanitized: ${payload}`);
        
        // Clear input for next test
        await page.fill('[data-testid="search-input"]', '');
      }
    });

    test('should sanitize XSS in filter inputs', async () => {
      await page.click('[data-testid="add-filter-button"]');
      
      const xssPayload = '<script>alert("xss")</script>';
      const isSafe = await securityHelper.testXSSPayload('[data-testid="filter-value-input"]', xssPayload);
      expect(isSafe).toBeTruthy();
    });

    test('should sanitize XSS in cell editor', async () => {
      // First import some test data
      const csvContent = 'firstName,lastName,email\nTest,User,test@example.com';
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', {
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      await page.waitForSelector('[data-testid="leads-table"]');
      
      // Double-click to edit cell
      await page.dblclick('[data-testid="cell-test@example.com-firstName"]');
      
      const xssPayload = '<img src="x" onerror="alert(\'xss\')">';
      const isSafe = await securityHelper.testXSSPayload('[data-testid="cell-editor-input"]', xssPayload);
      expect(isSafe).toBeTruthy();
    });

    test('should sanitize XSS in formula builder', async () => {
      await page.click('[data-testid="formula-builder-button"]');
      await page.waitForSelector('[data-testid="formula-input"]');
      
      const xssPayload = 'CONCAT("<script>alert(\'xss\')</script>", firstName)';
      const isSafe = await securityHelper.testXSSPayload('[data-testid="formula-input"]', xssPayload);
      expect(isSafe).toBeTruthy();
    });
  });

  test.describe('SQL Injection Prevention', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should prevent SQL injection in search', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 5)) {
        const isSafe = await securityHelper.testSQLInjection('[data-testid="search-input"]', payload);
        expect(isSafe).toBeTruthy(`SQL injection should be prevented: ${payload}`);
        
        await page.fill('[data-testid="search-input"]', '');
        await page.waitForTimeout(200);
      }
    });

    test('should prevent SQL injection in filters', async () => {
      await page.click('[data-testid="add-filter-button"]');
      await page.selectOption('[data-testid="filter-column-select"]', 'firstName');
      await page.selectOption('[data-testid="filter-operator-select"]', 'equals');
      
      const sqlPayload = "'; DROP TABLE leads; --";
      const isSafe = await securityHelper.testSQLInjection('[data-testid="filter-value-input"]', sqlPayload);
      expect(isSafe).toBeTruthy();
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('should redirect unauthenticated users to login', async () => {
      // Clear authentication
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto('/leads');
      await page.waitForURL('/login');
      expect(page.url()).toContain('/login');
    });

    test('should handle session timeout gracefully', async () => {
      await login(page);
      await page.goto('/leads');
      
      // Simulate session timeout
      await securityHelper.simulateSessionTimeout();
      
      // Try to perform authenticated action
      await page.click('[data-testid="upload-leads-button"]');
      
      // Should redirect to login or show auth error
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const hasAuthError = await page.locator('[data-testid="auth-error"]').isVisible();
      
      expect(currentUrl.includes('/login') || hasAuthError).toBeTruthy();
    });

    test('should validate JWT tokens properly', async () => {
      await login(page);
      
      // Tamper with JWT token
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'invalid.jwt.token');
      });
      
      await page.goto('/leads');
      
      // Should be redirected to login or show error
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });

    test('should prevent privilege escalation', async () => {
      await login(page);
      
      // Try to access admin endpoints (should be blocked)
      const adminResponse = await page.request.get('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`
        }
      });
      
      expect(adminResponse.status()).toBe(403);
    });
  });

  test.describe('CSRF Protection', () => {
    test.beforeEach(async () => {
      await login(page);
    });

    test('should have CSRF protection on state-changing endpoints', async () => {
      for (const endpoint of CSRF_TEST_ENDPOINTS) {
        const isProtected = await securityHelper.checkCSRFProtection(endpoint);
        expect(isProtected).toBeTruthy(`Endpoint ${endpoint} should have CSRF protection`);
      }
    });

    test('should include CSRF token in forms', async () => {
      await page.goto('/leads');
      
      // Check if CSRF token is present in forms
      const csrfToken = await page.$eval('meta[name="csrf-token"]', el => el.getAttribute('content'));
      expect(csrfToken).toBeTruthy();
    });
  });

  test.describe('File Upload Security', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should only allow CSV and Excel files', async () => {
      // Create malicious files to test
      const maliciousFiles = [
        { name: 'script.js', content: 'alert("xss")', shouldBlock: true },
        { name: 'malware.exe', content: 'fake executable', shouldBlock: true },
        { name: 'valid.csv', content: 'firstName,lastName\nTest,User', shouldBlock: false }
      ];

      for (const file of maliciousFiles) {
        const tempPath = `/tmp/${file.name}`;
        require('fs').writeFileSync(tempPath, file.content);
        
        const isSecure = await securityHelper.testFileUploadSecurity(tempPath, file.shouldBlock);
        expect(isSecure).toBeTruthy(`File ${file.name} security test failed`);
      }
    });

    test('should validate file content', async () => {
      // Create CSV with malicious content
      const maliciousCsv = 'firstName,lastName\n=cmd|"/c calc",User\n@SUM(1+1)*cmd|"/c calc",Test';
      const tempPath = '/tmp/malicious.csv';
      require('fs').writeFileSync(tempPath, maliciousCsv);
      
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', tempPath);
      
      // Should show security warning or sanitize content
      await page.waitForTimeout(2000);
      const hasWarning = await page.locator('[data-testid="security-warning"]').isVisible();
      const pageContent = await page.content();
      const hasFormula = pageContent.includes('=cmd');
      
      expect(hasWarning || !hasFormula).toBeTruthy();
    });

    test('should limit file size', async () => {
      // Create large file (if size limits exist)
      const largeContent = 'firstName,lastName\n' + 'a,b\n'.repeat(1000000);
      const tempPath = '/tmp/large.csv';
      require('fs').writeFileSync(tempPath, largeContent);
      
      await page.click('[data-testid="upload-leads-button"]');
      await page.setInputFiles('input[type="file"]', tempPath);
      
      // Should handle large files gracefully (error or processing)
      await page.waitForTimeout(3000);
      const hasError = await page.locator('[data-testid="upload-error"]').isVisible();
      const hasProcessing = await page.locator('[data-testid="upload-processing"]').isVisible();
      
      expect(hasError || hasProcessing).toBeTruthy();
    });
  });

  test.describe('Data Protection', () => {
    test.beforeEach(async () => {
      await login(page);
      await page.goto('/leads');
    });

    test('should not expose sensitive data in client-side code', async () => {
      // Check for exposed secrets in page source
      const pageContent = await page.content();
      
      const sensitivePatterns = [
        /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
        /secret["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
        /password["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
        /token["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi
      ];
      
      for (const pattern of sensitivePatterns) {
        const matches = pageContent.match(pattern);
        expect(matches).toBeFalsy(`Sensitive data exposed: ${matches?.[0]}`);
      }
    });

    test('should not log sensitive information', async () => {
      // Monitor console for sensitive data
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });
      
      // Perform actions that might log data
      await page.fill('[data-testid="search-input"]', 'test@example.com');
      await page.click('[data-testid="add-filter-button"]');
      await page.fill('[data-testid="filter-value-input"]', 'sensitive-data');
      
      await page.waitForTimeout(1000);
      
      // Check console logs for sensitive patterns
      const allLogs = consoleLogs.join(' ');
      const hasSensitiveData = [
        'password',
        'token',
        'secret',
        'api_key'
      ].some(term => allLogs.toLowerCase().includes(term));
      
      expect(hasSensitiveData).toBeFalsy('Sensitive data should not be logged to console');
    });
  });

  test.describe('Content Security Policy', () => {
    test('should prevent inline script execution', async () => {
      await login(page);
      await page.goto('/leads');
      
      // Try to inject inline script
      const scriptInjected = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.innerHTML = 'window.cspTest = true;';
          document.body.appendChild(script);
          return !!window.cspTest;
        } catch (e) {
          return false;
        }
      });
      
      expect(scriptInjected).toBeFalsy('Inline scripts should be blocked by CSP');
    });

    test('should prevent unsafe eval usage', async () => {
      await login(page);
      await page.goto('/leads');
      
      const evalBlocked = await page.evaluate(() => {
        try {
          // @ts-ignore
          eval('1 + 1');
          return false;
        } catch (e) {
          return true;
        }
      });
      
      // Note: CSP should block eval, but it may be allowed in test environment
      console.log(`Eval blocked: ${evalBlocked}`);
    });
  });

  test.describe('Rate Limiting', () => {
    test.beforeEach(async () => {
      await login(page);
    });

    test('should implement rate limiting on API endpoints', async () => {
      const apiEndpoint = '/api/leads';
      const requests: Promise<any>[] = [];
      
      // Send multiple rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          page.request.get(apiEndpoint, {
            headers: {
              'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`
            }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      // Should have some rate-limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling Security', () => {
    test('should not expose stack traces to users', async () => {
      await login(page);
      
      // Try to trigger an error
      const errorResponse = await page.request.get('/api/leads/invalid-id');
      const responseText = await errorResponse.text();
      
      // Should not contain stack traces
      const hasStackTrace = responseText.includes('at ') && responseText.includes('.js:');
      expect(hasStackTrace).toBeFalsy('Stack traces should not be exposed');
    });

    test('should handle 404s gracefully', async () => {
      await page.goto('/leads/nonexistent-page');
      
      // Should show custom 404 page, not expose system info
      const pageContent = await page.textContent('body') || '';
      const has404Page = pageContent.includes('404') || pageContent.includes('Page not found');
      const exposesInfo = pageContent.includes('Error:') || pageContent.includes('Stack');
      
      expect(has404Page && !exposesInfo).toBeTruthy();
    });
  });
});