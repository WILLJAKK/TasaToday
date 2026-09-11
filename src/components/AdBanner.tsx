import React, { useEffect } from 'react';
import { shouldDisplayAds } from '../services/iapService';

interface AdBannerProps {
  isPremium?: boolean;
  adBlockExpiresAt?: number | null;
  onGoPremium?: () => void;
  className?: string;
}

/**
 * Controlador para Google AdMob Banner nativo.
 * No dibuja banners simulados, texto publicitario ficticio ni botones de 'Quitar' provisionales.
 * La interfaz permanece 100% limpia.
 * Cuando se compile con plugins nativos de Google AdMob (Capacitor/Cordova),
 * sincroniza automáticamente la visibilidad según isPremium y adsBlockedUntil.
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  isPremium = false,
  adBlockExpiresAt = null,
}) => {
  const showAds = shouldDisplayAds(isPremium, adBlockExpiresAt);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!showAds) {
      // Notificar al plugin nativo de AdMob que debe ocultar el banner
      window.dispatchEvent(new CustomEvent('admob_hide_banner'));
      if ((window as any).AdMob?.hideBanner) {
        (window as any).AdMob.hideBanner().catch(() => {});
      }
    } else {
      // Notificar al plugin nativo de AdMob que el usuario no es premium y puede mostrar banner
      window.dispatchEvent(new CustomEvent('admob_show_banner'));
    }
  }, [showAds]);

  // Interfaz limpia: ningún elemento publicitario falso en pantalla
  return null;
};
