import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { 
  ForgotPasswordRequest, 
  ForgotPasswordResponse, 
  ResetPasswordTokenResponse, 
  ResetPasswordRequest, 
  ResetPasswordResponse 
} from '../types';

interface UseForgotPasswordReturn {
  loading: boolean;
  error: string | null;
  success: boolean;
  sendResetEmail: (email: string) => Promise<boolean>;
  verifyResetToken: (token: string) => Promise<{ valid: boolean; email?: string }>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<boolean>;
  clearState: () => void;
}

export function useForgotPassword(): UseForgotPasswordReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearState = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  const sendResetEmail = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const requestBody: ForgotPasswordRequest = { email: email.trim() };
      
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: ForgotPasswordResponse = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        return true;
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          setError('No account found with this email address.');
        } else if (response.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError(data.message || 'Failed to send reset email. Please try again.');
        }
        return false;
      }
    } catch (err) {
      console.error('Send reset email error:', err);
      setError('Network error. Please check your connection and try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyResetToken = useCallback(async (token: string): Promise<{ valid: boolean; email?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password/${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ResetPasswordTokenResponse = await response.json();

      if (response.ok && data.success && data.valid) {
        return { valid: true, email: data.email };
      } else {
        // Handle specific error cases
        if (response.status === 404 || !data.valid) {
          setError('Invalid or expired reset link.');
        } else {
          setError(data.message || 'Unable to verify reset link.');
        }
        return { valid: false };
      }
    } catch (err) {
      console.error('Verify reset token error:', err);
      setError('Network error. Please check your connection and try again.');
      return { valid: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (
    token: string, 
    password: string, 
    confirmPassword: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return false;
    }

    // Basic password strength validation
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLetter || !hasNumber) {
      setError('Password must contain at least one letter and one number.');
      setLoading(false);
      return false;
    }

    try {
      const requestBody: ResetPasswordRequest = {
        token,
        password,
        confirmPassword,
      };

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: ResetPasswordResponse = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        return true;
      } else {
        // Handle specific error cases
        if (response.status === 400) {
          setError('Invalid request. Please try again.');
        } else if (response.status === 404) {
          setError('Invalid or expired reset link.');
        } else if (response.status === 422) {
          setError('Password does not meet security requirements.');
        } else {
          setError(data.message || 'Failed to reset password. Please try again.');
        }
        return false;
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Network error. Please check your connection and try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    success,
    sendResetEmail,
    verifyResetToken,
    resetPassword,
    clearState,
  };
}