const CACHE_NAME = 'marketofwatches-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/shop.html',
    '/product.html',
    '/css/style.css',
    '/css/admin.css',
    '/js/main.js',
    '/images/watch.svg',
    '/images/logo/logo-transparent.png',
    '/images/features/competitive-prices.svg',
    '/images/features/easy-order.svg',
    '/images/features/support.svg'
];

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp|avif)$/i;

function isImageRequest(request) {
    const url = new URL(request.url);
    if (IMAGE_EXTENSIONS.test(url.pathname)) return true;
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('image/')) return true;
    return false;
}

function isHtmlRequest(request) {
    const url = new URL(request.url);
    return url.pathname === '/' || url.pathname.endsWith('.html');
}

function putInCache(request, networkResponse) {
    if (networkResponse && networkResponse.status === 200) {
        caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
        });
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    if (isImageRequest(request)) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    putInCache(request, networkResponse);
                    return networkResponse;
                }).catch(() => {
                    return cachedResponse || new Response('', { status: 404 });
                });
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    if (isHtmlRequest(request)) {
        event.respondWith(
            fetch(request).then((networkResponse) => {
                putInCache(request, networkResponse);
                return networkResponse;
            }).catch(() => {
                return caches.match(request).then((cachedResponse) => {
                    return cachedResponse || new Response('', { status: 404 });
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(request).then((networkResponse) => {
            putInCache(request, networkResponse);
            return networkResponse;
        }).catch(() => {
            return caches.match(request).then((cachedResponse) => {
                return cachedResponse || new Response('', { status: 404 });
            });
        })
    );
});
