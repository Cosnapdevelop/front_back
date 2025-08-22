/**
 * Analytics utilities for tracking user behavior and business metrics
 * Supports Google Analytics 4 and custom event tracking
 */

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

interface UserProperties {
  user_id?: string;
  user_type?: 'free' | 'premium' | 'trial';
  signup_date?: string;
  total_effects_created?: number;
  favorite_category?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
}

class Analytics {
  private isEnabled: boolean = false;
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize() {
    // Check if analytics should be enabled (production, user consent, etc.)
    this.isEnabled = 
      typeof window !== 'undefined' && 
      process.env.NODE_ENV === 'production' &&
      !window.navigator.doNotTrack;

    if (this.isEnabled) {
      this.setupGoogleAnalytics();
    }
  }

  private setupGoogleAnalytics() {
    // Initialize Google Analytics 4 with environment-based configuration
    const GA_MEASUREMENT_ID = this.getAnalyticsId();
    
    if (typeof window !== 'undefined' && !window.gtag && GA_MEASUREMENT_ID) {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll send page views manually
        anonymize_ip: true,
        allow_google_signals: false,
      });
    } else if (!GA_MEASUREMENT_ID) {
      console.warn('Analytics: No measurement ID configured. Analytics disabled.');
    }
  }

  private getAnalyticsId(): string | null {
    // Try to get from environment variables first (production)
    if (typeof window !== 'undefined' && (window as any).__GA_MEASUREMENT_ID__) {
      return (window as any).__GA_MEASUREMENT_ID__;
    }
    
    // Fallback for development/staging environments
    if (process.env.NODE_ENV === 'development') {
      return null; // Disable analytics in development
    }
    
    // Production fallback - replace with actual GA4 ID when available
    return import.meta.env.VITE_GA_MEASUREMENT_ID || null;
  }

  /**
   * Set user properties for analytics
   */
  setUserProperties(properties: UserProperties) {
    if (!this.isEnabled) return;

    this.userId = properties.user_id;

    if (typeof window !== 'undefined' && window.gtag) {
      const GA_MEASUREMENT_ID = this.getAnalyticsId();
      if (GA_MEASUREMENT_ID) {
        window.gtag('config', GA_MEASUREMENT_ID, {
          user_id: properties.user_id,
          custom_map: {
            'user_type': properties.user_type,
            'signup_date': properties.signup_date,
            'device_type': properties.device_type,
          }
        });
      }
    }
  }

  /**
   * Track page views
   */
  trackPageView(page: string, title?: string) {
    if (!this.isEnabled) return;

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: title || document.title,
        page_location: window.location.href,
        page_path: page,
        session_id: this.sessionId,
      });
    }

    // Also track for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Page View: ${page}`, { title, url: window.location.href });
    }
  }

  /**
   * Track custom events
   */
  trackEvent(event: AnalyticsEvent) {
    if (!this.isEnabled) return;

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        session_id: this.sessionId,
        user_id: this.userId,
        ...event.custom_parameters,
      });
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Event Tracked:', event);
    }
  }

  /**
   * Track user registration
   */
  trackUserRegistration(method: 'email' | 'social', userId: string) {
    this.trackEvent({
      action: 'sign_up',
      category: 'user_engagement',
      label: method,
      custom_parameters: {
        method,
        user_id: userId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track effect creation (key business metric)
   */
  trackEffectCreated(effectId: string, effectType: 'webapp' | 'comfyui', processingTime?: number) {
    this.trackEvent({
      action: 'effect_created',
      category: 'core_action',
      label: effectType,
      value: processingTime,
      custom_parameters: {
        effect_id: effectId,
        effect_type: effectType,
        processing_time: processingTime,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track user engagement actions
   */
  trackEngagement(action: 'image_upload' | 'result_download' | 'result_share' | 'profile_update') {
    this.trackEvent({
      action,
      category: 'user_engagement',
      custom_parameters: {
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track business conversion events
   */
  trackConversion(action: 'trial_started' | 'subscription_started' | 'payment_completed', value?: number) {
    this.trackEvent({
      action,
      category: 'conversion',
      value,
      custom_parameters: {
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: 'page_load_time' | 'api_response_time' | 'effect_processing_time', value: number) {
    this.trackEvent({
      action: 'performance_metric',
      category: 'technical',
      label: metric,
      value: Math.round(value),
      custom_parameters: {
        metric_type: metric,
        metric_value: value,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track errors for debugging and improvement
   */
  trackError(error: Error, context?: string) {
    this.trackEvent({
      action: 'error_occurred',
      category: 'technical',
      label: context || error.name,
      custom_parameters: {
        error_message: error.message,
        error_stack: error.stack,
        context,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track feature usage for product decisions
   */
  trackFeatureUsage(feature: string, action: 'viewed' | 'clicked' | 'completed') {
    this.trackEvent({
      action: `feature_${action}`,
      category: 'feature_usage',
      label: feature,
      custom_parameters: {
        feature_name: feature,
        action_type: action,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      }
    });
  }
}

// Create singleton instance
const analytics = new Analytics();

// Export commonly used tracking functions
export const trackPageView = (page: string, title?: string) => analytics.trackPageView(page, title);
export const trackEvent = (event: AnalyticsEvent) => analytics.trackEvent(event);
export const trackUserRegistration = (method: 'email' | 'social', userId: string) => 
  analytics.trackUserRegistration(method, userId);
export const trackEffectCreated = (effectId: string, effectType: 'webapp' | 'comfyui', processingTime?: number) => 
  analytics.trackEffectCreated(effectId, effectType, processingTime);
export const trackEngagement = (action: 'image_upload' | 'result_download' | 'result_share' | 'profile_update') => 
  analytics.trackEngagement(action);
export const trackConversion = (action: 'trial_started' | 'subscription_started' | 'payment_completed', value?: number) => 
  analytics.trackConversion(action, value);
export const trackPerformance = (metric: 'page_load_time' | 'api_response_time' | 'effect_processing_time', value: number) => 
  analytics.trackPerformance(metric, value);
export const trackError = (error: Error, context?: string) => analytics.trackError(error, context);
export const trackFeatureUsage = (feature: string, action: 'viewed' | 'clicked' | 'completed') => 
  analytics.trackFeatureUsage(feature, action);
export const setUserProperties = (properties: UserProperties) => analytics.setUserProperties(properties);

export default analytics;