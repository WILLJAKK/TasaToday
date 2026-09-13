// Service Worker para TasaToday - Soporte de Notificaciones Push de Primer Plano
// Diseñado para recibir alertas de nuevas intervenciones cambiarias del BCV
// incluso con el teléfono bloqueado o la aplicación cerrada.

const CACHE_NAME = 'tasatoday-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[SW] Service Worker activo y controlando clientes');
    })
  );
});

// Receptor de Notificaciones Push de Alta Prioridad / Primer Plano
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 NUEVA INTERVENCIÓN CAMBIARIA BCV',
    body: 'El Banco Central de Venezuela acaba de publicar una nueva intervención cambiaria.',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'intervencion-bcv-' + Date.now(),
    url: '/?tab=intervencion',
    timestamp: Date.now(),
    tipoCambioBsUsd: '',
    tipoCambioBsEur: '',
    fecha: '',
    nro: ''
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  // Opciones de máxima prioridad para Android, iOS (PWA) y Desktop
  const options = {
    body: payload.body,
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    tag: payload.tag,
    renotify: true,
    requireInteraction: true, // Permanece en pantalla / lockscreen hasta que el usuario interactúe
    silent: false,
    vibrate: [500, 200, 500, 200, 500], // Patrón de vibración fuerte de alerta
    data: {
      url: payload.url || '/?tab=intervencion',
      fecha: payload.fecha,
      nro: payload.nro,
      tipoCambioBsUsd: payload.tipoCambioBsUsd,
      tipoCambioBsEur: payload.tipoCambioBsEur,
      receivedAt: Date.now()
    },
    actions: [
      { action: 'view', title: '📊 Ver Intervención' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Manejo de interacción cuando el usuario toca la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/?tab=intervencion';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta en alguna pestaña, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          // Enviar mensaje interno a la app abierta para conmutar a la pestaña intervención
          client.postMessage({
            type: 'OPEN_INTERVENCION',
            data: event.notification.data
          });
          return;
        }
      }
      // Si la app estaba cerrada o en segundo plano sin ventana activa, abrirla
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
