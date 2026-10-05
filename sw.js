// Production-ready Service Worker for Cyber Tuning Fork
const CACHE_NAME = 'cyber-tuning-fork-v2025-09-29-audio-v10';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/main.js',
    '/worklet-wt.js',
    '/CyberTuningFork.wav',
    '/app-icon-180.png',
    '/app-icon-192.png',
    '/app-icon-512.png',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('SW installing with cache:', CACHE_NAME);
    
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        
        try {
            // Cache critical assets first
            await cache.addAll([
                '/',
                '/index.html', 
                '/style.css',
                '/main.js',
                '/manifest.json'
            ]);
            
            // Cache optional assets (don't fail if missing) - exclude CyberTuningFork.png for dynamic loading
            for (const asset of ['/worklet-wt.js', '/CyberTuningFork.wav', '/app-icon-180.png', '/app-icon-192.png', '/app-icon-512.png', '/lib/bridge/audio-bridge.js', '/lib/bridge/effects.js', '/lib/bridge/et.js', '/lib/bridge/eval.js', '/lib/bridge/map.js', '/lib/bridge/utils.js']) {
                try {
                    await cache.add(asset);
                } catch (error) {
                    console.warn(`Failed to cache optional asset ${asset}:`, error);
                }
            }
            
            console.log('SW cached all assets successfully');
        } catch (error) {
            console.error('SW failed to cache assets:', error);
            throw error;
        }
        
        // Take control immediately
        self.skipWaiting();
    })());
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('SW activating, cleaning up old caches');
    
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        
        // Delete old caches
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith('cyber-tuning-fork-') && name !== CACHE_NAME)
                .map(name => {
                    console.log('Deleting old cache:', name);
                    return caches.delete(name);
                })
        );
        
        // Take control of all clients
        await self.clients.claim();
        console.log('SW now controls all clients');
    })());
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Only handle same-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }
    
    event.respondWith((async () => {
        // Keep app shell files in sync. This prevents stale iOS/PWA HTML from
        // loading alongside newer JavaScript after an update.
        const networkFirst = request.mode === 'navigate'
            || url.pathname === '/'
            || url.pathname === '/index.html'
            || url.pathname === '/main.js'
            || url.pathname === '/style.css';
        if (networkFirst) {
            try {
                console.log('Network-first for app shell:', url.pathname);
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                }
            } catch (error) {
                console.warn('Network failed for app shell, falling back to cache:', error);
                // Fall through to cache lookup
            }
        }
        
        // Try cache first for other static assets
        if (STATIC_ASSETS.some(asset => url.pathname === asset || (asset === '/' && url.pathname === '/index.html'))) {
            try {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(request);
                
                if (cachedResponse) {
                    console.log('Serving from cache:', url.pathname);
                    return cachedResponse;
                }
            } catch (error) {
                console.warn('Cache lookup failed for:', url.pathname, error);
            }
        }
        
        // Fallback to network
        try {
            const networkResponse = await fetch(request);
            
            // Cache successful responses to static assets
            if (networkResponse.ok && STATIC_ASSETS.some(asset => url.pathname === asset || (asset === '/' && url.pathname === '/index.html'))) {
                try {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                } catch (error) {
                    console.warn('Failed to cache network response:', url.pathname, error);
                }
            }
            
            return networkResponse;
        } catch (error) {
            console.error('Network request failed:', url.pathname, error);
            
            // Return cached version as fallback if available
            try {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    console.log('Serving stale cache as fallback:', url.pathname);
                    return cachedResponse;
                }
            } catch (cacheError) {
                console.warn('Cache fallback failed:', cacheError);
            }
            
            throw error;
        }
    })());
});