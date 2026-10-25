/// <reference lib="webworker" />

const CACHE_NAME = 'matematica-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.json',
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

// Fetch: network-first for navigations (para recibir siempre la última
// versión del index.html) y cache-first para assets con hash.
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') return;

    // Skip other protocols
    if (!url.protocol.startsWith('http')) return;

    // Navigation requests: network-first, cache como fallback offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
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
                    // Sin conexión: servir la última copia cacheada
                    return caches.match(request)
                        .then((cached) => cached || caches.match('/index.html'))
                        .then((cached) => cached || new Response('Offline', { status: 503 }));
                })
        );
        return;
    }

    // Assets locales con hash (/assets/xxx.js, imágenes, fuentes): cache-first.
    // Nunca se cachean archivos de /src/ (Vite los sirve solo en desarrollo).
    if (
        url.pathname.startsWith('/assets/') ||
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
                        return new Response('Not Found', { status: 404 });
                    });
            })
        );
        return;
    }

    // Resto: network-first con cache como respaldo
    event.respondWith(
        fetch(request)
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
                return caches.match(request).then((cached) => {
                    if (cached) {
                        return cached;
                    }
                    console.log('[SW] Sin conexión y sin cache para:', url.pathname);
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
