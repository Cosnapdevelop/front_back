import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { BaseError, ErrorSeverity } from '../types/errors';

interface BusinessContext {
  userId?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  featureUsed?: string;
  userJourney?: 'onboarding' | 'creating' | 'sharing' | 'managing' | 'purchasing';
  businessImpact?: {
    type: 'revenue' | 'conversion' | 'retention' | 'satisfaction';
    severity: 'low' | 'medium' | 'high' | 'critical';
    estimatedLoss?: number;
  };
  customerContext?: {
    accountAge: number;
    lifetimeValue: number;
    supportTickets: number;
    lastActivity: string;
    region: 'china' | 'international';
  };
}

interface ErrorFingerprint {
  errorType: string;
  component?: string;
  feature?: string;
  userAction?: string;
  platform: string;
}

class SentryErrorTracker {
  private isInitialized = false;
  private businessMetrics: Map<string, number> = new Map();
  private errorPatterns: Map<string, number> = new Map();
  private userContext: any = null;
  
  public init(dsn?: string): void {
    if (this.isInitialized || !dsn) {
      return;
    }
    
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: this.getTracesSampleRate(),
      
      integrations: [
        new BrowserTracing({
          tracePropagationTargets: [
            'localhost',
            /^\//,
            /https:\/\/[^/]*\.vercel\.app/,
            /https:\/\/[^/]*\.runninghub\.(ai|cn)/,
            /https:\/\/api\.cosnap\.ai/
          ]
        })
      ],
      
      beforeSend: this.beforeSend.bind(this),
      beforeSendTransaction: this.beforeSendTransaction.bind(this),
      
      // Performance monitoring
      profilesSampleRate: 0.1,
      
      // Session tracking
      autoSessionTracking: true,
      
      // Custom tags for filtering
      initialScope: {
        tags: {
          service: 'cosnap-frontend',
          version: process.env.REACT_APP_VERSION || 'unknown'
        }
      }
    });
    
    this.setupGlobalErrorHandling();
    this.isInitialized = true;
    
    console.log('[SentryErrorTracker] Initialized with environment:', process.env.NODE_ENV);
  }
  
  private getTracesSampleRate(): number {
    switch (process.env.NODE_ENV) {
      case 'production':
        return 0.1; // 10% sampling in production
      case 'staging':
        return 0.5; // 50% sampling in staging
      default:
        return 1.0; // 100% sampling in development
    }
  }
  
  private setupGlobalErrorHandling(): void {
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, {
        tags: { errorSource: 'unhandledRejection' }
      });
    });
    
    // Capture console errors in development
    if (process.env.NODE_ENV === 'development') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0] instanceof Error) {
          this.captureException(args[0], {
            tags: { errorSource: 'console' },
            extra: { arguments: args.slice(1) }
          });
        }
        originalConsoleError.apply(console, args);
      };
    }
  }
  
  private beforeSend(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
    // Filter out sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }
    
    // Filter password fields from form data
    if (event.request?.data) {
      this.filterSensitiveFields(event.request.data);
    }
    
    // Add business context if available
    if (this.userContext) {
      event.user = {
        ...event.user,
        ...this.userContext
      };
    }
    
    // Generate custom fingerprinting for better grouping
    if (hint.originalException instanceof Error) {
      event.fingerprint = this.generateFingerprint(hint.originalException, event);
    }
    
    // Track error patterns
    this.trackErrorPattern(event);
    
    // Skip low-priority errors in production
    if (process.env.NODE_ENV === 'production' && this.isLowPriorityError(event)) {
      return null;
    }
    
    return event;
  }
  
  private beforeSendTransaction(event: Sentry.Transaction): Sentry.Transaction | null {
    // Skip very fast transactions to reduce noise
    if (event.start_timestamp && event.timestamp) {
      const duration = event.timestamp - event.start_timestamp;
      if (duration < 0.1) { // Less than 100ms
        return null;
      }
    }
    
    return event;
  }
  
  private filterSensitiveFields(data: any): void {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth',
      'credit_card', 'ssn', 'phone', 'email'
    ];
    
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          data[key] = '[Filtered]';
        } else if (typeof data[key] === 'object') {
          this.filterSensitiveFields(data[key]);
        }
      }
    }
  }
  
  private generateFingerprint(error: Error, event: Sentry.Event): string[] {
    const fingerprint: ErrorFingerprint = {
      errorType: error.name,
      platform: navigator.platform,
      component: event.tags?.component as string,
      feature: event.tags?.feature as string,
      userAction: event.tags?.userAction as string
    };
    
    // Generate fingerprint array for grouping similar errors
    const parts = [
      fingerprint.errorType,
      fingerprint.component || 'unknown',
      fingerprint.feature || 'general'
    ];
    
    return parts.filter(Boolean);
  }
  
  private trackErrorPattern(event: Sentry.Event): void {
    const pattern = `${event.exception?.values?.[0]?.type || 'unknown'}_${event.tags?.component || 'global'}`;
    const count = this.errorPatterns.get(pattern) || 0;
    this.errorPatterns.set(pattern, count + 1);
    
    // Alert on error spikes
    if (count > 0 && count % 10 === 0) {
      this.reportErrorSpike(pattern, count);
    }
  }
  
  private isLowPriorityError(event: Sentry.Event): boolean {
    const lowPriorityPatterns = [
      'ChunkLoadError',
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Non-Error promise rejection captured'
    ];
    
    const message = event.exception?.values?.[0]?.value || '';
    return lowPriorityPatterns.some(pattern => message.includes(pattern));
  }
  
  private reportErrorSpike(pattern: string, count: number): void {
    Sentry.withScope((scope) => {
      scope.setTag('alertType', 'errorSpike');
      scope.setContext('spike', {
        pattern,
        count,
        timestamp: new Date().toISOString()
      });
      scope.setLevel('warning');
      
      Sentry.captureMessage(`Error spike detected: ${pattern} (${count} occurrences)`, 'warning');
    });
  }
  
  // Business context methods
  public setUserContext(user: {
    id: string;
    email?: string;
    username?: string;
    subscriptionTier?: string;
    region?: string;
  }): void {
    this.userContext = user;
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    });
    
    Sentry.setTag('subscriptionTier', user.subscriptionTier || 'free');
    Sentry.setTag('region', user.region || 'unknown');
  }
  
  public clearUserContext(): void {
    this.userContext = null;
    Sentry.setUser(null);
  }
  
  public logError(message: string, error: Error, context: BusinessContext = {}): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    Sentry.withScope((scope) => {
      // Set basic context
      scope.setTag('errorId', errorId);
      scope.setTag('source', 'manual');
      
      if (context.featureUsed) {
        scope.setTag('feature', context.featureUsed);
      }
      
      if (context.userJourney) {
        scope.setTag('userJourney', context.userJourney);
      }
      
      // Set business context
      if (context.businessImpact) {
        scope.setContext('businessImpact', context.businessImpact);
        scope.setTag('impactType', context.businessImpact.type);
        scope.setTag('impactSeverity', context.businessImpact.severity);
        
        if (context.businessImpact.estimatedLoss) {
          scope.setExtra('estimatedLoss', context.businessImpact.estimatedLoss);
        }
      }
      
      // Set customer context
      if (context.customerContext) {
        scope.setContext('customer', context.customerContext);
        scope.setTag('customerRegion', context.customerContext.region);
        
        // Set priority based on customer value
        if (context.customerContext.lifetimeValue > 1000) {
          scope.setTag('priority', 'high');
        } else if (context.customerContext.lifetimeValue > 100) {
          scope.setTag('priority', 'medium');
        } else {
          scope.setTag('priority', 'low');
        }
      }
      
      // Set severity level
      let level: Sentry.Severity = 'error';
      if (error instanceof BaseError) {
        switch (error.severity) {
          case ErrorSeverity.CRITICAL:
            level = 'fatal';
            break;
          case ErrorSeverity.HIGH:
            level = 'error';
            break;
          case ErrorSeverity.MEDIUM:
            level = 'warning';
            break;
          case ErrorSeverity.LOW:
            level = 'info';
            break;
        }
      }
      scope.setLevel(level);
      
      // Capture the error
      Sentry.captureException(error);
    });
    
    // Track business metrics
    this.trackBusinessMetric(context);
    
    return errorId;
  }
  
  public trackConversionImpact(errorType: string, userId: string, conversionStep: string): void {
    Sentry.withScope((scope) => {
      scope.setTag('impactType', 'conversion');
      scope.setTag('conversionStep', conversionStep);
      scope.setUser({ id: userId });
      scope.setContext('businessImpact', {
        errorType,
        conversionStep,
        timestamp: new Date().toISOString()
      });
      
      Sentry.captureMessage(`Conversion impact: ${errorType} at ${conversionStep}`, 'warning');
    });
    
    this.businessMetrics.set('conversionErrors', (this.businessMetrics.get('conversionErrors') || 0) + 1);
  }
  
  public trackRevenueImpact(errorType: string, amount: number, currency: string = 'USD'): void {
    Sentry.withScope((scope) => {
      scope.setTag('impactType', 'revenue');
      scope.setContext('revenueImpact', {
        errorType,
        amount,
        currency,
        timestamp: new Date().toISOString()
      });
      
      Sentry.captureMessage(`Revenue impact: ${errorType} - ${amount} ${currency}`, 'error');
    });
    
    const currentLoss = this.businessMetrics.get('revenueLoss') || 0;
    this.businessMetrics.set('revenueLoss', currentLoss + amount);
  }
  
  public trackFeatureUsage(featureName: string, success: boolean, duration?: number): void {
    Sentry.addBreadcrumb({
      category: 'feature_usage',
      message: `Feature ${featureName} ${success ? 'succeeded' : 'failed'}`,
      data: {
        feature: featureName,
        success,
        duration
      },
      level: success ? 'info' : 'warning'
    });
  }
  
  public trackUserAction(action: string, context?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      category: 'user_action',
      message: `User performed: ${action}`,
      data: {
        action,
        ...context
      },
      level: 'info'
    });
  }
  
  private trackBusinessMetric(context: BusinessContext): void {
    if (context.businessImpact) {
      const metricKey = `${context.businessImpact.type}_errors`;
      const count = this.businessMetrics.get(metricKey) || 0;
      this.businessMetrics.set(metricKey, count + 1);
      
      // Alert on significant business impact
      if (count > 0 && count % 5 === 0) {
        this.alertBusinessImpact(context.businessImpact.type, count);
      }
    }
  }
  
  private alertBusinessImpact(impactType: string, count: number): void {
    Sentry.withScope((scope) => {
      scope.setTag('alertType', 'businessImpact');
      scope.setContext('impact', {
        type: impactType,
        count,
        timestamp: new Date().toISOString()
      });
      scope.setLevel('error');
      
      Sentry.captureMessage(`Business impact alert: ${count} ${impactType} errors`, 'error');
    });
  }
  
  // Performance monitoring
  public startTransaction(name: string, op: string): Sentry.Transaction {
    return Sentry.startTransaction({ name, op });
  }
  
  public measurePerformance<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const transaction = this.startTransaction(name, 'function');
    
    const finish = () => {
      transaction.finish();
    };
    
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(finish);
      } else {
        finish();
        return Promise.resolve(result);
      }
    } catch (error) {
      finish();
      throw error;
    }
  }
  
  // Utility methods
  public captureException(exception: any, captureContext?: Sentry.CaptureContext): string {
    return Sentry.captureException(exception, captureContext);
  }
  
  public captureMessage(message: string, level?: Sentry.Severity): string {
    return Sentry.captureMessage(message, level);
  }
  
  public addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }
  
  public getBusinessMetrics(): Record<string, number> {
    return Object.fromEntries(this.businessMetrics);
  }
  
  public getErrorPatterns(): Record<string, number> {
    return Object.fromEntries(this.errorPatterns);
  }
  
  public resetMetrics(): void {
    this.businessMetrics.clear();
    this.errorPatterns.clear();
  }
  
  public isInitialized(): boolean {
    return this.isInitialized;
  }
}

// Create and export singleton instance
export const sentryErrorTracker = new SentryErrorTracker();

// Initialize if DSN is available
if (typeof window !== 'undefined') {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (dsn) {
    sentryErrorTracker.init(dsn);
  }
}

// React error boundary integration
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// React profiler integration
export const SentryProfiler = Sentry.withProfiler;

// Export Sentry instance for direct access if needed
export { Sentry };

export default sentryErrorTracker;