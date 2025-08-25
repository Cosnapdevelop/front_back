import { BaseError, ErrorCode, ErrorSeverity, errorUtils } from '../types/errors';

interface AsyncErrorContext {
  component?: string;
  feature?: string;
  userAction?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
}

interface ErrorNotificationOptions {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
}

class AsyncErrorHandler {
  private static instance: AsyncErrorHandler;
  private errorHistory: Map<string, number> = new Map();
  private notificationService: any;
  private isInitialized = false;
  
  public static getInstance(): AsyncErrorHandler {
    if (!AsyncErrorHandler.instance) {
      AsyncErrorHandler.instance = new AsyncErrorHandler();
    }
    return AsyncErrorHandler.instance;
  }
  
  public init(notificationService?: any) {
    if (this.isInitialized) return;
    
    this.notificationService = notificationService;
    
    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // Global error handler for async operations
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    // Handle resource loading errors (images, scripts, etc.)
    window.addEventListener('error', this.handleResourceError.bind(this), true);
    
    this.isInitialized = true;
    console.log('[AsyncErrorHandler] Initialized global error handlers');
  }
  
  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const error = this.normalizeError(event.reason);
    const context = this.createErrorContext('unhandled_promise_rejection');
    
    console.error('[AsyncErrorHandler] Unhandled Promise Rejection:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    });
    
    // Log to error tracking service
    this.logError(error, context);
    
    // Show user notification if it's a user-facing error
    if (this.isUserFacingError(error)) {
      this.showErrorNotification(error, context);
    }
    
    // Prevent default browser console error for handled cases
    if (this.shouldPreventDefault(error)) {
      event.preventDefault();
    }
  };
  
  private handleGlobalError = (event: ErrorEvent) => {
    // Skip resource loading errors (handled separately)
    if (event.target !== window) return;
    
    const error = this.normalizeError(event.error || new Error(event.message));
    const context = this.createErrorContext('global_error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    console.error('[AsyncErrorHandler] Global Error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      event: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
    
    this.logError(error, context);
    
    if (this.isUserFacingError(error)) {
      this.showErrorNotification(error, context);
    }
  };
  
  private handleResourceError = (event: Event) => {
    const target = event.target as HTMLElement;
    
    // Only handle script and link resource errors
    if (!target || !['SCRIPT', 'LINK', 'IMG'].includes(target.tagName)) {
      return;
    }
    
    const resourceType = target.tagName.toLowerCase();
    const resourceUrl = (target as any).src || (target as any).href;
    
    const error = new BaseError(
      `Failed to load ${resourceType}: ${resourceUrl}`,
      ErrorCode.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      true
    );
    
    const context = this.createErrorContext('resource_load_error', {
      resourceType,
      resourceUrl,
      tagName: target.tagName
    });
    
    console.warn('[AsyncErrorHandler] Resource Load Error:', {
      error: error.message,
      context
    });
    
    this.logError(error, context);
    
    // For critical resources (scripts), show user notification
    if (resourceType === 'script') {
      this.showErrorNotification(
        new BaseError(
          'Failed to load application resources. Please refresh the page.',
          ErrorCode.NETWORK_ERROR,
          ErrorSeverity.HIGH,
          true
        ),
        context
      );
    }
  };
  
  private normalizeError = (error: any): Error => {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (error && typeof error === 'object') {
      if (error.message) {
        return new Error(error.message);
      }
      return new Error(JSON.stringify(error));
    }
    
    return new Error('Unknown error occurred');
  };
  
  private createErrorContext = (source: string, additionalInfo?: any): AsyncErrorContext => {
    return {
      component: 'AsyncErrorHandler',
      feature: source,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      ...additionalInfo
    };
  };
  
  private getUserId = (): string | undefined => {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // From localStorage
      const authData = localStorage.getItem('auth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return parsed.user?.id || parsed.userId;
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // From global state
      if ((window as any).currentUser?.id) {
        return (window as any).currentUser.id;
      }
    }
    
    return undefined;
  };
  
  private getSessionId = (): string | undefined => {
    if (typeof window !== 'undefined') {
      // Generate or retrieve session ID
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    }
    return undefined;
  };
  
  private isUserFacingError = (error: Error): boolean => {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    // Show for network errors that affect user experience
    if (message.includes('fetch') || message.includes('network') || name.includes('networkerror')) {
      return true;
    }
    
    // Show for chunk loading errors (code splitting failures)
    if (name.includes('chunkloaderror') || message.includes('loading chunk')) {
      return true;
    }
    
    // Show for our custom errors marked as user-facing
    if (error instanceof BaseError) {
      return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL;
    }
    
    // Don't show for script errors or other technical issues
    return false;
  };
  
  private shouldPreventDefault = (error: Error): boolean => {
    // Prevent default for errors we handle gracefully
    const message = error.message?.toLowerCase() || '';
    
    // Let chunk loading errors through (they need page refresh)
    if (message.includes('loading chunk')) {
      return false;
    }
    
    // Prevent default for network errors we can retry
    if (message.includes('fetch') || message.includes('network')) {
      return true;
    }
    
    return false;
  };
  
  private logError = (error: Error, context: AsyncErrorContext) => {
    const errorKey = `${error.name}_${context.feature}`;
    const count = this.errorHistory.get(errorKey) || 0;
    this.errorHistory.set(errorKey, count + 1);
    
    // Enhanced error logging
    errorUtils.logError(error, `AsyncErrorHandler:${context.feature}`);
    
    // Send to monitoring service
    if (typeof window !== 'undefined' && (window as any).errorTrackingService) {
      (window as any).errorTrackingService.logError('Async Error', error, {
        context,
        errorCount: count + 1,
        timestamp: context.timestamp
      });
    }
    
    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.withScope((scope: any) => {
        scope.setTag('errorSource', 'AsyncErrorHandler');
        scope.setTag('feature', context.feature);
        scope.setContext('asyncError', context);
        scope.setLevel('error');
        (window as any).Sentry.captureException(error);
      });
    }
  };
  
  private showErrorNotification = (error: Error, context: AsyncErrorContext) => {
    const options = this.getNotificationOptions(error, context);
    
    // Use toast service if available
    if (this.notificationService?.push) {
      this.notificationService.push(options.type, options.message, options.duration);
      return;
    }
    
    // Fallback to custom notification
    this.showCustomNotification(options);
  };
  
  private getNotificationOptions = (error: Error, context: AsyncErrorContext): ErrorNotificationOptions => {
    if (error instanceof BaseError) {
      switch (error.code) {
        case ErrorCode.NETWORK_ERROR:
          return {
            title: 'Connection Issue',
            message: 'Please check your internet connection and try again.',
            type: 'error',
            duration: 5000,
            actions: [
              {
                label: 'Retry',
                action: () => window.location.reload(),
                primary: true
              },
              {
                label: 'Check Connection',
                action: () => window.open('https://www.google.com', '_blank')
              }
            ]
          };
          
        case ErrorCode.API_ERROR:
          return {
            title: 'Service Error',
            message: 'Our services are temporarily unavailable. Please try again.',
            type: 'error',
            duration: 5000
          };
          
        default:
          return {
            title: 'Unexpected Error',
            message: errorUtils.getUserMessage(error),
            type: 'error',
            duration: 4000
          };
      }
    }
    
    // Handle specific error patterns
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('loading chunk')) {
      return {
        title: 'App Update Available',
        message: 'A new version is available. Please refresh to update.',
        type: 'info',
        duration: 0, // Don't auto-dismiss
        actions: [
          {
            label: 'Refresh Now',
            action: () => window.location.reload(),
            primary: true
          }
        ]
      };
    }
    
    if (message.includes('fetch') || message.includes('network')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to our servers. Please check your connection.',
        type: 'warning',
        duration: 5000
      };
    }
    
    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try refreshing the page.',
      type: 'error',
      duration: 4000
    };
  };
  
  private showCustomNotification = (options: ErrorNotificationOptions) => {
    // Create a simple notification if no toast service is available
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg
      ${options.type === 'error' ? 'bg-red-100 border border-red-200 text-red-800' : ''}
      ${options.type === 'warning' ? 'bg-yellow-100 border border-yellow-200 text-yellow-800' : ''}
      ${options.type === 'info' ? 'bg-blue-100 border border-blue-200 text-blue-800' : ''}
      animate-slide-in-right
    `;
    
    // SECURITY FIX: Use textContent instead of innerHTML to prevent XSS
    const titleElement = document.createElement('h4');
    titleElement.className = 'font-medium';
    titleElement.textContent = options.title;
    
    const messageElement = document.createElement('p');
    messageElement.className = 'text-sm mt-1';
    messageElement.textContent = options.message;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex-1';
    contentDiv.appendChild(titleElement);
    contentDiv.appendChild(messageElement);
    
    const containerDiv = document.createElement('div');
    containerDiv.className = 'flex items-start space-x-3';
    containerDiv.appendChild(contentDiv);
    
    
    // Handle actions safely without innerHTML
    if (options.actions) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'mt-3 space-x-2';
      
      options.actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `text-sm px-3 py-1 rounded ${action.primary ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} hover:opacity-80`;
        button.textContent = action.label;
        button.addEventListener('click', () => {
          action.action();
          notification.remove();
        });
        actionsDiv.appendChild(button);
      });
      
      contentDiv.appendChild(actionsDiv);
    }
    
    notification.appendChild(containerDiv);
        </div>
        <button 
          class="text-gray-400 hover:text-gray-600"
          onclick="this.closest('[data-notification]').remove();"
        >
          ✕
        </button>
      </div>
    `;
    
    notification.setAttribute('data-notification', 'true');
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, options.duration);
    }
  };
  
  // Public methods for manual error handling
  public captureError = (error: Error, context?: Partial<AsyncErrorContext>) => {
    const fullContext = this.createErrorContext('manual_capture', context);
    this.logError(error, fullContext);
    
    if (this.isUserFacingError(error)) {
      this.showErrorNotification(error, fullContext);
    }
  };
  
  public captureException = (error: Error, context?: Partial<AsyncErrorContext>) => {
    this.captureError(error, context);
  };
  
  public captureMessage = (message: string, level: 'error' | 'warning' | 'info' = 'error', context?: Partial<AsyncErrorContext>) => {
    const error = new Error(message);
    const fullContext = this.createErrorContext('manual_message', { level, ...context });
    this.logError(error, fullContext);
  };
  
  public getErrorStats = () => {
    return {
      totalErrors: Array.from(this.errorHistory.values()).reduce((sum, count) => sum + count, 0),
      errorTypes: Object.fromEntries(this.errorHistory),
      isInitialized: this.isInitialized
    };
  };
  
  public clearErrorHistory = () => {
    this.errorHistory.clear();
  };
  
  public destroy = () => {
    if (!this.isInitialized) return;
    
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('error', this.handleResourceError, true);
    
    this.isInitialized = false;
    console.log('[AsyncErrorHandler] Destroyed global error handlers');
  };
}

// Create and export singleton instance
export const asyncErrorHandler = AsyncErrorHandler.getInstance();

// Export types for external use
export type { AsyncErrorContext, ErrorNotificationOptions };

// Initialize automatically when module loads (if in browser)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      asyncErrorHandler.init();
    });
  } else {
    asyncErrorHandler.init();
  }
}

export default asyncErrorHandler;