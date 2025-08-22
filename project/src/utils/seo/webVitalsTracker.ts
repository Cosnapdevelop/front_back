// Web Vitals tracking utilities for SEO performance monitoring
import React from 'react';

interface WebVitalMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface PerformanceData {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  timestamp: number;
  url: string;
}

class WebVitalsTracker {
  private performanceData: PerformanceData = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    timestamp: Date.now(),
    url: window.location.href
  };

  private thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 }
  };

  constructor() {
    this.initializeTracking();
  }

  private async initializeTracking() {
    try {
      // Dynamically import web-vitals to avoid blocking main bundle
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

      // Track Core Web Vitals
      getCLS(this.handleMetric.bind(this, 'cls'));
      getFID(this.handleMetric.bind(this, 'fid'));
      getFCP(this.handleMetric.bind(this, 'fcp'));
      getLCP(this.handleMetric.bind(this, 'lcp'));
      getTTFB(this.handleMetric.bind(this, 'ttfb'));

    } catch (error) {
      console.warn('Web Vitals library not available:', error);
      this.fallbackTracking();
    }
  }

  private handleMetric(metricName: keyof PerformanceData, metric: WebVitalMetric) {
    // Store the metric value
    this.performanceData[metricName] = metric.value;
    this.performanceData.timestamp = Date.now();
    this.performanceData.url = window.location.href;

    // Get rating based on thresholds
    const rating = this.getMetricRating(metricName, metric.value);

    // Send to analytics if available
    this.sendToAnalytics(metricName, metric.value, rating);

    // Store in local storage for debugging
    this.storeMetricLocally(metricName, metric.value, rating);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Web Vital - ${metricName.toUpperCase()}:`, {
        value: metric.value,
        rating,
        threshold: this.thresholds[metricName]
      });
    }

    // Send to backend for monitoring
    this.sendToBackend(metricName, metric.value, rating);
  }

  private getMetricRating(metricName: keyof PerformanceData, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[metricName];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private sendToAnalytics(metricName: string, value: number, rating: string) {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metricName, {
        custom_parameter_1: value,
        custom_parameter_2: rating,
        event_category: 'Web Vitals',
        event_label: metricName.toUpperCase(),
        value: Math.round(value)
      });
    }

    // Send to custom analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Web Vital Measured', {
        metric: metricName,
        value: value,
        rating: rating,
        url: window.location.href,
        timestamp: Date.now()
      });
    }
  }

  private storeMetricLocally(metricName: string, value: number, rating: string) {
    try {
      const webVitals = JSON.parse(localStorage.getItem('cosnap_web_vitals') || '{}');
      webVitals[metricName] = {
        value,
        rating,
        timestamp: Date.now(),
        url: window.location.href
      };
      localStorage.setItem('cosnap_web_vitals', JSON.stringify(webVitals));
    } catch (error) {
      console.warn('Could not store web vitals locally:', error);
    }
  }

  private async sendToBackend(metricName: string, value: number, rating: string) {
    try {
      // Only send in production
      if (process.env.NODE_ENV !== 'production') return;

      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric: metricName,
          value: value,
          rating: rating,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      // Silently fail to avoid breaking user experience
      console.warn('Could not send web vitals to backend:', error);
    }
  }

  private fallbackTracking() {
    // Fallback performance tracking for browsers without web-vitals support
    if ('performance' in window && 'navigation' in window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Calculate TTFB
      const ttfb = navigation.responseStart - navigation.fetchStart;
      this.handleMetric('ttfb', {
        name: 'TTFB',
        value: ttfb,
        delta: ttfb,
        id: 'fallback-ttfb',
        rating: this.getMetricRating('ttfb', ttfb)
      });

      // Calculate FCP if available
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry;
      if (fcpEntry) {
        this.handleMetric('fcp', {
          name: 'FCP',
          value: fcpEntry.startTime,
          delta: fcpEntry.startTime,
          id: 'fallback-fcp',
          rating: this.getMetricRating('fcp', fcpEntry.startTime)
        });
      }
    }
  }

  // Public method to get current performance data
  public getPerformanceData(): PerformanceData {
    return { ...this.performanceData };
  }

  // Public method to manually track custom metrics
  public trackCustomMetric(name: string, value: number) {
    this.sendToAnalytics(`custom_${name}`, value, 'good');
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Custom Metric - ${name}:`, value);
    }
  }

  // Method to check if Core Web Vitals are good
  public areWebVitalsGood(): boolean {
    const { lcp, fid, cls } = this.performanceData;
    
    if (lcp === null || fid === null || cls === null) {
      return false; // Not all metrics collected yet
    }

    return (
      lcp <= this.thresholds.lcp.good &&
      fid <= this.thresholds.fid.good &&
      cls <= this.thresholds.cls.good
    );
  }
}

// Create singleton instance
let webVitalsTracker: WebVitalsTracker | null = null;

export const initWebVitalsTracking = (): WebVitalsTracker => {
  if (!webVitalsTracker && typeof window !== 'undefined') {
    webVitalsTracker = new WebVitalsTracker();
  }
  return webVitalsTracker!;
};

export const getWebVitalsData = (): PerformanceData | null => {
  return webVitalsTracker ? webVitalsTracker.getPerformanceData() : null;
};

export const trackCustomMetric = (name: string, value: number): void => {
  if (webVitalsTracker) {
    webVitalsTracker.trackCustomMetric(name, value);
  }
};

export const areWebVitalsGood = (): boolean => {
  return webVitalsTracker ? webVitalsTracker.areWebVitalsGood() : false;
};

// React hook for using web vitals in components
export const useWebVitals = () => {
  const [vitalsData, setVitalsData] = React.useState<PerformanceData | null>(null);
  const [vitalsGood, setVitalsGood] = React.useState<boolean>(false);

  React.useEffect(() => {
    const tracker = initWebVitalsTracking();
    
    // Update state periodically
    const interval = setInterval(() => {
      setVitalsData(tracker.getPerformanceData());
      setVitalsGood(tracker.areWebVitalsGood());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    vitalsData,
    vitalsGood,
    trackCustomMetric
  };
};

export default WebVitalsTracker;