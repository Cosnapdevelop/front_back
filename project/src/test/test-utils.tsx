/**
 * Test utilities for React component testing
 * 
 * Provides custom render functions with providers and common test helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { ToastProvider } from '../context/ToastContext';

// Create a custom render function that includes all providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create a new QueryClient for each test to ensure isolation
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        staleTime: Infinity, // Prevent background refetches
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Custom render for components that don't need all providers
export const renderWithRouter = (ui: ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

// Custom render for components that only need auth
export const renderWithAuth = (ui: ReactElement) => {
  const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
  
  return render(ui, { wrapper: AuthWrapper });
};

// Mock user data for tests
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  avatar: null,
  bio: null,
};

// Mock authentication state
export const mockAuthState = {
  user: mockUser,
  isAuthenticated: true,
  accessToken: 'mock-access-token',
  bootstrapped: true,
  login: vi.fn().mockResolvedValue(true),
  register: vi.fn().mockResolvedValue(true),
  logout: vi.fn(),
  refresh: vi.fn().mockResolvedValue(true),
};

// Mock unauthenticated state
export const mockUnauthenticatedState = {
  user: null,
  isAuthenticated: false,
  accessToken: null,
  bootstrapped: true,
  login: vi.fn().mockResolvedValue(false),
  register: vi.fn().mockResolvedValue(false),
  logout: vi.fn(),
  refresh: vi.fn().mockResolvedValue(false),
};

// Mock app context state
export const mockAppState = {
  selectedRegion: 'hongkong' as const,
  setSelectedRegion: vi.fn(),
  isProcessing: false,
  setIsProcessing: vi.fn(),
  currentTask: null,
  setCurrentTask: vi.fn(),
  taskHistory: [],
  addTaskToHistory: vi.fn(),
};

// Mock toast context
export const mockToastContext = {
  showToast: vi.fn(),
  toasts: [],
  removeToast: vi.fn(),
};

// Mock AI effects data
export const mockEffects = [
  {
    id: '1',
    name: 'Ultimate upscale final v.1',
    description: 'High-quality image upscaling',
    webappId: '1907581130097192962',
    thumbnail: 'https://example.com/thumb1.jpg',
    category: 'upscale',
    nodeInfoList: [
      { nodeId: '2', fieldName: 'image', fieldValue: '' },
      { nodeId: '161', fieldName: 'value', fieldValue: '1' },
      { nodeId: '160', fieldName: 'value', fieldValue: '0.25' }
    ]
  },
  {
    id: '2',
    name: 'Face Swap Effect',
    description: 'Swap faces in images',
    webappId: '1937084629516193794',
    thumbnail: 'https://example.com/thumb2.jpg',
    category: 'face',
    nodeInfoList: [
      { nodeId: '39', fieldName: 'image', fieldValue: '' },
      { nodeId: '52', fieldName: 'prompt', fieldValue: '' }
    ]
  }
];

// Mock task data
export const mockTask = {
  id: 'task-123',
  status: 'PENDING' as const,
  effectId: '1',
  effectName: 'Test Effect',
  inputImage: 'https://example.com/input.jpg',
  results: [],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  completedAt: null,
};

export const mockCompletedTask = {
  ...mockTask,
  status: 'SUCCESS' as const,
  results: [
    'https://example.com/result1.jpg',
    'https://example.com/result2.jpg'
  ],
  completedAt: new Date('2024-01-01T00:05:00Z'),
};

// Mock community posts
export const mockPosts = [
  {
    id: '1',
    title: 'Amazing AI Art',
    content: 'Check out this cool AI-generated artwork!',
    imageUrl: 'https://example.com/post1.jpg',
    author: {
      id: '1',
      username: 'artist1',
      avatar: 'https://example.com/avatar1.jpg'
    },
    createdAt: '2024-01-01T00:00:00Z',
    likes: 15,
    comments: 3,
    isLiked: false
  },
  {
    id: '2',
    title: 'Portrait Enhancement',
    content: 'Before and after using the portrait upscale effect',
    imageUrl: 'https://example.com/post2.jpg',
    author: {
      id: '2',
      username: 'photographer',
      avatar: null
    },
    createdAt: '2024-01-02T00:00:00Z',
    likes: 8,
    comments: 1,
    isLiked: true
  }
];

// Helper to wait for loading states
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Helper to create mock file for upload tests
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: 1024 });
  return file;
};

// Helper to simulate file input change
export const simulateFileUpload = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, 'files', {
    value: [file],
    configurable: true,
  });
  
  const event = new Event('change', { bubbles: true });
  input.dispatchEvent(event);
};

// Custom matchers for common assertions
export const expectToBeLoading = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(/loading|加载|处理/i);
};

export const expectToBeError = (element: HTMLElement, message?: string) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(/error|错误|失败/i);
  if (message) {
    expect(element).toHaveTextContent(message);
  }
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override the default render with our custom one
export { customRender as render };