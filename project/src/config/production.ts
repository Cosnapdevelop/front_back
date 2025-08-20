/**
 * Production Environment Configuration
 * Comprehensive production settings for Cosnap AI frontend
 */

interface ProductionConfig {
  app: {
    name: string;
    version: string;
    environment: string;
    buildTime: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  auth: {
    tokenStorageKey: string;
    refreshTokenStorageKey: string;
    tokenRefreshThreshold: number;
  };
  features: {
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
    enableServiceWorker: boolean;
    enableOfflineMode: boolean;
  };
  security: {
    enableCSP: boolean;
    enableSRI: boolean;
    httpsOnly: boolean;
  };
  performance: {
    enableCodeSplitting: boolean;
    enableImageOptimization: boolean;
    enablePrefetching: boolean;
    enableCompression: boolean;
  };
  monitoring: {
    sentry: {
      dsn: string;
      environment: string;
      tracesSampleRate: number;
    };
    analytics: {
      googleAnalyticsId?: string;
      baiduAnalyticsId?: string;
    };
  };
  caching: {
    enableStaticCaching: boolean;
    enableApiCaching: boolean;
    staticCacheDuration: number;
    apiCacheDuration: number;
  };
}

const isProduction = import.meta.env.MODE === 'production';
const isStaging = import.meta.env.MODE === 'staging';

export const productionConfig: ProductionConfig = {
  app: {
    name: 'Cosnap AI',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
    buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString()
  },

  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 
      (isProduction 
        ? 'https://cosnap-backend.railway.app'
        : 'http://localhost:3001'),
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY) || 1000
  },

  auth: {
    tokenStorageKey: 'cosnap_access_token',
    refreshTokenStorageKey: 'cosnap_refresh_token',
    tokenRefreshThreshold: 300000 // 5 minutes before expiry
  },

  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING !== 'false',
    enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableServiceWorker: import.meta.env.VITE_ENABLE_SERVICE_WORKER !== 'false',
    enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true'
  },

  security: {
    enableCSP: isProduction,
    enableSRI: isProduction,
    httpsOnly: isProduction
  },

  performance: {
    enableCodeSplitting: true,
    enableImageOptimization: true,
    enablePrefetching: import.meta.env.VITE_ENABLE_PREFETCHING !== 'false',
    enableCompression: isProduction
  },

  monitoring: {
    sentry: {
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      environment: import.meta.env.MODE || 'development',
      tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 
        (isProduction ? 0.1 : 1.0)
    },
    analytics: {
      googleAnalyticsId: import.meta.env.VITE_GA_ID,
      baiduAnalyticsId: import.meta.env.VITE_BAIDU_ANALYTICS_ID
    }
  },

  caching: {
    enableStaticCaching: isProduction,
    enableApiCaching: import.meta.env.VITE_ENABLE_API_CACHING !== 'false',
    staticCacheDuration: parseInt(import.meta.env.VITE_STATIC_CACHE_DURATION) || 86400000, // 24 hours
    apiCacheDuration: parseInt(import.meta.env.VITE_API_CACHE_DURATION) || 300000 // 5 minutes
  }
};

// Environment validation
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'VITE_API_BASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => 
    !import.meta.env[varName] && isProduction
  );

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Production-specific warnings
  if (isProduction) {
    const recommendedVars = [
      'VITE_SENTRY_DSN',
      'VITE_GA_ID'
    ];

    const missingRecommended = recommendedVars.filter(varName => 
      !import.meta.env[varName]
    );

    if (missingRecommended.length > 0) {
      console.warn('⚠️ Missing recommended production environment variables:', missingRecommended);
    }
  }

  console.log('✅ Environment configuration validated');
}

// Content Security Policy configuration
export const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite dev
    "'unsafe-eval'", // Required for Vite dev
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://hm.baidu.com"
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com"
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "*.alicdn.com",
    "*.aliyuncs.com"
  ],
  'connect-src': [
    "'self'",
    "https://api.runninghub.cn",
    "https://api.runninghub.hk",
    productionConfig.api.baseUrl,
    "https://sentry.io",
    "https://www.google-analytics.com",
    "https://hm.baidu.com",
    ...(isProduction ? [] : ["ws://localhost:*", "http://localhost:*"])
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "data:"
  ],
  'media-src': ["'self'", "blob:", "https:"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

// Performance monitoring configuration
export const performanceConfig = {
  // Core Web Vitals thresholds
  vitals: {
    lcp: 2500, // Largest Contentful Paint
    fid: 100,  // First Input Delay
    cls: 0.1   // Cumulative Layout Shift
  },

  // Resource loading thresholds
  resources: {
    scriptLoadTime: 3000,
    styleLoadTime: 1500,
    imageLoadTime: 2000
  },

  // Bundle size limits
  bundleSize: {
    maxChunkSize: 500000, // 500KB
    maxAssetSize: 1000000 // 1MB
  }
};

// Feature flags for gradual rollout
export const featureFlags = {
  newImageUploader: import.meta.env.VITE_FEATURE_NEW_UPLOADER === 'true',
  enhancedEffects: import.meta.env.VITE_FEATURE_ENHANCED_EFFECTS === 'true',
  socialSharing: import.meta.env.VITE_FEATURE_SOCIAL_SHARING !== 'false',
  advancedFilters: import.meta.env.VITE_FEATURE_ADVANCED_FILTERS === 'true',
  realTimePreview: import.meta.env.VITE_FEATURE_REALTIME_PREVIEW === 'true',
  betaFeatures: import.meta.env.VITE_ENABLE_BETA_FEATURES === 'true'
};

export default productionConfig;