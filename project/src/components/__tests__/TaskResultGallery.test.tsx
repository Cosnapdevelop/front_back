/**
 * Tests for TaskResultGallery component
 * 
 * Tests image gallery functionality including:
 * - Display of AI processing results
 * - Image carousel navigation
 * - Loading and error states
 * - Download functionality
 * - Responsive behavior
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, render, fireEvent, waitFor } from '../../test/test-utils';
import { userEvent } from '../../test/test-utils';
import TaskResultGallery from '../TaskResultGallery';
import { mockCompletedTask, mockTask } from '../../test/test-utils';

// Mock the image download functionality
const mockDownload = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'mock-blob-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

// Mock fetch for image downloading
global.fetch = vi.fn();

// Mock IntersectionObserver for image lazy loading
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('TaskResultGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering states', () => {
    test('should render empty state when no results', () => {
      const emptyTask = { ...mockTask, results: [] };
      
      render(<TaskResultGallery task={emptyTask} />);

      expect(screen.getByText(/暂无结果|no results|processing/i)).toBeInTheDocument();
    });

    test('should render loading state for pending task', () => {
      render(<TaskResultGallery task={mockTask} />);

      expect(screen.getByText(/处理中|processing|generating/i)).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('should render gallery with results', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
      
      // Should show multiple images
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(mockCompletedTask.results.length);
      
      // First image should be visible
      expect(images[0]).toHaveAttribute('src', mockCompletedTask.results[0]);
      expect(images[0]).toHaveAttribute('alt', expect.stringContaining('Result'));
    });

    test('should render task information', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      expect(screen.getByText(mockCompletedTask.effectName)).toBeInTheDocument();
      expect(screen.getByText(/完成时间|completed/i)).toBeInTheDocument();
      expect(screen.getByText(/生成了.*张图片|generated.*images/i)).toBeInTheDocument();
    });
  });

  describe('Image gallery navigation', () => {
    test('should navigate between images using buttons', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const nextButton = screen.getByRole('button', { name: /下一张|next/i });
      const prevButton = screen.getByRole('button', { name: /上一张|previous/i });

      // Previous button should be disabled on first image
      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();

      // Click next
      await user.click(nextButton);
      
      const currentImage = screen.getByTestId('current-image');
      expect(currentImage).toHaveAttribute('src', mockCompletedTask.results[1]);

      // Both buttons should be enabled for middle images
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).toBeDisabled(); // Only 2 images in mock data

      // Click previous to go back
      await user.click(prevButton);
      
      expect(currentImage).toHaveAttribute('src', mockCompletedTask.results[0]);
    });

    test('should navigate using keyboard arrows', async () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      const gallery = screen.getByTestId('image-gallery');
      
      // Focus the gallery
      gallery.focus();
      
      // Press right arrow
      fireEvent.keyDown(gallery, { key: 'ArrowRight', code: 'ArrowRight' });
      
      const currentImage = screen.getByTestId('current-image');
      expect(currentImage).toHaveAttribute('src', mockCompletedTask.results[1]);

      // Press left arrow
      fireEvent.keyDown(gallery, { key: 'ArrowLeft', code: 'ArrowLeft' });
      
      expect(currentImage).toHaveAttribute('src', mockCompletedTask.results[0]);
    });

    test('should show image counter', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    test('should handle single image gallery', () => {
      const singleImageTask = {
        ...mockCompletedTask,
        results: ['https://example.com/single.jpg']
      };
      
      render(<TaskResultGallery task={singleImageTask} />);

      // Navigation buttons should be hidden or disabled
      const nextButton = screen.queryByRole('button', { name: /下一张|next/i });
      const prevButton = screen.queryByRole('button', { name: /上一张|previous/i });
      
      expect(nextButton).toBeNull();
      expect(prevButton).toBeNull();
      
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });
  });

  describe('Image interaction', () => {
    test('should open fullscreen view on image click', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const image = screen.getByTestId('current-image');
      await user.click(image);

      expect(screen.getByTestId('fullscreen-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('fullscreen-image')).toHaveAttribute(
        'src', 
        mockCompletedTask.results[0]
      );
    });

    test('should close fullscreen with escape key', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      // Open fullscreen
      const image = screen.getByTestId('current-image');
      await user.click(image);
      
      expect(screen.getByTestId('fullscreen-overlay')).toBeInTheDocument();

      // Press escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByTestId('fullscreen-overlay')).not.toBeInTheDocument();
      });
    });

    test('should close fullscreen by clicking overlay', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      // Open fullscreen
      await user.click(screen.getByTestId('current-image'));
      
      const overlay = screen.getByTestId('fullscreen-overlay');
      expect(overlay).toBeInTheDocument();

      // Click overlay (not the image)
      await user.click(overlay);
      
      await waitFor(() => {
        expect(screen.queryByTestId('fullscreen-overlay')).not.toBeInTheDocument();
      });
    });

    test('should navigate in fullscreen mode', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      // Open fullscreen
      await user.click(screen.getByTestId('current-image'));
      
      const fullscreenImage = screen.getByTestId('fullscreen-image');
      expect(fullscreenImage).toHaveAttribute('src', mockCompletedTask.results[0]);

      // Navigate to next image in fullscreen
      const nextButton = screen.getByRole('button', { name: /下一张|next/i });
      await user.click(nextButton);
      
      expect(fullscreenImage).toHaveAttribute('src', mockCompletedTask.results[1]);
    });
  });

  describe('Download functionality', () => {
    beforeEach(() => {
      // Mock successful fetch response
      global.fetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/jpeg' }))
      });

      // Mock createElement for download link
      const mockAnchor = {
        href: '',
        download: '',
        click: mockDownload,
        style: { display: '' }
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    });

    test('should download current image', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const downloadButton = screen.getByRole('button', { name: /下载|download/i });
      await user.click(downloadButton);

      expect(global.fetch).toHaveBeenCalledWith(mockCompletedTask.results[0]);
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockDownload).toHaveBeenCalled();
    });

    test('should download all images', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const downloadAllButton = screen.getByRole('button', { name: /下载全部|download all/i });
      await user.click(downloadAllButton);

      // Should fetch all result images
      expect(global.fetch).toHaveBeenCalledTimes(mockCompletedTask.results.length);
      mockCompletedTask.results.forEach(url => {
        expect(global.fetch).toHaveBeenCalledWith(url);
      });
    });

    test('should handle download failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const downloadButton = screen.getByRole('button', { name: /下载|download/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/下载失败|download failed/i)).toBeInTheDocument();
      });
    });

    test('should show download progress', async () => {
      let resolveDownload: (value: any) => void;
      const downloadPromise = new Promise(resolve => {
        resolveDownload = resolve;
      });
      
      global.fetch.mockReturnValue(downloadPromise);

      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const downloadButton = screen.getByRole('button', { name: /下载|download/i });
      await user.click(downloadButton);

      // Should show loading state
      expect(screen.getByText(/下载中|downloading/i)).toBeInTheDocument();
      expect(downloadButton).toBeDisabled();

      // Complete download
      resolveDownload!({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'], { type: 'image/jpeg' }))
      });

      await waitFor(() => {
        expect(screen.queryByText(/下载中|downloading/i)).not.toBeInTheDocument();
        expect(downloadButton).not.toBeDisabled();
      });
    });
  });

  describe('Error handling', () => {
    test('should handle failed task', () => {
      const failedTask = { ...mockTask, status: 'FAILED' as const };
      
      render(<TaskResultGallery task={failedTask} />);

      expect(screen.getByText(/处理失败|failed|error/i)).toBeInTheDocument();
      expect(screen.queryByTestId('image-gallery')).not.toBeInTheDocument();
    });

    test('should handle missing images gracefully', () => {
      const taskWithInvalidResults = {
        ...mockCompletedTask,
        results: ['', null, undefined].filter(Boolean) as string[]
      };
      
      render(<TaskResultGallery task={taskWithInvalidResults} />);

      expect(screen.getByText(/暂无结果|no results/i)).toBeInTheDocument();
    });

    test('should handle image load errors', async () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      const image = screen.getByTestId('current-image');
      
      // Simulate image load error
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText(/图片加载失败|failed to load/i)).toBeInTheDocument();
      });
    });

    test('should show retry option for failed images', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const image = screen.getByTestId('current-image');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /重试|retry/i })).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /重试|retry/i });
      await user.click(retryButton);

      // Image should be reloaded
      expect(image).toHaveAttribute('src', mockCompletedTask.results[0]);
    });
  });

  describe('Performance and lazy loading', () => {
    test('should implement lazy loading for images', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      // IntersectionObserver should be used
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    test('should preload adjacent images', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      // Navigate to trigger preloading
      const nextButton = screen.getByRole('button', { name: /下一张|next/i });
      await user.click(nextButton);

      // Should preload the previous and next images
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      expect(preloadLinks.length).toBeGreaterThan(0);
    });

    test('should optimize image sizes for display', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        // Should have appropriate loading and sizing attributes
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveStyle({ 'max-width': '100%' });
      });
    });
  });

  describe('Responsive behavior', () => {
    test('should adapt layout for mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TaskResultGallery task={mockCompletedTask} />);

      const gallery = screen.getByTestId('image-gallery');
      expect(gallery).toHaveClass(/mobile|sm:/);
    });

    test('should handle touch gestures', async () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      const gallery = screen.getByTestId('image-gallery');
      
      // Simulate touch swipe left
      fireEvent.touchStart(gallery, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchMove(gallery, {
        touches: [{ clientX: 50, clientY: 100 }]
      });
      fireEvent.touchEnd(gallery);

      // Should navigate to next image
      const currentImage = screen.getByTestId('current-image');
      await waitFor(() => {
        expect(currentImage).toHaveAttribute('src', mockCompletedTask.results[1]);
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      const gallery = screen.getByTestId('image-gallery');
      expect(gallery).toHaveAttribute('role', 'region');
      expect(gallery).toHaveAttribute('aria-label', expect.stringContaining('图片画廊'));

      const images = screen.getAllByRole('img');
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('alt', expect.stringContaining(`Result ${index + 1}`));
      });
    });

    test('should support keyboard navigation', () => {
      render(<TaskResultGallery task={mockCompletedTask} />);

      const gallery = screen.getByTestId('image-gallery');
      const nextButton = screen.getByRole('button', { name: /下一张|next/i });
      const prevButton = screen.getByRole('button', { name: /上一张|previous/i });

      // Gallery should be focusable
      expect(gallery).toHaveAttribute('tabIndex', '0');
      
      // Navigation buttons should be accessible
      expect(nextButton).not.toHaveAttribute('aria-disabled');
      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
    });

    test('should announce image changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<TaskResultGallery task={mockCompletedTask} />);

      const liveRegion = screen.getByLabelText(/当前显示|currently showing/i);
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      const nextButton = screen.getByRole('button', { name: /下一张|next/i });
      await user.click(nextButton);

      expect(liveRegion).toHaveTextContent(/第.*张|image.*of/i);
    });
  });
});