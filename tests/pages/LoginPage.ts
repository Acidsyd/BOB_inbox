import { Page, expect } from '@playwright/test';

/**
 * LoginPage - Page Object Model for Authentication
 * Handles login, registration, and authentication flows
 */
export class LoginPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    emailInput: '[data-testid="email-input"], input[type="email"], input[name="email"]',
    passwordInput: '[data-testid="password-input"], input[type="password"], input[name="password"]',
    loginButton: '[data-testid="login-button"], button[type="submit"], .login-btn',
    registerButton: '[data-testid="register-button"], .register-btn',
    forgotPasswordLink: '[data-testid="forgot-password"], .forgot-password',
    errorMessage: '[data-testid="error-message"], .error, .alert-error',
    successMessage: '[data-testid="success-message"], .success, .alert-success'
  };

  // Navigation
  async goto() {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    // Wait for either email input or already logged in redirect
    try {
      await this.page.waitForSelector(this.selectors.emailInput, { timeout: 5000 });
    } catch {
      // Might already be logged in, check for redirect
      if (this.page.url().includes('/login')) {
        throw new Error('Login page did not load properly');
      }
    }
  }

  // Actions
  async fillEmail(email: string) {
    await this.page.fill(this.selectors.emailInput, email);
  }

  async fillPassword(password: string) {
    await this.page.fill(this.selectors.passwordInput, password);
  }

  async clickLogin() {
    await this.page.click(this.selectors.loginButton);
  }

  async clickRegister() {
    await this.page.click(this.selectors.registerButton);
  }

  async clickForgotPassword() {
    await this.page.click(this.selectors.forgotPasswordLink);
  }

  // Complex workflows
  async login(email: string, password: string) {
    console.log(`🔐 Logging in with: ${email}`);
    
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    
    // Wait for either success (redirect) or error message
    try {
      await this.page.waitForURL('/', { timeout: 10000 });
      console.log('✅ Login successful - redirected to dashboard');
    } catch {
      // Check for error message
      const errorVisible = await this.page.locator(this.selectors.errorMessage).isVisible();
      if (errorVisible) {
        const errorText = await this.page.locator(this.selectors.errorMessage).textContent();
        console.log(`❌ Login failed: ${errorText}`);
        throw new Error(`Login failed: ${errorText}`);
      } else {
        console.log('❌ Login failed: Unknown error');
        throw new Error('Login failed: Unknown error');
      }
    }
  }

  async quickLogin() {
    const email = 'test@example.com';
    const password = 'testpassword123';
    await this.login(email, password);
  }

  // Verifications
  async verifyOnLoginPage() {
    await expect(this.page.locator(this.selectors.emailInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.loginButton)).toBeVisible();
  }

  async verifyErrorMessage(expectedMessage?: string) {
    await expect(this.page.locator(this.selectors.errorMessage)).toBeVisible();
    
    if (expectedMessage) {
      const actualMessage = await this.page.locator(this.selectors.errorMessage).textContent();
      expect(actualMessage).toContain(expectedMessage);
    }
  }

  async verifySuccessMessage(expectedMessage?: string) {
    await expect(this.page.locator(this.selectors.successMessage)).toBeVisible();
    
    if (expectedMessage) {
      const actualMessage = await this.page.locator(this.selectors.successMessage).textContent();
      expect(actualMessage).toContain(expectedMessage);
    }
  }

  async verifyRedirectToDashboard() {
    await this.page.waitForURL('/', { timeout: 10000 });
    console.log('✅ Successfully redirected to dashboard');
  }
}