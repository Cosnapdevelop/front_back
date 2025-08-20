/**
 * Test data and fixtures for E2E tests
 * 
 * Provides mock data and utilities for end-to-end testing scenarios
 */

export const testUsers = {
  validUser: {
    email: 'e2e.test@example.com',
    username: 'e2euser',
    password: 'Password123!',
  },
  invalidUser: {
    email: 'invalid@example.com',
    username: 'invalid',
    password: 'wrongpassword',
  },
  newUser: {
    email: 'newuser.e2e@example.com',
    username: 'newuser',
    password: 'NewPassword123!',
  },
};

export const mockEffects = [
  {
    id: '1',
    name: 'Ultimate upscale final v.1',
    description: 'High-quality image upscaling with AI',
    webappId: '1907581130097192962',
    thumbnail: '/api/mock/thumbnail1.jpg',
    category: 'upscale',
  },
  {
    id: '2',
    name: 'Face Swap Effect',
    description: 'Advanced face swapping technology',
    webappId: '1937084629516193794',
    thumbnail: '/api/mock/thumbnail2.jpg',
    category: 'face',
  },
  {
    id: '3',
    name: 'Background Remover',
    description: 'Remove backgrounds with precision',
    webappId: '1903718280794906626',
    thumbnail: '/api/mock/thumbnail3.jpg',
    category: 'background',
  },
];

export const mockTasks = [
  {
    id: 'task-1',
    effectName: 'Ultimate upscale final v.1',
    status: 'SUCCESS',
    inputImage: '/api/mock/input1.jpg',
    results: [
      '/api/mock/result1-1.jpg',
      '/api/mock/result1-2.jpg',
    ],
    createdAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-15T10:35:00Z',
  },
  {
    id: 'task-2',
    effectName: 'Face Swap Effect',
    status: 'PENDING',
    inputImage: '/api/mock/input2.jpg',
    results: [],
    createdAt: '2024-01-15T11:00:00Z',
    completedAt: null,
  },
];

export const mockCommunityPosts = [
  {
    id: '1',
    title: 'Amazing Portrait Enhancement',
    content: 'Used the upscale effect on this old family photo. The results are incredible!',
    imageUrl: '/api/mock/community1.jpg',
    author: {
      id: '1',
      username: 'photographer123',
      avatar: '/api/mock/avatar1.jpg',
    },
    likes: 42,
    comments: 8,
    createdAt: '2024-01-14T09:15:00Z',
  },
  {
    id: '2',
    title: 'Before and After Comparison',
    content: 'Check out this transformation using our AI effects!',
    imageUrl: '/api/mock/community2.jpg',
    author: {
      id: '2',
      username: 'artist_ai',
      avatar: '/api/mock/avatar2.jpg',
    },
    likes: 28,
    comments: 3,
    createdAt: '2024-01-14T14:22:00Z',
  },
];

// Test file data (base64 encoded small image)
export const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Helper to create test file
export function createTestFile(name = 'test.jpg', type = 'image/jpeg') {
  // Convert base64 to blob
  const byteCharacters = atob(testImageBase64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type });
  
  return new File([blob], name, { type });
}

// Common test scenarios
export const testScenarios = {
  userRegistration: {
    steps: [
      'Navigate to register page',
      'Fill in registration form',
      'Submit form',
      'Verify redirect to dashboard',
      'Check welcome message',
    ],
  },
  userLogin: {
    steps: [
      'Navigate to login page',
      'Enter valid credentials',
      'Submit login form',
      'Verify authentication success',
      'Check user profile in navbar',
    ],
  },
  effectApplication: {
    steps: [
      'Login as authenticated user',
      'Navigate to effects page',
      'Select an effect',
      'Upload test image',
      'Configure effect parameters',
      'Submit processing request',
      'Wait for task completion',
      'View results in gallery',
    ],
  },
  imageGalleryNavigation: {
    steps: [
      'Open task result gallery',
      'Navigate through images',
      'Test fullscreen view',
      'Test download functionality',
      'Test keyboard navigation',
    ],
  },
  communityInteraction: {
    steps: [
      'Navigate to community page',
      'Browse posts',
      'Like a post',
      'Add comment',
      'Create new post',
      'Share processed image',
    ],
  },
  mobileResponsiveness: {
    steps: [
      'Switch to mobile viewport',
      'Test navigation menu',
      'Test form interactions',
      'Test image upload on mobile',
      'Test touch gestures',
    ],
  },
};

// API mock responses for different scenarios
export const mockAPIResponses = {
  authSuccess: {
    success: true,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: testUsers.validUser,
  },
  authFailure: {
    success: false,
    error: 'Invalid credentials',
  },
  effectsSuccess: {
    success: true,
    effects: mockEffects,
  },
  taskStartSuccess: {
    success: true,
    taskId: 'mock-task-123',
    status: 'PENDING',
  },
  taskStatusPending: {
    success: true,
    status: 'PENDING',
  },
  taskStatusSuccess: {
    success: true,
    status: 'SUCCESS',
    results: [
      '/api/mock/result-1.jpg',
      '/api/mock/result-2.jpg',
    ],
  },
  communityPostsSuccess: {
    success: true,
    posts: mockCommunityPosts,
    totalPages: 1,
    currentPage: 1,
  },
  uploadSuccess: {
    success: true,
    fileUrl: '/api/mock/uploaded-image.jpg',
    fileSize: 1024000,
  },
};

// Test configuration for different environments
export const testConfig = {
  development: {
    baseURL: 'http://localhost:5173',
    apiBaseURL: 'http://localhost:3001',
    timeout: 30000,
  },
  staging: {
    baseURL: 'https://staging.cosnap.ai',
    apiBaseURL: 'https://staging-api.cosnap.ai',
    timeout: 60000,
  },
  production: {
    baseURL: 'https://cosnap.ai',
    apiBaseURL: 'https://api.cosnap.ai',
    timeout: 60000,
  },
};

// Helper functions for common test operations
export const testHelpers = {
  // Generate random user data for registration tests
  generateRandomUser() {
    const timestamp = Date.now();
    return {
      email: `test${timestamp}@example.com`,
      username: `user${timestamp}`,
      password: 'TestPassword123!',
    };
  },

  // Wait for element with custom timeout
  async waitForElement(page: any, selector: string, timeout = 10000) {
    return page.waitForSelector(selector, { timeout });
  },

  // Upload file helper
  async uploadFile(page: any, inputSelector: string, filename: string) {
    const fileInput = await page.locator(inputSelector);
    await fileInput.setInputFiles(filename);
  },

  // Login helper for tests that require authentication
  async login(page: any, credentials = testUsers.validUser) {
    await page.goto('/login');
    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  },

  // Logout helper
  async logout(page: any) {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=退出登录');
    await page.waitForURL('/');
  },

  // Check if user is authenticated
  async isAuthenticated(page: any) {
    try {
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },

  // Take screenshot with timestamp
  async takeScreenshot(page: any, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: `screenshots/${name}-${timestamp}.png` });
  },

  // Simulate network conditions
  async simulateSlowNetwork(page: any) {
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000); // 1 second delay
    });
  },

  // Mock API responses
  async mockAPIResponse(page: any, url: string, response: any) {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  },
};