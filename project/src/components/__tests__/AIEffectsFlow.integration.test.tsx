/**
 * AI Effects Processing Flow Integration Tests
 * 
 * Tests the complete AI effects processing workflow including:
 * - File upload with 10MB size validation
 * - Effect selection and parameter configuration
 * - Task processing and polling
 * - Result display in TaskResultGallery
 * - Error boundary handling
 * - Performance monitoring
 */

import React from 'react';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';

// Import components
import { AuthProvider } from '../../context/AuthContext';
import { AppProvider } from '../../context/AppContext';
import { ToastProvider } from '../../context/ToastContext';
import TaskImageUploader from '../TaskImageUploader';
import TaskResultGallery from '../TaskResultGallery';
import ApplyEffect from '../../pages/ApplyEffect';
import Effects from '../../pages/Effects';
import ErrorBoundary from '../ErrorBoundary';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue('mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Create query client for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Test wrapper with all providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Mock file for testing
const createMockFile = (name: string, size: number, type: string = 'image/jpeg') => {
  return new File(['mock image content'], name, {
    type,
    lastModified: Date.now(),
  }) as File & { size: number };
};

// Mock effects data
const mockEffects = [
  {
    id: '1',
    name: 'Portrait Enhancement',
    description: 'Enhance portrait photos with AI',
    webappId: '1907581130097192962',
    thumbnail: 'https://example.com/portrait-thumb.jpg',
    category: 'portrait',
    nodeInfoList: [
      { nodeId: '2', fieldName: 'image', fieldValue: '' }
    ]
  },
  {
    id: '2', 
    name: 'Background Removal',
    description: 'Remove background from images',
    webappId: '1907581130097192963',
    thumbnail: 'https://example.com/bg-thumb.jpg',
    category: 'utility',
    nodeInfoList: [
      { nodeId: '3', fieldName: 'input_image', fieldValue: '' }
    ]
  }
];

describe('AI Effects Processing Flow Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth responses
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            username: 'testuser'
          }
        });
      }),
      
      // Mock effects API
      http.get('/api/effects', () => {
        return HttpResponse.json({
          success: true,
          effects: mockEffects
        });
      }),
      
      // Mock image upload
      http.post('/api/upload/image', () => {
        return HttpResponse.json({
          success: true,
          fileUrl: 'https://example.com/uploaded-image.jpg',
          fileSize: 1024000 // 1MB
        });
      }),
      
      // Mock effect application
      http.post('/api/effects/webapp/apply', () => {
        return HttpResponse.json({
          success: true,
          taskId: 'task-123',
          status: 'PENDING'
        });
      }),
      
      // Mock task status polling
      http.get('/api/tasks/task-123/status', () => {
        return HttpResponse.json({
          success: true,
          status: 'SUCCESS',
          taskId: 'task-123'
        });
      }),
      
      // Mock task results
      http.get('/api/tasks/task-123/results', () => {
        return HttpResponse.json({
          success: true,
          results: [
            'https://example.com/result1.jpg',
            'https://example.com/result2.jpg'
          ],
          taskId: 'task-123'
        });
      })
    );
  });

  describe('File Upload Component', () => {
    test('should accept valid image files within 10MB limit', async () => {
      const onUpload = vi.fn();
      const validFile = createMockFile('test.jpg', 5 * 1024 * 1024); // 5MB
      Object.defineProperty(validFile, 'size', { value: 5 * 1024 * 1024 });
      
      render(
        <TestWrapper>
          <TaskImageUploader onUpload={onUpload} />
        </TestWrapper>
      );

      const fileInput = screen.getByRole('file') as HTMLInputElement;
      
      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [validFile] }
        });
      });

      expect(onUpload).toHaveBeenCalledWith(validFile);
    });

    test('should reject files over 10MB limit', async () => {
      const onUpload = vi.fn();
      const oversizedFile = createMockFile('large.jpg', 15 * 1024 * 1024); // 15MB
      Object.defineProperty(oversizedFile, 'size', { value: 15 * 1024 * 1024 });
      
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', feature: 'test' }}>
            <TaskImageUploader onUpload={onUpload} />
          </ErrorBoundary>
        </TestWrapper>
      );

      const fileInput = screen.getByRole('file') as HTMLInputElement;
      
      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [oversizedFile] }
        });
      });

      // Should show error message about file size
      await waitFor(() => {
        expect(screen.getByText(/文件大小.*超过限制.*10MB/)).toBeInTheDocument();
      });

      expect(onUpload).not.toHaveBeenCalled();
    });

    test('should reject unsupported file types', async () => {
      const onUpload = vi.fn();
      const invalidFile = createMockFile('document.pdf', 1024, 'application/pdf');
      
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', feature: 'test' }}>
            <TaskImageUploader onUpload={onUpload} />
          </ErrorBoundary>
        </TestWrapper>
      );

      const fileInput = screen.getByRole('file') as HTMLInputElement;
      
      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [invalidFile] }
        });
      });

      // Should show error about file type
      await waitFor(() => {
        expect(screen.getByText(/不支持的文件类型/)).toBeInTheDocument();
      });

      expect(onUpload).not.toHaveBeenCalled();
    });

    test('should show file preview after successful upload', async () => {
      const onUpload = vi.fn();
      const validFile = createMockFile('preview.jpg', 2 * 1024 * 1024);
      
      const fileObj = {
        url: 'data:image/jpeg;base64,mockdata',
        name: 'preview.jpg',
        size: 2 * 1024 * 1024
      };
      
      render(
        <TestWrapper>
          <TaskImageUploader 
            fileObj={fileObj}
            onUpload={onUpload} 
          />
        </TestWrapper>
      );

      // Should show image preview
      expect(screen.getByRole('img', { name: /preview.jpg/ })).toBeInTheDocument();
      expect(screen.getByText(/preview.jpg.*2.0MB/)).toBeInTheDocument();
    });
  });

  describe('Effects Selection Flow', () => {
    test('should load and display available effects', async () => {
      render(
        <TestWrapper>
          <Effects />
        </TestWrapper>
      );

      // Should load effects
      await waitFor(() => {
        expect(screen.getByText('Portrait Enhancement')).toBeInTheDocument();
        expect(screen.getByText('Background Removal')).toBeInTheDocument();
      });

      // Should show effect thumbnails
      expect(screen.getByRole('img', { name: /Portrait Enhancement/ })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /Background Removal/ })).toBeInTheDocument();
    });

    test('should handle effect selection and navigation', async () => {
      const { container } = render(
        <TestWrapper>
          <Effects />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Portrait Enhancement')).toBeInTheDocument();
      });

      // Click on first effect
      const effectCard = screen.getByText('Portrait Enhancement').closest('div');
      await user.click(effectCard!);

      // Should navigate to apply effect page (mocked)
      // In real app, this would use router navigation
    });

    test('should show loading state while fetching effects', async () => {
      // Delay the effects API response
      server.use(
        http.get('/api/effects', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            effects: mockEffects
          });
        })
      );

      render(
        <TestWrapper>
          <Effects />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should load effects
      await waitFor(() => {
        expect(screen.getByText('Portrait Enhancement')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Effect Application Process', () => {
    test('should complete full effect processing workflow', async () => {
      render(
        <TestWrapper>
          <ApplyEffect />
        </TestWrapper>
      );

      // Upload image
      const fileInput = screen.getByRole('file') as HTMLInputElement;
      const testFile = createMockFile('test.jpg', 2 * 1024 * 1024);
      
      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [testFile] }
        });
      });

      // Should show uploaded image preview
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      // Apply effect
      const applyButton = screen.getByRole('button', { name: /apply effect/i });
      await user.click(applyButton);

      // Should show processing state
      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      // Should show results after processing
      await waitFor(() => {
        expect(screen.getByText(/AI Enhanced Results/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('should ensure webappId is passed as string to RunningHub API', async () => {
      let capturedRequest: any = null;
      
      server.use(
        http.post('/api/effects/webapp/apply', async ({ request }) => {
          capturedRequest = await request.json();
          return HttpResponse.json({
            success: true,
            taskId: 'task-123',
            status: 'PENDING'
          });
        })
      );

      render(
        <TestWrapper>
          <ApplyEffect />
        </TestWrapper>
      );

      const fileInput = screen.getByRole('file') as HTMLInputElement;
      const testFile = createMockFile('test.jpg', 1024 * 1024);
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      await user.click(screen.getByRole('button', { name: /apply effect/i }));

      await waitFor(() => {
        expect(capturedRequest).toBeTruthy();
        // Ensure webappId is string, not integer
        expect(typeof capturedRequest.webappId).toBe('string');
        // Ensure fieldValue is string
        expect(typeof capturedRequest.nodeInfoList[0].fieldValue).toBe('string');
      });
    });

    test('should handle API errors gracefully', async () => {
      server.use(
        http.post('/api/effects/webapp/apply', () => {
          return HttpResponse.json(
            { success: false, error: 'APIKEY_INVALID_NODE_INFO' },
            { status: 400 }
          );
        })
      );

      render(
        <TestWrapper>
          <ApplyEffect />
        </TestWrapper>
      );

      const fileInput = screen.getByRole('file') as HTMLInputElement;
      const testFile = createMockFile('test.jpg', 1024 * 1024);
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      await user.click(screen.getByRole('button', { name: /apply effect/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/API error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Results Display', () => {
    test('should display processed results in gallery', async () => {
      const mockImages = [
        { id: '1', url: 'https://example.com/result1.jpg' },
        { id: '2', url: 'https://example.com/result2.jpg' }
      ];

      render(
        <TestWrapper>
          <TaskResultGallery 
            images={mockImages}
            onPreview={vi.fn()}
          />
        </TestWrapper>
      );

      // Should show gallery title
      expect(screen.getByText('AI Enhanced Results')).toBeInTheDocument();
      
      // Should show result count
      expect(screen.getByText('2 results')).toBeInTheDocument();
      
      // Should show result images
      expect(screen.getAllByRole('img', { name: /AI Enhanced Result/ })).toHaveLength(2);
    });

    test('should handle image download functionality', async () => {
      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock fetch for download
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob())
      });

      const mockImages = [
        { id: '1', url: 'https://example.com/result1.jpg' }
      ];

      render(
        <TestWrapper>
          <TaskResultGallery images={mockImages} />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /download result/i });
      await user.click(downloadButton);

      // Should show downloading state
      expect(screen.getByText(/downloading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/download result/i)).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/result1.jpg');
    });

    test('should show progressive loading for large result sets', async () => {
      const manyImages = Array.from({ length: 10 }, (_, i) => ({
        id: `img-${i}`,
        url: `https://example.com/result${i}.jpg`
      }));

      render(
        <TestWrapper>
          <TaskResultGallery images={manyImages} />
        </TestWrapper>
      );

      // Should initially show only first 3 images
      expect(screen.getAllByRole('img', { name: /AI Enhanced Result/ })).toHaveLength(3);
      
      // Should show load more button
      expect(screen.getByRole('button', { name: /load.*more/i })).toBeInTheDocument();
      
      // Click load more
      await user.click(screen.getByRole('button', { name: /load.*more/i }));
      
      // Should show more images
      await waitFor(() => {
        expect(screen.getAllByRole('img', { name: /AI Enhanced Result/ })).toHaveLength(6);
      });
    });
  });

  describe('Error Boundary Integration', () => {
    test('should catch and handle component errors gracefully', async () => {
      // Mock console.error to suppress error logs in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test error in component');
      };

      render(
        <TestWrapper>
          <ErrorBoundary config={{ 
            level: 'component', 
            feature: 'test_feature',
            fallback: <div>Component Error Fallback</div>
          }}>
            <ErrorComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Should show error boundary fallback
      expect(screen.getByText('Component Error Fallback')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('should handle image upload errors with boundary', async () => {
      const onUpload = vi.fn().mockImplementation(() => {
        throw new Error('Upload processing error');
      });
      
      render(
        <TestWrapper>
          <ErrorBoundary config={{ 
            level: 'component', 
            feature: 'image_upload',
            fallback: (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-gray-500">图片上传组件暂时不可用</p>
                <p className="text-sm text-gray-400 mt-1">请刷新页面重试</p>
              </div>
            )
          }}>
            <TaskImageUploader onUpload={onUpload} />
          </ErrorBoundary>
        </TestWrapper>
      );

      const fileInput = screen.getByRole('file') as HTMLInputElement;
      const testFile = createMockFile('test.jpg', 1024 * 1024);
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
      });

      // Should show error boundary fallback for upload component
      await waitFor(() => {
        expect(screen.getByText('图片上传组件暂时不可用')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring', () => {
    test('should track effect processing metrics', async () => {
      const performanceNowSpy = vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(3000); // End time

      const mockImages = [
        { id: '1', url: 'https://example.com/result1.jpg' }
      ];

      render(
        <TestWrapper>
          <TaskResultGallery images={mockImages} />
        </TestWrapper>
      );

      // Performance tracking should be called
      expect(performanceNowSpy).toHaveBeenCalled();
      
      performanceNowSpy.mockRestore();
    });

    test('should handle image load performance tracking', async () => {
      const mockImages = [
        { id: '1', url: 'https://example.com/result1.jpg' }
      ];

      render(
        <TestWrapper>
          <TaskResultGallery images={mockImages} />
        </TestWrapper>
      );

      const image = screen.getByRole('img', { name: /AI Enhanced Result/ });
      
      // Simulate image load event
      fireEvent.load(image);

      // Should update loaded images state
      await waitFor(() => {
        expect(screen.getByText(/100%/)).toBeInTheDocument(); // Loading progress
      });
    });
  });
});