import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              console.log('New content available! Please refresh.');
              
              // You could show a toast notification here
              if (window.confirm('应用有新版本可用，是否立即更新？')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

// Register for push notifications (optional)
async function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Subscribe to push notifications
      try {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn('VAPID 公钥未配置，跳过推送订阅');
          return;
        }
        // Convert base64 public key to Uint8Array per Push API requirement
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
        
        console.log('Push subscription successful:', subscription);
        // Send subscription to your server
      } catch (error) {
        console.error('Push subscription failed:', error);
      }
    }
  }
}

// Performance monitoring for mobile
function initPerformanceMonitoring() {
  // Monitor page load performance
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Log performance metrics for mobile optimization
    console.log('Performance Metrics:', {
      DNS: perfData.domainLookupEnd - perfData.domainLookupStart,
      TCP: perfData.connectEnd - perfData.connectStart,
      Request: perfData.responseStart - perfData.requestStart,
      Response: perfData.responseEnd - perfData.responseStart,
      DOM: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      Total: perfData.loadEventEnd - perfData.navigationStart
    });
    
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      
      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('FID:', entry.processingStart - entry.startTime);
        }
      }).observe({ type: 'first-input', buffered: true });
      
      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        console.log('CLS:', clsValue);
      }).observe({ type: 'layout-shift', buffered: true });
    }
  });
}

// Detect network conditions for mobile optimization
function initNetworkMonitoring() {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    
    console.log('Network Info:', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    });
    
    // Adapt behavior based on network conditions
    if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      // Enable data-saving mode
      document.documentElement.classList.add('data-saver-mode');
      console.log('Data saver mode enabled');
    }
    
    // Listen for network changes
    connection.addEventListener('change', () => {
      console.log('Network changed:', connection.effectiveType);
    });
  }
}

// Initialize mobile optimizations
initPerformanceMonitoring();
initNetworkMonitoring();

// Show loading indicator until app is ready
const root = document.getElementById('root')!;

// Add loading spinner
const loadingSpinner = document.createElement('div');
loadingSpinner.className = 'loading-spinner';
document.body.appendChild(loadingSpinner);

// Render app
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Remove loading spinner and show app once React has mounted
setTimeout(() => {
  root.classList.add('loaded');
  if (loadingSpinner.parentNode) {
    loadingSpinner.parentNode.removeChild(loadingSpinner);
  }
}, 100);

// Optional: Request notification permission after app loads
setTimeout(() => {
  requestNotificationPermission();
}, 5000); // Wait 5 seconds after app load
