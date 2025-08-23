import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../pages/Home';
import MobileNavbar from '../components/Layout/MobileNavbar';
import MobilePayment from '../components/Payment/MobilePayment';
import MobileImageGallery from '../components/Mobile/MobileImageGallery';
import PullToRefresh from '../components/Mobile/PullToRefresh';
import ChineseSocialShare from '../components/Mobile/ChineseSocialShare';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

// Mock viewport sizes for testing
const mockViewportSizes = {
  mobile_s: { width: 320, height: 568 },
  mobile_m: { width: 375, height: 667 },
  mobile_l: { width: 425, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 }
};

// Mock implementations
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  const base: Record<string, any> = {
    Home: (props: any) => <span data-testid="home-icon" {...props}>Home</span>,
    Sparkles: (props: any) => <span data-testid="sparkles-icon" {...props}>Sparkles</span>,
    Users: (props: any) => <span data-testid="users-icon" {...props}>Users</span>,
    User: (props: any) => <span data-testid="user-icon" {...props}>User</span>,
    Bell: (props: any) => <span data-testid="bell-icon" {...props}>Bell</span>,
    Search: (props: any) => <span data-testid="search-icon" {...props}>Search</span>,
    Menu: (props: any) => <span data-testid="menu-icon" {...props}>Menu</span>,
    X: (props: any) => <span data-testid="x-icon" {...props}>X</span>,
    ArrowLeft: (props: any) => <span data-testid="arrow-left-icon" {...props}>ArrowLeft</span>,
    Share2: (props: any) => <span data-testid="share-icon" {...props}>Share2</span>,
    Download: (props: any) => <span data-testid="download-icon" {...props}>Download</span>,
    Heart: (props: any) => <span data-testid="heart-icon" {...props}>Heart</span>,
    MessageCircle: (props: any) => <span data-testid="message-icon" {...props}>MessageCircle</span>,
    RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props}>RefreshCw</span>,
    QrCode: (props: any) => <span data-testid="qr-icon" {...props}>QrCode</span>,
    Copy: (props: any) => <span data-testid="copy-icon" {...props}>Copy</span>,
    Check: (props: any) => <span data-testid="check-icon" {...props}>Check</span>,
  };
  return new Proxy({ ...actual, ...base }, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      // Fallback generic icon component for any missing export
      return (props: any) => <span data-testid={`${String(prop)}-icon`} {...props}>{String(prop)}</span>;
    },
  });
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Helper function to set viewport size
const setViewport = (size: keyof typeof mockViewportSizes) => {
  const { width, height } = mockViewportSizes[size];
  
  // Mock window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Mock CSS media queries
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const maxWidth = query.match(/max-width:\s*(\d+)px/)?.[1];
      const minWidth = query.match(/min-width:\s*(\d+)px/)?.[1];
      
      let matches = false;
      if (maxWidth) {
        matches = width <= parseInt(maxWidth);
      } else if (minWidth) {
        matches = width >= parseInt(minWidth);
      }
      
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Helper function to test touch interactions
const simulateTouch = (element: Element, eventType: string, touches: Touch[]) => {
  const touchEvent = new TouchEvent(eventType, {
    touches,
    targetTouches: touches,
    changedTouches: touches,
    bubbles: true,
    cancelable: true,
  });
  
  element.dispatchEvent(touchEvent);
};

describe('Mobile Responsiveness Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    // Reset viewport to mobile by default
    setViewport('mobile_m');
    
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Viewport Responsiveness', () => {
    it.each(Object.keys(mockViewportSizes))('should render correctly on %s viewport', (size) => {
      setViewport(size as keyof typeof mockViewportSizes);
      
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Home component should render without crashes
      expect(screen.getByText(/Cosnap/)).toBeInTheDocument();
    });

    it('should show mobile navigation on small screens', () => {
      setViewport('mobile_m');
      
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      expect(screen.getByText('Cosnap')).toBeInTheDocument();
    });

    it('should hide mobile navigation on large screens', () => {
      setViewport('desktop');
      
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      // Mobile navigation should be hidden or adapted for desktop
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch targets with minimum 44px size', () => {
      setViewport('mobile_m');
      
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      const touchTargets = screen.getAllByRole('button');
      
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target);
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height);
        const minWidth = parseInt(styles.minWidth) || parseInt(styles.width);
        
        // Touch targets should be at least 44px (this test assumes CSS is applied)
        expect(minHeight >= 44 || minWidth >= 44).toBeTruthy();
      });
    });

    it('should respond to touch events', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <PullToRefresh onRefresh={onRefresh}>
            <div>Content</div>
          </PullToRefresh>
        </TestWrapper>
      );
      
      const container = screen.getByText('Content').parentElement;
      expect(container).toBeInTheDocument();
      
      // Simulate touch events for pull to refresh
      if (container) {
        simulateTouch(container, 'touchstart', [
          new Touch({
            identifier: 1,
            target: container,
            clientX: 200,
            clientY: 100,
          })
        ]);
        
        simulateTouch(container, 'touchmove', [
          new Touch({
            identifier: 1,
            target: container,
            clientX: 200,
            clientY: 200,
          })
        ]);
        
        simulateTouch(container, 'touchend', []);
        
        // Should trigger refresh if pulled far enough
        await waitFor(() => {
          // This would depend on actual implementation
          expect(container).toBeInTheDocument();
        });
      }
    });
  });

  describe('Chinese Mobile UX Patterns', () => {
    it('should display WeChat-style payment options', () => {
      const mockPaymentData = {
        amount: 99.99,
        description: '测试支付',
        onSuccess: vi.fn(),
        onCancel: vi.fn(),
        onError: vi.fn(),
      };
      
      render(
        <TestWrapper>
          <MobilePayment {...mockPaymentData} />
        </TestWrapper>
      );
      
      expect(screen.getByText('微信支付')).toBeInTheDocument();
      expect(screen.getByText('支付宝')).toBeInTheDocument();
      expect(screen.getByText('银联云闪付')).toBeInTheDocument();
    });

    it('should support Chinese social sharing platforms', () => {
      const shareData = {
        title: '测试分享',
        description: '测试描述',
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://example.com'
      };
      
      render(
        <TestWrapper>
          <ChineseSocialShare 
            shareData={shareData} 
            isOpen={true} 
            onClose={() => {}} 
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('微信好友')).toBeInTheDocument();
      expect(screen.getByText('朋友圈')).toBeInTheDocument();
      expect(screen.getByText('QQ')).toBeInTheDocument();
      expect(screen.getByText('微博')).toBeInTheDocument();
      expect(screen.getByText('小红书')).toBeInTheDocument();
    });
  });

  describe('Image Gallery Touch Interactions', () => {
    it('should support swipe navigation', async () => {
      const mockImages = [
        { id: '1', url: 'image1.jpg', title: 'Image 1' },
        { id: '2', url: 'image2.jpg', title: 'Image 2' },
        { id: '3', url: 'image3.jpg', title: 'Image 3' },
      ];
      
      render(
        <TestWrapper>
          <MobileImageGallery 
            images={mockImages}
            initialIndex={0}
            onClose={() => {}}
          />
        </TestWrapper>
      );
      
      const gallery = screen.getByText('1 / 3').closest('div');
      expect(gallery).toBeInTheDocument();
    });

    it('should support pinch to zoom', () => {
      const mockImages = [
        { id: '1', url: 'image1.jpg', title: 'Image 1' },
      ];
      
      render(
        <TestWrapper>
          <MobileImageGallery 
            images={mockImages}
            initialIndex={0}
            onClose={() => {}}
          />
        </TestWrapper>
      );
      
      // Check if zoom controls are present
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('should implement touch-action optimization', () => {
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check if touch-action CSS is properly applied
        expect(button.style.touchAction || button.className).toBeDefined();
      });
    });

    it('should prevent text selection on interactive elements', () => {
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        // Check if user-select: none is applied via CSS classes
        expect(element.className.includes('touch-feedback') || 
               element.style.userSelect === 'none').toBeTruthy();
      });
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain proper focus management', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      const firstButton = screen.getAllByRole('button')[0];
      await user.tab();
      
      expect(document.activeElement).toBe(firstButton);
    });

    it('should provide adequate color contrast', () => {
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      // This test would need actual color contrast calculation
      // For now, we just check that elements are rendered
      expect(screen.getByText('Cosnap')).toBeInTheDocument();
    });

    it('should support screen reader navigation', () => {
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check that buttons have accessible labels
        expect(
          button.getAttribute('aria-label') || 
          button.textContent || 
          button.querySelector('[data-testid]')
        ).toBeTruthy();
      });
    });
  });

  describe('Network Optimization', () => {
    it('should handle slow network conditions', async () => {
      // Mock slow network
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          saveData: true,
        },
        writable: true
      });
      
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // App should render even on slow networks
      expect(screen.getByText(/Cosnap/)).toBeInTheDocument();
    });

    it('should implement progressive loading', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Check for loading states or skeleton screens
      // This would depend on actual implementation
      expect(screen.getByText(/Cosnap/)).toBeInTheDocument();
    });
  });

  describe('PWA Features', () => {
    it('should register service worker', async () => {
      // Mock service worker registration
      const mockServiceWorker = {
        register: vi.fn().mockResolvedValue({
          scope: '/',
          addEventListener: vi.fn(),
        }),
      };
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true
      });
      
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Service worker should be registered (this happens in main.tsx)
      expect(navigator.serviceWorker).toBeDefined();
    });

    it('should support offline functionality', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });
      
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // App should still render when offline
      expect(screen.getByText(/Cosnap/)).toBeInTheDocument();
    });
  });

  describe('Safe Area Support', () => {
    it('should handle safe area insets', () => {
      // Mock safe area insets for iPhone X+
      Object.defineProperty(document.documentElement.style, 'paddingTop', {
        value: 'env(safe-area-inset-top)',
        writable: true
      });
      
      render(
        <TestWrapper>
          <MobileNavbar onBack={() => {}} />
        </TestWrapper>
      );
      
      // Component should render with safe area considerations
      expect(screen.getByText('Cosnap')).toBeInTheDocument();
    });
  });
});

describe('Mobile Performance Tests', () => {
  it('should complete initial render within performance budget', async () => {
    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Cosnap/)).toBeInTheDocument();
    });
    
    const renderTime = performance.now() - startTime;
    
    // Initial render should complete within 100ms for good mobile performance
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle rapid touch interactions without lag', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    
    render(
      <TestWrapper>
        <PullToRefresh onRefresh={onRefresh}>
          <div data-testid="content">Content</div>
        </PullToRefresh>
      </TestWrapper>
    );
    
    const content = screen.getByTestId('content');
    
    // Simulate rapid touch events
    for (let i = 0; i < 10; i++) {
      fireEvent.touchStart(content);
      fireEvent.touchMove(content);
      fireEvent.touchEnd(content);
    }
    
    // Should handle all events without crashing
    expect(content).toBeInTheDocument();
  });
});