import React, { useState, useEffect } from 'react';
import { ExchangeRatesData } from '../types';
import { AdModal } from './AdModal';
import { LegalModal } from './LegalModal';
import { Star, ShieldCheck, Play, Sliders, Check, RotateCcw, Moon, Sun, Clock, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import {
  PREMIUM_PRODUCT_ID,
  PREMIUM_PRODUCT_PRICE,
  purchaseProduct,
  restoreUserPurchases,
  triggerNativeRewardedAd,
  setStoredPremiumStatus,
  setStoredAdsBlockedUntil,
} from '../services/iapService';

interface AjustesViewProps {
  rates: ExchangeRatesData;
  setRates: React.Dispatch<React.SetStateAction<ExchangeRatesData>>;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  adBlockExpiresAt: number | null;
  setAdBlockExpiresAt: (val: number | null) => void;
  onRefreshLiveRates?: () => Promise<void>;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  rates,
  setRates,
  isPremium,
  setIsPremium,
  adBlockExpiresAt,
  setAdBlockExpiresAt,
  onRefreshLiveRates,
}) => {
  const { themeMode, setThemeMode, activeTheme, colors, isDark } = useTheme();
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [showEditRates, setShowEditRates] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState(false);

  // Estados de compras en la tienda (IAP)
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [storeFeedback, setStoreFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Estados de modales legales (EULA y Privacidad)
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'eula' | 'privacy'>('eula');
  const [rateToast, setRateToast] = useState<string | null>(null);

  // Temporary edit state con protección null
  const [editBcv, setEditBcv] = useState(rates.bcv?.numPrice?.toString() || '0');
  const [editUsdt, setEditUsdt] = useState(rates.usdt?.numPrice?.toString() || '0');
  const [editEuro, setEditEuro] = useState(rates.euro?.numPrice?.toString() || '0');
  const [editBtc, setEditBtc] = useState(rates.btc?.numPrice?.toString() || '0');
  const [editOro, setEditOro] = useState(rates.oro?.numPrice?.toString() || '0');

  // Mantener sincronizados los campos cuando se abren o se actualizan las tasas en vivo
  useEffect(() => {
    if (rates.bcv?.numPrice) setEditBcv(rates.bcv.numPrice.toString());
    if (rates.usdt?.numPrice) setEditUsdt(rates.usdt.numPrice.toString());
    if (rates.euro?.numPrice) setEditEuro(rates.euro.numPrice.toString());
    if (rates.btc?.numPrice) setEditBtc(rates.btc.numPrice.toString());
    if (rates.oro?.numPrice) setEditOro(rates.oro.numPrice.toString());
  }, [rates]);

  // Manejador nativo de suscripción Premium
  const handlePurchasePremium = async () => {
    if (isPremium) {
      setStoreFeedback({
        type: 'info',
        message: 'Tu suscripción Premium ya se encuentra activa. Puedes administrarla desde la configuración de tu cuenta de Google Play o Apple ID.',
      });
      setTimeout(() => setStoreFeedback(null), 5000);
      return;
    }

    setIsPurchasing(true);
    setStoreFeedback(null);
    try {
      const result = await purchaseProduct(PREMIUM_PRODUCT_ID);
      if (result.success && result.isPremium) {
        setIsPremium(true);
        setStoredPremiumStatus(true);
        setStoreFeedback({
          type: 'success',
          message: '¡Felicitaciones! Suscripción Premium activada. Todos los anuncios han sido eliminados de inmediato.',
        });
      } else {
        setStoreFeedback({
          type: 'error',
          message: result.message || 'No se pudo completar la compra en la tienda.',
        });
      }
    } catch (err: any) {
      setStoreFeedback({
        type: 'error',
        message: 'Error al conectar con la tienda: ' + (err?.message || 'Operación cancelada'),
      });
    } finally {
      setIsPurchasing(false);
      setTimeout(() => setStoreFeedback(null), 5000);
    }
  };

  // Manejador obligatorio de Apple: Restaurar compras previas
  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    setStoreFeedback(null);
    try {
      const result = await restoreUserPurchases();
      if (result.restored) {
        setIsPremium(true);
        setStoredPremiumStatus(true);
        setStoreFeedback({
          type: 'success',
          message: result.message || '¡Compras restauradas! Se ha reactivado tu suscripción Premium.',
        });
      } else {
        setStoreFeedback({
          type: 'info',
          message: result.message || 'No se encontraron compras activas en su cuenta.',
        });
      }
    } catch (err: any) {
      setStoreFeedback({
        type: 'error',
        message: 'Error al consultar historial de compras: ' + (err?.message || 'Error desconocido'),
      });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setStoreFeedback(null), 5000);
    }
  };

  // Manejador de Anuncio Bonificado Nativo (Rewarded Ad)
  const handleWatchRewardedAd = async () => {
    // Guardar inmediatamente adsBlockedUntil con la hora actual más 12 horas
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    setAdBlockExpiresAt(expiry);
    setStoredAdsBlockedUntil(expiry);
    setStoreFeedback({
      type: 'success',
      message: '¡Anuncios bloqueados por 12 horas! Disfruta la app sin interrupciones.',
    });
    setTimeout(() => setStoreFeedback(null), 4000);

    try {
      await triggerNativeRewardedAd();
    } catch (err) {
      // Bloqueo ya activado
    }
  };

  const handleAdCompleted = () => {
    // Al terminar de reproducirse el anuncio bonificado, asegurar marca de tiempo de 12 horas
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    setAdBlockExpiresAt(expiry);
    setStoredAdsBlockedUntil(expiry);
    setStoreFeedback({
      type: 'success',
      message: '¡Recompensa completada! Anuncios bloqueados por 12 horas.',
    });
    setTimeout(() => setStoreFeedback(null), 4000);
  };

  // Manejador de calificación de la aplicación (In-App Review / Store Review)
  const handleRateApp = async () => {
    const isNative = typeof window !== 'undefined' && (
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) ||
      Boolean((window as any).Android?.requestReview || (window as any).Android?.rateApp) ||
      Boolean((window as any).webkit?.messageHandlers?.rateApp || (window as any).webkit?.messageHandlers?.requestReview) ||
      Boolean((window as any).InAppReview)
    );

    if (isNative) {
      try {
        // 1. In-App Review via Capacitor / Cordova plugin
        if ((window as any).InAppReview?.requestReview) {
          await (window as any).InAppReview.requestReview();
          return;
        }
        // 2. Android interface
        if ((window as any).Android?.requestReview) {
          (window as any).Android.requestReview();
          return;
        }
        if ((window as any).Android?.rateApp) {
          (window as any).Android.rateApp();
          return;
        }
        // 3. Apple iOS WebKit message handlers
        if ((window as any).webkit?.messageHandlers?.requestReview) {
          (window as any).webkit.messageHandlers.requestReview.postMessage({});
          return;
        }
        if ((window as any).webkit?.messageHandlers?.rateApp) {
          (window as any).webkit.messageHandlers.rateApp.postMessage({});
          return;
        }

        // 4. Intent directo en tienda nativa según plataforma
        const platform = typeof Capacitor !== 'undefined' ? Capacitor.getPlatform() : 'web';
        if (platform === 'ios') {
          window.open('itms-apps://itunes.apple.com/app/id6470000000?action=write-review', '_system');
        } else {
          window.open('market://details?id=com.tasatoday.app', '_system');
        }
      } catch (e) {
        console.warn('[Review] Error requesting native review:', e);
      }
    } else {
      // Modo navegador web o preview
      setRateToast('¡Gracias por tu apoyo! Serás redirigido a la tienda para calificar');
      setTimeout(() => {
        setRateToast(null);
      }, 5000);

      try {
        window.open('https://play.google.com/store/apps/details?id=com.tasatoday.app', '_blank', 'noopener,noreferrer');
      } catch {
        // El toast ya informa al usuario si hay bloqueador de ventanas emergentes
      }
    }
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    const newBcv = parseFloat(editBcv) || rates.bcv?.numPrice || 0;
    const newUsdt = parseFloat(editUsdt) || rates.usdt?.numPrice || 0;
    const newEuro = parseFloat(editEuro) || rates.euro?.numPrice || 0;
    const newBtc = parseFloat(editBtc) || rates.btc?.numPrice || 0;
    const newOro = parseFloat(editOro) || rates.oro?.numPrice || 0;

    setRates({
      bcv: {
        price: newBcv.toFixed(2).replace('.', ','),
        numPrice: newBcv,
        change: rates.bcv?.change || '0,00',
        percent: rates.bcv?.percent || '0.00',
        isUp: rates.bcv?.isUp ?? true,
        status: 'ok',
      },
      usdt: {
        price: newUsdt.toFixed(2).replace('.', ','),
        numPrice: newUsdt,
        change: rates.usdt?.change || '0,00',
        percent: rates.usdt?.percent || '0.00',
        isUp: rates.usdt?.isUp ?? true,
        status: 'ok',
      },
      euro: {
        price: newEuro.toFixed(2).replace('.', ','),
        numPrice: newEuro,
        change: rates.euro?.change || '0,00',
        percent: rates.euro?.percent || '0.00',
        isUp: rates.euro?.isUp ?? true,
        status: 'ok',
      },
      btc: {
        price: newBtc.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        numPrice: newBtc,
        change: rates.btc?.change || '0.00',
        percent: rates.btc?.percent || '0.00',
        isUp: rates.btc?.isUp ?? true,
        status: 'ok',
      },
      oro: {
        price: newOro.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        numPrice: newOro,
        change: rates.oro?.change || '0.00',
        percent: rates.oro?.percent || '0.00',
        isUp: rates.oro?.isUp ?? true,
        status: 'ok',
      },
      lastUpdated: new Date().toLocaleDateString('es-VE', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setShowEditRates(false);
  };

  // Restablece consultando las tasas REALES Y ACTUALIZADAS en el momento exacto
  const handleResetRates = async () => {
    setIsResetting(true);
    try {
      let freshData: any = null;
      // Consultar endpoint central /api/rates
      const serverRes = await fetch(`/api/rates?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.bcv && json.usdt && json.euro) {
          freshData = json;
        }
      }

      if (freshData) {
        setRates(freshData);

        const bcvVal = freshData.bcv?.numPrice ? freshData.bcv.numPrice.toString() : '832.49';
        const usdtVal = freshData.usdt?.numPrice ? freshData.usdt.numPrice.toString() : '940.95';
        const euroVal = freshData.euro?.numPrice ? freshData.euro.numPrice.toString() : '968.07';
        const btcVal = freshData.btc?.numPrice ? freshData.btc.numPrice.toString() : '77800';
        const oroVal = freshData.oro?.numPrice ? freshData.oro.numPrice.toString() : '4364.20';

        setEditBcv(bcvVal);
        setEditUsdt(usdtVal);
        setEditEuro(euroVal);
        setEditBtc(btcVal);
        setEditOro(oroVal);

        if (onRefreshLiveRates) {
          await onRefreshLiveRates();
        }

        setResetSuccessToast(true);
        setTimeout(() => setResetSuccessToast(false), 3000);
      }
    } catch (err) {
      console.error('Error al restablecer tasas en vivo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const isAdBlocked = isPremium || (adBlockExpiresAt !== null && adBlockExpiresAt > Date.now());

  const themeOptions: { mode: ThemeMode; label: string; icon: React.FC<{ size?: number; className?: string }>; desc: string }[] = [
    {
      mode: 'light',
      label: 'Claro',
      icon: Sun,
      desc: 'Fondo claro permanente',
    },
    {
      mode: 'dark',
      label: 'Oscuro',
      icon: Moon,
      desc: 'Fondo oscuro permanente',
    },
    {
      mode: 'auto',
      label: 'Automático',
      icon: Clock,
      desc: 'Oscuro (18:00 - 05:59) / Claro (06:00 - 17:59)',
    },
  ];

  return (
    <div 
      style={{ backgroundColor: colors.backgroundColor }}
      className="flex-1 overflow-y-auto p-4 flex flex-col justify-between transition-colors duration-200"
    >
      <div className="max-w-lg mx-auto w-full space-y-4">

        {/* SELECTOR DE TEMA / APARIENCIA */}
        <div 
          id="card-settings-theme"
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-5 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 
              style={{ color: colors.textColor }}
              className="text-[18px] font-bold leading-tight"
            >
              Apariencia y Tema
            </h2>
            <span 
              style={{ 
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE',
                color: isDark ? '#38BDF8' : '#0369A1'
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              Activo: {activeTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
            </span>
          </div>

          <p style={{ color: colors.secondaryTextColor }} className="text-xs mb-4">
            Selecciona el estilo visual. Los colores de las monedas (USDT, BCV, Euro, BTC) se mantienen intactos.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const isSelected = themeMode === opt.mode;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.mode}
                  id={`btn-theme-${opt.mode}`}
                  onClick={() => setThemeMode(opt.mode)}
                  style={{
                    backgroundColor: isSelected 
                      ? colors.usdtColor 
                      : (isDark ? '#334155' : '#F1F5F9'),
                    borderColor: isSelected ? colors.usdtColor : colors.borderColor,
                    color: isSelected ? '#FFFFFF' : colors.textColor,
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-md border text-center transition-all cursor-pointer hover:opacity-95 active:scale-98 shadow-2xs"
                >
                  <IconComp size={20} className="mb-1.5 shrink-0" />
                  <span className="text-xs font-bold leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {themeMode === 'auto' && (
            <div 
              style={{ 
                backgroundColor: isDark ? 'rgba(44, 153, 69, 0.15)' : '#F0FDF4',
                borderColor: isDark ? 'rgba(44, 153, 69, 0.3)' : '#DCFCE7',
                color: isDark ? '#4ADE80' : '#15803D' 
              }}
              className="mt-3 p-2.5 rounded border text-[11px] font-medium flex items-center gap-2"
            >
              <Clock size={15} className="shrink-0" />
              <span>Regla horaria activa: Modo Oscuro entre 6:00 PM (18:00) y 5:59 AM. Modo Claro entre 6:00 AM y 5:59 PM.</span>
            </div>
          )}
        </div>

        {/* Main Settings Card (Monetization / Premium) */}
        <div 
          id="card-settings-monetization"
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-5 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 
              style={{ color: colors.textColor }}
              className="text-[20px] font-bold leading-tight"
            >
              Tasa Today Premium
            </h2>
            {isPremium && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check size={12} />
                Activo
              </span>
            )}
          </div>

          <p style={{ color: colors.secondaryTextColor }} className="text-sm mb-4">
            Disfruta de la aplicación sin anuncios y con máxima velocidad.
          </p>

          {/* Premium Subscription Button: Real Native IAP for tasatoday_premium_monthly */}
          <button
            id="btn-get-premium"
            disabled={isPurchasing || isRestoring}
            onClick={handlePurchasePremium}
            className={`w-full py-3.5 px-4 rounded-lg font-bold text-base flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-75 ${
              isPremium
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#FFD700] hover:bg-[#f0ca00] text-black'
            }`}
          >
            <Star size={18} className={isPremium ? 'fill-white' : 'fill-black'} />
            <span>
              {isPurchasing
                ? 'Conectando con la tienda...'
                : isPremium
                ? '⭐ Suscripción Premium Activa'
                : '⭐ Obtener Premium ($0.99/mes)'}
            </span>
          </button>

          {/* Apple Mandatory Button: Restaurar compras */}
          <button
            id="btn-restore-purchases"
            disabled={isPurchasing || isRestoring}
            onClick={handleRestorePurchases}
            style={{
              color: colors.textColor,
            }}
            className="w-full mt-2 py-2 px-3 font-medium text-xs flex items-center justify-center gap-1.5 hover:underline transition-all cursor-pointer disabled:opacity-60"
            title="Consultar historial de compras en App Store / Google Play"
          >
            <RotateCcw size={13} className={isRestoring ? 'animate-spin' : ''} />
            <span>{isRestoring ? 'Consultando historial de la tienda...' : 'Restaurar compras'}</span>
          </button>

          {/* Status badge if ad-free */}
          {isAdBlocked && (
            <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold">
                  {isPremium ? 'Modo Premium Activo' : 'Pase temporal de 12 horas'}
                </span>
                <span className="text-[11px] opacity-90">
                  {isPremium 
                    ? 'Disfrutas de cero anuncios publicitarios y soporte prioritario.'
                    : `Anuncios bloqueados por recompensa de video (${Math.max(1, Math.round(((adBlockExpiresAt || 0) - Date.now()) / (1000 * 60 * 60)))}h restantes).`}
                </span>
              </div>
            </div>
          )}

          {/* Store Feedback Banner */}
          {storeFeedback && (
            <div 
              className={`mt-3 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                storeFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : storeFeedback.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-800 dark:text-blue-300'
              }`}
            >
              {storeFeedback.type === 'success' ? (
                <Check size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{storeFeedback.message}</span>
            </div>
          )}

          {/* Divider & Rewarded Ad Button: solo cuando NO es Premium */}
          {!isPremium && (
            <>
              <div style={{ backgroundColor: colors.borderColor }} className="h-px my-4" />

              {/* Native Rewarded Ad Button */}
              <button
                id="btn-watch-ad"
                onClick={handleWatchRewardedAd}
                style={{
                  backgroundColor: isDark ? '#334155' : '#E2E8F0',
                  color: colors.textColor,
                }}
                className="w-full hover:opacity-90 active:scale-99 py-3 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play size={15} className="shrink-0" />
                <span>▶ Bloquear anuncios por 12 horas</span>
              </button>
            </>
          )}

          {/* Footer de suscripción para cumplimiento estricto con App Store & Google Play */}
          <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex flex-col items-center gap-1.5 text-center">
            <p style={{ color: colors.mutedTextColor }} className="text-[10px] leading-tight">
              Suscripción mensual de renovación automática ($0.99 USD/mes). Sin permanencia obligatoria. Administrable y cancelable desde los ajustes de tu cuenta de Apple ID o Google Play.
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold">
              <button
                type="button"
                id="link-eula"
                onClick={() => {
                  setLegalModalTab('eula');
                  setIsLegalModalOpen(true);
                }}
                style={{ color: colors.usdtColor }}
                className="hover:underline cursor-pointer"
              >
                Términos de uso (EULA)
              </button>
              <span style={{ color: colors.mutedTextColor }}>•</span>
              <button
                type="button"
                id="link-privacy"
                onClick={() => {
                  setLegalModalTab('privacy');
                  setIsLegalModalOpen(true);
                }}
                style={{ color: colors.usdtColor }}
                className="hover:underline cursor-pointer"
              >
                Política de privacidad
              </button>
            </div>
          </div>
        </div>

        {/* Opción para Calificar la Aplicación (In-App Review / Calificación en Tienda) */}
        <div 
          id="card-settings-rate-app"
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-4 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <button
            id="btn-rate-app"
            type="button"
            onClick={handleRateApp}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div 
                style={{ 
                  backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3',
                  color: '#EAB308'
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
              >
                <Star size={18} className="fill-[#EAB308] text-[#EAB308]" />
              </div>
              <div>
                <h3 style={{ color: colors.textColor }} className="font-bold text-sm leading-snug group-hover:underline">
                  ⭐ Calificar TasaToday
                </h3>
                <p style={{ color: colors.secondaryTextColor }} className="text-xs">
                  Apóyanos con 5 estrellas en la tienda
                </p>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: colors.mutedTextColor }} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>

          {rateToast && (
            <div 
              id="toast-rate-app"
              className="mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300 animate-fade-in"
            >
              <Check size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium leading-snug">{rateToast}</span>
            </div>
          )}
        </div>

        {/* Descargo Legal de Responsabilidad Financiera (Google Play Financial Services & Apple Guideline 5.1.1) */}
        <div 
          id="card-settings-financial-disclaimer"
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-4 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <div className="flex items-start gap-3">
            <div 
              style={{ 
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                color: '#3B82F6'
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            >
              <ShieldCheck size={16} />
            </div>
            <div className="space-y-1">
              <h3 style={{ color: colors.textColor }} className="font-bold text-xs">
                Descargo de Responsabilidad Financiera
              </h3>
              <p style={{ color: colors.secondaryTextColor }} className="text-[11px] leading-relaxed">
                Los valores y cotizaciones exhibidos (BCV, USDT, Euro, Oro y Criptoactivos) son únicamente de carácter informativo y referencial, extraídos de fuentes públicas y mercados de intercambio. TasaToday no es una entidad bancaria ni presta servicios de intermediación cambiaria, captación o remesas.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Rates Adjustment Tool */}
        <div 
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-4 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} style={{ color: colors.usdtColor }} />
              <h3 style={{ color: colors.textColor }} className="font-bold text-sm">Ajuste Manual de Tasas</h3>
            </div>
            <button
              onClick={() => setShowEditRates(!showEditRates)}
              style={{ color: colors.usdtColor }}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              {showEditRates ? 'Ocultar' : 'Editar Tasas'}
            </button>
          </div>

          {showEditRates && (
            <form onSubmit={handleSaveRates} className="mt-4 space-y-3 pt-3 border-t border-gray-200/50">
              <p style={{ color: colors.secondaryTextColor }} className="text-xs">
                Puedes ajustar las tasas para tu negocio o comercio local:
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block font-semibold mb-1">TASA USDT (Bs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={editUsdt}
                    onChange={(e) => setEditUsdt(e.target.value)}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-2 border rounded font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block font-semibold mb-1">BCV OFICIAL (Bs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={editBcv}
                    onChange={(e) => setEditBcv(e.target.value)}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-2 border rounded font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block font-semibold mb-1">EURO (Bs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={editEuro}
                    onChange={(e) => setEditEuro(e.target.value)}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-2 border rounded font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block font-semibold mb-1">BITCOIN ($ USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={editBtc}
                    onChange={(e) => setEditBtc(e.target.value)}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-2 border rounded font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block font-semibold mb-1">ONZA DE ORO ($ USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={editOro}
                    onChange={(e) => setEditOro(e.target.value)}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-2 border rounded font-mono text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  style={{ backgroundColor: colors.usdtColor }}
                  className="flex-1 text-white py-2 rounded text-xs font-bold hover:opacity-90 transition-colors cursor-pointer"
                >
                  Guardar Tasas
                </button>
                <button
                  type="button"
                  onClick={handleResetRates}
                  disabled={isResetting}
                  style={{
                    backgroundColor: isDark ? '#334155' : '#F1F5F9',
                    color: colors.textColor,
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold hover:opacity-80 transition-colors cursor-pointer disabled:opacity-50"
                  title="Restablecer con las tasas oficiales en vivo"
                >
                  <RotateCcw size={12} className={isResetting ? 'animate-spin' : ''} />
                  <span>{isResetting ? 'Restableciendo...' : 'Restablecer'}</span>
                </button>
              </div>
              {resetSuccessToast && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                  <Check size={14} className="shrink-0" />
                  <span>¡Tasas restablecidas a los valores reales y actualizados del momento!</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Info & Fecha */}
        <div className="text-center text-xs py-2 space-y-1">
          <p className="font-semibold text-xs tracking-wide">
            <span style={{ color: colors.usdtColor }}>$ Tasa</span>
            <span style={{ color: colors.textColor }}>Today</span>
          </p>
          <p style={{ color: colors.mutedTextColor }} className="text-xs">
            {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Ad Modal Player (Native video fallback) */}
      <AdModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onAdCompleted={handleAdCompleted}
      />

      {/* Legal Modal (Términos de uso EULA & Política de Privacidad) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
};
