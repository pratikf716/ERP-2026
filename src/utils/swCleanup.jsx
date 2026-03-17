export const cleanupServiceWorkers = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    return Promise.all([
      // Unregister all service workers
      navigator.serviceWorker.getRegistrations().then(registrations => {
        return Promise.all(registrations.map(r => r.unregister()));
      }),
      // Clear all caches
      caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }),
      // Clear IndexedDB databases
      new Promise((resolve) => {
        if ('indexedDB' in window) {
          window.indexedDB.databases().then(dbs => {
            Promise.all(dbs.map(db => {
              return new Promise((res) => {
                const request = indexedDB.deleteDatabase(db.name);
                request.onsuccess = res;
                request.onerror = res;
              });
            })).then(resolve);
          }).catch(resolve);
        } else {
          resolve();
        }
      })
    ]);
  }
  return Promise.resolve();
};