// Service Worker for Portfolio - Mobile Optimized
const CACHE_NAME = 'portfolio-v1.0.0';
const CACHE_VERSION = 1;

// Resources to cache for offline support
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/animations.css',
  '/scripts/app.js',
  '/scripts/animations.js',
  '/data/projects.json',
  '/assets/favicon.ico'
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
  images: /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  fonts: /\.(woff|woff2|ttf|eot)$/i,
  api: /\/api\//,
  external: /^https?:\/\/(?!localhost)/
};

// Cache strategies
const STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Cache configurations
const CACHE_CONFIG = {
  static: {
    strategy: STRATEGIES.CACHE_FIRST,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 50
  },
  images: {
    strategy: STRATEGIES.CACHE_FIRST,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100
  },
  api: {
    strategy: STRATEGIES.NETWORK_FIRST,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20
  },
  external: {
    strategy: STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxEntries: 30
  }
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove old versions of our cache
              return cacheName.startsWith('portfolio-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // Determine cache strategy based on request type
  const strategy = determineStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
      .catch((error) => {
        console.error('Service Worker: Request failed:', error);
        return handleFallback(request);
      })
  );
});

// Determine caching strategy based on request
function determineStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Static assets (HTML, CSS, JS)
  if (STATIC_CACHE_URLS.some(staticUrl => pathname.endsWith(staticUrl.split('/').pop()))) {
    return { type: 'static', ...CACHE_CONFIG.static };
  }
  
  // Images
  if (CACHE_PATTERNS.images.test(pathname)) {
    return { type: 'images', ...CACHE_CONFIG.images };
  }
  
  // API requests
  if (CACHE_PATTERNS.api.test(pathname) || pathname.includes('/data/')) {
    return { type: 'api', ...CACHE_CONFIG.api };
  }
  
  // External resources
  if (CACHE_PATTERNS.external.test(url.origin) && url.origin !== location.origin) {
    return { type: 'external', ...CACHE_CONFIG.external };
  }
  
  // Default to network first for same-origin requests
  return { type: 'default', strategy: STRATEGIES.NETWORK_FIRST, maxAge: 60 * 60 * 1000 };
}

// Handle request based on strategy
async function handleRequest(request, config) {
  const cacheName = getCacheName(config.type);
  
  switch (config.strategy) {
    case STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName, config);
    
    case STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName, config);
    
    case STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName, config);
    
    case STRATEGIES.CACHE_ONLY:
      return cacheOnly(request, cacheName);
    
    case STRATEGIES.NETWORK_ONLY:
    default:
      return networkOnly(request);
  }
}

// Cache strategies implementation
async function cacheFirst(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response before caching (response can only be consumed once)
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await cleanupCache(cache, config.maxEntries);
    }
    return networkResponse;
  } catch (error) {
    // Return stale cache if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function networkFirst(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await cleanupCache(cache, config.maxEntries);
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always attempt to fetch from network in background
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const responseToCache = response.clone();
        await cache.put(request, responseToCache);
        await cleanupCache(cache, config.maxEntries);
      }
      return response;
    })
    .catch(() => {
      // Ignore network errors for background updates
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache available
  return networkPromise;
}

async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  throw new Error('No cached response available');
}

async function networkOnly(request) {
  return fetch(request);
}

// Utility functions
function getCacheName(type) {
  return `${CACHE_NAME}-${type}`;
}

function isExpired(response, maxAge) {
  if (!maxAge) return false;
  
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const age = Date.now() - new Date(dateHeader).getTime();
  return age > maxAge;
}

async function cleanupCache(cache, maxEntries) {
  if (!maxEntries) return;
  
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Remove oldest entries (FIFO)
    const entriesToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(
      entriesToDelete.map(key => cache.delete(key))
    );
  }
}

// Fallback responses for offline scenarios
async function handleFallback(request) {
  const url = new URL(request.url);
  
  // Fallback for HTML pages
  if (request.destination === 'document') {
    const cache = await caches.open(CACHE_NAME);
    return cache.match('/') || cache.match('/index.html');
  }
  
  // Fallback for images
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#f0f0f0"/>' +
      '<text x="100" y="100" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">' +
      'Image unavailable offline' +
      '</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  // Generic offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Background sync for form submissions (if needed)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'contact-form') {
    event.waitUntil(handleContactFormSync());
  }
});

async function handleContactFormSync() {
  // Handle offline form submissions
  try {
    const db = await openIndexedDB();
    const pendingForms = await getPendingForms(db);
    
    for (const form of pendingForms) {
      try {
        await submitForm(form.data);
        await deletePendingForm(db, form.id);
        console.log('Service Worker: Form submitted successfully');
      } catch (error) {
        console.error('Service Worker: Form submission failed:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// IndexedDB helpers for offline form storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('portfolio-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const store = db.createObjectStore('pending-forms', { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      store.createIndex('timestamp', 'timestamp');
    };
  });
}

async function getPendingForms(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-forms'], 'readonly');
    const store = transaction.objectStore('pending-forms');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deletePendingForm(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-forms'], 'readwrite');
    const store = transaction.objectStore('pending-forms');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function submitForm(formData) {
  // Implement actual form submission logic
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });
  
  if (!response.ok) {
    throw new Error(`Form submission failed: ${response.status}`);
  }
  
  return response.json();
}

// Push notification handling (if implemented)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New portfolio update available!',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Portfolio'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Portfolio Update', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
});

// Get cache status for debugging
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return status;
}

// Error reporting
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker: Registered successfully');