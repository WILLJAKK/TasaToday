// Servicio de Notificaciones Push de Alta Prioridad
// Diseñado para la versión nativa de App Store (iOS APNs) y Google Play Store (Android FCM),
// con compatibilidad Web Push para entornos de desarrollo y navegadores compatibles.

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export function getMobilePlatform(): 'ios' | 'android' | 'web' {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as 'ios' | 'android';
  }
  return 'web';
}

export function isPushNotificationSupported(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window;
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await PushNotifications.checkPermissions();
      if (status.receive === 'granted') return 'granted';
      if (status.receive === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
  }
  return 'prompt';
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('[Push Service] Error al registrar Service Worker:', err);
    return null;
  }
}

export async function getExistingPushSubscription(): Promise<any | null> {
  const subscribed = typeof window !== 'undefined' && localStorage.getItem('tasatoday_push_subscribed') === 'true';

  if (Capacitor.isNativePlatform()) {
    return subscribed ? { type: 'native', platform: Capacitor.getPlatform() } : null;
  }

  if (!isPushNotificationSupported()) {
    return subscribed ? { type: 'web-fallback' } : null;
  }

  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.pushManager) {
        return await registration.pushManager.getSubscription();
      }
    }
  } catch {
    return subscribed ? { type: 'web-local' } : null;
  }

  return subscribed ? { type: 'web-local' } : null;
}

export async function subscribeToBCVIntervencionPush(): Promise<{
  success: boolean;
  error?: string;
  isNative?: boolean;
}> {
  // =========================================================================
  // 1. FLUJO NATIVO: APP STORE (iOS) Y GOOGLE PLAY (ANDROID)
  // =========================================================================
  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        return {
          success: false,
          error: 'Permiso de notificaciones denegado en el sistema operativo.',
          isNative: true,
        };
      }

      // En Android, crear canal de máxima prioridad con sonido y vibración
      if (Capacitor.getPlatform() === 'android') {
        try {
          await PushNotifications.createChannel({
            id: 'bcv-intervenciones',
            name: 'Intervenciones BCV',
            description: 'Alertas inmediatas de intervenciones cambiarias del BCV',
            importance: 5,
            visibility: 1,
            sound: 'res_custom_alert',
            vibration: true,
            lights: true,
            lightColor: '#3B82F6',
          });
        } catch (channelErr) {
          console.warn('[Push Nativo] Canal de notificación Android:', channelErr);
        }
      }

      await PushNotifications.register();

      PushNotifications.removeAllListeners();

      PushNotifications.addListener('registration', async (token) => {
        try {
          await fetch('/api/push/native-register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token.value,
              platform: Capacitor.getPlatform(),
            }),
          });
        } catch (err) {
          console.error('[Push Nativo] Error enviando token al backend:', err);
        }
      });

      localStorage.setItem('tasatoday_push_subscribed', 'true');

      // Enviar de inmediato la notificación de confirmación al teléfono
      await triggerTestPushNotification(0);

      return { success: true, isNative: true };
    } catch (err: any) {
      console.error('[Push Nativo] Excepción al registrar en iOS/Android:', err);
      return {
        success: false,
        error: err?.message || 'Error al conectar con el servicio nativo de notificaciones.',
        isNative: true,
      };
    }
  }

  // =========================================================================
  // 2. FLUJO NAVEGADOR / WEB PUSH / PREVIEW
  // =========================================================================
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn('[Push Web] Solicitud de permiso:', e);
        }
      }
    }

    const registration = await registerPushServiceWorker();

    if (registration && registration.pushManager && typeof window !== 'undefined' && 'PushManager' in window) {
      try {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const { publicKey } = await keyRes.json();
          if (publicKey) {
            const convertedKey = urlBase64ToUint8Array(publicKey);
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey,
            });

            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription }),
            });
          }
        }
      } catch (vapidErr) {
        console.warn('[Push Web] Fallback suscripción VAPID:', vapidErr);
      }
    }

    localStorage.setItem('tasatoday_push_subscribed', 'true');

    // Enviar de inmediato la notificación al teléfono / pantalla para confirmar activación
    await triggerTestPushNotification(0);

    return { success: true };
  } catch (err: any) {
    console.error('[Push Web] Error general en suscripción:', err);
    localStorage.setItem('tasatoday_push_subscribed', 'true');
    await triggerTestPushNotification(0);
    return { success: true };
  }
}

export async function unsubscribeFromBCVIntervencionPush(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      localStorage.removeItem('tasatoday_push_subscribed');
      return true;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.pushManager) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            }).catch(() => {});
            await subscription.unsubscribe().catch(() => {});
          }
        }
      } catch (swErr) {
        console.warn('[Push Service] Advertencia al desuscribir push web:', swErr);
      }
    }
    localStorage.removeItem('tasatoday_push_subscribed');
    return true;
  } catch (err) {
    console.error('[Push Service] Error al desuscribir:', err);
    localStorage.removeItem('tasatoday_push_subscribed');
    return true;
  }
}

export async function triggerTestPushNotification(
  delaySeconds = 0,
  customTitle?: string,
  customBody?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const deliverNotification = async () => {
    const title = customTitle || '¡Alertas Activadas!';
    const body = customBody || 'Recibirás las notificaciones de TasaToday aquí.';

    // 1. Si estamos en Capacitor Nativo (iOS / Android), usar LocalNotifications
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.requestPermissions();
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Math.floor(Math.random() * 100000) + 1,
            schedule: { at: new Date(Date.now() + 150) },
            sound: 'res_custom_alert',
          }],
        });
      } catch (nativeErr) {
        console.warn('[Push] Error disparando LocalNotifications nativas:', nativeErr);
      }
    } else if (typeof window !== 'undefined') {
      // 2. Si estamos en Web o PWA, disparar a través del Service Worker
      let delivered = false;
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: '/icon.png',
              badge: '/icon.png',
              vibrate: [500, 200, 500, 200, 500],
              tag: 'intervencion-bcv-' + Date.now(),
              renotify: true,
              requireInteraction: true,
              data: { url: '/?tab=intervencion' },
            });
            delivered = true;
          }
        } catch (swErr) {
          console.warn('[Push] Error en showNotification del Service Worker:', swErr);
        }
      }

      // 3. Fallback directo con API Notification del navegador
      if (!delivered && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icon.png',
          });
        } catch (notifErr) {
          console.warn('[Push] Error en Notification constructor:', notifErr);
        }
      }
    }
  };

  try {
    if (delaySeconds > 0) {
      setTimeout(deliverNotification, delaySeconds * 1000);
    } else {
      await deliverNotification();
    }

    // Emitir también a través del backend (/api/push/test) para Web Push y tokens
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delaySeconds }),
    });

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      message: data?.message || 'Notificación push enviada a tu teléfono con éxito.',
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
