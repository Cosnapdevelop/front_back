import { test, expect, type Page } from '@playwright/test';
import type { MockEmailService } from './fixtures/test-data';

// Test data
const TEST_EMAIL = 'e2e-test@example.com';
const TEST_USER = {
  email: TEST_EMAIL,
  username: 'e2euser',
  id: 999
};
const NEW_PASSWORD = 'NewSecurePassword123!';

test.describe('Forgot Password E2E Flow', () => {
  let mockEmailService: MockEmailService;
  let resetToken: string;

  test.beforeEach(async ({ page }) => {
    // Setup API mocking
    await page.route('**/api/auth/forgot-password', async (route) => {
      const request = route.request();
      const body = await request.postDataJSON();
      
      if (body.email === TEST_EMAIL) {
        // Generate a mock reset token
        resetToken = 'mock-reset-token-' + Date.now();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'If an account with this email exists, you will receive a password reset link.'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'If an account with this email exists, you will receive a password reset link.'
          })
        });
      }
    });

    await page.route('**/api/auth/reset-password/*', async (route) => {
      const url = route.request().url();
      const token = url.split('/').pop();
      
      if (token === resetToken) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            valid: true,
            email: TEST_EMAIL
          })
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            valid: false,
            message: 'Invalid or expired reset link.'
          })
        });
      }
    });

    await page.route('**/api/auth/reset-password', async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON();
        
        if (body.token === resetToken && body.password === NEW_PASSWORD) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Password reset successfully'
            })
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Invalid reset request'
            })
          });
        }
      }
    });
  });

  test('should complete the full forgot password flow successfully', async ({ page }) => {
    // Step 1: Navigate to forgot password page
    await page.goto('/forgot-password');
    
    // Verify page loads correctly
    await expect(page).toHaveTitle(/Reset Password.*Cosnap AI/);
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();

    // Step 2: Fill and submit forgot password form
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /send reset link/i });

    await emailInput.fill(TEST_EMAIL);
    await expect(submitButton).toBeEnabled();
    
    await submitButton.click();

    // Step 3: Verify navigation to email sent page
    await expect(page).toHaveURL('/forgot-password/email-sent');
    await expect(page.getByText('Check Your Email')).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();

    // Verify email instructions are shown
    await expect(page.getByText(/we've sent a password reset link/i)).toBeVisible();
    await expect(page.getByText(/check your inbox/i)).toBeVisible();

    // Step 4: Verify resend functionality
    const resendButton = page.getByRole('button', { name: /resend/i });
    await expect(resendButton).toBeDisabled(); // Should be on cooldown initially
    
    // Wait for cooldown or check countdown timer
    const countdownText = page.locator('text=/Resend in \\d+:\\d+/');
    await expect(countdownText).toBeVisible();

    // Step 5: Navigate to reset password page (simulate email link click)
    await page.goto(`/reset-password/${resetToken}`);
    
    // Wait for token verification
    await expect(page.getByText('Create New Password')).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();

    // Step 6: Fill and submit password reset form
    const passwordInput = page.getByLabel(/new password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    const resetButton = page.getByRole('button', { name: /reset password/i });

    // Test password strength indicator
    await passwordInput.fill('weak');
    await expect(page.getByText('Too weak')).toBeVisible();

    await passwordInput.fill('');
    await passwordInput.fill('StrongPassword123');
    await expect(page.getByText('Fair')).toBeVisible();

    await passwordInput.fill('');
    await passwordInput.fill(NEW_PASSWORD);
    await expect(page.getByText('Strong')).toBeVisible();

    await confirmPasswordInput.fill(NEW_PASSWORD);
    
    // Verify password match indicator
    await expect(confirmPasswordInput).toHaveClass(/border-green-500/);

    await resetButton.click();

    // Step 7: Verify success page
    await expect(page).toHaveURL('/reset-password/success');
    await expect(page.getByText('Password Reset Successfully!')).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();

    // Step 8: Verify success page interactions
    const signInButton = page.getByRole('link', { name: /sign in now/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toHaveAttribute('href', '/login');

    const homeLink = page.getByRole('link', { name: /back to home/i });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/');
  });

  test('should handle invalid email addresses with proper validation', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /send reset link/i });

    // Test empty email
    await submitButton.click();
    await expect(page.getByText('Email is required')).toBeVisible();

    // Test invalid email formats
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user..name@example.com',
      'user name@example.com'
    ];

    for (const email of invalidEmails) {
      await emailInput.fill(email);
      await submitButton.click();
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      
      // Clear error by typing
      await emailInput.fill('');
      await expect(page.getByText('Please enter a valid email address')).not.toBeVisible();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/forgot-password');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /send reset link/i });

    await emailInput.fill(TEST_EMAIL);
    await submitButton.click();

    // Should show network error
    await expect(page.getByText(/network error/i)).toBeVisible();
    
    // Form should remain functional
    await expect(emailInput).toBeEnabled();
    await expect(submitButton).toBeEnabled();
  });

  test('should handle expired or invalid reset tokens', async ({ page }) => {
    // Navigate directly to reset page with invalid token
    await page.goto('/reset-password/invalid-token');

    // Should show invalid token error
    await expect(page.getByText('Invalid Reset Link')).toBeVisible();
    await expect(page.getByRole('link', { name: /request new reset link/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible();

    // Test navigation from error page
    await page.getByRole('link', { name: /request new reset link/i }).click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('should validate password requirements on reset page', async ({ page }) => {
    // Navigate to reset page with valid token
    await page.goto(`/reset-password/${resetToken}`);
    await expect(page.getByText('Create New Password')).toBeVisible();

    const passwordInput = page.getByLabel(/new password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    const resetButton = page.getByRole('button', { name: /reset password/i });

    // Test various invalid passwords
    const invalidPasswords = [
      { password: 'short', error: 'Password must be at least 8 characters long' },
      { password: 'onlyletters', error: 'Password must contain at least one letter and one number' },
      { password: '12345678', error: 'Password must contain at least one letter and one number' }
    ];

    for (const { password, error } of invalidPasswords) {
      await passwordInput.fill(password);
      await confirmPasswordInput.fill(password);
      await resetButton.click();
      
      await expect(page.getByText(error)).toBeVisible();
      
      // Clear inputs
      await passwordInput.fill('');
      await confirmPasswordInput.fill('');
    }

    // Test password mismatch
    await passwordInput.fill(NEW_PASSWORD);
    await confirmPasswordInput.fill('DifferentPassword123!');
    await resetButton.click();
    
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should support keyboard navigation throughout the flow', async ({ page }) => {
    await page.goto('/forgot-password');

    // Test keyboard navigation on forgot password page
    await page.keyboard.press('Tab'); // Focus email input
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab'); // Focus submit button
    const submitButton = page.getByRole('button', { name: /send reset link/i });
    await expect(submitButton).toBeFocused();

    // Test form submission with Enter key
    await emailInput.focus();
    await emailInput.fill(TEST_EMAIL);
    await page.keyboard.press('Enter');
    
    // Should submit form
    await expect(page).toHaveURL('/forgot-password/email-sent');

    // Test reset password page keyboard navigation
    await page.goto(`/reset-password/${resetToken}`);
    await expect(page.getByText('Create New Password')).toBeVisible();

    const passwordInput = page.getByLabel(/new password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    // Test tab order
    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(confirmPasswordInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    const resetButton = page.getByRole('button', { name: /reset password/i });
    await expect(resetButton).toBeFocused();
  });

  test('should provide proper loading states and feedback', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/auth/forgot-password', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/forgot-password');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /send reset link/i });

    await emailInput.fill(TEST_EMAIL);
    await submitButton.click();

    // Should show loading state immediately
    await expect(page.getByText('Sending...')).toBeVisible();
    await expect(submitButton).toBeDisabled();
    await expect(emailInput).toBeDisabled();

    // Should eventually succeed
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });
  });

  test('should handle rate limiting appropriately', async ({ page }) => {
    // Mock rate limiting response
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Too many requests. Please try again later.'
        })
      });
    });

    await page.goto('/forgot-password');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /send reset link/i });

    await emailInput.fill(TEST_EMAIL);
    await submitButton.click();

    // Should show rate limiting error
    await expect(page.getByText('Too many requests. Please try again later.')).toBeVisible();
    
    // Form should remain usable after error
    await expect(emailInput).toBeEnabled();
    await expect(submitButton).toBeEnabled();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    await page.goto('/forgot-password');

    // Check page structure and ARIA attributes
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('autoComplete', 'email');

    // Check form labeling
    await expect(page.getByText('Email Address')).toBeVisible();

    // Navigate to reset password page and check accessibility
    await page.goto(`/reset-password/${resetToken}`);
    await expect(page.getByText('Create New Password')).toBeVisible();

    const passwordInput = page.getByLabel(/new password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await expect(passwordInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
    await expect(confirmPasswordInput).toHaveAttribute('required');
    await expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');

    // Check that password toggles are accessible
    const passwordToggles = page.locator('button[aria-label*="password"], button[title*="password"]');
    await expect(passwordToggles).toHaveCount(2); // One for each password field
  });

  test('should work correctly on mobile devices', async ({ page, isMobile }) => {
    // Test mobile-specific behavior if running on mobile
    await page.goto('/forgot-password');

    const emailInput = page.getByRole('textbox', { name: /email/i });
    
    // Check mobile-specific attributes
    await expect(emailInput).toHaveAttribute('inputMode', 'email');
    await expect(emailInput).toHaveAttribute('enterKeyHint', 'send');

    // On mobile, form should still function normally
    await emailInput.fill(TEST_EMAIL);
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page).toHaveURL('/forgot-password/email-sent');

    // Test reset password page on mobile
    await page.goto(`/reset-password/${resetToken}`);
    await expect(page.getByText('Create New Password')).toBeVisible();

    const passwordInput = page.getByLabel(/new password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    // Password fields should be properly sized for mobile
    const passwordRect = await passwordInput.boundingBox();
    const confirmRect = await confirmPasswordInput.boundingBox();
    
    expect(passwordRect?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
    expect(confirmRect?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle password visibility toggles correctly', async ({ page }) => {
    await page.goto(`/reset-password/${resetToken}`);
    await expect(page.getByText('Create New Password')).toBeVisible();

    const passwordInput = page.getByLabel(/new password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    
    // Initially both should be password type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Find toggle buttons (they might be identified by their position or icon)
    const passwordToggle = page.locator('button').nth(0); // First toggle button
    const confirmPasswordToggle = page.locator('button').nth(1); // Second toggle button

    // Toggle password visibility
    await passwordToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    await passwordToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle confirm password visibility
    await confirmPasswordToggle.click();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    
    await confirmPasswordToggle.click();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });
});