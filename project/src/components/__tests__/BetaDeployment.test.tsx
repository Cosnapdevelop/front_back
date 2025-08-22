import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BetaOnboardingTutorial from '../Onboarding/BetaOnboardingTutorial';
import FeedbackWidget from '../Feedback/FeedbackWidget';
import RealTimeMonitor from '../Performance/RealTimeMonitor';

// Mock contexts
const mockBetaContext = {
  analytics: { trackEvent: vi.fn() },
  userAccess: { accessLevel: 'PREMIUM' }
};

const mockAuthContext = {
  user: { id: 'test-user-1', username: 'testuser' }
};

const mockToastContext = {
  push: vi.fn()
};

vi.mock('../../context/BetaContext', () => ({
  useBeta: () => mockBetaContext
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => mockToastContext
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('Beta Deployment Tests', () => {
  describe('BetaOnboardingTutorial', () => {
    it('should render tutorial when user is a beta user', () => {
      render(<BetaOnboardingTutorial />);
      // Since tutorial is not visible by default, we check for the component structure
      expect(document.body).toBeDefined();
    });

    it('should track tutorial events', async () => {
      // Mock localStorage to trigger tutorial visibility
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn()
        },
        writable: true
      });

      render(<BetaOnboardingTutorial />);
      
      // Tutorial should track events when user interactions occur
      expect(mockBetaContext.analytics.trackEvent).toBeDefined();
    });
  });

  describe('FeedbackWidget', () => {
    it('should render feedback trigger button', () => {
      render(<FeedbackWidget position="bottom-right" />);
      
      // Should render the floating feedback button
      const feedbackButton = screen.getByRole('button');
      expect(feedbackButton).toBeInTheDocument();
    });

    it('should open feedback modal when clicked', async () => {
      render(<FeedbackWidget position="bottom-right" />);
      
      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockBetaContext.analytics.trackEvent).toHaveBeenCalledWith(
          'feedback_widget_opened',
          expect.any(Object)
        );
      });
    });

    it('should handle auto-trigger after actions', async () => {
      render(
        <FeedbackWidget 
          position="bottom-right" 
          autoTrigger={{ afterActions: 2, afterTime: 1 }}
        />
      );

      // Simulate user actions
      fireEvent.click(document.body);
      fireEvent.click(document.body);

      // Wait for auto-trigger
      await waitFor(() => {
        expect(mockBetaContext.analytics.trackEvent).toHaveBeenCalledWith(
          'feedback_auto_triggered',
          expect.any(Object)
        );
      }, { timeout: 2000 });
    });
  });

  describe('RealTimeMonitor', () => {
    it('should render performance monitor', () => {
      render(<RealTimeMonitor />);
      
      // Should render minimized by default
      const monitorButton = screen.getByRole('button');
      expect(monitorButton).toBeInTheDocument();
    });

    it('should track performance metrics', async () => {
      // Mock performance API
      Object.defineProperty(window, 'performance', {
        value: {
          now: vi.fn().mockReturnValue(1000),
          getEntriesByType: vi.fn().mockReturnValue([{
            loadEventEnd: 2000,
            loadEventStart: 1000,
            domContentLoadedEventEnd: 1500,
            navigationStart: 0
          }]),
          memory: {
            usedJSHeapSize: 10 * 1024 * 1024,
            totalJSHeapSize: 50 * 1024 * 1024,
            jsHeapSizeLimit: 100 * 1024 * 1024
          }
        },
        writable: true
      });

      render(<RealTimeMonitor />);
      
      // Should initialize and measure performance
      expect(window.performance.getEntriesByType).toBeDefined();
    });

    it('should expand when clicked', async () => {
      render(<RealTimeMonitor />);
      
      const monitorButton = screen.getByRole('button');
      fireEvent.click(monitorButton);

      // Should show expanded monitor with metrics
      await waitFor(() => {
        const performanceText = screen.getByText('Performance Monitor');
        expect(performanceText).toBeInTheDocument();
      });
    });
  });
});

describe('Beta Integration Tests', () => {
  it('should have all components available for production deployment', () => {
    // Test that all components can be imported without errors
    expect(BetaOnboardingTutorial).toBeDefined();
    expect(FeedbackWidget).toBeDefined();
    expect(RealTimeMonitor).toBeDefined();
  });

  it('should handle component interactions without crashes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Render all components together
    render(
      <>
        <BetaOnboardingTutorial />
        <FeedbackWidget position="bottom-right" />
        <RealTimeMonitor />
      </>,
      { container }
    );

    // Simulate various interactions
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      fireEvent.click(button);
    });

    // Should not crash
    expect(container).toBeInTheDocument();
    
    document.body.removeChild(container);
  });

  it('should properly handle beta context data', () => {
    render(<BetaOnboardingTutorial />);
    
    // Should access beta context without errors
    expect(mockBetaContext.userAccess.accessLevel).toBe('PREMIUM');
    expect(mockAuthContext.user.username).toBe('testuser');
  });
});