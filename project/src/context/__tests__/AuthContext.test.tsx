/**
 * Tests for AuthContext
 * 
 * Tests authentication state management including:
 * - User login and registration
 * - Token refresh mechanism
 * - Authentication state persistence
 * - Error handling
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';

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

// Helper to render hook with AuthProvider
const renderAuthHook = () => {
  return renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  });
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('Initial state', () => {
    test('should initialize with unauthenticated state', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { result } = renderAuthHook();

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.bootstrapped).toBe(false);
    });

    test('should bootstrap with existing token', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token');
      
      const { result } = renderAuthHook();

      // Wait for bootstrap to complete
      await waitFor(() => {
        expect(result.current.bootstrapped).toBe(true);
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        avatar: null,
        bio: null
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('existing-token');
    });

    test('should handle invalid token during bootstrap', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce('invalid-token') // First call for access token
        .mockReturnValueOnce('refresh-token'); // Second call for refresh token

      // Mock /auth/me to fail with invalid token
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 401 }
          );
        })
      );

      const { result } = renderAuthHook();

      await waitFor(() => {
        expect(result.current.bootstrapped).toBe(true);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('Login functionality', () => {
    test('should login with valid credentials', async () => {
      const { result } = renderAuthHook();

      let loginSuccess: boolean = false;
      await act(async () => {
        loginSuccess = await result.current.login('test@example.com', 'password123');
      });

      expect(loginSuccess).toBe(true);
      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        username: 'testuser'
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cosnap_access_token',
        'mock-access-token'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cosnap_refresh_token',
        'mock-refresh-token'
      );
    });

    test('should handle login failure', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const { result } = renderAuthHook();

      let loginSuccess: boolean = true;
      await act(async () => {
        loginSuccess = await result.current.login('wrong@example.com', 'wrongpassword');
      });

      expect(loginSuccess).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    test('should handle network error during login', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderAuthHook();

      let loginSuccess: boolean = true;
      await act(async () => {
        loginSuccess = await result.current.login('test@example.com', 'password123');
      });

      expect(loginSuccess).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Registration functionality', () => {
    test('should register new user successfully', async () => {
      const { result } = renderAuthHook();

      let registerSuccess: boolean = false;
      await act(async () => {
        registerSuccess = await result.current.register(
          'newuser@example.com',
          'newuser',
          'password123'
        );
      });

      expect(registerSuccess).toBe(true);
      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        username: 'testuser'
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should handle registration failure', async () => {
      server.use(
        http.post('/api/auth/register', () => {
          return HttpResponse.json(
            { success: false, error: 'Email already exists' },
            { status: 409 }
          );
        })
      );

      const { result } = renderAuthHook();

      let registerSuccess: boolean = true;
      await act(async () => {
        registerSuccess = await result.current.register(
          'existing@example.com',
          'existing',
          'password123'
        );
      });

      expect(registerSuccess).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Token refresh functionality', () => {
    test('should refresh token successfully', async () => {
      localStorageMock.getItem.mockReturnValue('valid-refresh-token');
      
      const { result } = renderAuthHook();

      let refreshSuccess: boolean = false;
      await act(async () => {
        refreshSuccess = await result.current.refresh();
      });

      expect(refreshSuccess).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cosnap_access_token',
        'new-mock-access-token'
      );
    });

    test('should handle refresh failure', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-refresh-token');
      
      server.use(
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json(
            { success: false, error: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      const { result } = renderAuthHook();

      let refreshSuccess: boolean = true;
      await act(async () => {
        refreshSuccess = await result.current.refresh();
      });

      expect(refreshSuccess).toBe(false);
    });

    test('should handle missing refresh token', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { result } = renderAuthHook();

      let refreshSuccess: boolean = true;
      await act(async () => {
        refreshSuccess = await result.current.refresh();
      });

      expect(refreshSuccess).toBe(false);
    });
  });

  describe('Logout functionality', () => {
    test('should logout and clear tokens', async () => {
      // Set up authenticated state
      localStorageMock.getItem.mockReturnValue('access-token');
      
      const { result } = renderAuthHook();

      // Wait for bootstrap
      await waitFor(() => {
        expect(result.current.bootstrapped).toBe(true);
      });

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cosnap_access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cosnap_refresh_token');
    });
  });

  describe('Error handling', () => {
    test('should handle useAuth hook outside provider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');
    });
  });

  describe('Authentication state persistence', () => {
    test('should maintain authentication across re-renders', async () => {
      localStorageMock.getItem.mockReturnValue('persistent-token');
      
      const { result, rerender } = renderAuthHook();

      // Wait for initial bootstrap
      await waitFor(() => {
        expect(result.current.bootstrapped).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Re-render should maintain auth state
      rerender();
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeTruthy();
    });

    test('should clear authentication on token expiry', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token');
      
      // Mock expired token response
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

      const { result } = renderAuthHook();

      await waitFor(() => {
        expect(result.current.bootstrapped).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('Concurrent operations', () => {
    test('should handle concurrent login attempts', async () => {
      const { result } = renderAuthHook();

      // Start multiple login attempts simultaneously
      const loginPromises = [
        result.current.login('test@example.com', 'password123'),
        result.current.login('test@example.com', 'password123'),
        result.current.login('test@example.com', 'password123'),
      ];

      await act(async () => {
        const results = await Promise.all(loginPromises);
        // All should succeed
        results.forEach(success => expect(success).toBe(true));
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should handle refresh during ongoing requests', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');
      
      const { result } = renderAuthHook();

      // Start refresh and login simultaneously
      await act(async () => {
        const [refreshResult, loginResult] = await Promise.all([
          result.current.refresh(),
          result.current.login('test@example.com', 'password123')
        ]);
        
        expect(refreshResult).toBe(true);
        expect(loginResult).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});