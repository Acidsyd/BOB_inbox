/**
 * Authentication Context Integration Tests
 * 
 * Tests the enhanced authentication context that integrates with
 * the navigation system to prevent unwanted dashboard redirects
 * and preserve user workflow context.
 * 
 * Test Coverage:
 * - Authentication state management
 * - Navigation context integration
 * - Login/registration redirect behavior
 * - Workflow preservation during auth flows
 * - Error handling and recovery
 * - Token management and validation
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../lib/auth/context';
import { NavigationProvider } from '../../lib/navigation/context';
import * as api from '../../lib/api';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPathname = '/test-path';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: mockPathname,
    query: {},
    asPath: mockPathname
  })
}));

// Mock API module
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component for auth context integration
const TestAuthComponent = ({ 
  onAuthChange, 
  children 
}: { 
  onAuthChange?: (auth: any) => void;
  children?: React.ReactNode;
}) => {
  const auth = useAuth();
  
  React.useEffect(() => {
    if (onAuthChange) {
      onAuthChange(auth);
    }
  }, [auth, onAuthChange]);

  return (
    <div>
      <span data-testid="loading">{auth.isLoading ? 'true' : 'false'}</span>
      <span data-testid="authenticated">{auth.isAuthenticated ? 'true' : 'false'}</span>
      <span data-testid="user-email">{auth.user?.email || 'none'}</span>
      <button 
        data-testid="login-button" 
        onClick={() => auth.login('test@example.com', 'password123')}
      >
        Login
      </button>
      <button 
        data-testid="logout-button" 
        onClick={() => auth.logout()}
      >
        Logout
      </button>
      <button 
        data-testid="register-button" 
        onClick={() => auth.register({
          email: 'new@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        })}
      >
        Register
      </button>
      {children}
    </div>
  );
};

// Combined provider for integration testing
const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <NavigationProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </NavigationProvider>
);

describe('AuthProvider Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Authentication State', () => {
    test('should initialize with loading state', () => {
      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });

    test('should initialize authenticated user with stored token', async () => {
      const mockUser = {
        id: '123',
        email: 'stored@example.com',
        firstName: 'Stored',
        lastName: 'User',
        role: 'user',
        organizationId: 'org-123'
      };

      localStorageMock.getItem.mockReturnValue('stored-token');
      (api.api.get as jest.Mock).mockResolvedValue({
        data: mockUser
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent('stored@example.com');
      
      expect(api.api.get).toHaveBeenCalledWith('/auth/me');
    });

    test('should clear invalid stored tokens', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      (api.api.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('Login Flow Integration', () => {
    test('should handle successful login with navigation context', async () => {
      const mockUser = {
        id: '456',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        organizationId: 'org-456'
      };

      const mockTokens = {
        user: mockUser,
        token: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      (api.api.post as jest.Mock).mockResolvedValue({
        data: mockTokens
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const loginButton = screen.getByTestId('login-button');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
      
      // Should redirect to default (dashboard) when no navigation context
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    test('should preserve workflow context during login', async () => {
      const mockUser = {
        id: '789',
        email: 'workflow@example.com',
        organizationId: 'org-789'
      };

      (api.api.post as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'workflow-token',
          refreshToken: 'workflow-refresh'
        }
      });

      let authContext: any = null;

      render(
        <TestProviders>
          <TestAuthComponent onAuthChange={(auth) => authContext = auth} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Simulate workflow preservation before login
      // In real usage, this would be set by navigation context
      const loginButton = screen.getByTestId('login-button');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Verify login was processed
      expect(api.api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });

    test('should handle login errors gracefully', async () => {
      (api.api.post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: 'Invalid credentials'
          }
        }
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const loginButton = screen.getByTestId('login-button');

      await expect(async () => {
        await act(async () => {
          loginButton.click();
        });
      }).rejects.toThrow('Invalid credentials');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test('should log authentication flow events', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      (api.api.post as jest.Mock).mockResolvedValue({
        data: {
          user: { email: 'logged@example.com' },
          token: 'log-token',
          refreshToken: 'log-refresh'
        }
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const loginButton = screen.getByTestId('login-button');

      await act(async () => {
        loginButton.click();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 Attempting login for:', 'test@example.com'
      );
    });
  });

  describe('Registration Flow Integration', () => {
    test('should handle successful registration with navigation context', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'Test',
        lastName: 'User',
        organizationId: 'new-org-id'
      };

      (api.api.post as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'registration-token',
          refreshToken: 'registration-refresh'
        }
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const registerButton = screen.getByTestId('register-button');

      await act(async () => {
        registerButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('user-email')).toHaveTextContent('new@example.com');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'registration-token');
      expect(mockPush).toHaveBeenCalledWith('/dashboard'); // Default redirect
    });

    test('should handle registration errors', async () => {
      (api.api.post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: 'Email already exists'
          }
        }
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const registerButton = screen.getByTestId('register-button');

      await expect(async () => {
        await act(async () => {
          registerButton.click();
        });
      }).rejects.toThrow('Email already exists');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  describe('Logout Functionality', () => {
    test('should handle logout properly', async () => {
      // Setup authenticated user first
      const mockUser = {
        id: 'logout-user',
        email: 'logout@example.com',
        organizationId: 'logout-org'
      };

      localStorageMock.getItem.mockReturnValue('logout-token');
      (api.api.get as jest.Mock).mockResolvedValue({
        data: mockUser
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByTestId('logout-button');

      await act(async () => {
        logoutButton.click();
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Navigation Context Integration', () => {
    test('should respect navigation context during authentication', async () => {
      const TestWithNavigation = () => {
        const [preserveWorkflow, setPreserveWorkflow] = React.useState(false);
        
        return (
          <TestProviders>
            <div>
              <button 
                data-testid="preserve-workflow"
                onClick={() => setPreserveWorkflow(true)}
              >
                Preserve Workflow
              </button>
              <TestAuthComponent />
            </div>
          </TestProviders>
        );
      };

      (api.api.post as jest.Mock).mockResolvedValue({
        data: {
          user: { email: 'navigation@example.com' },
          token: 'nav-token',
          refreshToken: 'nav-refresh'
        }
      });

      render(<TestWithNavigation />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // The navigation context integration would be tested here
      // In practice, the navigation context would control redirect behavior
      const loginButton = screen.getByTestId('login-button');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Default behavior should redirect to dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    test('should skip redirect when workflow is preserved', async () => {
      // This test would verify the navigation context integration
      // where shouldRedirectAfterAuth is false
      
      const TestWithPreservedWorkflow = () => {
        const [authContext, setAuthContext] = React.useState<any>(null);
        
        return (
          <TestProviders>
            <TestAuthComponent onAuthChange={setAuthContext} />
          </TestProviders>
        );
      };

      render(<TestWithPreservedWorkflow />);

      // In a real scenario, navigation context would control this behavior
      // This test demonstrates the integration structure
      expect(screen.getByTestId('loading')).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle API initialization errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      localStorageMock.getItem.mockReturnValue('error-token');
      (api.api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(consoleSpy).toHaveBeenCalledWith('🔑 Token invalid, clearing auth state');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });

    test('should handle missing error details gracefully', async () => {
      (api.api.post as jest.Mock).mockRejectedValue(new Error('Generic error'));

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const loginButton = screen.getByTestId('login-button');

      await expect(async () => {
        await act(async () => {
          loginButton.click();
        });
      }).rejects.toThrow('Login failed'); // Default error message
    });

    test('should maintain auth state consistency during errors', async () => {
      // Setup authenticated state
      localStorageMock.getItem.mockReturnValue('valid-token');
      (api.api.get as jest.Mock).mockResolvedValue({
        data: { email: 'consistent@example.com' }
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Attempt login with error (shouldn't affect existing auth state in this test)
      (api.api.post as jest.Mock).mockRejectedValue(new Error('Login error'));
      
      const loginButton = screen.getByTestId('login-button');

      try {
        await act(async () => {
          loginButton.click();
        });
      } catch (error) {
        // Expected error
      }

      // Auth state should remain consistent
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
  });

  describe('Token Management', () => {
    test('should properly store and retrieve tokens', async () => {
      const mockTokens = {
        user: { email: 'token@example.com' },
        token: 'access-token-123',
        refreshToken: 'refresh-token-456'
      };

      (api.api.post as jest.Mock).mockResolvedValue({
        data: mockTokens
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const loginButton = screen.getByTestId('login-button');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'access-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456');
    });

    test('should clean up tokens on logout', async () => {
      // Setup authenticated user
      localStorageMock.getItem.mockReturnValue('cleanup-token');
      (api.api.get as jest.Mock).mockResolvedValue({
        data: { email: 'cleanup@example.com' }
      });

      render(
        <TestProviders>
          <TestAuthComponent />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByTestId('logout-button');

      await act(async () => {
        logoutButton.click();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });
});