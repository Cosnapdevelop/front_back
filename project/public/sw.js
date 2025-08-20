// Service Worker for Cosnap AI PWA
// Optimized for Chinese mobile networks and offline functionality

const CACHE_NAME = 'cosnap-v1.0.0';
const API_CACHE_NAME = 'cosnap-api-v1.0.0';
const IMAGE_CACHE_NAME = 'cosnap-images-v1.0.0';

// Resources to cache on install
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.js',
  '/static/css/main.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/effects',
  '/api/user/profile',
  '/api/regions'
];

// Maximum cache sizes (optimized for mobile storage)
const MAX_IMAGE_CACHE_SIZE = 50; // 50 images max
const MAX_API_CACHE_SIZE = 100; // 100 API responses max
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Network timeout for slow Chinese networks
const NETWORK_TIMEOUT = 8000; // 8 seconds

// Install event - cache core resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache core assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),
      
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== IMAGE_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - handle network requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Different strategies for different types of requests
  if (request.destination === 'image') {
    // Images: Cache First with size limit
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API: Network First with timeout fallback
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'document') {
    // HTML: Network First with offline fallback
    event.respondWith(handleDocumentRequest(request));
  } else {
    // Static assets: Cache First
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle image requests with cache-first strategy and size management
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Check if cached image is still fresh
      const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
      if (Date.now() - cachedDate.getTime() < MAX_CACHE_AGE) {
        return cachedResponse;
      }
    }
    
    // Try network with timeout
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse && networkResponse.ok) {
      // Clone response for caching
      const responseToCache = networkResponse.clone();
      
      // Add timestamp header
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      // Cache with size management
      await cacheWithSizeLimit(cache, request, responseWithTimestamp, MAX_IMAGE_CACHE_SIZE);
      
      return networkResponse;
    }
    
    // Fallback to cache if network fails
    return cachedResponse || new Response('Image not available offline', {
      status: 404,
      statusText: 'Not Found'
    });
    
  } catch (error) {
    console.error('Image request failed:', error);
    
    // Try cache as last resort
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    return cachedResponse || new Response('Image not available', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  try {
    // Try network first with timeout
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful API responses (GET only)
      if (request.method === 'GET') {
        const cache = await caches.open(API_CACHE_NAME);
        const responseToCache = networkResponse.clone();
        
        // Add timestamp
        const headers = new Headers(responseToCache.headers);
        headers.set('sw-cached-date', new Date().toISOString());
        
        const responseWithTimestamp = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers
        });
        
        await cacheWithSizeLimit(cache, request, responseWithTimestamp, MAX_API_CACHE_SIZE);
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('Network failed, trying cache:', error.message);
    
    // Fallback to cache for GET requests
    if (request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        // Check if cached data is still fresh
        const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
        if (Date.now() - cachedDate.getTime() < MAX_CACHE_AGE) {
          return cachedResponse;
        }
      }
    }
    
    // Return error response for POST/PUT/DELETE or stale cache
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: '网络连接不可用，请检查网络设置'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle document requests with network-first strategy
async function handleDocumentRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('Document network failed, trying cache:', error.message);
    
    // Fallback to cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ultimate fallback to offline page
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Return basic offline message if no offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cosnap - 离线模式</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px 20px; 
              color: #666;
              background: linear-gradient(135deg, #14b8a6 0%, #6366f1 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { margin: 20px 0; }
            p { max-width: 400px; line-height: 1.6; }
            .retry-btn {
              background: rgba(255,255,255,0.2);
              border: 2px solid rgba(255,255,255,0.3);
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
            .retry-btn:hover {
              background: rgba(255,255,255,0.3);
            }
          </style>
        </head>
        <body>
          <div class="icon">📱</div>
          <h1>Cosnap 离线模式</h1>
          <p>您当前处于离线状态，部分功能可能不可用。请检查网络连接后重试。</p>
          <button class="retry-btn" onclick="window.location.reload()">重新连接</button>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    
    if (networkResponse && networkResponse.ok) {
      // Cache the response
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.error('Static request failed:', error);
    
    return new Response('Resource not available offline', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Utility function to fetch with timeout
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    )
  ]);
}

// Cache with size limit management
async function cacheWithSizeLimit(cache, request, response, maxSize) {
  try {
    // Add to cache
    await cache.put(request, response);
    
    // Get all cached items
    const keys = await cache.keys();
    
    // If over limit, remove oldest items
    if (keys.length > maxSize) {
      const itemsToDelete = keys.length - maxSize;
      
      // Get items with timestamps
      const itemsWithTimestamps = await Promise.all(
        keys.map(async (key) => {
          const cachedResponse = await cache.match(key);
          const timestamp = cachedResponse.headers.get('sw-cached-date') || '1970-01-01';
          return { key, timestamp: new Date(timestamp) };
        })
      );
      
      // Sort by timestamp (oldest first)
      itemsWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
      
      // Delete oldest items
      for (let i = 0; i < itemsToDelete; i++) {
        await cache.delete(itemsWithTimestamps[i].key);
      }
    }
  } catch (error) {
    console.error('Cache size management failed:', error);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync offline actions when network is available
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove successful action from storage
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Background sync failed for action:', action.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Utility functions for offline action storage
async function getOfflineActions() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

async function removeOfflineAction(actionId) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Removing offline action:', actionId);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || '您有新的消息',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: data.image,
      data: data.url,
      actions: [
        {
          action: 'open',
          title: '查看',
          icon: '/icons/action-open.png'
        },
        {
          action: 'dismiss',
          title: '忽略',
          icon: '/icons/action-dismiss.png'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: data.tag || 'default'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Cosnap', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

console.log('Cosnap Service Worker loaded successfully');