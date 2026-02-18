const CACHE_NAME = 'precioalmendra-v1';
const ASSETS = [
    '/',
    '/css/styles.css',
    '/js/data.js',
    '/js/app.js',
    '/pages/lonja-albacete.html',
    '/pages/lonja-murcia.html',
    '/pages/lonja-reus.html',
    '/pages/lonja-cordoba.html',
    '/pages/calculadora.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetched = fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => cached);
            return cached || fetched;
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
});
