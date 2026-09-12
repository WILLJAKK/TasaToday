import React, { useState, useEffect, useCallback } from 'react';
import { toBlob } from 'html-to-image';
import { 
  X, Check, Copy, Share2, RefreshCw,
  Smartphone, DollarSign, Coins, Ban, Landmark
} from 'lucide-react';
import { ExchangeRatesData, SelectedCurrency } from '../types';
import { 
  buildDynamicShareText, 
  buildFullBoardShareText,
  PaymentDetailsPayload 
} from '../utils/shareUtils';
import { useTheme } from '../context/ThemeContext';

interface ShareModalProps {
  rates: ExchangeRatesData;
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: SelectedCurrency;
}

type ShareTarget = 'usdt' | 'bcv' | 'euro' | 'btc' | 'oro' | 'all';
export type PaymentOption = 'none' | 'pago_movil' | 'zelle' | 'usdt';

interface PagoMovilData {
  banco: string;
  cedula: string;
  telefono: string;
}

interface ZelleData {
  titular: string;
  correo: string;
}

interface UsdtData {
  trc20: string;
  binanceId: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  rates,
  isOpen,
  onClose,
  defaultCurrency = 'usdt',
}) => {
  const { colors, isDark } = useTheme();
  const [selectedTarget, setSelectedTarget] = useState<ShareTarget>(defaultCurrency);
  const [copiedText, setCopiedText] = useState(false);

  // 4 Cuadros de Selección de Métodos de Pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>(() => {
    try {
      return (localStorage.getItem('tasadolar_share_payment_method') as PaymentOption) || 'none';
    } catch {
      return 'none';
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

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Recargar datos actualizados al abrir el modal
  useEffect(() => {
    if (isOpen) {
      try {
        const savedMethod = localStorage.getItem('tasadolar_share_payment_method') as PaymentOption;
        if (savedMethod) setPaymentMethod(savedMethod);
        const savedPM = localStorage.getItem('tasadolar_pm_data');
        if (savedPM) setPagoMovil(JSON.parse(savedPM));
        const savedZelle = localStorage.getItem('tasadolar_zelle_data');
        if (savedZelle) setZelle(JSON.parse(savedZelle));
        const savedUsdt = localStorage.getItem('tasadolar_usdt_data');
        if (savedUsdt) setUsdt(JSON.parse(savedUsdt));
      } catch {}
    }
  }, [isOpen]);

  // Persistir en localStorage solo cuando el modal está activo
  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem('tasadolar_share_payment_method', paymentMethod);
      window.dispatchEvent(new CustomEvent('payment-method-changed', { detail: paymentMethod }));
    } catch {}
  }, [paymentMethod, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem('tasadolar_pm_data', JSON.stringify(pagoMovil));
    } catch {}
  }, [pagoMovil, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem('tasadolar_zelle_data', JSON.stringify(zelle));
    } catch {}
  }, [zelle, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem('tasadolar_usdt_data', JSON.stringify(usdt));
    } catch {}
  }, [usdt, isOpen]);

  const handleCopySingleField = async (text: string, fieldId: string) => {
    if (!text || !text.trim()) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text.trim();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Sincronizar target cuando cambia defaultCurrency
  useEffect(() => {
    if (defaultCurrency) {
      setSelectedTarget(defaultCurrency);
    }
  }, [defaultCurrency]);

  // Obtener datos de la tasa activa
  const getActiveRateData = useCallback(() => {
    switch (selectedTarget) {
      case 'bcv':
        return { label: 'BCV', item: rates.bcv, isCrypto: false, hex: colors.bcvColor };
      case 'euro':
        return { label: 'EURO', item: rates.euro, isCrypto: false, hex: colors.euroColor };
      case 'btc':
        return { label: 'BTC', item: rates.btc, isCrypto: true, hex: colors.btcColor };
      case 'oro':
        return { label: 'ORO', item: rates.oro, isCrypto: true, hex: colors.oroColor };
      case 'usdt':
      default:
        return { label: 'USDT', item: rates.usdt, isCrypto: false, hex: colors.usdtColor };
    }
  }, [selectedTarget, rates, colors]);

  // Construir el texto con formato ESTRICTO requerido + Datos de pago
  const activeData = getActiveRateData();
  const priceDisplay = activeData.item?.price || '0,00';
  
  const paymentPayload: PaymentDetailsPayload = {
    method: paymentMethod,
    pagoMovil: paymentMethod === 'pago_movil' ? pagoMovil : undefined,
    zelle: paymentMethod === 'zelle' ? zelle : undefined,
    usdt: paymentMethod === 'usdt' ? usdt : undefined,
  };

  const dynamicMessage = selectedTarget === 'all'
    ? buildFullBoardShareText(
        {
          usdt: rates.usdt?.price,
          bcv: rates.bcv?.price,
          euro: rates.euro?.price,
          btc: rates.btc?.price,
          oro: rates.oro?.price,
        },
        new Date(),
        paymentPayload
      )
    : buildDynamicShareText({
        currencyLabel: activeData.label,
        price: priceDisplay,
        paymentDetails: paymentPayload,
      });

  // Borrar todos los datos de pago colocados
  const handleResetPaymentData = useCallback(() => {
    setPagoMovil({ banco: '', cedula: '', telefono: '' });
    setZelle({ titular: '', correo: '' });
    setUsdt({ trc20: '', binanceId: '' });
    setPaymentMethod('none');
    try {
      localStorage.removeItem('tasadolar_share_payment_method');
      localStorage.removeItem('tasadolar_pm_data');
      localStorage.removeItem('tasadolar_zelle_data');
      localStorage.removeItem('tasadolar_usdt_data');
    } catch {}
  }, []);

  if (!isOpen) return null;

  // FUNCIÓN DE COMPARTIR NATIVO: Comparte la tarjeta como imagen + plantilla de texto
  const handleNativeShare = async () => {
    try {
      const cardEl = document.getElementById('share-rate-card-capture');
      if (cardEl && typeof navigator !== 'undefined' && navigator.share) {
        try {
          const blob = await toBlob(cardEl, {
            quality: 0.98,
            pixelRatio: 2.5,
            backgroundColor: isDark ? '#0B132B' : '#FFFFFF',
            cacheBust: true,
          });
          if (blob) {
            const file = new File([blob], `Tasa-${selectedTarget.toUpperCase()}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                text: dynamicMessage,
                title: 'TasaToday',
              });
              return;
            }
          }
        } catch (e) {
          console.log('Image share fallback:', e);
        }

        await navigator.share({
          text: dynamicMessage,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.log('Share dismissed or cancelled');
    }

    // Fallback: copiar texto si Web Share no está disponible
    handleCopyText();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(dynamicMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = dynamicMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div 
        id="modal-share-container"
        style={{ 
          backgroundColor: colors.surfaceColor, 
          borderColor: colors.borderColor 
        }}
        className="rounded-xl shadow-2xl max-w-md w-full border overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header del Modal */}
        <div 
          style={{ borderColor: colors.borderColor }}
          className="flex justify-between items-center px-4 py-3 border-b shrink-0"
        >
          <div className="flex items-center gap-2">
            <div 
              style={{ backgroundColor: colors.usdtColor }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-2xs"
            >
              <Share2 size={15} />
            </div>
            <div>
              <h3 style={{ color: colors.textColor }} className="font-bold text-base leading-tight">
                Compartir Cotización
              </h3>
              <p style={{ color: colors.secondaryTextColor }} className="text-[11px]">
                Cotización oficial y datos de pago
              </p>
            </div>
          </div>
          <button
            id="btn-close-share-modal"
            onClick={onClose}
            style={{ color: colors.secondaryTextColor }}
            className="p-1.5 rounded-full hover:opacity-80 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Selector de Moneda Activa para el Formato Dinámico */}
              <div>
                <label style={{ color: colors.secondaryTextColor }} className="block text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Moneda a compartir:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['usdt', 'bcv', 'euro', 'btc', 'oro', 'all'] as const).map((curr) => {
                    const isSelected = selectedTarget === curr;
                    const labels: Record<string, string> = {
                      usdt: 'USDT',
                      bcv: 'BCV',
                      euro: 'EURO',
                      btc: 'BTC',
                      oro: 'ORO',
                      all: 'TODAS',
                    };
                    return (
                      <button
                        key={curr}
                        id={`btn-select-share-${curr}`}
                        onClick={() => setSelectedTarget(curr)}
                        style={{
                          backgroundColor: isSelected ? (curr === 'oro' ? colors.oroColor : colors.usdtColor) : (isDark ? '#1E293B' : '#F8FAFC'),
                          borderColor: isSelected ? (curr === 'oro' ? colors.oroColor : colors.usdtColor) : colors.borderColor,
                          color: isSelected ? '#FFFFFF' : colors.textColor,
                        }}
                        className="py-1.5 text-center text-xs font-bold rounded border transition-all cursor-pointer"
                      >
                        {labels[curr]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 
                1. COMPONENTE VISUAL DE PREVISUALIZACIÓN
              */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-end">
                  <button
                    id="btn-reset-payment-share"
                    onClick={handleResetPaymentData}
                    style={{ color: colors.secondaryTextColor }}
                    className="text-[11px] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    title="Limpiar datos de pago colocados"
                  >
                    <RefreshCw size={11} />
                    Limpiar datos
                  </button>
                </div>

                {/* Contenedor del elemento */}
                <div 
                  id="share-rate-card-capture"
                  style={{
                    backgroundColor: colors.surfaceColor,
                    borderColor: activeData.hex || colors.borderColor,
                  }}
                  className="p-4 rounded-xl border-2 shadow-sm select-none"
                >
                  {/* Encabezado con Logo y Marca */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/40">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: colors.usdtColor }} className="text-[18px] font-bold italic">$</span>
                      <span style={{ color: colors.usdtColor }} className="text-[16px] font-bold italic tracking-tighter">Tasa</span>
                      <span style={{ color: colors.textColor }} className="text-[16px] font-bold italic tracking-tighter">Today</span>
                    </div>
                    <span 
                      style={{ 
                        backgroundColor: activeData.hex,
                        color: '#FFFFFF' 
                      }}
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    >
                      {selectedTarget === 'all' ? 'OFICIAL' : activeData.label}
                    </span>
                  </div>

                  {/* Cuerpo según selección */}
                  {selectedTarget === 'all' ? (
                    <div className="space-y-1.5 py-1">
                      {[
                        { label: 'USDT', data: rates.usdt, color: colors.usdtColor, isCrypto: false },
                        { label: 'BCV', data: rates.bcv, color: colors.bcvColor, isCrypto: false },
                        { label: 'EURO', data: rates.euro, color: colors.euroColor, isCrypto: false },
                        { label: 'BTC', data: rates.btc, color: rates.btc ? colors.btcColor : '#999', isCrypto: true },
                        { label: 'ORO', data: rates.oro, color: rates.oro ? colors.oroColor : '#D4AF37', isCrypto: true },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span style={{ color: colors.textColor }} className="font-semibold">{item.label}</span>
                          </div>
                          <span style={{ color: colors.textColor }} className="font-mono font-bold">
                            {item.isCrypto ? '$' : 'Bs.'} {item.data?.price || 'N/D'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 flex flex-col items-center justify-center text-center">
                      <span style={{ color: colors.secondaryTextColor }} className="text-xs font-semibold uppercase tracking-wider">
                        1 {selectedTarget === 'btc' ? 'BITCOIN' : selectedTarget === 'oro' ? 'ONZA DE ORO' : 'DÓLAR'} =
                      </span>
                      <div className="flex items-baseline justify-center gap-1 my-1">
                        <span style={{ color: colors.secondaryTextColor }} className="text-xl font-bold">
                          {selectedTarget === 'btc' || selectedTarget === 'oro' ? '$' : 'Bs.'}
                        </span>
                        <span 
                          style={{ color: colors.textColor }}
                          className="text-4xl font-extrabold font-mono tracking-tight"
                        >
                          {priceDisplay}
                        </span>
                      </div>
                      {activeData.item?.change && (
                        <div className={`text-xs font-bold ${activeData.item.isUp ? 'text-[#2C9945]' : 'text-red-500'}`}>
                          {activeData.item.isUp ? '▲ +' : '▼ -'}{activeData.item.change} ({activeData.item.percent || '0.00'}%)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pie de datos de pago en la tarjeta gráfica si está activo */}
                  {paymentMethod === 'pago_movil' && (pagoMovil.banco || pagoMovil.cedula || pagoMovil.telefono) && (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 text-[10px] space-y-0.5 text-left font-mono">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        📱 Pago Móvil: {[pagoMovil.banco, pagoMovil.cedula, pagoMovil.telefono].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  )}
                  {paymentMethod === 'zelle' && (zelle.titular || zelle.correo) && (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 text-[10px] space-y-0.5 text-left font-mono">
                      <div className="font-bold text-purple-600 dark:text-purple-400 truncate">
                        💳 Zelle: {[zelle.titular, zelle.correo].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  )}
                  {paymentMethod === 'usdt' && (usdt.trc20 || usdt.binanceId) && (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 text-[10px] space-y-0.5 text-left font-mono">
                      <div className="font-bold text-amber-500 truncate">
                        🪙 USDT: {[usdt.trc20 ? `TRC20: ${usdt.trc20}` : null, usdt.binanceId ? `ID: ${usdt.binanceId}` : null].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  )}

                  {/* Pie de la tarjeta */}
                  <div className="pt-2 mt-2 border-t border-gray-200/40 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>TasaToday</span>
                    <span>{new Date().toLocaleDateString('es-VE')}</span>
                  </div>
                </div>
              </div>

              {/* 
                DATOS DE PAGO PARA EL CLIENTE
              */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label style={{ color: colors.secondaryTextColor }} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark size={13} className="text-[#3F9047]" />
                      DATOS DE PAGO PARA EL CLIENTE
                    </label>
                    <p style={{ color: colors.mutedTextColor }} className="text-[10px] mt-0.5">
                      Opcional para incluir en el recibo a tu cliente. TasaToday no gestiona cobros ni transferencias.
                    </p>
                  </div>
                </div>

                {/* Los 4 Cuadros */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {[
                    { id: 'none', label: 'Sin Datos', sub: 'Solo Tasa', icon: Ban, color: '#64748B' },
                    { id: 'pago_movil', label: 'Pago Móvil', sub: '3 Datos', icon: Smartphone, color: colors.usdtColor },
                    { id: 'zelle', label: 'Zelle', sub: 'Titular/Mail', icon: DollarSign, color: '#7C3AED' },
                    { id: 'usdt', label: 'USDT', sub: 'TRC20/Binance', icon: Coins, color: '#F59E0B' },
                  ].map((item) => {
                    const isSelected = paymentMethod === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        id={`btn-pay-method-${item.id}`}
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
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0"
                        >
                          <Icon size={14} />
                        </div>
                        <span 
                          style={{ color: isSelected ? (isDark ? '#FFFFFF' : '#0F172A') : colors.textColor }}
                          className="text-[11px] font-bold leading-tight truncate w-full"
                        >
                          {item.label}
                        </span>
                        <span 
                          style={{ color: isSelected ? item.color : colors.secondaryTextColor }}
                          className="text-[9px] font-medium leading-none truncate w-full hidden sm:block"
                        >
                          {item.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* CUADROS PARA PAGO MÓVIL: 3 Cuadros manuales con botón copiar */}
                {paymentMethod === 'pago_movil' && (
                  <div 
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.borderColor,
                    }}
                    className="p-3 rounded-lg border space-y-2.5 animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Smartphone size={13} />
                        Datos para Pago Móvil (3 Campos):
                      </span>
                      <span style={{ color: colors.secondaryTextColor }} className="text-[10px]">
                        Listo para copiar y enviar
                      </span>
                    </div>

                    {/* 1. Banco */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        1. Banco:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-pm-banco"
                          type="text"
                          value={pagoMovil.banco}
                          onChange={(e) => setPagoMovil(prev => ({ ...prev, banco: e.target.value }))}
                          placeholder="Ej: Banesco (0134), BDV, Mercantil..."
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                        />
                        <button
                          id="btn-copy-pm-banco"
                          type="button"
                          onClick={() => handleCopySingleField(pagoMovil.banco, 'pm_banco')}
                          disabled={!pagoMovil.banco.trim()}
                          style={{
                            backgroundColor: copiedField === 'pm_banco' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'pm_banco' ? '#FFFFFF' : (pagoMovil.banco.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'pm_banco' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !pagoMovil.banco.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar Banco"
                        >
                          {copiedField === 'pm_banco' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'pm_banco' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Cédula / RIF */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        2. Cédula / RIF:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-pm-cedula"
                          type="text"
                          value={pagoMovil.cedula}
                          onChange={(e) => setPagoMovil(prev => ({ ...prev, cedula: e.target.value }))}
                          placeholder="Ej: V-12345678 o J-12345678"
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                        />
                        <button
                          id="btn-copy-pm-cedula"
                          type="button"
                          onClick={() => handleCopySingleField(pagoMovil.cedula, 'pm_cedula')}
                          disabled={!pagoMovil.cedula.trim()}
                          style={{
                            backgroundColor: copiedField === 'pm_cedula' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'pm_cedula' ? '#FFFFFF' : (pagoMovil.cedula.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'pm_cedula' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !pagoMovil.cedula.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar Cédula"
                        >
                          {copiedField === 'pm_cedula' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'pm_cedula' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Teléfono */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        3. Teléfono:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-pm-telefono"
                          type="text"
                          value={pagoMovil.telefono}
                          onChange={(e) => setPagoMovil(prev => ({ ...prev, telefono: e.target.value }))}
                          placeholder="Ej: 0414-1234567 o 0412-9876543"
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                        />
                        <button
                          id="btn-copy-pm-telefono"
                          type="button"
                          onClick={() => handleCopySingleField(pagoMovil.telefono, 'pm_telefono')}
                          disabled={!pagoMovil.telefono.trim()}
                          style={{
                            backgroundColor: copiedField === 'pm_telefono' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'pm_telefono' ? '#FFFFFF' : (pagoMovil.telefono.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'pm_telefono' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !pagoMovil.telefono.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar Teléfono"
                        >
                          {copiedField === 'pm_telefono' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'pm_telefono' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CUADROS PARA ZELLE: Lo necesario para enviar dinero con botón copiar */}
                {paymentMethod === 'zelle' && (
                  <div 
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.borderColor,
                    }}
                    className="p-3 rounded-lg border space-y-2.5 animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <DollarSign size={13} />
                        Datos para Zelle (2 Campos):
                      </span>
                      <span style={{ color: colors.secondaryTextColor }} className="text-[10px]">
                        Listo para copiar y enviar
                      </span>
                    </div>

                    {/* 1. Titular */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        1. Nombre del Titular:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-zelle-titular"
                          type="text"
                          value={zelle.titular}
                          onChange={(e) => setZelle(prev => ({ ...prev, titular: e.target.value }))}
                          placeholder="Ej: Juan Pérez"
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                        />
                        <button
                          id="btn-copy-zelle-titular"
                          type="button"
                          onClick={() => handleCopySingleField(zelle.titular, 'zelle_titular')}
                          disabled={!zelle.titular.trim()}
                          style={{
                            backgroundColor: copiedField === 'zelle_titular' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'zelle_titular' ? '#FFFFFF' : (zelle.titular.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'zelle_titular' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !zelle.titular.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar Titular"
                        >
                          {copiedField === 'zelle_titular' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'zelle_titular' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Correo o Teléfono */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        2. Correo o Teléfono Zelle:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-zelle-correo"
                          type="text"
                          value={zelle.correo}
                          onChange={(e) => setZelle(prev => ({ ...prev, correo: e.target.value }))}
                          placeholder="Ej: pagos@empresa.com o +1 786-1234567"
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                        />
                        <button
                          id="btn-copy-zelle-correo"
                          type="button"
                          onClick={() => handleCopySingleField(zelle.correo, 'zelle_correo')}
                          disabled={!zelle.correo.trim()}
                          style={{
                            backgroundColor: copiedField === 'zelle_correo' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'zelle_correo' ? '#FFFFFF' : (zelle.correo.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'zelle_correo' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !zelle.correo.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar Zelle"
                        >
                          {copiedField === 'zelle_correo' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'zelle_correo' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CUADROS PARA USDT: Solo TRC20 o ID BINANCE */}
                {paymentMethod === 'usdt' && (
                  <div 
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.borderColor,
                    }}
                    className="p-3 rounded-lg border space-y-2.5 animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                        <Coins size={13} />
                        Datos para USDT (TRC20 / Binance ID):
                      </span>
                      <span style={{ color: colors.secondaryTextColor }} className="text-[10px]">
                        Listo para copiar y enviar
                      </span>
                    </div>

                    {/* 1. TRC20 */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        1. Dirección Red Tron (TRC20):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-usdt-trc20"
                          type="text"
                          value={usdt.trc20}
                          onChange={(e) => setUsdt(prev => ({ ...prev, trc20: e.target.value }))}
                          placeholder="Dirección USDT (ej: TJy4hD8...)"
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                        <button
                          id="btn-copy-usdt-trc20"
                          type="button"
                          onClick={() => handleCopySingleField(usdt.trc20, 'usdt_trc20')}
                          disabled={!usdt.trc20.trim()}
                          style={{
                            backgroundColor: copiedField === 'usdt_trc20' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'usdt_trc20' ? '#FFFFFF' : (usdt.trc20.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'usdt_trc20' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !usdt.trc20.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar TRC20"
                        >
                          {copiedField === 'usdt_trc20' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'usdt_trc20' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Binance ID / Pay ID */}
                    <div className="space-y-1">
                      <label style={{ color: colors.secondaryTextColor }} className="text-[10px] font-bold uppercase tracking-wider">
                        2. ID Binance / Pay ID:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-usdt-binance"
                          type="text"
                          value={usdt.binanceId}
                          onChange={(e) => setUsdt(prev => ({ ...prev, binanceId: e.target.value }))}
                          placeholder="Ej: 182937465"
                          style={{
                            backgroundColor: isDark ? '#090D16' : '#FFFFFF',
                            borderColor: colors.borderColor,
                            color: colors.textColor,
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                        <button
                          id="btn-copy-usdt-binance"
                          type="button"
                          onClick={() => handleCopySingleField(usdt.binanceId, 'usdt_binance')}
                          disabled={!usdt.binanceId.trim()}
                          style={{
                            backgroundColor: copiedField === 'usdt_binance' ? '#22C55E' : (isDark ? '#1E293B' : '#E2E8F0'),
                            color: copiedField === 'usdt_binance' ? '#FFFFFF' : (usdt.binanceId.trim() ? colors.textColor : colors.mutedTextColor),
                            borderColor: copiedField === 'usdt_binance' ? '#22C55E' : colors.borderColor,
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            !usdt.binanceId.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
                          }`}
                          title="Copiar ID Binance"
                        >
                          {copiedField === 'usdt_binance' ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                          <span>{copiedField === 'usdt_binance' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 
                2. PLANTILLA DE TEXTO DINÁMICA (FORMATO ESTRICTO)
              */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label style={{ color: colors.secondaryTextColor }} className="text-[11px] font-bold uppercase tracking-wider">
                    Texto dinámico (Formato Estricto):
                  </label>
                  <span className="text-[10px] text-[#2C9945] font-semibold">Listo para enviar</span>
                </div>
                <div 
                  style={{
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: colors.borderColor,
                    color: colors.textColor,
                  }}
                  className="border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed select-all shadow-inner"
                >
                  {dynamicMessage}
                </div>
              </div>

              {/* 
                BOTÓN PRINCIPAL: COMPARTIR (VERDE)
              */}
              <div className="pt-2 pb-1">
                <button
                  id="btn-native-share-trigger"
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full text-white py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all cursor-pointer bg-[#25D366] hover:bg-[#20ba59] hover:shadow-lg"
                >
                  <Share2 size={19} />
                  <span>Compartir</span>
                </button>
                {copiedText && (
                  <p className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center justify-center gap-1.5 animate-in fade-in">
                    <Check size={14} /> ¡Plantilla copiada al portapapeles!
                  </p>
                )}
              </div>
        </div>
      </div>
    </div>
  );
};
