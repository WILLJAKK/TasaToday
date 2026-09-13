import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { pushSubscriptions, nativePushTokens } from '../../db/schema.js';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const configStore = getStore('push-config');
let vapidKeysPromise: Promise<VapidKeys> | null = null;

async function getVapidKeys(): Promise<VapidKeys> {
  if (!vapidKeysPromise) {
    vapidKeysPromise = (async () => {
      const existing = await configStore.get('vapid-keys', { type: 'json' }).catch(() => null);
      if (existing && (existing as VapidKeys).publicKey && (existing as VapidKeys).privateKey) {
        return existing as VapidKeys;
      }
      const generated = webpush.generateVAPIDKeys();
      await configStore.setJSON('vapid-keys', generated).catch(() => {});
      return generated;
    })();
  }
  return vapidKeysPromise;
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
  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) return;

  const vapidKeys = await getVapidKeys();
  webpush.setVapidDetails('mailto:notificaciones@tasatoday.com', vapidKeys.publicKey, vapidKeys.privateKey);

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
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        stringifiedPayload,
        sendOptions
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      }
    }
  });

  await Promise.allSettled(promises);

  for (const endpoint of deadEndpoints) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).catch(() => {});
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
    const vapidKeys = await getVapidKeys();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ publicKey: vapidKeys.publicKey }),
    };
  }

  // POST /api/push/subscribe
  if (urlPath.includes('subscribe') && !urlPath.includes('unsubscribe') && method === 'POST') {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      const subscription = data.subscription;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Suscripción inválida' }) };
      }

      await db
        .insert(pushSubscriptions)
        .values({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        })
        .onConflictDoNothing({ target: pushSubscriptions.endpoint });

      // Disparar push de confirmación real del sistema de vuelta al dispositivo
      try {
        const vapidKeys = await getVapidKeys();
        webpush.setVapidDetails('mailto:notificaciones@tasatoday.com', vapidKeys.publicKey, vapidKeys.privateKey);

        const confirmationPayload = JSON.stringify({
          title: '¡Alertas Activadas!',
          body: 'Recibirás las notificaciones de TasaToday aquí.',
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'tasatoday-welcome-' + Date.now(),
          url: '/?tab=intervencion',
          timestamp: Date.now(),
        });

        await webpush.sendNotification(subscription, confirmationPayload, {
          TTL: 86400,
          urgency: 'high',
          topic: 'tasatoday-confirm',
        });
      } catch (pushErr: any) {
        console.warn('[PUSH Serverless] Nota al enviar confirmación inmediata:', pushErr?.message);
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, pushSent: true }) };
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
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST /api/push/native-register (iOS APNs / Android FCM vía Capacitor)
  if (urlPath.includes('native-register') && method === 'POST') {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      const { token, platform } = data;
      if (!token || !platform) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token o plataforma inválidos' }) };
      }

      await db
        .insert(nativePushTokens)
        .values({ token, platform })
        .onConflictDoNothing({ target: nativePushTokens.token });

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
    const subs = await db.select().from(pushSubscriptions);
    const nativeTokens = await db.select().from(nativePushTokens);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        configured: true,
        subscribersCount: subs.length,
        nativeTokensCount: nativeTokens.length,
      }),
    };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
}
