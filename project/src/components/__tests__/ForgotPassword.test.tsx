import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
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
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

// Mock hooks
const mockSendResetEmail = vi.fn();
const mockClearState = vi.fn();
const mockUseSEO = vi.fn();

vi.mock('../../hooks/useForgotPassword', () => ({
  useForgotPassword: () => ({
    loading: false,
    error: null,
    success: false,
    sendResetEmail: mockSendResetEmail,
    clearState: mockClearState,
  }),
}));

vi.mock('../../hooks/useSEO', () => ({
  useSEO: mockUseSEO,
}));

// Import component after mocks
import ForgotPassword from '../../pages/ForgotPassword';

// Wrapper component for router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ForgotPassword Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render forgot password form', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address and we\'ll send you a link to reset your password.')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
      expect(screen.getByText('Remember your password?')).toBeInTheDocument();
    });

    it('should render app branding', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Cosnap AI')).toBeInTheDocument();
    });

    it('should apply correct SEO metadata', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(mockUseSEO).toHaveBeenCalledWith({
        customSEO: expect.objectContaining({
          title: expect.stringContaining('Reset Password'),
          description: expect.stringContaining('Reset your Cosnap AI account password'),
          keywords: expect.arrayContaining(['reset password cosnap ai']),
        }),
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required email field', async () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should accept valid email format', async () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });

      await user.type(emailInput, 'test@example.com');

      // No validation error should be shown
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });

    it('should clear field errors when user types', async () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Start typing should clear error
      await user.type(emailInput, 't');
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid email', async () => {
      mockSendResetEmail.mockResolvedValue(true);

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSendResetEmail).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should trim email before submission', async () => {
      mockSendResetEmail.mockResolvedValue(true);

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, '  test@example.com  ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSendResetEmail).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should not submit form with invalid data', async () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.click(submitButton);

      expect(mockSendResetEmail).not.toHaveBeenCalled();
    });

    it('should prevent multiple submissions', async () => {
      mockSendResetEmail.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      
      // Click twice quickly
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only be called once
      expect(mockSendResetEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      // Mock loading state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: true,
        error: null,
        success: false,
        sendResetEmail: mockSendResetEmail,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should disable form elements during loading', async () => {
      // Mock loading state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: true,
        error: null,
        success: false,
        sendResetEmail: mockSendResetEmail,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(screen.getByRole('textbox', { name: /email/i })).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display API errors', () => {
      // Mock error state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: false,
        error: 'Network error occurred',
        success: false,
        sendResetEmail: mockSendResetEmail,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should not show API error when field error exists', async () => {
      // Mock error state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: false,
        error: 'Network error occurred',
        success: false,
        sendResetEmail: mockSendResetEmail,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.queryByText('Network error occurred')).not.toBeInTheDocument();
      });
    });
  });

  describe('Success Navigation', () => {
    it('should navigate to email sent page on success', () => {
      // Mock success state
      vi.mocked(vi.importMock('../../hooks/useForgotPassword')).mockReturnValue({
        loading: false,
        error: null,
        success: true,
        sendResetEmail: mockSendResetEmail,
        clearState: mockClearState,
      });

      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      // Should trigger navigation effect
      expect(mockNavigate).toHaveBeenCalledWith(
        '/forgot-password/email-sent',
        expect.objectContaining({
          state: { email: expect.any(String) },
          replace: true,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Reset Password');
    });

    it('should have proper form labeling', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const label = screen.getByText('Email Address');

      expect(emailInput).toBeRequired();
      expect(label).toBeInTheDocument();
    });
  });

  describe('Mobile Compatibility', () => {
    it('should have mobile-friendly input attributes', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });

      expect(emailInput).toHaveAttribute('inputMode', 'email');
      expect(emailInput).toHaveAttribute('enterKeyHint', 'send');
      expect(emailInput).toHaveAttribute('spellCheck', 'false');
    });

    it('should have minimum touch target size', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      const emailInput = screen.getByRole('textbox', { name: /email/i });

      // Check for minimum height class
      expect(emailInput).toHaveClass('min-h-[44px]');
    });
  });

  describe('State Management', () => {
    it('should clear state on component mount', () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      expect(mockClearState).toHaveBeenCalled();
    });

    it('should manage email state correctly', async () => {
      render(
        <RouterWrapper>
          <ForgotPassword />
        </RouterWrapper>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });

      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });
  });
});