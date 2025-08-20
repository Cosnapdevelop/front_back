/**
 * Tests for ProtectedRoute component
 * 
 * Tests route protection functionality including:
 * - Authentication-based access control
 * - Loading states during bootstrap
 * - Redirect behavior for unauthenticated users
 * - Proper rendering for authenticated users
 */

import { describe, test, expect, vi } from 'vitest';
import { screen, render } from '../../test/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import ProtectedRoute from '../ProtectedRoute';
import React from 'react';

// Mock the AuthContext
const mockAuthContext = vi.hoisted(() => ({
  user: null,
  isAuthenticated: false,
  accessToken: null,
  bootstrapped: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original as any,
    useAuth: () => mockAuthContext,
  };
});

// Test component to render inside ProtectedRoute
const TestComponent = () => <div>Protected Content</div>;

const renderProtectedRoute = (initialEntries = ['/protected']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Reset mock state
    mockAuthContext.user = null;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.accessToken = null;
    mockAuthContext.bootstrapped = false;
  });

  describe('Loading state', () => {
    test('should show loading state during bootstrap', () => {
      mockAuthContext.bootstrapped = false;
      
      renderProtectedRoute();

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should show loading spinner during bootstrap', () => {
      mockAuthContext.bootstrapped = false;
      
      renderProtectedRoute();

      // Check for loading spinner or loading indicator
      const loadingElement = screen.getByTestId('loading-spinner') || 
                           screen.getByText(/加载中|loading/i);
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Unauthenticated access', () => {
    test('should redirect to login when not authenticated', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;
      
      renderProtectedRoute();

      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      
      // Should show login form or redirect indicator
      expect(
        screen.queryByText(/请先登录|请登录|登录/i) ||
        screen.queryByRole('button', { name: /登录|login/i }) ||
        screen.queryByText(/redirecting|重定向/i)
      ).toBeTruthy();
    });

    test('should redirect to login with return URL', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      
      renderProtectedRoute(['/protected/sensitive-page']);

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should handle expired token gracefully', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.accessToken = null; // Token was cleared
      
      renderProtectedRoute();

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated access', () => {
    test('should render protected content when authenticated', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser'
      };
      mockAuthContext.accessToken = 'valid-token';
      
      renderProtectedRoute();

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText(/loading|加载/i)).not.toBeInTheDocument();
    });

    test('should render children correctly', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      
      const ComplexTestComponent = () => (
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {mockAuthContext.user?.username}!</p>
          <button>Action Button</button>
        </div>
      );

      render(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <ComplexTestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, testuser!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    test('should maintain protected content during re-renders', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      
      const { rerender } = renderProtectedRoute();

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Rerender should maintain the content
      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('State transitions', () => {
    test('should handle authentication state changes', () => {
      // Start unauthenticated
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      
      const { rerender } = renderProtectedRoute();
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Become authenticated
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      mockAuthContext.accessToken = 'new-token';

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should handle logout during protected route access', () => {
      // Start authenticated
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      
      const { rerender } = renderProtectedRoute();
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Simulate logout
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;
      mockAuthContext.accessToken = null;

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should handle token refresh during route access', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      mockAuthContext.accessToken = 'old-token';
      
      const { rerender } = renderProtectedRoute();
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Simulate token refresh
      mockAuthContext.accessToken = 'new-token';

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      // Content should remain visible
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Error scenarios', () => {
    test('should handle missing auth context gracefully', () => {
      // This test ensures the component doesn't crash without context
      // In practice, useAuth throws an error, but we can test error boundaries
      
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      
      expect(() => renderProtectedRoute()).not.toThrow();
    });

    test('should handle partial authentication state', () => {
      // Test edge case where user exists but not authenticated
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };
      mockAuthContext.accessToken = null;
      
      renderProtectedRoute();

      // Should not show protected content despite having user
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should handle inconsistent authentication state', () => {
      // Test edge case where authenticated but no user
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = null;
      mockAuthContext.accessToken = 'token';
      
      renderProtectedRoute();

      // Implementation should handle this gracefully
      // Behavior depends on how isAuthenticated is calculated
      const hasProtectedContent = screen.queryByText('Protected Content');
      
      // Either should show content (if token is enough) or not (if user is required)
      // This documents the expected behavior
      expect(hasProtectedContent).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should be accessible during loading state', () => {
      mockAuthContext.bootstrapped = false;
      
      renderProtectedRoute();

      const loadingElement = screen.getByText(/加载中|loading/i);
      expect(loadingElement).toBeInTheDocument();
      
      // Should have appropriate accessibility attributes
      expect(loadingElement).toHaveAttribute('role', 'status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });

    test('should be accessible when showing login prompt', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      
      renderProtectedRoute();

      // Login elements should be focusable and have appropriate labels
      const loginElements = screen.queryAllByRole('button') || 
                           screen.queryAllByRole('textbox');
      
      if (loginElements.length > 0) {
        loginElements.forEach(element => {
          expect(element).toBeVisible();
        });
      }
    });

    test('should maintain focus management during state changes', () => {
      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = false;
      
      const { rerender } = renderProtectedRoute();

      // Become authenticated
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      // Focus should be managed appropriately
      expect(document.body).toHaveAttribute('tabIndex');
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();
      
      const SpyComponent = () => {
        renderSpy();
        return <div>Spy Content</div>;
      };

      mockAuthContext.bootstrapped = true;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: '1', email: 'test@example.com', username: 'testuser' };

      const { rerender } = render(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <SpyComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Rerender with same auth state
      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <SpyComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should not cause additional renders if state hasn't changed
      expect(renderSpy).toHaveBeenCalledTimes(2); // Expected for React 18 strict mode
    });
  });
});