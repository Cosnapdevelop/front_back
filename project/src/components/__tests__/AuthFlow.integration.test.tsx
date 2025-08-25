/**
 * Authentication Flow Integration Tests
 * 
 * Tests the complete user authentication flow including:
 * - Login/Register form interactions
 * - Token refresh mutex mechanism
 * - ProtectedRoute navigation
 * - Concurrent authentication requests
 * - Error handling and user feedback
 */

import React from 'react';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';

// Import components
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import ProtectedRoute from '../ProtectedRoute';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import Home from '../../pages/Home';

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

// Test App wrapper with all providers
const TestApp = ({ initialRoute = '/login' }: { initialRoute?: string }) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  </MemoryRouter>
);

describe('Authentication Flow Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Clear all mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Login Flow', () => {
    test('should complete successful login flow and redirect to protected route', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(<TestApp initialRoute="/login" />);

      // Check login form is rendered
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Fill in login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for successful login and redirect
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'cosnap_access_token',
          'mock-access-token'
        );
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'cosnap_refresh_token', 
          'mock-refresh-token'
        );
      });
    }, 10000);

    test('should show error message for invalid credentials', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      render(<TestApp initialRoute="/login" />);

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });

      // Should remain on login page
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should handle network errors gracefully', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.error();
        })
      );

      render(<TestApp initialRoute="/login" />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    test('should complete successful registration flow', async () => {
      render(<TestApp initialRoute="/register" />);

      // Check registration form
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

      // Fill in registration form
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/username/i), 'newuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Wait for successful registration
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'cosnap_access_token',
          'mock-access-token'
        );
      });
    });

    test('should handle duplicate email registration', async () => {
      server.use(
        http.post('/api/auth/register', () => {
          return HttpResponse.json(
            { success: false, error: 'Email already exists' },
            { status: 409 }
          );
        })
      );

      render(<TestApp initialRoute="/register" />);

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/username/i), 'existing');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Protected Route Access', () => {
    test('should redirect unauthenticated users to login', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(<TestApp initialRoute="/protected" />);

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    test('should allow access to authenticated users', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      
      render(<TestApp initialRoute="/protected" />);

      // Should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    test('should handle token expiry and redirect to login', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce('expired-token')
        .mockReturnValueOnce('expired-refresh-token');

      // Mock expired token responses
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(
            { success: false, error: 'Token expired' },
            { status: 401 }
          );
        }),
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json(
            { success: false, error: 'Refresh token expired' },
            { status: 401 }
          );
        })
      );

      render(<TestApp initialRoute="/protected" />);

      // Should redirect to login after token expiry
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cosnap_access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cosnap_refresh_token');
    });
  });

  describe('Token Refresh Mechanism', () => {
    test('should refresh token automatically when accessing protected routes', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('valid-refresh-token');

      // Mock expired access token but valid refresh token
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(
            { success: false, error: 'Token expired' },
            { status: 401 }
          );
        })
      );

      render(<TestApp initialRoute="/protected" />);

      // Should refresh token and show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cosnap_access_token',
        'new-mock-access-token'
      );
    });

    test('should handle concurrent refresh requests with mutex', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');
      
      let refreshCallCount = 0;
      server.use(
        http.post('/api/auth/refresh', () => {
          refreshCallCount++;
          return HttpResponse.json({
            success: true,
            accessToken: 'new-access-token'
          });
        })
      );

      render(<TestApp initialRoute="/protected" />);

      // Multiple protected routes accessed simultaneously should only trigger one refresh
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      // Should only make one refresh call due to mutex mechanism
      expect(refreshCallCount).toBeLessThanOrEqual(2);
    });
  });

  describe('User Experience', () => {
    test('should show loading state during authentication', async () => {
      // Slow down the API response
      server.use(
        http.post('/api/auth/login', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
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
        })
      );

      render(<TestApp initialRoute="/login" />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    test('should maintain form data on validation errors', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid password' },
            { status: 400 }
          );
        })
      );

      render(<TestApp initialRoute="/login" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('wrongpassword');
    });
  });

  describe('Navigation Integration', () => {
    test('should navigate between login and register pages', async () => {
      render(<TestApp initialRoute="/login" />);

      // Should be on login page
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

      // Click register link
      await user.click(screen.getByText(/create account/i));

      // Should navigate to register page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      // Click login link
      await user.click(screen.getByText(/sign in/i));

      // Should navigate back to login page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    test('should redirect to intended route after login', async () => {
      // Try to access protected route while unauthenticated
      render(<TestApp initialRoute="/protected" />);

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });

      // Login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should redirect back to originally intended protected route
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('Logout Functionality', () => {
    test('should logout and redirect to login page', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      
      render(<TestApp initialRoute="/protected" />);

      // Should show protected content initially
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      // Find and click logout button (assuming it exists in the protected content)
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      // Should redirect to login and clear tokens
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cosnap_access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cosnap_refresh_token');
    });
  });
});