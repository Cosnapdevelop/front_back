import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
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

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

// Mock hooks
const mockVerifyResetToken = vi.fn();
const mockResetPassword = vi.fn();
const mockClearState = vi.fn();

vi.mock('../../hooks/useForgotPassword', () => ({
  useForgotPassword: () => ({
    loading: false,
    error: null,
    success: false,
    verifyResetToken: mockVerifyResetToken,
    resetPassword: mockResetPassword,
    clearState: mockClearState,
  }),
}));

vi.mock('../../hooks/useSEO', () => ({
  useSEO: vi.fn(),
}));

// Import component after mocks
import ResetPassword from '../../pages/ResetPassword';

const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ResetPassword Component', () => {
  const user = userEvent.setup();
  const mockToken = 'valid-reset-token';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ token: mockToken });
    mockVerifyResetToken.mockResolvedValue({ valid: true, email: 'test@example.com' });
  });

  describe('Token Verification', () => {
    it('should verify token on mount', async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockVerifyResetToken).toHaveBeenCalledWith(mockToken);
      });
    });

    it('should redirect if no token provided', () => {
      mockUseParams.mockReturnValue({ token: undefined });

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/forgot-password', { replace: true });
    });

    it('should show loading during token verification', () => {
      // Mock verification in progress
      mockVerifyResetToken.mockImplementation(() => new Promise(() => {}));

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Verifying reset link...')).toBeInTheDocument();
    });

    it('should show error for invalid token', async () => {
      mockVerifyResetToken.mockResolvedValue({ valid: false });

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
        expect(screen.getByText('Request New Reset Link')).toBeInTheDocument();
      });
    });
  });

  describe('Form Rendering', () => {
    it('should render password reset form with valid token', async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Password')).toBeInTheDocument();
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
      });
    });

    it('should show email address when available', async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should have password visibility toggles', async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');

        // Should have toggle buttons
        const toggleButtons = screen.getAllByRole('button', { name: '' }); // Eye icons
        expect(toggleButtons).toHaveLength(2);
      });
    });
  });

  describe('Password Validation', () => {
    beforeEach(async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'weak');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
      });
    });

    it('should validate password confirmation match', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'ValidPassword123!');
      await user.type(confirmPasswordInput, 'DifferentPassword123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('should show password strength indicator', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);

      await user.type(passwordInput, 'weak');
      expect(screen.getByText('Too weak')).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, 'Password123');
      expect(screen.getByText('Fair')).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, 'Password123!');
      expect(screen.getByText('Good')).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPassword123!');
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should show password match indicator', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'ValidPassword123!');
      await user.type(confirmPasswordInput, 'ValidPassword123!');

      // Should show check mark or visual indicator for match
      const confirmContainer = confirmPasswordInput.closest('div');
      expect(confirmContainer).toHaveClass('border-green-500');
    });

    it('should clear field errors when user types', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });

      // Start typing should clear error
      await user.type(passwordInput, 'P');
      expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    beforeEach(async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should toggle password visibility', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const toggleButtons = screen.getAllByRole('button', { name: '' });
      const passwordToggle = toggleButtons[0];

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(passwordToggle);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(passwordToggle);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should toggle confirm password visibility', async () => {
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const toggleButtons = screen.getAllByRole('button', { name: '' });
      const confirmPasswordToggle = toggleButtons[1];

      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      await user.click(confirmPasswordToggle);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should submit form with valid data', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'ValidPassword123!');
      await user.type(confirmPasswordInput, 'ValidPassword123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(
          mockToken,
          'ValidPassword123!',
          'ValidPassword123!'
        );
      });
    });

    it('should not submit with invalid data', async () => {
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.click(submitButton);

      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('should disable submit button when loading', () => {
      // Mock loading state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: true,
        error: null,
        success: false,
        verifyResetToken: mockVerifyResetToken,
        resetPassword: mockResetPassword,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Success Navigation', () => {
    it('should navigate to success page on successful reset', () => {
      // Mock success state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: false,
        error: null,
        success: true,
        verifyResetToken: mockVerifyResetToken,
        resetPassword: mockResetPassword,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        '/reset-password/success',
        expect.objectContaining({
          state: { email: expect.any(String) },
          replace: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should display API errors', () => {
      // Mock error state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: false,
        error: 'Password reset failed',
        success: false,
        verifyResetToken: mockVerifyResetToken,
        resetPassword: mockResetPassword,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Password reset failed')).toBeInTheDocument();
    });

    it('should prioritize field errors over API errors', async () => {
      // Mock error state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: false,
        error: 'API error',
        success: false,
        verifyResetToken: mockVerifyResetToken,
        resetPassword: mockResetPassword,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
        expect(screen.queryByText('API error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels and attributes', () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(passwordInput).toHaveAttribute('required');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('required');
    });

    it('should have proper heading hierarchy', () => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Create New Password');
    });

    it('should have keyboard navigation support', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('enterKeyHint', 'next');
      expect(confirmPasswordInput).toHaveAttribute('enterKeyHint', 'done');
    });
  });

  describe('Mobile Compatibility', () => {
    beforeEach(async () => {
      render(
        <RouterWrapper>
          <ResetPassword />
        </RouterWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should have mobile-friendly input attributes', () => {
      const inputs = screen.getAllByRole('textbox');
      
      inputs.forEach(input => {
        expect(input).toHaveClass('min-h-[44px]'); // Minimum touch target
      });
    });
  });
});