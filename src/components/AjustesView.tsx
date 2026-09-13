import React, { useState, useEffect } from 'react';
import { ExchangeRatesData, PaymentOption, PagoMovilData, ZelleData, UsdtData } from '../types';
import { AdModal } from './AdModal';
import { LegalModal } from './LegalModal';
import { 
  Star, ShieldCheck, Play, Sliders, Check, RotateCcw, 
  AlertCircle, FileText, ChevronRight, Smartphone, DollarSign, Coins, Ban, Landmark,
  Building2, ImagePlus, Upload, Trash2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../context/ThemeContext';
import { getStoredTasamiRate, saveTasamiRate, formatTasamiRate } from '../utils/tasami';
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
  const { colors, isDark } = useTheme();
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Estado de TasaMi personalizada
  const [tasamiRate, setTasamiRate] = useState<number>(() => getStoredTasamiRate());
  const [tasamiInput, setTasamiInput] = useState<string>(() => getStoredTasamiRate().toString());
  const [tasamiSavedToast, setTasamiSavedToast] = useState<boolean>(false);

  useEffect(() => {
    const handleTasamiChanged = (e: any) => {
      const newRate = typeof e?.detail?.rate === 'number' ? e.detail.rate : getStoredTasamiRate();
      setTasamiRate(newRate);
      setTasamiInput(newRate.toString());
    };
    window.addEventListener('tasatoday_tasami_changed', handleTasamiChanged);
    return () => window.removeEventListener('tasatoday_tasami_changed', handleTasamiChanged);
  }, []);

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

  // Datos de Métodos de Pago guardados para cobros
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>(() => {
    try {
      return (localStorage.getItem('tasadolar_share_payment_method') as PaymentOption) || 'pago_movil';
    } catch {
      return 'pago_movil';
    }
  });

  const [pagoMovil, setPagoMovil] = useState<PagoMovilData>(() => {
    try {
      const saved = localStorage.getItem('tasadolar_pm_data');
      return saved ? JSON.parse(saved) : { banco: '', cedula: '', telefono: '' };
    } catch {
      return { banco: '', cedula: '', telefono: '' };
    }
  });

  const [zelle, setZelle] = useState<ZelleData>(() => {
    try {
      const saved = localStorage.getItem('tasadolar_zelle_data');
      return saved ? JSON.parse(saved) : { titular: '', correo: '' };
    } catch {
      return { titular: '', correo: '' };
    }
  });

  const [usdt, setUsdt] = useState<UsdtData>(() => {
    try {
      const saved = localStorage.getItem('tasadolar_usdt_data');
      return saved ? JSON.parse(saved) : { trc20: '', binanceId: '' };
    } catch {
      return { trc20: '', binanceId: '' };
    }
  });

  const [companyLogo, setCompanyLogo] = useState<string>(() => {
    try {
      return localStorage.getItem('tasadolar_company_logo') || '';
    } catch {
      return '';
    }
  });

  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      return localStorage.getItem('tasadolar_company_name') || '';
    } catch {
      return '';
    }
  });

  const [paymentSavedToast, setPaymentSavedToast] = useState(false);

  const handleSavePaymentMethods = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('tasadolar_share_payment_method', paymentMethod);
      localStorage.setItem('tasadolar_pm_data', JSON.stringify(pagoMovil));
      localStorage.setItem('tasadolar_zelle_data', JSON.stringify(zelle));
      localStorage.setItem('tasadolar_usdt_data', JSON.stringify(usdt));
      if (companyLogo) {
        localStorage.setItem('tasadolar_company_logo', companyLogo);
      } else {
        localStorage.removeItem('tasadolar_company_logo');
      }
      if (companyName) {
        localStorage.setItem('tasadolar_company_name', companyName);
      } else {
        localStorage.removeItem('tasadolar_company_name');
      }
      window.dispatchEvent(new CustomEvent('payment-method-changed', { detail: paymentMethod }));
      setPaymentSavedToast(true);
      setTimeout(() => setPaymentSavedToast(false), 3500);
    } catch {}
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type.includes('png');
          const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.88);
          setCompanyLogo(dataUrl);
          try {
            localStorage.setItem('tasadolar_company_logo', dataUrl);
          } catch {}
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setCompanyLogo('');
    try {
      localStorage.removeItem('tasadolar_company_logo');
    } catch {}
  };

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

  const handleSaveTasami = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(tasamiInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      saveTasamiRate(parsed);
      setTasamiRate(parsed);
      setTasamiSavedToast(true);
      setTimeout(() => setTasamiSavedToast(false), 3500);
    }
  };

  const isAdBlocked = isPremium || (adBlockExpiresAt !== null && adBlockExpiresAt > Date.now());

  return (
    <div 
      style={{ backgroundColor: colors.backgroundColor }}
      className="flex-1 overflow-y-auto p-4 flex flex-col justify-between transition-colors duration-200"
    >
      <div className="max-w-lg mx-auto w-full space-y-4 pb-8">

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

        {/* Configuración de Métodos de Pago para Cobros y Calculadora */}
        <div 
          id="card-settings-payment-methods"
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-4 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                style={{ 
                  backgroundColor: isDark ? 'rgba(44, 153, 69, 0.15)' : '#DCFCE7',
                  color: colors.usdtColor
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              >
                <Landmark size={16} />
              </div>
              <div>
                <h3 style={{ color: colors.textColor }} className="font-bold text-sm">
                  Medios de Pago para Cobrar
                </h3>
                <p style={{ color: colors.secondaryTextColor }} className="text-xs">
                  El método activo define el botón de cobro de la Calculadora y los comprobantes
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePaymentMethods} className="space-y-3.5 pt-1">
            {/* Selector de Método Predeterminado para Cobrar */}
            <div>
              <label style={{ color: colors.secondaryTextColor }} className="block text-[11px] font-bold mb-1.5 uppercase">
                Método Predeterminado Activo:
              </label>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { id: 'none', label: 'Sin Datos', icon: Ban, color: '#64748B' },
                  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, color: colors.usdtColor || '#2C9945' },
                  { id: 'zelle', label: 'Zelle', icon: DollarSign, color: '#7C3AED' },
                  { id: 'usdt', label: 'USDT', icon: Coins, color: '#F59E0B' },
                ].map((item) => {
                  const isSelected = paymentMethod === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as PaymentOption)}
                      style={{
                        backgroundColor: isSelected 
                          ? (isDark ? '#1E293B' : '#FFFFFF') 
                          : (isDark ? '#0F172A' : '#F8FAFC'),
                        borderColor: isSelected ? item.color : colors.borderColor,
                        boxShadow: isSelected ? `0 0 0 2px ${item.color}35` : undefined,
                      }}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected ? 'scale-[1.02] shadow-xs' : 'hover:opacity-85'
                      }`}
                    >
                      <div 
                        style={{ 
                          backgroundColor: isSelected ? `${item.color}25` : (isDark ? '#1E293B' : '#E2E8F0'),
                          color: isSelected ? item.color : colors.secondaryTextColor,
                        }}
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      >
                        <Icon size={13} />
                      </div>
                      <span 
                        style={{ color: isSelected ? (isDark ? '#FFFFFF' : '#0F172A') : colors.textColor }}
                        className="text-[11px] font-bold truncate w-full"
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 1: DATOS PAGO MÓVIL */}
            <div 
              style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.borderColor }}
              className="p-3 rounded-lg border space-y-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Smartphone size={14} />
                <span>Datos de Pago Móvil (Bolívares)</span>
              </div>

              <div>
                <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                  Banco
                </label>
                <input
                  type="text"
                  placeholder="Ej: Banesco (0134) o Banco de Venezuela (0102)"
                  value={pagoMovil.banco}
                  onChange={(e) => setPagoMovil(prev => ({ ...prev, banco: e.target.value }))}
                  style={{
                    backgroundColor: colors.surfaceColor,
                    color: colors.textColor,
                    borderColor: colors.borderColor,
                  }}
                  className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Cédula / RIF
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: V-12345678"
                    value={pagoMovil.cedula}
                    onChange={(e) => setPagoMovil(prev => ({ ...prev, cedula: e.target.value }))}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0414-1234567"
                    value={pagoMovil.telefono}
                    onChange={(e) => setPagoMovil(prev => ({ ...prev, telefono: e.target.value }))}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS ZELLE */}
            <div 
              style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.borderColor }}
              className="p-3 rounded-lg border space-y-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                <DollarSign size={14} />
                <span>Datos de Zelle (Dólares USD)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={zelle.titular}
                    onChange={(e) => setZelle(prev => ({ ...prev, titular: e.target.value }))}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Correo / Teléfono Zelle
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: pagos@ejemplo.com"
                    value={zelle.correo}
                    onChange={(e) => setZelle(prev => ({ ...prev, correo: e.target.value }))}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: DATOS USDT / BINANCE */}
            <div 
              style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.borderColor }}
              className="p-3 rounded-lg border space-y-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                <Coins size={14} />
                <span>Datos de USDT / Binance (Cripto)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Billetera TRC20 (Tron)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: T..."
                    value={usdt.trc20}
                    onChange={(e) => setUsdt(prev => ({ ...prev, trc20: e.target.value }))}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Binance Pay ID / Correo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 12345678"
                    value={usdt.binanceId}
                    onChange={(e) => setUsdt(prev => ({ ...prev, binanceId: e.target.value }))}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: LOGO Y EMPRESA COBRADORA */}
            <div 
              style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.borderColor }}
              className="p-3 rounded-lg border space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Building2 size={14} />
                  <span>Logo de Empresa Cobradora (Planilla)</span>
                </div>
                {companyLogo ? (
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <Check size={12} /> Guardado
                  </span>
                ) : (
                  <span style={{ color: colors.secondaryTextColor }} className="text-[10px]">
                    Opcional
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {companyLogo ? (
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-700/30 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      <img 
                        src={companyLogo} 
                        alt="Logo Empresa" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label 
                        className="px-2.5 py-1.5 rounded border border-emerald-500/40 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Upload size={12} />
                        Cambiar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-2.5 py-1.5 rounded border border-rose-500/30 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-2.5 px-3 rounded-lg border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <ImagePlus size={16} />
                    <span>Subir Logo desde tu Teléfono</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                )}

                <div className="w-full sm:flex-1">
                  <label style={{ color: colors.secondaryTextColor }} className="block text-[10px] font-bold mb-1 uppercase">
                    Nombre Comercial / Empresa
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Inversiones Ávila C.A."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      backgroundColor: colors.surfaceColor,
                      color: colors.textColor,
                      borderColor: colors.borderColor,
                    }}
                    className="w-full px-2.5 py-1.5 border rounded text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              style={{ backgroundColor: colors.usdtColor }}
              className="w-full text-white py-2.5 rounded text-xs font-bold hover:opacity-90 transition-colors cursor-pointer shadow-xs"
            >
              Guardar Métodos de Pago
            </button>

            {paymentSavedToast && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1 animate-fade-in">
                <Check size={14} className="shrink-0" />
                <span>¡Métodos de pago guardados! El botón de la Calculadora se ha actualizado con tu método predeterminado.</span>
              </div>
            )}
          </form>
        </div>

        {/* Ajuste manual de TasaMi */}
        <div 
          id="card-settings-tasami"
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="p-4 rounded-xs border shadow-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sliders size={16} style={{ color: '#7C3AED' }} />
              <h3 style={{ color: colors.textColor }} className="font-bold text-sm">
                Ajuste manual de TasaMi
              </h3>
            </div>
            <span 
              style={{ 
                backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE',
                color: '#7C3AED' 
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              Tasa activa: Bs. {formatTasamiRate(tasamiRate)}
            </span>
          </div>

          <p style={{ color: colors.secondaryTextColor }} className="text-xs mb-3">
            Ingresa el valor de tu tasa personalizada (Bs. por dólar). Quedará guardada en tu dispositivo y se vinculará directamente con la Calculadora en la opción TasaMi.
          </p>

          <form onSubmit={handleSaveTasami} className="space-y-3">
            <div>
              <label 
                style={{ color: colors.secondaryTextColor }} 
                className="block font-semibold mb-1 text-xs"
              >
                TasaMi (Bs.)
              </label>
              <div className="relative">
                <input
                  id="input-tasami-rate"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ej: 950.00"
                  value={tasamiInput}
                  onChange={(e) => setTasamiInput(e.target.value)}
                  style={{
                    backgroundColor: colors.surfaceColor,
                    color: colors.textColor,
                    borderColor: colors.borderColor,
                  }}
                  className="w-full px-3 py-2.5 border rounded font-mono text-base font-bold outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <span 
                  style={{ color: colors.secondaryTextColor }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
                >
                  Bs. / $
                </span>
              </div>
            </div>

            <button
              id="btn-save-tasami"
              type="submit"
              style={{ backgroundColor: '#7C3AED' }}
              className="w-full text-white py-2.5 rounded text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check size={15} />
              <span>Guardar TasaMi</span>
            </button>

            {tasamiSavedToast && (
              <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 p-2 rounded font-medium animate-fade-in">
                <Check size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
                <span>¡TasaMi guardada exitosamente! Se sincronizó en tu dispositivo y en la Calculadora.</span>
              </div>
            )}
          </form>
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
