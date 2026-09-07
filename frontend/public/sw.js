self.addEventListener('push', (event) => {
    let data = { title: 'DinoCars', body: 'Tienes una notificación nueva.' };
    try {
        if (event.data) data = event.data.json();
    } catch (e) {
        // ignore malformed payloads
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'DinoCars', {
            body: data.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: data.tag || 'dinocars-notification',
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
            const existing = clientsArr.find((c) => c.url.includes('/dashboard'));
            if (existing) return existing.focus();
            return self.clients.openWindow('/dashboard');
        })
    );
});
