// Self-destroying Service Worker to break out of a SW trap
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url));
    });
});

self.addEventListener('fetch', (event) => {
  // Do nothing, let it fall back to network
  return;
});
