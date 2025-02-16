const CACHE_NAME = 'calorie-tracker-v1';
const baseURL = '/calorie-tracker';  // Your repository name
const urlsToCache = [
  `${baseURL}/`,
  `${baseURL}/index.html`,
  `${baseURL}/css/styles.css`,
  `${baseURL}/js/app.js`,
  `${baseURL}/data/food_data.csv`,
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});