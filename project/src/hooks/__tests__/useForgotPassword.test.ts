import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useForgotPassword } from '../useForgotPassword';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock API config
vi.mock('../../config/api', () => ({
  API_BASE_URL: 'http://localhost:3001/api'
}));

describe('useForgotPassword Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
      expect(typeof result.current.sendResetEmail).toBe('function');
      expect(typeof result.current.verifyResetToken).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
      expect(typeof result.current.clearState).toBe('function');
    });
  });

  describe('clearState', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useForgotPassword());

      // First set some state
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Server error' })
      });

      await act(async () => {
        await result.current.sendResetEmail('test@example.com');
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.loading).toBe(false);

      // Now clear state
      act(() => {
        result.current.clearState();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
    });
  });

  describe('sendResetEmail', () => {
    it('should send reset email successfully', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Email sent' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/forgot-password',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should trim email before sending', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await act(async () => {
        await result.current.sendResetEmail('  test@example.com  ');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/forgot-password',
        expect.objectContaining({
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should handle 404 error (user not found)', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, message: 'User not found' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('No account found with this email address.');
      expect(result.current.success).toBe(false);
    });

    it('should handle 429 rate limit error', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ success: false, message: 'Rate limited' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Too many requests. Please try again later.');
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
      expect(result.current.loading).toBe(false);
    });

    it('should handle generic API errors', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Internal server error' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Internal server error');
    });

    it('should set loading state during request', async () => {
      const { result } = renderHook(() => useForgotPassword());

      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      // Start the request
      const requestPromise = act(async () => {
        await result.current.sendResetEmail('test@example.com');
      });

      // Check loading state is true
      expect(result.current.loading).toBe(true);

      // Resolve the request
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true })
      });

      await requestPromise;

      // Check loading state is false
      expect(result.current.loading).toBe(false);
    });
  });

  describe('verifyResetToken', () => {
    const mockToken = 'valid-token';

    it('should verify valid token successfully', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          valid: true, 
          email: 'test@example.com' 
        })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.verifyResetToken(mockToken);
      });

      expect(returnValue).toEqual({ valid: true, email: 'test@example.com' });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/auth/reset-password/${encodeURIComponent(mockToken)}`,
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle invalid token', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ 
          success: false, 
          valid: false, 
          message: 'Token not found' 
        })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.verifyResetToken(mockToken);
      });

      expect(returnValue).toEqual({ valid: false });
      expect(result.current.error).toBe('Invalid or expired reset link.');
    });

    it('should handle network errors during verification', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.verifyResetToken(mockToken);
      });

      expect(returnValue).toEqual({ valid: false });
      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
    });

    it('should properly encode token in URL', async () => {
      const { result } = renderHook(() => useForgotPassword());
      const specialToken = 'token/with+special=chars';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, valid: true })
      });

      await act(async () => {
        await result.current.verifyResetToken(specialToken);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/auth/reset-password/${encodeURIComponent(specialToken)}`,
        expect.any(Object)
      );
    });
  });

  describe('resetPassword', () => {
    const mockToken = 'valid-token';
    const validPassword = 'ValidPassword123!';
    const confirmPassword = 'ValidPassword123!';

    it('should reset password successfully', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Password reset successfully' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, validPassword, confirmPassword);
      });

      expect(returnValue).toBe(true);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBe(null);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: mockToken,
            password: validPassword,
            confirmPassword: confirmPassword
          })
        })
      );
    });

    it('should validate password confirmation match', async () => {
      const { result } = renderHook(() => useForgotPassword());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, validPassword, 'DifferentPassword');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Passwords do not match.');
      expect(result.current.loading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate minimum password length', async () => {
      const { result } = renderHook(() => useForgotPassword());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, 'short', 'short');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Password must be at least 8 characters long.');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate password contains letters and numbers', async () => {
      const { result } = renderHook(() => useForgotPassword());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, 'onlyletters', 'onlyletters');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Password must contain at least one letter and one number.');

      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, '12345678', '12345678');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Password must contain at least one letter and one number.');
    });

    it('should handle 400 bad request error', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, message: 'Invalid request' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, validPassword, confirmPassword);
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Invalid request. Please try again.');
    });

    it('should handle 404 token not found error', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, message: 'Token not found' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, validPassword, confirmPassword);
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Invalid or expired reset link.');
    });

    it('should handle 422 validation error', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ success: false, message: 'Validation failed' })
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, validPassword, confirmPassword);
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Password does not meet security requirements.');
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.resetPassword(mockToken, validPassword, confirmPassword);
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
    });
  });

  describe('State Management', () => {
    it('should properly manage loading states across different methods', async () => {
      const { result } = renderHook(() => useForgotPassword());

      // Mock delayed response
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      // Start request
      const requestPromise = act(async () => {
        await result.current.sendResetEmail('test@example.com');
      });

      expect(result.current.loading).toBe(true);

      // Resolve request
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true })
      });

      await requestPromise;

      expect(result.current.loading).toBe(false);
    });

    it('should reset success state when starting new operations', async () => {
      const { result } = renderHook(() => useForgotPassword());

      // First successful operation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await act(async () => {
        await result.current.sendResetEmail('test@example.com');
      });

      expect(result.current.success).toBe(true);

      // Second operation should reset success state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, valid: true })
      });

      await act(async () => {
        await result.current.verifyResetToken('token');
      });

      // Success should still be false for verification (it doesn't set success)
      expect(result.current.success).toBe(false);
    });

    it('should clear error state when starting new operations', async () => {
      const { result } = renderHook(() => useForgotPassword());

      // First operation with error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Server error' })
      });

      await act(async () => {
        await result.current.sendResetEmail('test@example.com');
      });

      expect(result.current.error).toBe('Server error');

      // Second operation should clear error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, valid: true })
      });

      await act(async () => {
        await result.current.verifyResetToken('token');
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}) // Empty response
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Failed to send reset email. Please try again.');
    });

    it('should handle malformed JSON response', async () => {
      const { result } = renderHook(() => useForgotPassword());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      let returnValue;
      await act(async () => {
        returnValue = await result.current.sendResetEmail('test@example.com');
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
    });
  });
});