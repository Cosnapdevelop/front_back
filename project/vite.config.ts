import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@jest/globals': 'vitest',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'framer-motion', '@headlessui/react', '@tanstack/react-query']
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: true,
    chunkSizeWarningLimit: 500, // Reduced from 1000 to 500KB for better performance
    rollupOptions: {
      output: {
        // Advanced code splitting for optimal performance - targeting <30% bundle reduction
        manualChunks: (id) => {
          // Vendor libraries - more granular splitting
          if (id.includes('node_modules')) {
            // Core React ecosystem (critical - load first)
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor-react-core';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            
            // Animation and UI libraries (defer loading)
            if (id.includes('framer-motion')) {
              return 'vendor-animations';
            }
            if (id.includes('@headlessui') || id.includes('lucide-react')) {
              return 'vendor-ui-components';
            }
            
            // HTTP and data fetching (critical for API calls)
            if (id.includes('axios') || id.includes('@tanstack/react-query')) {
              return 'vendor-data-fetching';
            }
            
            // Image processing libraries (defer - only needed for effects)
            if (id.includes('react-easy-crop') || id.includes('canvas') || id.includes('image')) {
              return 'vendor-image-processing';
            }
            
            // Analytics and monitoring (defer)
            if (id.includes('analytics') || id.includes('gtag') || id.includes('performance')) {
              return 'vendor-analytics';
            }
            
            // Payment processing (defer - only needed on payment flow)
            if (id.includes('stripe') || id.includes('paypal') || id.includes('payment')) {
              return 'vendor-payments';
            }
            
            // Other vendor libraries (small utilities)
            return 'vendor-utils';
          }

          // App code splitting by feature and usage priority
          if (id.includes('/pages/')) {
            // Critical pages (Home, Login, Register) - bundle together
            if (id.includes('/pages/Home.') || id.includes('/pages/Login.') || id.includes('/pages/Register.')) {
              return 'pages-critical';
            }
            // Effects and processing pages (main functionality)
            if (id.includes('/pages/Effects.') || id.includes('/pages/ApplyEffect.') || id.includes('/pages/EffectDetail.')) {
              return 'pages-effects';
            }
            // Community and social features (defer)
            if (id.includes('/pages/Community.') || id.includes('/pages/PostDetail.') || id.includes('/pages/CommentsDetail.')) {
              return 'pages-community';
            }
            // User profile and settings (defer)
            if (id.includes('/pages/Profile.') || id.includes('/pages/UserProfile.') || id.includes('/pages/ImageLibrary.')) {
              return 'pages-user';
            }
          }
          
          if (id.includes('/components/')) {
            // Critical UI components (layout, navigation)
            if (id.includes('/components/Layout/') || id.includes('/components/ProtectedRoute.')) {
              return 'components-layout';
            }
            // Effects and AI processing components (main feature)
            if (id.includes('/components/EffectParameters/') || id.includes('/components/Cards/EffectCard.') || id.includes('/components/TaskResultGallery.')) {
              return 'components-effects';
            }
            // Mobile and payment components (defer until needed)
            if (id.includes('/components/Mobile/') || id.includes('/components/Payment/')) {
              return 'components-mobile-payment';
            }
            // Processing and results components
            if (id.includes('/components/Results/') || id.includes('/components/ProcessingStatus/')) {
              return 'components-processing';
            }
            // Onboarding and tutorial components (defer)
            if (id.includes('/components/Onboarding/') || id.includes('/components/UI/TutorialOverlay.')) {
              return 'components-onboarding';
            }
            // Common UI components
            return 'components-ui';
          }
          
          // Services splitting by functionality
          if (id.includes('/services/')) {
            return 'app-services';
          }
          
          // Utilities and configuration
          if (id.includes('/utils/') || id.includes('/config/')) {
            if (id.includes('/utils/analytics.')) {
              return 'app-analytics';
            }
            return 'app-utils';
          }
          
          // Context and hooks
          if (id.includes('/context/') || id.includes('/hooks/')) {
            return 'app-state';
          }
        },
        
        // Optimize asset naming for aggressive caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash:8][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash:8][extname]`;
          }
          if (/woff2?|ttf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash:8][extname]`;
          }
          return `assets/[ext]/[name]-[hash:8][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash:8].js',
        entryFileNames: 'assets/js/[name]-[hash:8].js',
      }
    },
    
    // Additional performance optimizations
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
    reportCompressedSize: false, // Faster builds
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
