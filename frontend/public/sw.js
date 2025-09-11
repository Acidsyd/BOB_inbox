const CACHE_NAME = 'mailsender-v2'
const API_CACHE_NAME = 'mailsender-api-v2'

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/campaigns',
  '/settings/email-accounts',
  '/offline',
  '/manifest.json',
  '/_next/static/css/app/layout.css'
]

// API endpoints to cache
const API_PATTERNS = [
  '/api/analytics/dashboard',
  '/api/campaigns',
  '/api/email-accounts',
  '/api/user/profile'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Caching static assets')
      // Cache each asset individually to handle failures gracefully
      const cachePromises = STATIC_ASSETS.map(async (url) => {
        try {
          await cache.add(url)
        } catch (error) {
          console.warn(`Failed to cache ${url}:`, error)
        }
      })
      await Promise.all(cachePromises)
    }).then(() => {
      // Force the waiting service worker to become active
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Ensure the service worker takes control immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Handle static assets with cache-first strategy
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/') ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Handle navigation requests with network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigationStrategy(request))
    return
  }
})

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok && isApiCacheable(request.url)) {
      const cache = await caches.open(API_CACHE_NAME)
      await cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', request.url)
    
    // Try to get from cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are currently offline. Some features may not be available.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, networkResponse.clone())
    return networkResponse
  } catch (error) {
    console.log('Failed to fetch:', request.url)
    throw error
  }
}

// Network-first strategy for navigation
async function networkFirstNavigationStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('Network failed for navigation, trying cache:', request.url)
    
    // Try to get from cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }
    
    // Fallback offline response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Mailsender</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background-color: #f9fafb;
            }
            .offline-container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            .offline-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            .retry-btn {
              background: #9333ea;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 1rem;
            }
            .retry-btn:hover {
              background: #7c3aed;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>You're offline</h1>
            <p>Check your internet connection and try again.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Retry
            </button>
          </div>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  }
}

// Check if API endpoint should be cached
function isApiCacheable(url) {
  return API_PATTERNS.some(pattern => url.includes(pattern))
}

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'offline-actions') {
    event.waitUntil(processOfflineActions())
  }
})

// Process queued offline actions
async function processOfflineActions() {
  try {
    // Get queued actions from IndexedDB
    const actions = await getQueuedActions()
    
    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        // Remove successful action from queue
        await removeQueuedAction(action.id)
        
        // Notify client of success
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'OFFLINE_ACTION_SUCCESS',
              action: action
            })
          })
        })
      } catch (error) {
        console.error('Failed to process offline action:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// IndexedDB helpers (simplified - you'd want a proper implementation)
async function getQueuedActions() {
  // This would connect to IndexedDB and retrieve queued actions
  return []
}

async function removeQueuedAction(id) {
  // This would remove the action from IndexedDB
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  const options = {
    body: 'You have new activity in your campaigns',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close notification',
        icon: '/images/xmark.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Mailsender', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag, event.action)
  
  event.notification.close()

  if (event.action === 'explore') {
    // Open the dashboard
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  }
})

// Message handling from the main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})