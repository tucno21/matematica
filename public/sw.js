/// <reference lib="webworker" />

const CACHE_NAME = 'matematica-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.json',
    '/sw.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando activos estáticos...');
            return cache.addAll(STATIC_ASSETS).catch((error) => {
                console.error('[SW] Error al cachear activos:', error);
                // Continuar aunque falle algún recurso
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Eliminando cache antiguo:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first strategy for all requests (offline-first)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') return;

    // Skip other protocols
    if (!url.protocol.startsWith('http')) return;

    // Cache-first strategy for navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) {
                    console.log('[SW] Sirviendo desde cache:', url.pathname);
                    return cached;
                }

                return fetch(request)
                    .then((response) => {
                        // Solo cachear respuestas exitosas
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                        return response;
                    })
                    .catch(() => {
                        // Si falla la red, servir index.html como fallback
                        console.log('[SW] Sin conexión, sirviendo index.html desde cache');
                        return caches.match('/index.html');
                    });
            })
        );
        return;
    }

    // Cache-first strategy for static assets (JS, CSS, images, fonts)
    if (
        url.pathname.startsWith('/assets/') ||
        url.pathname.startsWith('/src/') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.webp') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.ttf') ||
        url.pathname.endsWith('.eot')
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) {
                    console.log('[SW] Sirviendo activo estático desde cache:', url.pathname);
                    return cached;
                }

                return fetch(request)
                    .then((response) => {
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                        return response;
                    })
                    .catch(() => {
                        console.log('[SW] No se pudo cargar activo estático:', url.pathname);
                        // Retornar una respuesta vacía o un placeholder
                        return new Response('Not Found', { status: 404 });
                    });
            })
        );
        return;
    }

    // Network-first for everything else (API calls, etc.)
    event.respondWith(
        caches.match(request).then((cached) => {
            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    if (cached) {
                        console.log('[SW] Usando cache como fallback:', url.pathname);
                        return cached;
                    }
                    console.log('[SW] Sin conexión y sin cache para:', url.pathname);
                    return new Response('Offline', { status: 503 });
                });
        })
    );
});
