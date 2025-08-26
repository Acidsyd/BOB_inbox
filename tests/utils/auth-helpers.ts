import { Page, BrowserContext } from '@playwright/test';
import { makeAPIRequest } from './test-helpers';

/**
 * Authentication Helpers for E2E Testing
 * Handles login tokens, user sessions, and test authentication
 */

export const TEST_USERS = {
  admin: {
    email: 'test@example.com',
    password: 'testpassword123',
    role: 'admin'
  },
  user: {
    email: 'user@demo.com', 
    password: 'testpassword123',
    role: 'user'
  }
};

/**
 * Create a test authentication token
 */
export async function createTestAuthToken(user = TEST_USERS.admin): Promise<string> {
  try {
    // For development/testing, create a simple JWT-like token
    // In production, this would authenticate with the real API
    const payload = {
      sub: '550e8400-e29b-41d4-a716-446655440001',
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };
    
    // Simple base64 encoding for testing (not secure, for dev only)
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    console.log(`🔐 Created test auth token for: ${user.email}`);
    return token;
    
  } catch (error) {
    console.error('Failed to create test auth token:', error);
    throw error;
  }
}

/**
 * Login user and store authentication context
 */
export async function authenticateUser(page: Page, user = TEST_USERS.admin): Promise<string> {
  try {
    console.log(`🔐 Authenticating user: ${user.email}`);
    
    // Create test token
    const token = await createTestAuthToken(user);
    
    // Store token in localStorage for the application
    await page.addInitScript((authToken) => {
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('user_email', `${JSON.parse(atob(authToken)).email}`);
    }, token);
    
    console.log(`✅ User authenticated: ${user.email}`);
    return token;
    
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

/**
 * Setup authenticated browser context
 */
export async function createAuthenticatedContext(context: BrowserContext, user = TEST_USERS.admin): Promise<string> {
  const token = await createTestAuthToken(user);
  
  // Add authentication to all pages in this context
  await context.addInitScript((authToken) => {
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user_email', `${JSON.parse(atob(authToken)).email}`);
  }, token);
  
  console.log(`✅ Browser context authenticated for: ${user.email}`);
  return token;
}

/**
 * Verify authentication state
 */
export async function verifyAuthenticationState(page: Page): Promise<boolean> {
  try {
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    const userEmail = await page.evaluate(() => localStorage.getItem('user_email'));
    
    const isAuthenticated = !!(authToken && userEmail);
    
    if (isAuthenticated) {
      console.log(`✅ User authenticated as: ${userEmail}`);
    } else {
      console.log('❌ User not authenticated');
    }
    
    return isAuthenticated;
    
  } catch (error) {
    console.error('Failed to verify authentication state:', error);
    return false;
  }
}

/**
 * Clear authentication
 */
export async function clearAuthentication(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    sessionStorage.clear();
  });
  
  console.log('🚪 Authentication cleared');
}

/**
 * Make authenticated API request for testing
 */
export async function makeAuthenticatedRequest(endpoint: string, options: any = {}, user = TEST_USERS.admin) {
  const token = await createTestAuthToken(user);
  
  return await makeAPIRequest(
    options.method || 'GET',
    endpoint,
    options.data,
    token
  );
}

/**
 * Wait for authentication to be ready
 */
export async function waitForAuthentication(page: Page, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => !!localStorage.getItem('auth_token'),
      { timeout }
    );
    
    console.log('✅ Authentication ready');
    return true;
    
  } catch (error) {
    console.log('⚠️ Authentication not ready within timeout');
    return false;
  }
}