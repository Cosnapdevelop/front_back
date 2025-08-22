import React, { useEffect } from 'react';

interface PerformanceOptimizerProps {
  enableWebVitals?: boolean;
  enableResourceHints?: boolean;
  enableFontOptimization?: boolean;
}

export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  enableWebVitals = true,
  enableResourceHints = true,
  enableFontOptimization = true
}) => {
  useEffect(() => {
    // Preload critical resources
    if (enableResourceHints) {
      preloadCriticalResources();
    }

    // Optimize font loading
    if (enableFontOptimization) {
      optimizeFontLoading();
    }

    // Initialize Web Vitals monitoring
    if (enableWebVitals) {
      initializeWebVitalsTracking();
    }

    // Optimize image loading
    setupImageLoadingOptimization();

    // Setup intersection observer for lazy loading
    setupLazyLoadingObserver();

  }, [enableWebVitals, enableResourceHints, enableFontOptimization]);

  return null;
};

// Preload critical resources for better performance
const preloadCriticalResources = () => {
  const criticalResources = [
    { href: '/og-image.png', as: 'image' },
    { href: 'https://fonts.googleapis.com', rel: 'preconnect' },
    { href: 'https://fonts.gstatic.com', rel: 'preconnect', crossorigin: 'anonymous' }
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = resource.rel || 'preload';
    link.href = resource.href;
    if (resource.as) link.as = resource.as;
    if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
    
    // Only add if not already present
    if (!document.querySelector(`link[href="${resource.href}"]`)) {
      document.head.appendChild(link);
    }
  });
};

// Optimize font loading for better performance
const optimizeFontLoading = () => {
  // Add font-display: swap to existing font links
  const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
  fontLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('display=swap')) {
      const newHref = href.includes('?') 
        ? `${href}&display=swap` 
        : `${href}?display=swap`;
      link.setAttribute('href', newHref);
    }
  });

  // Preload critical font files
  const criticalFonts = [
    '/fonts/inter-var.woff2'
  ];

  criticalFonts.forEach(fontUrl => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = fontUrl;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    
    if (!document.querySelector(`link[href="${fontUrl}"]`)) {
      document.head.appendChild(link);
    }
  });
};

// Initialize Web Vitals tracking
const initializeWebVitalsTracking = async () => {
  try {
    // Dynamically import web-vitals to avoid blocking main bundle
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

    // Track Core Web Vitals
    getCLS(metric => {
      trackWebVital('CLS', metric.value);
    });

    getFID(metric => {
      trackWebVital('FID', metric.value);
    });

    getFCP(metric => {
      trackWebVital('FCP', metric.value);
    });

    getLCP(metric => {
      trackWebVital('LCP', metric.value);
    });

    getTTFB(metric => {
      trackWebVital('TTFB', metric.value);
    });

  } catch (error) {
    console.warn('Web Vitals tracking not available:', error);
  }
};

// Track Web Vital metrics
const trackWebVital = (name: string, value: number) => {
  // Send to analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      custom_parameter: value
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Web Vital - ${name}:`, value);
  }

  // Store in sessionStorage for debugging
  const webVitals = JSON.parse(sessionStorage.getItem('webVitals') || '{}');
  webVitals[name] = value;
  sessionStorage.setItem('webVitals', JSON.stringify(webVitals));
};

// Setup image loading optimization
const setupImageLoadingOptimization = () => {
  // Add loading="lazy" to images that don't have it
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(img => {
    const rect = img.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    
    // Only lazy load images that are not immediately visible
    if (!isVisible) {
      img.setAttribute('loading', 'lazy');
    }
  });

  // Add decoding="async" for better performance
  const allImages = document.querySelectorAll('img:not([decoding])');
  allImages.forEach(img => {
    img.setAttribute('decoding', 'async');
  });
};

// Setup intersection observer for lazy loading
const setupLazyLoadingObserver = () => {
  if (!('IntersectionObserver' in window)) {
    return; // Fallback for older browsers
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        
        // Handle lazy loading for custom components
        if (element.dataset.lazySrc) {
          if (element.tagName === 'IMG') {
            (element as HTMLImageElement).src = element.dataset.lazySrc;
          }
          delete element.dataset.lazySrc;
          observer.unobserver(element);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  // Observe elements with data-lazy-src
  document.querySelectorAll('[data-lazy-src]').forEach(element => {
    observer.observe(element);
  });
};

// Hook for component-level performance optimization
export const usePerformanceOptimization = () => {
  useEffect(() => {
    // Prevent layout shifts by setting image dimensions
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      const { naturalWidth, naturalHeight } = img as HTMLImageElement;
      if (naturalWidth && naturalHeight) {
        img.setAttribute('width', naturalWidth.toString());
        img.setAttribute('height', naturalHeight.toString());
      }
    });

    // Optimize CSS animations for performance
    const style = document.createElement('style');
    style.textContent = `
      * {
        /* Use GPU acceleration for transforms and opacity */
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000;
      }
      
      /* Optimize scroll performance */
      * {
        will-change: auto;
      }
      
      .scroll-container {
        will-change: scroll-position;
      }
      
      .animate-element {
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
};

// Critical CSS injection for above-the-fold content
export const injectCriticalCSS = (css: string) => {
  const style = document.createElement('style');
  style.setAttribute('data-critical', 'true');
  style.textContent = css;
  document.head.appendChild(style);
};

// Preload next page resources
export const preloadNextPage = (path: string) => {
  // Preload the next page's critical resources
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path;
  document.head.appendChild(link);
};

export default PerformanceOptimizer;