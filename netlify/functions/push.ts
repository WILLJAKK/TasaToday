import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

const VAPID_KEYS_FILE = path.join(process.cwd(), 'vapid_keys.json');
let vapidKeys: { publicKey: string; privateKey: string };

try {
  if (fs.existsSync(VAPID_KEYS_FILE)) {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
  }
} catch {
  vapidKeys = webpush.generateVAPIDKeys();
}

webpush.setVapidDetails(
  'mailto:notificaciones@tasatoday.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'push_subscriptions.json');

function getSubscriptions(): Array<webpush.PushSubscription & { createdAt?: string }> {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveSubscriptions(subs: any[]) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), 'utf8');
  } catch (err) {
    console.error('[PUSH] Error al guardar push_subscriptions.json:', err);
  }
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
  const subs = getSubscriptions();
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
    saveSubscriptions(updated);
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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ publicKey: vapidKeys.publicKey }),
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

      const subs = getSubscriptions();
      if (!subs.some((s) => s.endpoint === subscription.endpoint)) {
        subs.push({ ...subscription, createdAt: new Date().toISOString() });
        saveSubscriptions(subs);
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
        const subs = getSubscriptions().filter((s) => s.endpoint !== endpoint);
        saveSubscriptions(subs);
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
    const subs = getSubscriptions();
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
