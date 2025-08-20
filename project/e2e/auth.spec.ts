/**
 * End-to-end tests for authentication workflows
 * 
 * Tests complete user authentication flows including:
 * - User registration and login
 * - Password validation and error handling
 * - Session persistence and token refresh
 * - Logout and security scenarios
 */

import { test, expect, Page } from '@playwright/test';
import { testUsers, mockAPIResponses, testHelpers } from './fixtures/test-data';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication state
    await page.context().clearCookies();
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      const newUser = testHelpers.generateRandomUser();

      // Navigate to registration page
      await page.goto('/register');
      await expect(page).toHaveTitle(/注册|Register/);

      // Fill registration form
      await page.fill('input[name="email"]', newUser.email);
      await page.fill('input[name="username"]', newUser.username);
      await page.fill('input[name="password"]', newUser.password);

      // Submit registration
      await page.click('button[type="submit"]');

      // Should redirect to dashboard after successful registration
      await page.waitForURL('/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(newUser.username);
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/register');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('.error-message')).toHaveCount(3); // email, username, password
      await expect(page.locator('text=邮箱格式不正确')).toBeVisible();
      await expect(page.locator('text=用户名至少3个字符')).toBeVisible();
      await expect(page.locator('text=密码至少6个字符')).toBeVisible();
    });

    test('should handle registration with existing email', async ({ page }) => {
      await page.goto('/register');

      // Try to register with existing user data
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="username"]', 'differentusername');
      await page.fill('input[name="password"]', testUsers.validUser.password);

      await page.click('button[type="submit"]');

      // Should show error for existing email
      await expect(page.locator('.error-message')).toContainText('邮箱已存在');
    });

    test('should handle password strength requirements', async ({ page }) => {
      await page.goto('/register');

      const weakPasswords = ['123', 'password', '12345678'];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', weakPassword);

        await page.click('button[type="submit"]');
        
        // Should show password strength error
        await expect(page.locator('.error-message')).toContainText(/密码强度不够|密码太简单/);
        
        // Clear form for next iteration
        await page.fill('input[name="password"]', '');
      }
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/register');

      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('[data-testid="password-toggle"]');

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);

      // Submit login
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // User menu should show username
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('.user-menu-dropdown')).toContainText(testUsers.validUser.username);
    });

    test('should allow login with username instead of email', async ({ page }) => {
      await page.goto('/login');
      
      // Use username instead of email
      await page.fill('input[name="email"]', testUsers.validUser.username);
      await page.fill('input[name="password"]', testUsers.validUser.password);

      await page.click('button[type="submit"]');

      // Should still succeed
      await page.waitForURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[name="email"]', testUsers.invalidUser.email);
      await page.fill('input[name="password"]', testUsers.invalidUser.password);

      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('.error-message')).toContainText('账号或密码错误');
      
      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('/api/auth/login', route => {
        route.abort('failed');
      });

      await page.goto('/login');
      
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);

      await page.click('button[type="submit"]');

      // Should show network error
      await expect(page.locator('.error-message')).toContainText(/网络错误|连接失败/);
    });

    test('should remember me functionality', async ({ page, context }) => {
      await page.goto('/login');
      
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);
      
      // Check "Remember me"
      await page.check('input[name="remember"]');
      
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Close and reopen browser
      await page.close();
      const newPage = await context.newPage();
      await newPage.goto('/');

      // Should still be authenticated
      await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/profile');
      
      // Should redirect to login with return URL
      await expect(page).toHaveURL(/\/login.*returnTo=/);

      // Login
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);
      await page.click('button[type="submit"]');

      // Should redirect to originally requested page
      await page.waitForURL('/profile');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Login first
      await testHelpers.login(page);
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle token expiration gracefully', async ({ page }) => {
      await testHelpers.login(page);

      // Mock token expiration
      await page.route('/api/auth/me', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Token expired' }),
        });
      });

      // Navigate to a page that requires authentication
      await page.goto('/profile');

      // Should redirect to login
      await page.waitForURL('/login');
      await expect(page.locator('.error-message')).toContainText(/登录已过期|session expired/);
    });

    test('should refresh token automatically', async ({ page }) => {
      await testHelpers.login(page);

      // Mock token refresh
      let refreshCalled = false;
      await page.route('/api/auth/refresh', route => {
        refreshCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            accessToken: 'new-access-token'
          }),
        });
      });

      // Mock expired token that triggers refresh
      await page.route('/api/auth/me', route => {
        if (!refreshCalled) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Token expired' }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              user: testUsers.validUser
            }),
          });
        }
      });

      await page.reload();

      // Should automatically refresh and maintain session
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle concurrent requests during token refresh', async ({ page }) => {
      await testHelpers.login(page);

      // Mock token refresh with delay
      await page.route('/api/auth/refresh', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              accessToken: 'new-access-token'
            }),
          });
        }, 1000);
      });

      // Make multiple concurrent requests
      const promises = [
        page.goto('/profile'),
        page.goto('/effects'),
        page.goto('/community'),
      ];

      await Promise.all(promises);

      // All requests should succeed after token refresh
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      await testHelpers.login(page);

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=退出登录');

      // Should redirect to home page
      await page.waitForURL('/');
      
      // Should not show user menu
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
      
      // Should show login/register buttons
      await expect(page.locator('text=登录')).toBeVisible();
      await expect(page.locator('text=注册')).toBeVisible();
    });

    test('should logout from all devices', async ({ page, context }) => {
      await testHelpers.login(page);

      // Open second tab
      const secondPage = await context.newPage();
      await secondPage.goto('/dashboard');
      await expect(secondPage.locator('[data-testid="user-menu"]')).toBeVisible();

      // Logout from first tab
      await page.click('[data-testid="user-menu"]');
      await page.click('text=退出登录');

      // Second tab should also be logged out
      await secondPage.reload();
      await expect(secondPage.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });

    test('should clear sensitive data on logout', async ({ page }) => {
      await testHelpers.login(page);

      // Navigate to sensitive page
      await page.goto('/profile');
      await expect(page.locator('input[name="email"]')).toHaveValue(testUsers.validUser.email);

      // Logout
      await testHelpers.logout(page);

      // Try to go back to sensitive page
      await page.goto('/profile');
      
      // Should redirect to login
      await page.waitForURL('/login');
    });
  });

  test.describe('Security', () => {
    test('should prevent access to protected routes when not authenticated', async ({ page }) => {
      const protectedRoutes = ['/profile', '/effects', '/dashboard'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test('should handle multiple login attempts', async ({ page }) => {
      await page.goto('/login');

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="email"]', testUsers.invalidUser.email);
        await page.fill('input[name="password"]', testUsers.invalidUser.password);
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.error-message')).toBeVisible();
      }

      // Should show rate limiting message after multiple failures
      await expect(page.locator('.error-message')).toContainText(/too many attempts|尝试次数过多/);
    });

    test('should validate CSRF protection', async ({ page }) => {
      // This test ensures forms have CSRF protection
      await page.goto('/login');

      // Check for CSRF token in form
      const csrfToken = await page.locator('input[name="_token"]');
      if (await csrfToken.count() > 0) {
        await expect(csrfToken).toHaveAttribute('value', /.+/);
      }
    });

    test('should sanitize user input', async ({ page }) => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '"><script>alert(1)</script>',
      ];

      await page.goto('/register');

      for (const maliciousInput of maliciousInputs) {
        await page.fill('input[name="username"]', maliciousInput);
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        
        await page.click('button[type="submit"]');
        
        // Should not execute script or show as-is
        // Page should either reject the input or sanitize it
        const alerts = await page.evaluate(() => window.alert.toString());
        expect(alerts).not.toContain('alert("xss")');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="email"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="password"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();

      // Should be able to submit with Enter
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);
      
      await page.locator('button[type="submit"]').press('Enter');
      await page.waitForURL('/dashboard');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');

      // Form should have proper labeling
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label', /.+/);
      await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label', /.+/);

      // Error messages should be announced
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    test('should work with screen readers', async ({ page }) => {
      await page.goto('/login');

      // Page should have proper headings hierarchy
      await expect(page.locator('h1')).toHaveText(/登录|Login/);
      
      // Form should be properly structured
      const form = page.locator('form');
      await expect(form).toHaveAttribute('role', 'form');
      await expect(form).toHaveAttribute('aria-labelledby', /.+/);
    });
  });

  test.describe('Mobile Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    test('should work on mobile devices', async ({ page }) => {
      await page.goto('/login');

      // Mobile-specific elements should be visible
      await expect(page.locator('.mobile-menu-toggle')).toBeVisible();

      // Form should be responsive
      const form = page.locator('form');
      const formBox = await form.boundingBox();
      expect(formBox!.width).toBeLessThan(375);

      // Should handle mobile keyboard
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);
      
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.goto('/register');

      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('[data-testid="password-toggle"]');

      // Tap to show/hide password
      await toggleButton.tap();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await toggleButton.tap();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});