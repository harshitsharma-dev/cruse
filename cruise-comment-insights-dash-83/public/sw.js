// Enhanced service worker for aggressive caching and compression
const CACHE_NAME = 'cruise-dashboard-v2';
const STATIC_CACHE_NAME = 'cruise-static-v2';
const DYNAMIC_CACHE_NAME = 'cruise-dynamic-v2';
const API_CACHE_NAME = 'cruise-api-v2';

// Assets to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apollo-intelligence.jpg',
  '/dtc.jpg',
  '/favicon.ico',
];

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  static: 24 * 60 * 60 * 1000, // 24 hours
  dynamic: 12 * 60 * 60 * 1000, // 12 hours
  api: 5 * 60 * 1000, // 5 minutes for API responses
};

// Install event - cache static assets aggressively
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      }),
      caches.open(DYNAMIC_CACHE_NAME),
      caches.open(API_CACHE_NAME),
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME
            )
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Helper function to check if cache entry is fresh
function isCacheFresh(cachedResponse, maxAge) {
  if (!cachedResponse) return false;
  
  const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
  const now = new Date();
  return (now.getTime() - cachedDate.getTime()) < maxAge;
}

// Helper function to add timestamp to cached response
function addCacheTimestamp(response) {
  const responseClone = response.clone();
  const headers = new Headers(responseClone.headers);
  headers.set('sw-cached-date', new Date().toISOString());
  
  return new Response(responseClone.body, {
    status: responseClone.status,
    statusText: responseClone.statusText,
    headers: headers
  });
}

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests with short-term caching
  if (url.pathname.includes('/sailing/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets (JS, CSS, images)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  // Default handling for other requests
  event.respondWith(handleDynamicContent(event.request));
});

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(pathname) ||
         pathname.includes('/assets/');
}

// Handle API requests with smart caching
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Return fresh cached response if available
  if (cachedResponse && isCacheFresh(cachedResponse, CACHE_DURATIONS.api)) {
    console.log('[SW] Serving API from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    console.log('[SW] Fetching API:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses
      const timestampedResponse = addCacheTimestamp(response);
      cache.put(request, timestampedResponse.clone());
      return response;
    }
    
    // Return cached response as fallback for failed requests
    return cachedResponse || response;
  } catch (error) {
    console.log('[SW] API fetch failed, serving from cache:', request.url);
    return cachedResponse || new Response('Network error', { status: 503 });
  }
}

// Handle static assets with long-term caching
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Return cached version if available and fresh
  if (cachedResponse && isCacheFresh(cachedResponse, CACHE_DURATIONS.static)) {
    console.log('[SW] Serving static asset from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    console.log('[SW] Fetching static asset:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const timestampedResponse = addCacheTimestamp(response);
      cache.put(request, timestampedResponse.clone());
      return response;
    }
    
    return cachedResponse || response;
  } catch (error) {
    console.log('[SW] Static asset fetch failed, serving from cache:', request.url);
    return cachedResponse || new Response('Asset not available', { status: 503 });
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    console.log('[SW] Handling navigation:', request.url);
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, serving cached index:', request.url);
    const cache = await caches.open(STATIC_CACHE_NAME);
    return cache.match('/index.html') || new Response('App not available', { status: 503 });
  }
}

// Handle dynamic content
async function handleDynamicContent(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && isCacheFresh(cachedResponse, CACHE_DURATIONS.dynamic)) {
    console.log('[SW] Serving dynamic content from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    console.log('[SW] Fetching dynamic content:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const timestampedResponse = addCacheTimestamp(response);
      cache.put(request, timestampedResponse.clone());
      return response;
    }
    
    return cachedResponse || response;
  } catch (error) {
    console.log('[SW] Dynamic content fetch failed, serving from cache:', request.url);
    return cachedResponse || new Response('Content not available', { status: 503 });
  }
}
