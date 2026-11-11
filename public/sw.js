/// <reference lib="webworker" />

// Identificador único de caché. En el build de producción se inyecta la versión exacta con timestamp.
const CACHE_NAME = 'matematica-v4';

// Lista base de activos estáticos que siempre deben estar disponibles offline
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/icons.svg',
    '/manifest.json',
    '/pwa-icons/icon-72x72.png',
    '/pwa-icons/icon-96x96.png',
    '/pwa-icons/icon-128x128.png',
    '/pwa-icons/icon-144x144.png',
    '/pwa-icons/icon-152x152.png',
    '/pwa-icons/icon-192x192.png',
    '/pwa-icons/icon-384x384.png',
    '/pwa-icons/icon-512x512.png',
    '/pwa-icons/apple-touch-icon.png'
];

// ── 1. INSTALL: Precacheo total de la aplicación ─────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            console.log('[SW] Instalando versión:', CACHE_NAME);
            const cache = await caches.open(CACHE_NAME);

            // 1. Cachear activos estáticos base
            await Promise.allSettled(
                STATIC_ASSETS.map(async (asset) => {
                    try {
                        const response = await fetch(asset, { cache: 'reload' });
                        if (response.ok) {
                            await cache.put(asset, response);
                        }
                    } catch (err) {
                        console.warn('[SW] No se pudo precachear:', asset, err);
                    }
                })
            );

            // 2. Extra seguridad SPA: Descargar /index.html y extraer todos los bundles JS y CSS de Vite
            try {
                const indexRes = await fetch('/index.html', { cache: 'reload' });
                if (indexRes.ok) {
                    await cache.put('/index.html', indexRes.clone());
                    await cache.put('/', indexRes.clone());

                    const htmlText = await indexRes.text();
                    // Detectar rutas de scripts y hojas de estilo generadas por Vite (/assets/index-xxx.js)
                    const assetMatches = Array.from(htmlText.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g));
                    await Promise.allSettled(
                        assetMatches.map(async (match) => {
                            const assetUrl = match[1];
                            try {
                                const assetRes = await fetch(assetUrl, { cache: 'reload' });
                                if (assetRes.ok) {
                                    await cache.put(assetUrl, assetRes);
                                    console.log('[SW] Precacheado dinámico confirmado:', assetUrl);
                                }
                            } catch (e) {
                                console.warn('[SW] Error al precachear activo de index.html:', assetUrl, e);
                            }
                        })
                    );
                }
            } catch (err) {
                console.warn('[SW] Error inspeccionando index.html en install:', err);
            }

            console.log('[SW] Precacheo completado para', CACHE_NAME);
        })()
    );
    self.skipWaiting();
});

// ── 2. ACTIVATE: Limpieza de cachés antiguas y toma de control inmediata ─────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Eliminando cache antiguo:', name);
                        return caches.delete(name);
                    })
            );
            await self.clients.claim();
            console.log('[SW] Activado y listo para servir offline.');
        })()
    );
});

// ── 3. FETCH: Estrategias robustas anti-pantalla blanca ───────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar métodos que no sean GET
    if (request.method !== 'GET') return;

    // Ignorar extensiones de navegador
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

    // Ignorar protocolos no HTTP/HTTPS
    if (!url.protocol.startsWith('http')) return;

    // A) NAVEGACIÓN SPA (index.html): Network-first con timeout corto y fallback garantizado
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                // Si hay internet, intentar obtener la versión más reciente en menos de 2.5s
                try {
                    const fetchPromise = fetch(request);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Network timeout')), 2500)
                    );
                    const networkResponse = await Promise.race([fetchPromise, timeoutPromise]);

                    if (networkResponse && networkResponse.status === 200) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put('/index.html', networkResponse.clone());
                        cache.put('/', networkResponse.clone());
                        return networkResponse;
                    }
                } catch {
                    // Fallo de red o timeout (offline): usar caché sin demora
                }

                // Fallback Offline: Buscar index.html en caché
                const cache = await caches.open(CACHE_NAME);
                const cachedIndex =
                    (await cache.match(request, { ignoreSearch: true })) ||
                    (await cache.match('/index.html', { ignoreSearch: true })) ||
                    (await cache.match('/', { ignoreSearch: true })) ||
                    (await cache.match('/index.html')) ||
                    (await cache.match('/'));

                if (cachedIndex) {
                    return cachedIndex;
                }

                // Último recurso: buscar cualquier entrada HTML en el caché
                const allKeys = await cache.keys();
                for (const key of allKeys) {
                    if (key.url.endsWith('/index.html') || key.url.endsWith('/')) {
                        const fallback = await cache.match(key);
                        if (fallback) return fallback;
                    }
                }

                return new Response(
                    '<!doctype html><html><body style="background:#080c18;color:white;font-family:sans-serif;padding:2rem;text-align:center;"><h2>Modo sin conexión</h2><p>Por favor conecta el dispositivo a internet una vez para sincronizar los recursos.</p><button onclick="location.reload()" style="padding:8px 16px;border-radius:6px;background:#3b82f6;color:white;border:none;cursor:pointer;">Reintentar</button></body></html>',
                    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
                );
            })()
        );
        return;
    }

    // B) ASSETS DE LA APLICACIÓN (/assets/, iconos, fuentes locales, imágenes): Cache-First
    if (
        url.pathname.startsWith('/assets/') ||
        url.pathname.startsWith('/pwa-icons/') ||
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
        url.pathname.endsWith('.json')
    ) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);

                // 1. Intentar servir desde caché de inmediato
                let cached = await cache.match(request, { ignoreSearch: true });
                if (!cached) {
                    cached = await cache.match(url.pathname, { ignoreSearch: true });
                }
                if (cached) {
                    return cached;
                }

                // 2. Si no estaba en caché, pedir a la red y almacenar
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch {
                    console.warn('[SW] Offline y activo no encontrado en caché:', url.pathname);
                    // Para CSS, devolver estilo vacío en lugar de romper el renderizado
                    if (url.pathname.endsWith('.css')) {
                        return new Response('', { headers: { 'Content-Type': 'text/css' } });
                    }
                    return new Response('Not Found', { status: 404 });
                }
            })()
        );
        return;
    }

    // C) FUENTES EXTERNAS (Google Fonts u otros CDN): Cache-First / Graceful Offline
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(request);
                if (cached) return cached;

                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch {
                    // Si está offline y es un CSS de fuentes, responder vacío para que el navegador use fuentes del sistema
                    if (request.destination === 'style' || url.pathname.endsWith('.css')) {
                        return new Response('', { headers: { 'Content-Type': 'text/css' } });
                    }
                    return new Response('', { status: 408 });
                }
            })()
        );
        return;
    }

    // D) RESTO DE SOLICITUDES: Stale-While-Revalidate
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);

            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                })
                .catch(() => null);

            return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
        })()
    );
});
