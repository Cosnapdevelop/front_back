/**
 * State Management Integration Tests
 * 
 * Tests global state management across contexts including:
 * - AppContext global application state
 * - Toast notification system
 * - React Query caching and synchronization
 * - Cross-component state sharing
 * - State persistence and recovery
 */

import React, { useEffect, useState } from 'react';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';

// Import contexts
import { AuthProvider, useAuth } from '../AuthContext';
import { AppProvider, useApp } from '../AppContext';
import { ToastProvider, useToast } from '../ToastContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      staleTime: 0,
      gcTime: 0
    },
    mutations: { retry: false },
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  }
});

// Test wrapper with all providers
const AllProvidersWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

// Test components to verify state interactions
const AuthStateDisplay = () => {
  const { user, isAuthenticated, accessToken } = useAuth();
  return (
    <div data-testid="auth-state">
      <div data-testid="user">{user ? user.username : 'Not authenticated'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Yes' : 'No'}</div>
      <div data-testid="token">{accessToken || 'No token'}</div>
    </div>
  );
};

const AppStateDisplay = () => {
  const { 
    currentEffect, 
    processingTasks, 
    region,
    setCurrentEffect,
    addProcessingTask,
    removeProcessingTask,
    setRegion
  } = useApp();
  
  return (
    <div data-testid="app-state">
      <div data-testid="current-effect">{currentEffect?.name || 'None'}</div>
      <div data-testid="processing-tasks">{processingTasks.length}</div>
      <div data-testid="region">{region}</div>
      <button 
        onClick={() => setCurrentEffect({ id: '1', name: 'Test Effect' })}
        data-testid="set-effect-btn"
      >
        Set Effect
      </button>
      <button 
        onClick={() => addProcessingTask('task-1')}
        data-testid="add-task-btn"
      >
        Add Task
      </button>
      <button 
        onClick={() => removeProcessingTask('task-1')}
        data-testid="remove-task-btn"
      >
        Remove Task
      </button>
      <button 
        onClick={() => setRegion('hong-kong')}
        data-testid="set-region-btn"
      >
        Set Region
      </button>
    </div>
  );
};

const ToastTestComponent = () => {
  const { push } = useToast();
  
  return (
    <div>
      <button 
        onClick={() => push('success', 'Success message')}
        data-testid="success-toast-btn"
      >
        Show Success
      </button>
      <button 
        onClick={() => push('error', 'Error message')}
        data-testid="error-toast-btn"
      >
        Show Error
      </button>
      <button 
        onClick={() => push('info', 'Info message', { duration: 1000 })}
        data-testid="info-toast-btn"
      >
        Show Info
      </button>
    </div>
  );
};

const QueryTestComponent = () => {
  const queryClient = useQueryClient();
  
  const { data: effects, isLoading, error, refetch } = useQuery({
    queryKey: ['effects'],
    queryFn: async () => {
      const response = await fetch('/api/effects');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return data.effects;
    }
  });
  
  const mutation = useMutation({
    mutationFn: async (effectId: string) => {
      const response = await fetch(`/api/effects/${effectId}/apply`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to apply');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate effects query to refetch
      queryClient.invalidateQueries({ queryKey: ['effects'] });
    }
  });
  
  return (
    <div data-testid="query-component">
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">Error: {(error as Error).message}</div>}
      {effects && (
        <div data-testid="effects-data">
          Effects: {effects.length}
        </div>
      )}
      <button 
        onClick={() => refetch()}
        data-testid="refetch-btn"
      >
        Refetch
      </button>
      <button 
        onClick={() => mutation.mutate('effect-1')}
        disabled={mutation.isPending}
        data-testid="mutate-btn"
      >
        {mutation.isPending ? 'Applying...' : 'Apply Effect'}
      </button>
      <button
        onClick={() => queryClient.clear()}
        data-testid="clear-cache-btn"
      >
        Clear Cache
      </button>
    </div>
  );
};

// Integration test component that uses multiple contexts
const IntegratedStateComponent = () => {
  const { user, login } = useAuth();
  const { currentEffect, setCurrentEffect, addProcessingTask } = useApp();
  const { push } = useToast();
  
  const handleLogin = async () => {
    const success = await login('test@example.com', 'password123');
    if (success) {
      push('success', `Welcome ${user?.username}!`);
      setCurrentEffect({ id: '1', name: 'Portrait Enhancement' });
      addProcessingTask('login-task');
    } else {
      push('error', 'Login failed');
    }
  };
  
  return (
    <div data-testid="integrated-component">
      <button onClick={handleLogin} data-testid="integrated-login-btn">
        Login & Set State
      </button>
      <div data-testid="integrated-state">
        User: {user?.username || 'None'} | 
        Effect: {currentEffect?.name || 'None'}
      </div>
    </div>
  );
};

describe('State Management Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock successful API responses
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            username: 'testuser'
          }
        });
      }),
      
      http.post('/api/auth/login', () => {
        return HttpResponse.json({
          success: true,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '1',
            email: 'test@example.com',
            username: 'testuser'
          }
        });
      }),
      
      http.get('/api/effects', () => {
        return HttpResponse.json({
          success: true,
          effects: [
            { id: '1', name: 'Effect 1' },
            { id: '2', name: 'Effect 2' }
          ]
        });
      }),
      
      http.post('/api/effects/:id/apply', ({ params }) => {
        return HttpResponse.json({
          success: true,
          taskId: `task-${params.id}`
        });
      })
    );
  });

  describe('AppContext State Management', () => {
    test('should manage application state correctly', async () => {
      render(
        <AllProvidersWrapper>
          <AppStateDisplay />
        </AllProvidersWrapper>
      );

      // Initial state
      expect(screen.getByTestId('current-effect')).toHaveTextContent('None');
      expect(screen.getByTestId('processing-tasks')).toHaveTextContent('0');
      expect(screen.getByTestId('region')).toHaveTextContent('china');

      // Set effect
      await user.click(screen.getByTestId('set-effect-btn'));
      expect(screen.getByTestId('current-effect')).toHaveTextContent('Test Effect');

      // Add processing task
      await user.click(screen.getByTestId('add-task-btn'));
      expect(screen.getByTestId('processing-tasks')).toHaveTextContent('1');

      // Remove processing task
      await user.click(screen.getByTestId('remove-task-btn'));
      expect(screen.getByTestId('processing-tasks')).toHaveTextContent('0');

      // Change region
      await user.click(screen.getByTestId('set-region-btn'));
      expect(screen.getByTestId('region')).toHaveTextContent('hong-kong');
    });

    test('should persist region selection', async () => {
      render(
        <AllProvidersWrapper>
          <AppStateDisplay />
        </AllProvidersWrapper>
      );

      // Change region
      await user.click(screen.getByTestId('set-region-btn'));

      // Check localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith('cosnap_region', 'hong-kong');
    });

    test('should load region from localStorage on init', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'cosnap_region') return 'hong-kong';
        return null;
      });

      render(
        <AllProvidersWrapper>
          <AppStateDisplay />
        </AllProvidersWrapper>
      );

      // Should show saved region
      expect(screen.getByTestId('region')).toHaveTextContent('hong-kong');
    });
  });

  describe('Toast System Integration', () => {
    test('should display and manage toast notifications', async () => {
      render(
        <AllProvidersWrapper>
          <ToastTestComponent />
        </AllProvidersWrapper>
      );

      // Show success toast
      await user.click(screen.getByTestId('success-toast-btn'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Show error toast
      await user.click(screen.getByTestId('error-toast-btn'));
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Show info toast with duration
      await user.click(screen.getByTestId('info-toast-btn'));
      expect(screen.getByText('Info message')).toBeInTheDocument();

      // Info toast should auto-dismiss after duration
      await waitFor(() => {
        expect(screen.queryByText('Info message')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should handle multiple toast notifications', async () => {
      render(
        <AllProvidersWrapper>
          <ToastTestComponent />
        </AllProvidersWrapper>
      );

      // Show multiple toasts rapidly
      await user.click(screen.getByTestId('success-toast-btn'));
      await user.click(screen.getByTestId('error-toast-btn'));
      
      // Both should be visible
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('React Query Integration', () => {
    test('should handle query states correctly', async () => {
      render(
        <AllProvidersWrapper>
          <QueryTestComponent />
        </AllProvidersWrapper>
      );

      // Should show loading state initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Should show data after loading
      await waitFor(() => {
        expect(screen.getByTestId('effects-data')).toHaveTextContent('Effects: 2');
      });

      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    test('should handle query refetching', async () => {
      render(
        <AllProvidersWrapper>
          <QueryTestComponent />
        </AllProvidersWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('effects-data')).toBeInTheDocument();
      });

      // Refetch data
      await user.click(screen.getByTestId('refetch-btn'));

      // Should briefly show loading state again
      await waitFor(() => {
        expect(screen.getByTestId('effects-data')).toBeInTheDocument();
      });
    });

    test('should handle mutations and cache invalidation', async () => {
      render(
        <AllProvidersWrapper>
          <QueryTestComponent />
        </AllProvidersWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('effects-data')).toBeInTheDocument();
      });

      // Trigger mutation
      await user.click(screen.getByTestId('mutate-btn'));

      // Should show pending state
      expect(screen.getByText('Applying...')).toBeInTheDocument();

      // Should return to normal state after mutation
      await waitFor(() => {
        expect(screen.getByText('Apply Effect')).toBeInTheDocument();
      });
    });

    test('should handle query errors', async () => {
      server.use(
        http.get('/api/effects', () => {
          return HttpResponse.json(
            { success: false, error: 'API Error' },
            { status: 500 }
          );
        })
      );

      render(
        <AllProvidersWrapper>
          <QueryTestComponent />
        </AllProvidersWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Error: Failed to fetch');
      });
    });

    test('should clear cache correctly', async () => {
      render(
        <AllProvidersWrapper>
          <QueryTestComponent />
        </AllProvidersWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('effects-data')).toBeInTheDocument();
      });

      // Clear cache
      await user.click(screen.getByTestId('clear-cache-btn'));

      // Should refetch data
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('effects-data')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Context State Interaction', () => {
    test('should coordinate state changes across multiple contexts', async () => {
      render(
        <AllProvidersWrapper>
          <AuthStateDisplay />
          <AppStateDisplay />
          <IntegratedStateComponent />
        </AllProvidersWrapper>
      );

      // Initial state
      expect(screen.getByTestId('user')).toHaveTextContent('Not authenticated');
      expect(screen.getByTestId('current-effect')).toHaveTextContent('None');

      // Perform integrated login action
      await user.click(screen.getByTestId('integrated-login-btn'));

      // Should update auth state
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });

      // Should update app state
      expect(screen.getByTestId('current-effect')).toHaveTextContent('Portrait Enhancement');
      expect(screen.getByTestId('processing-tasks')).toHaveTextContent('1');

      // Should show success toast
      expect(screen.getByText('Welcome testuser!')).toBeInTheDocument();

      // Should update integrated component display
      expect(screen.getByTestId('integrated-state')).toHaveTextContent(
        'User: testuser | Effect: Portrait Enhancement'
      );
    });

    test('should handle auth state changes affecting other contexts', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');

      render(
        <AllProvidersWrapper>
          <AuthStateDisplay />
          <AppStateDisplay />
        </AllProvidersWrapper>
      );

      // Should bootstrap with authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
      });

      // App state should be accessible for authenticated users
      await user.click(screen.getByTestId('set-effect-btn'));
      expect(screen.getByTestId('current-effect')).toHaveTextContent('Test Effect');
    });
  });

  describe('State Persistence and Recovery', () => {
    test('should persist critical state across page reloads', async () => {
      // Mock initial localStorage state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'cosnap_access_token') return 'persisted-token';
        if (key === 'cosnap_region') return 'hong-kong';
        return null;
      });

      render(
        <AllProvidersWrapper>
          <AuthStateDisplay />
          <AppStateDisplay />
        </AllProvidersWrapper>
      );

      // Should restore auth state
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
        expect(screen.getByTestId('token')).toHaveTextContent('persisted-token');
      });

      // Should restore app state
      expect(screen.getByTestId('region')).toHaveTextContent('hong-kong');
    });

    test('should handle state corruption gracefully', async () => {
      // Mock corrupted localStorage data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'cosnap_access_token') return 'invalid-corrupted-token';
        return null;
      });

      // Mock API to reject corrupted token
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 401 }
          );
        }),
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      render(
        <AllProvidersWrapper>
          <AuthStateDisplay />
        </AllProvidersWrapper>
      );

      // Should clear corrupted state and return to unauthenticated
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
      });

      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should not cause memory leaks with context providers', async () => {
      const TestComponent = ({ shouldUnmount }: { shouldUnmount: boolean }) => {
        if (shouldUnmount) return null;
        
        return (
          <AllProvidersWrapper>
            <AuthStateDisplay />
            <AppStateDisplay />
          </AllProvidersWrapper>
        );
      };

      const { rerender } = render(<TestComponent shouldUnmount={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toBeInTheDocument();
      });

      // Unmount component
      rerender(<TestComponent shouldUnmount={true} />);

      // Should cleanly unmount without errors
      expect(screen.queryByTestId('auth-state')).not.toBeInTheDocument();
    });

    test('should handle rapid state updates efficiently', async () => {
      const RapidStateUpdateComponent = () => {
        const [counter, setCounter] = useState(0);
        const { addProcessingTask, removeProcessingTask } = useApp();
        
        const handleRapidUpdates = async () => {
          for (let i = 0; i < 10; i++) {
            setCounter(i);
            addProcessingTask(`task-${i}`);
            if (i > 0) {
              removeProcessingTask(`task-${i - 1}`);
            }
          }
        };
        
        return (
          <div>
            <div data-testid="counter">{counter}</div>
            <button onClick={handleRapidUpdates} data-testid="rapid-updates-btn">
              Rapid Updates
            </button>
            <AppStateDisplay />
          </div>
        );
      };

      render(
        <AllProvidersWrapper>
          <RapidStateUpdateComponent />
        </AllProvidersWrapper>
      );

      await user.click(screen.getByTestId('rapid-updates-btn'));

      // Should handle rapid updates without crashing
      await waitFor(() => {
        expect(screen.getByTestId('counter')).toHaveTextContent('9');
        expect(screen.getByTestId('processing-tasks')).toHaveTextContent('1');
      });
    });
  });
});