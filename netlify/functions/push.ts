import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

// Las funciones de Netlify se ejecutan en contenedores efímeros: el sistema de archivos
// local NO persiste entre invocaciones ni entre despliegues. Usamos Netlify Blobs (con
// consistencia fuerte) para que las claves VAPID y las suscripciones sobrevivan siempre,
// sin importar qué instancia de la función atienda cada request.
const store = getStore({ name: 'push-notifications', consistency: 'strong' });

let vapidKeys: { publicKey: string; privateKey: string } | null = null;
let vapidReadyPromise: Promise<{ publicKey: string; privateKey: string }> | null = null;

async function ensureVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (vapidKeys) return vapidKeys;
  if (!vapidReadyPromise) {
    vapidReadyPromise = (async () => {
      let keys = await store.get('vapid-keys', { type: 'json' }) as { publicKey: string; privateKey: string } | null;
      if (!keys?.publicKey || !keys?.privateKey) {
        keys = webpush.generateVAPIDKeys();
        await store.setJSON('vapid-keys', keys);
      }
      webpush.setVapidDetails('mailto:notificaciones@tasatoday.com', keys.publicKey, keys.privateKey);
      vapidKeys = keys;
      return keys;
    })();
  }
  return vapidReadyPromise;
}

async function getSubscriptions(): Promise<Array<webpush.PushSubscription & { createdAt?: string }>> {
  const subs = await store.get('subscriptions', { type: 'json' });
  return Array.isArray(subs) ? subs : [];
}

async function saveSubscriptions(subs: any[]) {
  await store.setJSON('subscriptions', subs);
}

export async function broadcastPush(payload: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  fecha?: string;
  nro?: string;
  tipoCambioBsUsd?: string;
  tipoCambioBsEur?: string;
}) {
  await ensureVapidKeys();
  const subs = await getSubscriptions();
  if (subs.length === 0) return;

  const stringifiedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag: payload.tag || `intervencion-bcv-${Date.now()}`,
    url: payload.url || '/?tab=intervencion',
    fecha: payload.fecha || '',
    nro: payload.nro || '',
    tipoCambioBsUsd: payload.tipoCambioBsUsd || '',
    tipoCambioBsEur: payload.tipoCambioBsEur || '',
    timestamp: Date.now(),
  });

  const sendOptions = {
    TTL: 86400,
    urgency: 'high' as const,
    topic: 'intervencion-bcv',
  };

  const deadEndpoints: string[] = [];

  const promises = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, stringifiedPayload, sendOptions);
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      }
    }
  });

  await Promise.allSettled(promises);

  if (deadEndpoints.length > 0) {
    const updated = subs.filter((s) => !deadEndpoints.includes(s.endpoint));
    await saveSubscriptions(updated);
  }
}

export async function handler(event: {
  httpMethod: string;
  path?: string;
  body?: string;
}) {
  const method = event.httpMethod || 'GET';
  const urlPath = event.path || '';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET /api/push/vapid-public-key
  if (urlPath.includes('vapid-public-key')) {
    const keys = await ensureVapidKeys();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ publicKey: keys.publicKey }),
    };
  }

  // POST /api/push/subscribe
  if (urlPath.includes('subscribe') && method === 'POST') {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      const subscription = data.subscription;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Suscripción inválida' }) };
      }

      const subs = await getSubscriptions();
      if (!subs.some((s) => s.endpoint === subscription.endpoint)) {
        subs.push({ ...subscription, createdAt: new Date().toISOString() });
        await saveSubscriptions(subs);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, count: subs.length }) };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST /api/push/unsubscribe
  if (urlPath.includes('unsubscribe') && method === 'POST') {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      const endpoint = data.endpoint;
      if (endpoint) {
        const subs = (await getSubscriptions()).filter((s) => s.endpoint !== endpoint);
        await saveSubscriptions(subs);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST /api/push/test
  if (urlPath.includes('test') && method === 'POST') {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      const delaySeconds = Number(data.delaySeconds) || 0;

      const trigger = async () => {
        await broadcastPush({
          title: '🚨 PRUEBA: NUEVA INTERVENCIÓN BCV',
          body: 'Notificación de primer plano recibida con éxito. Esta alerta suena y vibra aunque el teléfono esté bloqueado o la app cerrada.',
          tag: 'prueba-intervencion-' + Date.now(),
          url: '/?tab=intervencion',
        });
      };

      if (delaySeconds > 0) {
        setTimeout(trigger, delaySeconds * 1000);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Notificación de prueba programada en ${delaySeconds} segundos. Bloquea tu teléfono o sal de la app ahora para probar.`,
          }),
        };
      } else {
        await trigger();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Notificación de prueba enviada de inmediato.',
          }),
        };
      }
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // GET /api/push/status
  if (urlPath.includes('status')) {
    const subs = await getSubscriptions();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        configured: true,
        subscribersCount: subs.length,
      }),
    };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
}
