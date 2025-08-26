/**
 * Navigation Context Provider Tests
 * 
 * Tests the new navigation state management system that preserves
 * user workflow context during OAuth2 flows and prevents unwanted
 * dashboard redirects.
 * 
 * Test Coverage:
 * - Navigation context state management
 * - Workflow preservation during OAuth2 flows
 * - Return path handling and validation
 * - Default redirect behavior
 * - Context cleanup and state management
 * - Hook functionality and integration
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { NavigationProvider, useNavigation, useWorkflowNavigation } from '../../lib/navigation/context';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: '/test-path',
    query: {},
    asPath: '/test-path'
  })
}));

// Test component for context integration
const TestComponent = ({ onNavigationChange }: { onNavigationChange?: (nav: any) => void }) => {
  const navigation = useNavigation();
  
  React.useEffect(() => {
    if (onNavigationChange) {
      onNavigationChange(navigation);
    }
  }, [navigation, onNavigationChange]);

  return (
    <div>
      <span data-testid="return-path">{navigation.returnPath || 'none'}</span>
      <span data-testid="should-redirect">{navigation.shouldRedirectAfterAuth ? 'true' : 'false'}</span>
      <button 
        data-testid="set-return-path" 
        onClick={() => navigation.setReturnPath('/campaigns')}
      >
        Set Return Path
      </button>
      <button 
        data-testid="clear-state" 
        onClick={() => navigation.clearNavigationState()}
      >
        Clear State
      </button>
      <button 
        data-testid="disable-redirect" 
        onClick={() => navigation.setShouldRedirectAfterAuth(false)}
      >
        Disable Redirect
      </button>
    </div>
  );
};

const TestWorkflowComponent = ({ onWorkflowChange }: { onWorkflowChange?: (workflow: any) => void }) => {
  const workflow = useWorkflowNavigation();
  
  React.useEffect(() => {
    if (onWorkflowChange) {
      onWorkflowChange(workflow);
    }
  }, [workflow, onWorkflowChange]);

  return (
    <div>
      <button 
        data-testid="preserve-current" 
        onClick={() => workflow.preserveCurrentPath()}
      >
        Preserve Current
      </button>
      <button 
        data-testid="preserve-workflow" 
        onClick={() => workflow.preserveWorkflow('/campaigns/new')}
      >
        Preserve Workflow
      </button>
      <button 
        data-testid="enable-default" 
        onClick={() => workflow.enableDefaultAuth()}
      >
        Enable Default
      </button>
    </div>
  );
};

describe('NavigationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Context Provider Setup', () => {
    test('should provide navigation context to children', () => {
      let navigationContext: any = null;

      render(
        <NavigationProvider>
          <TestComponent onNavigationChange={(nav) => navigationContext = nav} />
        </NavigationProvider>
      );

      expect(navigationContext).not.toBeNull();
      expect(navigationContext.returnPath).toBeNull();
      expect(navigationContext.shouldRedirectAfterAuth).toBe(true);
      expect(typeof navigationContext.setReturnPath).toBe('function');
      expect(typeof navigationContext.clearNavigationState).toBe('function');
    });

    test('should throw error when used outside provider', () => {
      const { result } = renderHook(() => useNavigation());
      
      expect(result.error).toEqual(
        Error('useNavigation must be used within a NavigationProvider')
      );
    });

    test('should initialize with default state', () => {
      render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      expect(screen.getByTestId('return-path')).toHaveTextContent('none');
      expect(screen.getByTestId('should-redirect')).toHaveTextContent('true');
    });
  });

  describe('Return Path Management', () => {
    test('should set and retrieve return path', async () => {
      render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      const setButton = screen.getByTestId('set-return-path');
      
      await act(async () => {
        setButton.click();
      });

      expect(screen.getByTestId('return-path')).toHaveTextContent('/campaigns');
    });

    test('should handle null return path', async () => {
      let navigationContext: any = null;

      render(
        <NavigationProvider>
          <TestComponent onNavigationChange={(nav) => navigationContext = nav} />
        </NavigationProvider>
      );

      await act(async () => {
        navigationContext.setReturnPath(null);
      });

      expect(screen.getByTestId('return-path')).toHaveTextContent('none');
    });

    test('should persist return path across re-renders', async () => {
      const { rerender } = render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      const setButton = screen.getByTestId('set-return-path');
      
      await act(async () => {
        setButton.click();
      });

      expect(screen.getByTestId('return-path')).toHaveTextContent('/campaigns');

      rerender(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      expect(screen.getByTestId('return-path')).toHaveTextContent('/campaigns');
    });
  });

  describe('Redirect Behavior Control', () => {
    test('should control redirect behavior', async () => {
      render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      const disableButton = screen.getByTestId('disable-redirect');
      
      await act(async () => {
        disableButton.click();
      });

      expect(screen.getByTestId('should-redirect')).toHaveTextContent('false');
    });

    test('should reset redirect behavior when clearing state', async () => {
      render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      const disableButton = screen.getByTestId('disable-redirect');
      const clearButton = screen.getByTestId('clear-state');
      
      await act(async () => {
        disableButton.click();
      });

      expect(screen.getByTestId('should-redirect')).toHaveTextContent('false');

      await act(async () => {
        clearButton.click();
      });

      expect(screen.getByTestId('should-redirect')).toHaveTextContent('true');
    });
  });

  describe('State Management', () => {
    test('should clear all navigation state', async () => {
      render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      const setButton = screen.getByTestId('set-return-path');
      const disableButton = screen.getByTestId('disable-redirect');
      const clearButton = screen.getByTestId('clear-state');
      
      // Set some state
      await act(async () => {
        setButton.click();
        disableButton.click();
      });

      expect(screen.getByTestId('return-path')).toHaveTextContent('/campaigns');
      expect(screen.getByTestId('should-redirect')).toHaveTextContent('false');

      // Clear state
      await act(async () => {
        clearButton.click();
      });

      expect(screen.getByTestId('return-path')).toHaveTextContent('none');
      expect(screen.getByTestId('should-redirect')).toHaveTextContent('true');
    });

    test('should log navigation state changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      render(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      const setButton = screen.getByTestId('set-return-path');
      
      await act(async () => {
        setButton.click();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '🧭 Navigation: Setting return path to:', '/campaigns'
      );
    });
  });

  describe('Default Redirect Logic', () => {
    test('should return stored path when available', () => {
      let navigationContext: any = null;

      render(
        <NavigationProvider>
          <TestComponent onNavigationChange={(nav) => navigationContext = nav} />
        </NavigationProvider>
      );

      act(() => {
        navigationContext.setReturnPath('/campaigns/new');
      });

      const defaultRedirect = navigationContext.getDefaultRedirect();
      expect(defaultRedirect).toBe('/campaigns/new');
    });

    test('should return dashboard when no return path is set', () => {
      let navigationContext: any = null;

      render(
        <NavigationProvider>
          <TestComponent onNavigationChange={(nav) => navigationContext = nav} />
        </NavigationProvider>
      );

      const defaultRedirect = navigationContext.getDefaultRedirect();
      expect(defaultRedirect).toBe('/dashboard');
    });

    test('should log default redirect behavior', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      let navigationContext: any = null;

      render(
        <NavigationProvider>
          <TestComponent onNavigationChange={(nav) => navigationContext = nav} />
        </NavigationProvider>
      );

      navigationContext.getDefaultRedirect();

      expect(consoleSpy).toHaveBeenCalledWith(
        '🧭 Navigation: Using default dashboard redirect'
      );
    });
  });
});

describe('useWorkflowNavigation Hook', () => {
  // Mock window.location for workflow tests
  const mockLocation = {
    pathname: '/campaigns/new',
    search: '',
    hash: '',
    href: 'http://localhost:3000/campaigns/new'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock window object
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Workflow Preservation', () => {
    test('should preserve current path', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      const preserveButton = screen.getByTestId('preserve-current');
      
      await act(async () => {
        preserveButton.click();
      });

      expect(workflowContext.returnPath).toBe('/campaigns/new');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);
    });

    test('should preserve specific workflow path', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      const preserveWorkflowButton = screen.getByTestId('preserve-workflow');
      
      await act(async () => {
        preserveWorkflowButton.click();
      });

      expect(workflowContext.returnPath).toBe('/campaigns/new');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);
    });

    test('should enable default auth behavior', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      const enableDefaultButton = screen.getByTestId('enable-default');
      
      // First disable it
      await act(async () => {
        workflowContext.setShouldRedirectAfterAuth(false);
        workflowContext.setReturnPath('/some/path');
      });

      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);
      expect(workflowContext.returnPath).toBe('/some/path');

      // Then enable default
      await act(async () => {
        enableDefaultButton.click();
      });

      expect(workflowContext.shouldRedirectAfterAuth).toBe(true);
      expect(workflowContext.returnPath).toBeNull();
    });

    test('should log workflow preservation', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      render(
        <NavigationProvider>
          <TestWorkflowComponent />
        </NavigationProvider>
      );

      const preserveButton = screen.getByTestId('preserve-current');
      
      await act(async () => {
        preserveButton.click();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '🧭 Workflow: Preserving current path for later return:', '/campaigns/new'
      );
    });

    test('should handle undefined window safely', async () => {
      // Temporarily remove window
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      // Should not crash when window is undefined
      await act(async () => {
        workflowContext.preserveCurrentPath();
      });

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Integration with Base Navigation', () => {
    test('should include all base navigation functionality', () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      // Should have all base navigation methods
      expect(typeof workflowContext.setReturnPath).toBe('function');
      expect(typeof workflowContext.clearNavigationState).toBe('function');
      expect(typeof workflowContext.getDefaultRedirect).toBe('function');
      expect(workflowContext.returnPath).toBeDefined();
      expect(workflowContext.shouldRedirectAfterAuth).toBeDefined();

      // Should have workflow-specific methods
      expect(typeof workflowContext.preserveCurrentPath).toBe('function');
      expect(typeof workflowContext.preserveWorkflow).toBe('function');
      expect(typeof workflowContext.enableDefaultAuth).toBe('function');
    });

    test('should maintain state consistency with base navigation', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      // Use workflow method to set state
      await act(async () => {
        workflowContext.preserveWorkflow('/test/workflow');
      });

      expect(workflowContext.returnPath).toBe('/test/workflow');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);

      // Use base method to clear state
      await act(async () => {
        workflowContext.clearNavigationState();
      });

      expect(workflowContext.returnPath).toBeNull();
      expect(workflowContext.shouldRedirectAfterAuth).toBe(true);
    });
  });

  describe('OAuth2 Flow Integration Scenarios', () => {
    test('should handle campaign creation OAuth2 flow', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      // Simulate user in campaign creation flow
      await act(async () => {
        workflowContext.preserveWorkflow('/campaigns/new');
      });

      // Simulate OAuth2 completion - should return to campaign flow
      const expectedRedirect = workflowContext.getDefaultRedirect();
      expect(expectedRedirect).toBe('/campaigns/new');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);
    });

    test('should handle direct account addition flow', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      // Simulate user in direct account addition (no workflow preservation)
      await act(async () => {
        workflowContext.enableDefaultAuth();
      });

      // Simulate OAuth2 completion - should go to default redirect
      const expectedRedirect = workflowContext.getDefaultRedirect();
      expect(expectedRedirect).toBe('/dashboard');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(true);
    });

    test('should handle complex workflow transitions', async () => {
      let workflowContext: any = null;

      render(
        <NavigationProvider>
          <TestWorkflowComponent onWorkflowChange={(workflow) => workflowContext = workflow} />
        </NavigationProvider>
      );

      // Start with campaign workflow
      await act(async () => {
        workflowContext.preserveWorkflow('/campaigns');
      });

      expect(workflowContext.returnPath).toBe('/campaigns');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);

      // Transition to different workflow
      await act(async () => {
        workflowContext.preserveWorkflow('/leads/import');
      });

      expect(workflowContext.returnPath).toBe('/leads/import');
      expect(workflowContext.shouldRedirectAfterAuth).toBe(false);

      // Complete workflow - return to preserved path
      const redirectPath = workflowContext.getDefaultRedirect();
      expect(redirectPath).toBe('/leads/import');
    });
  });
});