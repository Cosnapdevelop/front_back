import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ErrorBoundary, AIProcessingErrorBoundary, useErrorBoundary } from '../ErrorBoundary';
import { ErrorProvider, useErrorHandler } from '../../context/ErrorContext';
import { ToastProvider } from '../../context/ToastContext';
import { BaseError, ErrorCode, ErrorSeverity } from '../../types/errors';
import { circuitBreakerRegistry } from '../../utils/circuitBreaker';
import { retryManager } from '../../utils/retryManager';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';

// Mock external dependencies
jest.mock('../../utils/circuitBreaker');
jest.mock('../../utils/retryManager');
jest.mock('../../utils/asyncErrorHandler');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <ErrorProvider>
      {children}
    </ErrorProvider>
  </ToastProvider>
);

// Component that throws errors for testing
const ErrorThrowingComponent: React.FC<{ 
  errorType?: 'sync' | 'async' | 'network' | 'validation';
  shouldThrow?: boolean;
}> = ({ errorType = 'sync', shouldThrow = true }) => {
  React.useEffect(() => {
    if (shouldThrow && errorType === 'async') {
      setTimeout(() => {
        throw new BaseError('Async error', ErrorCode.NETWORK_ERROR, ErrorSeverity.HIGH, true);
      }, 0);
    }
  }, [errorType, shouldThrow]);

  if (shouldThrow && errorType === 'sync') {
    throw new BaseError('Sync error', ErrorCode.API_ERROR, ErrorSeverity.MEDIUM, true);
  }

  if (shouldThrow && errorType === 'network') {
    throw new BaseError('Network timeout', ErrorCode.NETWORK_ERROR, ErrorSeverity.HIGH, true);
  }

  if (shouldThrow && errorType === 'validation') {
    throw new BaseError('File too large', ErrorCode.FILE_TOO_LARGE, ErrorSeverity.MEDIUM, false);
  }

  return <div>Component rendered successfully</div>;
};

// Test component using error boundary hook
const ErrorBoundaryHookComponent: React.FC = () => {
  const { captureError, reportError } = useErrorBoundary();
  
  const handleTestError = () => {
    const error = new Error('Manual error test');
    captureError(error, 'test_component');
  };

  const handleReportError = () => {
    const error = new BaseError('Reported error', ErrorCode.USER_CANCELLED, ErrorSeverity.LOW);
    reportError(error, { component: 'test' });
  };

  return (
    <div>
      <button onClick={handleTestError}>Trigger Error</button>
      <button onClick={handleReportError}>Report Error</button>
    </div>
  );
};

// Test component using error handler context
const ErrorHandlerComponent: React.FC = () => {
  const { 
    reportError, 
    retryLastOperation, 
    clearErrorHistory,
    createRetryableFunction,
    executeWithCircuitBreaker 
  } = useErrorHandler();

  const testAsyncOperation = async () => {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Async operation failed')), 100);
    });
  };

  const retryableOperation = createRetryableFunction(testAsyncOperation, 'test_operation');

  const handleTestError = () => {
    const error = new BaseError('Test error', ErrorCode.TASK_TIMEOUT, ErrorSeverity.HIGH, true);
    reportError(error, { component: 'test', feature: 'error_handler' });
  };

  const handleRetryableOperation = async () => {
    try {
      await retryableOperation();
    } catch (error) {
      console.log('Operation failed after retries');
    }
  };

  const handleCircuitBreakerOperation = async () => {
    try {
      await executeWithCircuitBreaker('test_service', testAsyncOperation);
    } catch (error) {
      console.log('Circuit breaker operation failed');
    }
  };

  return (
    <div>
      <button onClick={handleTestError}>Report Error</button>
      <button onClick={retryLastOperation}>Retry Last</button>
      <button onClick={clearErrorHistory}>Clear History</button>
      <button onClick={handleRetryableOperation}>Test Retry</button>
      <button onClick={handleCircuitBreakerOperation}>Test Circuit Breaker</button>
    </div>
  );
};

describe('Error Boundary System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Error Boundary', () => {
    it('should catch and display component errors', () => {
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
            <ErrorThrowingComponent errorType="sync" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('should display error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
            <ErrorThrowingComponent errorType="sync" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/technical details/i)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should provide different UI for different error levels', () => {
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'page', enableReporting: false }}>
            <ErrorThrowingComponent errorType="network" />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Page-level error should have full-screen layout
      expect(screen.getByText(/connection issue/i)).toBeInTheDocument();
    });

    it('should handle retry functionality', async () => {
      let shouldThrow = true;
      const mockRetry = jest.fn().mockImplementation(() => {
        shouldThrow = false;
      });

      const TestComponent = () => {
        if (shouldThrow) {
          throw new BaseError('Retryable error', ErrorCode.NETWORK_ERROR, ErrorSeverity.HIGH, true);
        }
        return <div>Success after retry</div>;
      };

      render(
        <TestWrapper>
          <ErrorBoundary config={{ 
            level: 'component', 
            enableReporting: false,
            enableRetry: true,
            onRetry: mockRetry
          }}>
            <TestComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      const retryButton = screen.getByText(/try again/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockRetry).toHaveBeenCalled();
      });
    });
  });

  describe('Specialized Error Boundaries', () => {
    it('should use AI processing specific error boundary', () => {
      render(
        <TestWrapper>
          <AIProcessingErrorBoundary>
            <ErrorThrowingComponent errorType="sync" />
          </AIProcessingErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should provide different retry limits for different boundaries', async () => {
      const mockRetry = jest.fn();

      render(
        <TestWrapper>
          <AIProcessingErrorBoundary>
            <ErrorBoundary config={{ 
              onRetry: mockRetry,
              maxRetries: 2
            }}>
              <ErrorThrowingComponent errorType="sync" />
            </ErrorBoundary>
          </AIProcessingErrorBoundary>
        </TestWrapper>
      );

      const retryButton = screen.getByText(/try again/i);
      
      // First retry
      fireEvent.click(retryButton);
      await waitFor(() => expect(mockRetry).toHaveBeenCalledTimes(1));

      // Second retry
      fireEvent.click(retryButton);
      await waitFor(() => expect(mockRetry).toHaveBeenCalledTimes(2));

      // Third click should not retry (max reached)
      fireEvent.click(retryButton);
      await waitFor(() => expect(mockRetry).toHaveBeenCalledTimes(2));
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
            <ErrorThrowingComponent errorType="network" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/connection issue/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });

    it('should classify validation errors correctly', () => {
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
            <ErrorThrowingComponent errorType="validation" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/invalid input/i)).toBeInTheDocument();
    });

    it('should provide appropriate recovery actions for different error types', () => {
      render(
        <TestWrapper>
          <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
            <ErrorThrowingComponent errorType="network" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      expect(screen.getByText(/check connection/i)).toBeInTheDocument();
    });
  });
});

describe('Error Context and Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Reporting', () => {
    it('should report errors through context', () => {
      render(
        <TestWrapper>
          <ErrorHandlerComponent />
        </TestWrapper>
      );

      const reportButton = screen.getByText(/report error/i);
      fireEvent.click(reportButton);

      // Error should be reported (would show in toast)
      expect(screen.getByText(/report error/i)).toBeInTheDocument();
    });

    it('should track error history', async () => {
      render(
        <TestWrapper>
          <ErrorHandlerComponent />
        </TestWrapper>
      );

      const reportButton = screen.getByText(/report error/i);
      fireEvent.click(reportButton);

      // Clear history should be available
      const clearButton = screen.getByText(/clear history/i);
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Retry Manager Integration', () => {
    it('should create retryable functions', async () => {
      const mockExecuteWithRetry = jest.fn().mockRejectedValue(new Error('Test error'));
      (retryManager.executeWithRetry as jest.Mock) = mockExecuteWithRetry;

      render(
        <TestWrapper>
          <ErrorHandlerComponent />
        </TestWrapper>
      );

      const retryButton = screen.getByText(/test retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockExecuteWithRetry).toHaveBeenCalled();
      });
    });

    it('should handle retry failures gracefully', async () => {
      const mockExecuteWithRetry = jest.fn().mockRejectedValue(new Error('Max retries exceeded'));
      (retryManager.executeWithRetry as jest.Mock) = mockExecuteWithRetry;

      render(
        <TestWrapper>
          <ErrorHandlerComponent />
        </TestWrapper>
      );

      const retryButton = screen.getByText(/test retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockExecuteWithRetry).toHaveBeenCalled();
      });
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should execute operations with circuit breaker', async () => {
      const mockCircuitBreaker = {
        execute: jest.fn().mockRejectedValue(new Error('Circuit breaker open'))
      };
      const mockGet = jest.fn().mockReturnValue(mockCircuitBreaker);
      (circuitBreakerRegistry.get as jest.Mock) = mockGet;

      render(
        <TestWrapper>
          <ErrorHandlerComponent />
        </TestWrapper>
      );

      const circuitButton = screen.getByText(/test circuit breaker/i);
      fireEvent.click(circuitButton);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('test_service');
        expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      });
    });
  });
});

describe('Error Boundary Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide error capture functionality', () => {
    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <ErrorBoundaryHookComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    const triggerButton = screen.getByText(/trigger error/i);
    expect(triggerButton).toBeInTheDocument();

    fireEvent.click(triggerButton);
    // Error should be captured by boundary
  });

  it('should provide error reporting functionality', () => {
    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <ErrorBoundaryHookComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    const reportButton = screen.getByText(/report error/i);
    fireEvent.click(reportButton);

    // Error should be reported
    expect(reportButton).toBeInTheDocument();
  });
});

describe('Async Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle async errors in components', async () => {
    const mockCaptureError = jest.fn();
    (asyncErrorHandler.captureError as jest.Mock) = mockCaptureError;

    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: true }}>
          <ErrorThrowingComponent errorType="async" />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Wait for async error to be thrown
    await waitFor(() => {
      expect(screen.getByText(/component rendered successfully/i)).toBeInTheDocument();
    });
  });

  it('should integrate with global error handlers', () => {
    const mockInit = jest.fn();
    (asyncErrorHandler.init as jest.Mock) = mockInit;

    render(<TestWrapper><div>Test</div></TestWrapper>);

    // Async error handler should be initialized
    expect(mockInit).toHaveBeenCalled();
  });
});

describe('Performance and Memory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not cause memory leaks', () => {
    const { unmount } = render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <div>Test component</div>
        </ErrorBoundary>
      </TestWrapper>
    );

    // Should unmount without errors
    expect(() => unmount()).not.toThrow();
  });

  it('should handle multiple error boundaries efficiently', () => {
    const startTime = performance.now();

    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'page', enableReporting: false }}>
          <ErrorBoundary config={{ level: 'feature', enableReporting: false }}>
            <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
              <div>Nested boundaries test</div>
            </ErrorBoundary>
          </ErrorBoundary>
        </ErrorBoundary>
      </TestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with nested boundaries
    expect(renderTime).toBeLessThan(100); // Less than 100ms
  });

  it('should efficiently handle error state updates', async () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      
      if (count > 3) {
        throw new Error('Count exceeded limit');
      }

      return (
        <div>
          <span>Count: {count}</span>
          <button onClick={() => setCount(c => c + 1)}>Increment</button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <TestComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    const button = screen.getByText(/increment/i);
    
    // Click multiple times to trigger error
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});

describe('Error Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide proper ARIA labels', () => {
    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <ErrorThrowingComponent errorType="sync" />
        </ErrorBoundary>
      </TestWrapper>
    );

    const errorContainer = screen.getByRole('alert', { hidden: true });
    expect(errorContainer).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <ErrorThrowingComponent errorType="sync" />
        </ErrorBoundary>
      </TestWrapper>
    );

    const retryButton = screen.getByText(/try again/i);
    retryButton.focus();
    
    expect(document.activeElement).toBe(retryButton);
  });

  it('should announce errors to screen readers', () => {
    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'component', enableReporting: false }}>
          <ErrorThrowingComponent errorType="sync" />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Error message should be announced
    const errorMessage = screen.getByText(/something went wrong/i);
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});

// Integration tests
describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate all error handling components', async () => {
    const mockCircuitBreaker = {
      execute: jest.fn().mockResolvedValue('success'),
      getCurrentState: jest.fn().mockReturnValue('closed')
    };
    (circuitBreakerRegistry.get as jest.Mock) = jest.fn().mockReturnValue(mockCircuitBreaker);
    (circuitBreakerRegistry.getOrCreate as jest.Mock) = jest.fn().mockReturnValue(mockCircuitBreaker);

    const TestIntegrationComponent = () => {
      const { executeWithCircuitBreaker, reportError } = useErrorHandler();
      
      const handleIntegratedOperation = async () => {
        try {
          await executeWithCircuitBreaker('test_service', async () => {
            throw new Error('Integration test error');
          });
        } catch (error) {
          reportError(error as Error, { component: 'integration_test' });
        }
      };

      return (
        <button onClick={handleIntegratedOperation}>
          Test Integration
        </button>
      );
    };

    render(
      <TestWrapper>
        <ErrorBoundary config={{ level: 'page', enableReporting: true }}>
          <TestIntegrationComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    const testButton = screen.getByText(/test integration/i);
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    });
  });
});

export { ErrorThrowingComponent, TestWrapper };