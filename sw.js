const CACHE_NAME = 'barcode-printer-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './icon.svg',
    './css/styles.css',
    './js/ElementRenderer.js',
    './js/ValueFormatter.js',
    './js/CanvasManager.js',
    './js/ElementManager.js',
    './js/PropertyPanel.js',
    './js/TemplateManager.js',
    './js/CSVParser.js',
    './js/PrintUIController.js',
    './js/PrintEngine.js',
    './js/app.js',
    'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js',
    'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&family=Oswald:wght@400;600&family=Source+Sans+3:wght@400;600&family=Slabo+27px&family=Raleway:wght@400;600&family=PT+Sans:wght@400;700&family=Josefin+Sans:wght@400;600&family=Nunito:wght@400;600;700&family=Ubuntu:wght@400;700&family=Playfair+Display:wght@400;600&family=Rubik:wght@400;600&family=Merriweather:wght@400;700&family=Noto+Sans:wght@400;600&family=Fira+Sans:wght@400;600&family=Work+Sans:wght@400;600&family=Quicksand:wght@400;600&family=Karla:wght@400;600&family=Inconsolata:wght@400;600&family=Cabin:wght@400;600&family=Dancing+Script:wght@400;600&family=Pacifico&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});
