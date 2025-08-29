import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    p: React.forwardRef<HTMLParagraphElement, any>(({ children, ...props }, ref) => (
      <p ref={ref} {...props}>{children}</p>
    )),
  },
}));

// Mock API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock API config
vi.mock('../../config/api', () => ({
  API_BASE_URL: 'http://localhost:3001/api'
}));

// Mock SEO hook
vi.mock('../../hooks/useSEO', () => ({
  useSEO: vi.fn(),
}));

// Import components
import ForgotPassword from '../../pages/ForgotPassword';
import EmailSent from '../../pages/EmailSent';
import ResetPassword from '../../pages/ResetPassword';
import ResetSuccess from '../../pages/ResetSuccess';

// Test app wrapper with routing
const TestApp = ({ initialEntries = ['/forgot-password'] }) => (
  <BrowserRouter>
    <Routes>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forgot-password/email-sent" element={<EmailSent />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-password/success" element={<ResetSuccess />} />
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/" element={<div>Home Page</div>} />
    </Routes>
  </BrowserRouter>
);

describe('Forgot Password Flow Integration Tests', () => {
  const user = userEvent.setup();
  const testEmail = 'test@example.com';
  const validToken = 'valid-reset-token';
  const newPassword = 'NewSecurePassword123!';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location for navigation tests
    Object.defineProperty(window, 'location', {
      value: { href: '', assign: vi.fn(), replace: vi.fn() },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Success Flow', () => {
    it('should complete the full forgot password flow', async () => {
      // Step 1: Start on forgot password page
      render(<TestApp initialEntries={['/forgot-password']} />);

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();

      // Step 2: Submit forgot password form
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Reset email sent' })
      });

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, testEmail);
      await user.click(submitButton);

      // Should navigate to email sent page
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Step 3: Verify email sent page content
      expect(screen.getByText(testEmail)).toBeInTheDocument();
      expect(screen.getByText(/we've sent a password reset link/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled(); // Should be on cooldown

      // Step 4: Simulate clicking reset link (navigate to reset password page)
      // Mock token verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          valid: true, 
          email: testEmail 
        })
      });

      // Render reset password page with token
      render(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      // Wait for token verification
      await waitFor(() => {
        expect(screen.getByText('Create New Password')).toBeInTheDocument();
      });

      // Step 5: Submit new password
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          message: 'Password reset successfully' 
        })
      });

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const resetButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, newPassword);
      await user.type(confirmPasswordInput, newPassword);
      await user.click(resetButton);

      // Should navigate to success page
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully!')).toBeInTheDocument();
      });

      // Step 6: Verify success page
      expect(screen.getByText(testEmail)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in now/i })).toBeInTheDocument();
    });

    it('should maintain email state across navigation', async () => {
      // Start forgot password flow
      render(<TestApp initialEntries={['/forgot-password']} />);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, testEmail);
      await user.click(submitButton);

      // Navigate to email sent page (with email in state)
      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Email should be displayed on email sent page
      expect(screen.getByText(testEmail)).toBeInTheDocument();

      // Navigate to reset password page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          valid: true, 
          email: testEmail 
        })
      });

      render(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      // Email should be displayed on reset password page after token verification
      await waitFor(() => {
        expect(screen.getByText(testEmail)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle API errors gracefully throughout the flow', async () => {
      // Step 1: API error during forgot password request
      render(<TestApp initialEntries={['/forgot-password']} />);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ 
          success: false, 
          message: 'Too many requests' 
        })
      });

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, testEmail);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Too many requests. Please try again later.')).toBeInTheDocument();
      });

      // Step 2: Network error during token verification
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      });

      // Should show option to request new reset link
      expect(screen.getByText('Request New Reset Link')).toBeInTheDocument();
    });

    it('should handle validation errors consistently', async () => {
      // Test forgot password validation
      render(<TestApp initialEntries={['/forgot-password']} />);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Test reset password validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          valid: true, 
          email: testEmail 
        })
      });

      render(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
        expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
      });
    });

    it('should handle expired tokens appropriately', async () => {
      // Mock expired token response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ 
          success: false, 
          valid: false,
          message: 'Token expired' 
        })
      });

      render(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      });

      // Should provide recovery options
      expect(screen.getByRole('link', { name: /request new reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
    });
  });

  describe('User Experience Flow', () => {
    it('should provide clear feedback during loading states', async () => {
      render(<TestApp initialEntries={['/forgot-password']} />);

      // Mock delayed API response
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, testEmail);
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true })
      });

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });
    });

    it('should handle back navigation correctly', async () => {
      // Start on email sent page with proper state
      const { rerender } = render(<TestApp initialEntries={['/forgot-password/email-sent']} />);

      // Without email in state, should redirect
      await waitFor(() => {
        expect(screen.getByText('Reset Password')).toBeInTheDocument();
      });

      // Test reset password back navigation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          valid: true, 
          email: testEmail 
        })
      });

      rerender(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      await waitFor(() => {
        expect(screen.getByText('Create New Password')).toBeInTheDocument();
      });

      // Back to sign in link should be available
      expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation throughout the flow', async () => {
      render(<TestApp initialEntries={['/forgot-password']} />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      // Should support keyboard attributes
      expect(emailInput).toHaveAttribute('enterKeyHint', 'send');
      expect(emailInput).toHaveAttribute('inputMode', 'email');

      // Tab navigation should work
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /send reset link/i })).toHaveFocus();

      // Enter key should submit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await user.type(emailInput, testEmail);
      await user.keyboard('{Enter}');

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain functionality on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TestApp initialEntries={['/forgot-password']} />);

      // Mobile-specific attributes should be present
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveClass('min-h-[44px]'); // Touch-friendly height

      // Form should still function normally
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await user.type(emailInput, testEmail);
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility Throughout Flow', () => {
    it('should maintain proper ARIA attributes and roles', async () => {
      render(<TestApp initialEntries={['/forgot-password']} />);

      // Check initial accessibility
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reset Password');
      expect(screen.getByRole('textbox', { name: /email/i })).toBeRequired();

      // Navigate through flow and check accessibility at each step
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      await user.type(emailInput, testEmail);
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Check Your Email');
      });

      // Check reset password page accessibility
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          valid: true, 
          email: testEmail 
        })
      });

      render(<TestApp initialEntries={[`/reset-password/${validToken}`]} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);
        
        expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
        expect(confirmInput).toHaveAttribute('autoComplete', 'new-password');
        expect(passwordInput).toBeRequired();
        expect(confirmInput).toBeRequired();
      });
    });

    it('should provide proper error announcements', async () => {
      render(<TestApp initialEntries={['/forgot-password']} />);

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText('Email is required');
        // Error should be properly announced to screen readers
        expect(errorMessage).toBeInTheDocument();
      });

      // API error should also be announced
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ 
          success: false, 
          message: 'Server error' 
        })
      });

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      await user.type(emailInput, testEmail);
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information in error messages', async () => {
      render(<TestApp initialEntries={['/forgot-password']} />);

      // Test with non-existent email - should still show success message
      mockFetch.mockResolvedValueOnce({
        ok: true, // Backend returns success even for non-existent emails
        json: async () => ({ 
          success: true, 
          message: 'If an account exists, reset email sent' 
        })
      });

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      await user.type(emailInput, 'nonexistent@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Should not reveal whether account exists or not
      expect(screen.queryByText(/account.*not.*found/i)).not.toBeInTheDocument();
    });

    it('should handle malicious input safely', async () => {
      render(<TestApp initialEntries={['/forgot-password']} />);

      const maliciousInputs = [
        '<script>alert("xss")</script>@example.com',
        'test@<script>alert("xss")</script>.com',
        '../../etc/passwd@example.com'
      ];

      for (const maliciousInput of maliciousInputs) {
        const emailInput = screen.getByRole('textbox', { name: /email/i });
        
        await user.clear(emailInput);
        await user.type(emailInput, maliciousInput);
        
        // Input should be sanitized or validation should fail
        expect(emailInput.value).toBe(maliciousInput); // Input accepted but...
        
        await user.click(screen.getByRole('button', { name: /send reset link/i }));
        
        // Should show validation error for malicious input
        await waitFor(() => {
          expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });
      }
    });
  });
});