import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toBlob, toPng } from 'html-to-image';
import { 
  ExchangeRatesData, 
  SelectedCurrency, 
  GoldUnit, 
  PaymentOption, 
  PagoMovilData, 
  ZelleData, 
  UsdtData,
  TROY_OZ_PER_KG,
  GRAMS_PER_TROY_OZ
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { getStoredTasamiRate, formatTasamiRate } from '../utils/tasami';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Smartphone, 
  DollarSign, 
  Coins, 
  Ban,
  Landmark,
  Loader2,
  ImagePlus,
  Building2,
  Trash2,
  Upload,
  QrCode
} from 'lucide-react';

interface ShareCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: ExchangeRatesData;
  selectedCurrency: SelectedCurrency;
  conversionDirection: 'USD_TO_BS' | 'BS_TO_USD';
  amount: string;
  resultDisplay: string;
  subTextDisplay: string;
  resultTitle: string;
  bcvEquivalent?: string;
  usdtEquivalent?: string;
  goldUnit?: GoldUnit;
  initialPaymentMethod?: PaymentOption;
  onPaymentMethodChange?: (method: PaymentOption) => void;
}

const POPULAR_BANKS = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0134', name: 'Banesco' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'Banco Provincial (BBVA)' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0191', name: 'BNC (Nacional de Crédito)' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0175', name: 'Banco Bicentenario' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0174', name: 'Banplus' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0151', name: 'BFC Fondo Común' },
  { code: '0177', name: 'BANFANB' },
  { code: '0169', name: 'Mi Banco' },
];

export const ShareCalculationModal: React.FC<ShareCalculationModalProps> = ({
  isOpen,
  onClose,
  rates,
  selectedCurrency,
  conversionDirection,
  amount,
  resultDisplay,
  subTextDisplay,
  resultTitle,
  bcvEquivalent,
  goldUnit,
  initialPaymentMethod,
  onPaymentMethodChange,
}) => {
  const { colors, isDark } = useTheme();

  // Método de pago activo (none, pago_movil, zelle, usdt)
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>(() => {
    if (initialPaymentMethod) return initialPaymentMethod;
    try {
      return (localStorage.getItem('tasadolar_share_payment_method') as PaymentOption) || 'pago_movil';
    } catch {
      return 'pago_movil';
    }
  });

  // Datos de Pago Móvil guardados en localStorage
  const [pagoMovil, setPagoMovil] = useState<PagoMovilData>(() => {
    try {
      const saved = localStorage.getItem('tasadolar_pm_data');
      return saved ? JSON.parse(saved) : { banco: '', cedula: '', telefono: '' };
    } catch {
      return { banco: '', cedula: '', telefono: '' };
    }
  });

  // Datos de Zelle guardados en localStorage
  const [zelle, setZelle] = useState<ZelleData>(() => {
    try {
      const saved = localStorage.getItem('tasadolar_zelle_data');
      return saved ? JSON.parse(saved) : { titular: '', correo: '' };
    } catch {
      return { titular: '', correo: '' };
    }
  });

  // Datos de USDT guardados en localStorage
  const [usdt, setUsdt] = useState<UsdtData>(() => {
    try {
      const saved = localStorage.getItem('tasadolar_usdt_data');
      return saved ? JSON.parse(saved) : { trc20: '', binanceId: '' };
    } catch {
      return { trc20: '', binanceId: '' };
    }
  });

  const [note, setNote] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Logo y Nombre de la empresa o negocio cobrador
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

  const receiptRef = useRef<HTMLDivElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar datos cada vez que el modal se abre
  useEffect(() => {
    if (isOpen) {
      try {
        const savedMethod = (localStorage.getItem('tasadolar_share_payment_method') as PaymentOption) || initialPaymentMethod || 'pago_movil';
        setPaymentMethod(savedMethod);

        const savedLogo = localStorage.getItem('tasadolar_company_logo');
        if (savedLogo) setCompanyLogo(savedLogo);

        const savedName = localStorage.getItem('tasadolar_company_name');
        if (savedName) setCompanyName(savedName);

        const savedPM = localStorage.getItem('tasadolar_pm_data');
        if (savedPM) {
          const parsed = JSON.parse(savedPM);
          if (parsed && typeof parsed === 'object') {
            setPagoMovil({
              banco: parsed.banco || '',
              cedula: parsed.cedula || '',
              telefono: parsed.telefono || '',
            });
          }
        }

        const savedZelle = localStorage.getItem('tasadolar_zelle_data');
        if (savedZelle) {
          const parsed = JSON.parse(savedZelle);
          if (parsed && typeof parsed === 'object') {
            setZelle({
              titular: parsed.titular || '',
              correo: parsed.correo || '',
            });
          }
        }

        const savedUsdt = localStorage.getItem('tasadolar_usdt_data');
        if (savedUsdt) {
          const parsed = JSON.parse(savedUsdt);
          if (parsed && typeof parsed === 'object') {
            setUsdt({
              trc20: parsed.trc20 || '',
              binanceId: parsed.binanceId || '',
            });
          }
        }
      } catch (err) {
        console.error('Error reloading payment data:', err);
      }
    }
  }, [isOpen, initialPaymentMethod]);

  // Manejar cambio de método de pago y persistir
  const handleSelectPaymentMethod = (method: PaymentOption) => {
    setPaymentMethod(method);
    try {
      localStorage.setItem('tasadolar_share_payment_method', method);
      window.dispatchEvent(new CustomEvent('payment-method-changed', { detail: method }));
    } catch {}
    onPaymentMethodChange?.(method);
  };

  // Guardar datos en localStorage cuando cambien dentro del modal abierto
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

  // Persistir logo y nombre de la empresa
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (companyLogo) {
        localStorage.setItem('tasadolar_company_logo', companyLogo);
      } else {
        localStorage.removeItem('tasadolar_company_logo');
      }
    } catch {}
  }, [companyLogo, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      if (companyName) {
        localStorage.setItem('tasadolar_company_name', companyName);
      } else {
        localStorage.removeItem('tasadolar_company_name');
      }
    } catch {}
  }, [companyName, isOpen]);

  // Función para comprimir la imagen del logo y convertirla en Data URL ligero
  const compressLogoImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
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
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type === 'image/png' || file.type.includes('png');
          const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.88);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  // Manejador de subida de archivo de logo desde teléfono o PC
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setShareFeedback('Por favor selecciona una imagen válida (PNG, JPG o WebP)');
      setTimeout(() => setShareFeedback(null), 3000);
      return;
    }

    try {
      const compressedDataUrl = await compressLogoImage(file);
      setCompanyLogo(compressedDataUrl);
      setShareFeedback('¡Logo implantado en la planilla con éxito!');
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (err) {
      console.error('Error al procesar logo:', err);
      setShareFeedback('Error al procesar la imagen del logo');
      setTimeout(() => setShareFeedback(null), 3000);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Eliminar logo de la planilla
  const handleRemoveLogo = () => {
    setCompanyLogo('');
    try {
      localStorage.removeItem('tasadolar_company_logo');
    } catch {}
    setShareFeedback('Logo retirado de la planilla');
    setTimeout(() => setShareFeedback(null), 2500);
  };

  const currencyNames: Record<SelectedCurrency, string> = {
    usdt: 'USDT (Binance P2P)',
    bcv: 'BCV Oficial',
    euro: 'EURO Oficial',
    btc: 'Bitcoin Spot',
    oro: goldUnit === 'kg' ? 'Kilo de Oro' : goldUnit === 'g' ? 'Gramo de Oro' : 'Onza de Oro',
    tasami: 'TasaMi (Personalizada)',
  };

  const storedTasami = selectedCurrency === 'tasami' ? getStoredTasamiRate() : 0;
  const activeRateItem = selectedCurrency === 'tasami'
    ? {
        price: formatTasamiRate(storedTasami),
        numPrice: storedTasami,
        status: 'ok' as const,
      }
    : rates[selectedCurrency];
  const ratePriceFormatted = activeRateItem?.price || '0,00';

  // Fecha actual formateada
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isOro = selectedCurrency === 'oro';
  const isBTC = selectedCurrency === 'btc';

  // Cálculo de cotización real de Oro según unidad seleccionada
  const goldOzPrice = rates.oro?.numPrice || 0;
  const effectiveGoldRate = goldUnit === 'kg'
    ? goldOzPrice * TROY_OZ_PER_KG
    : goldUnit === 'g'
      ? goldOzPrice / GRAMS_PER_TROY_OZ
      : goldOzPrice;
  const effectiveGoldRateFormatted = effectiveGoldRate.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Tasa para mostrar en la caja "Tasa Aplicada"
  let rateDisplayForBox = `Bs. ${ratePriceFormatted}`;
  // Fórmula descriptiva para la plantilla de texto
  let rateFormula = `1$ = Bs. ${ratePriceFormatted}`;

  if (isOro) {
    if (goldUnit === 'kg') {
      rateDisplayForBox = `$ ${effectiveGoldRateFormatted} / Kg`;
      rateFormula = `1 Kg = $ ${effectiveGoldRateFormatted}`;
    } else if (goldUnit === 'g') {
      rateDisplayForBox = `$ ${effectiveGoldRateFormatted} / g`;
      rateFormula = `1 g = $ ${effectiveGoldRateFormatted}`;
    } else {
      rateDisplayForBox = `$ ${effectiveGoldRateFormatted} / Oz`;
      rateFormula = `1 Oz = $ ${effectiveGoldRateFormatted}`;
    }
  } else if (isBTC) {
    rateDisplayForBox = `$ ${rates.btc?.price || ratePriceFormatted}`;
    rateFormula = `1 BTC = $ ${rates.btc?.price || ratePriceFormatted}`;
  } else if (selectedCurrency === 'euro') {
    rateDisplayForBox = `Bs. ${ratePriceFormatted}`;
    rateFormula = `1€ = Bs. ${ratePriceFormatted}`;
  }

  // Formatear monto base con separadores de miles
  const formatInputAmount = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '0';
    const parts = trimmed.split('.');
    const intPart = Number(parts[0]);
    if (isNaN(intPart)) return trimmed;
    const formattedInt = intPart.toLocaleString('en-US');
    return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
  };

  let inputDisplay = '';
  if (isOro) {
    if (conversionDirection === 'USD_TO_BS') {
      const unitLabel = goldUnit === 'kg' ? 'Kg' : goldUnit === 'g' ? 'g' : 'Oz';
      inputDisplay = `${formatInputAmount(amount)} ${unitLabel} Oro`;
    } else {
      inputDisplay = `$ ${formatInputAmount(amount)}`;
    }
  } else if (isBTC) {
    if (conversionDirection === 'USD_TO_BS') {
      inputDisplay = `${amount} BTC`;
    } else {
      inputDisplay = `$ ${formatInputAmount(amount)}`;
    }
  } else if (selectedCurrency === 'euro') {
    if (conversionDirection === 'USD_TO_BS') {
      inputDisplay = `${formatInputAmount(amount)} €`;
    } else {
      inputDisplay = `Bs. ${formatInputAmount(amount)}`;
    }
  } else {
    if (conversionDirection === 'USD_TO_BS') {
      inputDisplay = `$ ${formatInputAmount(amount)}`;
    } else {
      inputDisplay = `Bs. ${formatInputAmount(amount)}`;
    }
  };

  // Construir plantilla completa estrictamente en texto
  const buildShareText = useCallback(() => {
    const rawDay = now.toLocaleDateString('es-VE', { weekday: 'long' });
    const capitalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const formattedDate = `${day}/${month}/${year}`;

    const lines: string[] = [];

    lines.push(`Tasa ${currencyNames[selectedCurrency]}: ${rateFormula}`);
    lines.push(`Monto a pagar: ${resultDisplay} (${inputDisplay})`);

    if (companyName.trim()) {
      lines.push(`🏢 Empresa / Cobrador: ${companyName.trim()}`);
    }

    if (note.trim()) {
      lines.push(`Concepto: ${note.trim()}`);
    }

    if (paymentMethod === 'pago_movil') {
      const pmLines: string[] = [];
      if (pagoMovil.banco.trim()) pmLines.push(`🏦 Banco: ${pagoMovil.banco.trim()}`);
      if (pagoMovil.cedula.trim()) pmLines.push(`🪪 Cédula/RIF: ${pagoMovil.cedula.trim()}`);
      if (pagoMovil.telefono.trim()) pmLines.push(`📱 Teléfono: ${pagoMovil.telefono.trim()}`);
      if (pmLines.length > 0) {
        lines.push('');
        lines.push('📌 Datos para Pago Móvil:');
        lines.push(...pmLines);
      }
    } else if (paymentMethod === 'zelle') {
      const zLines: string[] = [];
      if (zelle.titular.trim()) zLines.push(`👤 Titular: ${zelle.titular.trim()}`);
      if (zelle.correo.trim()) zLines.push(`💵 Zelle (Correo/Tlf): ${zelle.correo.trim()}`);
      if (zLines.length > 0) {
        lines.push('');
        lines.push('📌 Datos para Zelle:');
        lines.push(...zLines);
      }
    } else if (paymentMethod === 'usdt') {
      const uLines: string[] = [];
      if (usdt.trc20.trim()) uLines.push(`🔗 Red TRC20: ${usdt.trc20.trim()}`);
      if (usdt.binanceId.trim()) uLines.push(`🆔 Binance Pay / ID: ${usdt.binanceId.trim()}`);
      if (uLines.length > 0) {
        lines.push('');
        lines.push('📌 Datos para USDT:');
        lines.push(...uLines);
      }
    }

    lines.push('');
    lines.push(`Fecha valor: ${capitalizedDay}, ${formattedDate}`);

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }, [selectedCurrency, rateFormula, resultDisplay, inputDisplay, companyName, note, paymentMethod, pagoMovil, zelle, usdt, now]);

  // Manejar copiado de campo individual
  const handleCopyField = async (text: string, fieldId: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Copiar todo el texto
  const handleCopyAll = async () => {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  // Función utilitaria para descargar un Blob como archivo
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Generar Blob de la planilla gráfica de cobro
  const generateReceiptBlob = async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;
    try {
      await new Promise((r) => setTimeout(r, 60));
      const blob = await toBlob(receiptRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: isDark ? '#0B132B' : '#FFFFFF',
        cacheBust: true,
      });
      if (blob) return blob;

      const dataUrl = await toPng(receiptRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: isDark ? '#0B132B' : '#FFFFFF',
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error('Error al generar la imagen de la planilla:', err);
      return null;
    }
  };

  // Compartir Planilla Completa: envía la imagen de la planilla + texto con cálculo y tipo de pago
  const handleSharePlanilla = async () => {
    setIsGenerating(true);
    setShareFeedback(null);
    const text = buildShareText();

    try {
      const blob = await generateReceiptBlob();

      if (blob) {
        const file = new File(
          [blob], 
          `Planilla-Cobro-${selectedCurrency.toUpperCase()}-${Date.now()}.png`, 
          { type: 'image/png' }
        );

        // Si el dispositivo (iOS/Android/PWA) soporta compartir archivos por Web Share API:
        // WhatsApp lo recibe con la imagen en el encabezado y el texto en la leyenda
        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: text,
            title: `Planilla de Cobro - TasaToday`,
          });
          return;
        }

        // Si no soporta compartir archivo directo, lo descargamos automáticamente
        downloadBlob(blob, `Planilla-Cobro-${selectedCurrency.toUpperCase()}.png`);
        setShareFeedback('¡Planilla descargada! Adjúntala en el chat.');
      }

      // Si soporta compartir texto:
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ text });
          return;
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
        }
      }

      // Fallback: copiar texto y abrir WhatsApp
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
      handleShareWhatsApp();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error al compartir planilla:', err);
      handleShareWhatsApp();
    } finally {
      setIsGenerating(false);
    }
  };

  // Descarga directa solo de la imagen PNG de la planilla
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateReceiptBlob();
      if (blob) {
        downloadBlob(blob, `Planilla-Cobro-${selectedCurrency.toUpperCase()}-${Date.now()}.png`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Enviar directamente por WhatsApp solo texto
  const handleShareWhatsApp = () => {
    const text = buildShareText();
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const paymentOptions = [
    { id: 'none', label: 'Sin Datos', sub: 'Solo Cálculo', icon: Ban, color: '#64748B' },
    { id: 'pago_movil', label: 'Pago Móvil', sub: '3 Datos', icon: Smartphone, color: colors.usdtColor || '#2C9945' },
    { id: 'zelle', label: 'Zelle', sub: 'Titular/Correo', icon: DollarSign, color: '#7C3AED' },
    { id: 'usdt', label: 'USDT', sub: 'TRC20/Binance', icon: Coins, color: '#F59E0B' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
      <div 
        id="modal-share-calc-container"
        style={{ 
          backgroundColor: colors.surfaceColor, 
          borderColor: colors.borderColor,
          color: colors.textColor 
        }}
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col"
      >
        {/* Header Modal */}
        <div 
          style={{ borderColor: colors.borderColor }}
          className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-black/5 dark:bg-white/5"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">
                Compartir Cobro
              </h3>
              <p style={{ color: colors.mutedTextColor }} className="text-[11px]">
                {paymentMethod === 'pago_movil' 
                  ? 'Listo con tus datos de Pago Móvil' 
                  : paymentMethod === 'zelle' 
                    ? 'Listo con tus datos de Zelle' 
                    : paymentMethod === 'usdt' 
                      ? 'Listo con tus datos de USDT' 
                      : 'Envía el desglose de tasa y cálculo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Input oculto para subir logo desde galería o cámara del teléfono */}
          <input
            type="file"
            ref={logoFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          
            {/* Botones de Compartir y Descarga */}
          <div className="space-y-2">
            <button
              id="btn-share-calc-primary"
              type="button"
              disabled={isGenerating}
              onClick={handleSharePlanilla}
              className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-75"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Compartiendo...</span>
                </>
              ) : (
                <>
                  <Share2 size={20} className="shrink-0" />
                  <span>Compartir</span>
                </>
              )}
            </button>

            {shareFeedback && (
              <div className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                {shareFeedback}
              </div>
            )}

            <div className="flex items-center justify-center pt-0.5">
              <button
                id="btn-share-calc-copy-all"
                type="button"
                onClick={handleCopyAll}
                style={{ color: colors.secondaryTextColor }}
                className="text-xs hover:underline flex items-center gap-1.5 py-1 px-2 cursor-pointer font-medium"
              >
                {copiedAll ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedAll ? '¡Plantilla de texto copiada!' : 'Copiar plantilla de texto'}</span>
              </button>
            </div>
          </div>

          {/* TARJETA VISUAL / COMPROBANTE (Capturable como imagen PNG) */}
          <div 
            ref={receiptRef}
            style={{
              backgroundColor: isDark ? '#0B132B' : '#F8FAFC',
              borderColor: colors.borderColor,
            }}
            className="p-4 rounded-xl border shadow-md space-y-3 relative overflow-hidden"
          >
            {/* Encabezado del comprobante */}
            <div className="border-b pb-2.5 border-slate-700/20 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-widest uppercase shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Planilla de Cobro</span>
                </div>
                <div className="text-[10px] text-right font-medium opacity-70">
                  {dateFormatted}
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-emerald-500 font-bold italic text-lg leading-none">$</span>
                <span className="text-emerald-500 font-black italic text-sm tracking-tight leading-none">Tasa</span>
                <span style={{ color: colors.textColor }} className="font-black italic text-sm tracking-tight leading-none">Today</span>
              </div>
            </div>

            {/* Desglose Matemático del Cálculo */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                <div className="text-[10px] uppercase font-semibold opacity-70">Monto Base</div>
                <div style={{ color: colors.textColor }} className="text-sm font-bold">{inputDisplay}</div>
              </div>

              <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                <div className="text-[10px] uppercase font-semibold opacity-70">Tasa Aplicada</div>
                <div style={{ color: colors.textColor }} className="text-sm font-bold">
                  {rateDisplayForBox}
                </div>
              </div>
            </div>

            {/* TOTAL DESTACADO */}
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-center">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                {resultTitle}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5 break-all">
                {resultDisplay}
              </div>
              <div className="text-[11px] opacity-80 mt-1 font-medium">
                {subTextDisplay}
              </div>
            </div>

            {/* Concepto / Motivo si se ingresó */}
            {note.trim() && (
              <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs">
                <span className="text-[10px] uppercase font-semibold opacity-70 block">Concepto</span>
                <span style={{ color: colors.textColor }} className="font-semibold">{note.trim()}</span>
              </div>
            )}

            {/* Comparativa con BCV si aplica */}
            {bcvEquivalent && selectedCurrency === 'usdt' && bcvEquivalent !== 'FALTA DE DATOS' && (
              <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-black/5 dark:bg-white/5 opacity-85">
                <span>Equivalente en Tasa Oficial BCV:</span>
                <span className="font-bold text-[#8B1538] dark:text-rose-400">{bcvEquivalent}</span>
              </div>
            )}

            {/* DATOS DE PAGO SEGÚN EL MÉTODO SELECCIONADO */}
            {paymentMethod === 'pago_movil' && (
              <div className="pt-2 border-t border-slate-700/20 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Smartphone size={12} />
                    Datos para Pago Móvil
                  </span>
                  <span className="text-[9px] opacity-60">Transferencia inmediata</span>
                </div>

                {(pagoMovil.banco.trim() || pagoMovil.cedula.trim() || pagoMovil.telefono.trim()) ? (
                  <div className={companyLogo || !isGenerating ? "flex items-stretch gap-2" : "grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs"}>
                    {/* Campos de pago móvil */}
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      {pagoMovil.banco.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Banco</span>
                          <span className="font-bold truncate block">{pagoMovil.banco}</span>
                        </div>
                      )}

                      {pagoMovil.cedula.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Cédula / RIF</span>
                          <span className="font-bold truncate block">{pagoMovil.cedula}</span>
                        </div>
                      )}

                      {pagoMovil.telefono.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Teléfono</span>
                          <span className="font-bold truncate block">{pagoMovil.telefono}</span>
                        </div>
                      )}
                    </div>

                    {/* QR para pago inmediato o Logo (espacio marcado por el usuario) */}
                    {companyLogo ? (
                      <div
                        onClick={() => !isGenerating && logoFileInputRef.current?.click()}
                        className={`w-28 sm:w-36 shrink-0 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-700/30 p-1.5 flex flex-col items-center justify-center text-center shadow-xs overflow-hidden relative ${
                          !isGenerating ? 'cursor-pointer hover:border-emerald-500 transition-all group' : ''
                        }`}
                        title={!isGenerating ? 'Toca para cambiar QR o logo' : undefined}
                      >
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-tight mb-1 text-center">
                          Escanea Y Paga
                        </span>
                        <div className="flex-1 w-full flex items-center justify-center min-h-[58px]">
                          <img
                            src={companyLogo}
                            alt={companyName || "QR de Pago o Logo"}
                            className="max-h-20 max-w-full object-contain drop-shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {companyName.trim() && (
                          <span style={{ color: colors.textColor }} className="text-[10px] font-black truncate w-full mt-1 leading-tight">
                            {companyName.trim()}
                          </span>
                        )}
                        {!isGenerating && (
                          <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold rounded-xl backdrop-blur-[1px]">
                            Cambiar
                          </div>
                        )}
                      </div>
                    ) : !isGenerating ? (
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-28 sm:w-36 shrink-0 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer group"
                      >
                        <QrCode size={22} className="text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-tight mb-0.5">
                          Escanea Y Paga
                        </span>
                        <span className="text-[8px] opacity-70 leading-tight">
                          + Subir QR o Logo
                        </span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-600 dark:text-emerald-400">
                    Ingresa tus datos de Pago Móvil abajo para que aparezcan en esta planilla.
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'zelle' && (
              <div className="pt-2 border-t border-slate-700/20 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <DollarSign size={12} />
                    Datos para Zelle
                  </span>
                  <span className="text-[9px] opacity-60">Dólares USD</span>
                </div>

                {(zelle.titular.trim() || zelle.correo.trim()) ? (
                  <div className={companyLogo || !isGenerating ? "flex items-stretch gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs"}>
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      {zelle.titular.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Titular</span>
                          <span className="font-bold truncate block">{zelle.titular}</span>
                        </div>
                      )}
                      {zelle.correo.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Correo / Teléfono Zelle</span>
                          <span className="font-bold truncate block">{zelle.correo}</span>
                        </div>
                      )}
                    </div>

                    {companyLogo ? (
                      <div
                        onClick={() => !isGenerating && logoFileInputRef.current?.click()}
                        className={`w-28 sm:w-36 shrink-0 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-700/30 p-1.5 flex flex-col items-center justify-center text-center shadow-xs overflow-hidden relative ${
                          !isGenerating ? 'cursor-pointer hover:border-purple-500 transition-all group' : ''
                        }`}
                        title={!isGenerating ? 'Toca para cambiar QR o logo' : undefined}
                      >
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 leading-tight mb-1 text-center">
                          Escanea Y Paga
                        </span>
                        <div className="flex-1 w-full flex items-center justify-center min-h-[58px]">
                          <img
                            src={companyLogo}
                            alt={companyName || "QR de Pago o Logo"}
                            className="max-h-20 max-w-full object-contain drop-shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {companyName.trim() && (
                          <span style={{ color: colors.textColor }} className="text-[10px] font-black truncate w-full mt-1 leading-tight">
                            {companyName.trim()}
                          </span>
                        )}
                        {!isGenerating && (
                          <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold rounded-xl backdrop-blur-[1px]">
                            Cambiar
                          </div>
                        )}
                      </div>
                    ) : !isGenerating ? (
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-28 sm:w-36 shrink-0 rounded-xl border-2 border-dashed border-purple-500/40 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer group"
                      >
                        <QrCode size={22} className="text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 leading-tight mb-0.5">
                          Escanea Y Paga
                        </span>
                        <span className="text-[8px] opacity-70 leading-tight">
                          + Subir QR o Logo
                        </span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-center text-xs text-purple-600 dark:text-purple-400">
                    Ingresa tu Titular y Correo/Teléfono Zelle abajo para incluirlos en esta planilla.
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'usdt' && (
              <div className="pt-2 border-t border-slate-700/20 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 text-amber-500">
                    <Coins size={12} />
                    Datos para USDT / Binance
                  </span>
                  <span className="text-[9px] opacity-60">Criptoactivos</span>
                </div>

                {(usdt.trc20.trim() || usdt.binanceId.trim()) ? (
                  <div className={companyLogo || !isGenerating ? "flex items-stretch gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs"}>
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      {usdt.trc20.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Red TRC20</span>
                          <span className="font-bold truncate block text-[11px] font-mono">{usdt.trc20}</span>
                        </div>
                      )}
                      {usdt.binanceId.trim() && (
                        <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <span className="text-[9px] uppercase opacity-70 block font-semibold">Binance Pay ID / Correo</span>
                          <span className="font-bold truncate block">{usdt.binanceId}</span>
                        </div>
                      )}
                    </div>

                    {companyLogo ? (
                      <div
                        onClick={() => !isGenerating && logoFileInputRef.current?.click()}
                        className={`w-28 sm:w-36 shrink-0 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-700/30 p-1.5 flex flex-col items-center justify-center text-center shadow-xs overflow-hidden relative ${
                          !isGenerating ? 'cursor-pointer hover:border-amber-500 transition-all group' : ''
                        }`}
                        title={!isGenerating ? 'Toca para cambiar QR o logo' : undefined}
                      >
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-500 leading-tight mb-1 text-center">
                          Escanea Y Paga
                        </span>
                        <div className="flex-1 w-full flex items-center justify-center min-h-[58px]">
                          <img
                            src={companyLogo}
                            alt={companyName || "QR de Pago o Logo"}
                            className="max-h-20 max-w-full object-contain drop-shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {companyName.trim() && (
                          <span style={{ color: colors.textColor }} className="text-[10px] font-black truncate w-full mt-1 leading-tight">
                            {companyName.trim()}
                          </span>
                        )}
                        {!isGenerating && (
                          <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold rounded-xl backdrop-blur-[1px]">
                            Cambiar
                          </div>
                        )}
                      </div>
                    ) : !isGenerating ? (
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-28 sm:w-36 shrink-0 rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer group"
                      >
                        <QrCode size={22} className="text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-tight mb-0.5">
                          Escanea Y Paga
                        </span>
                        <span className="text-[8px] opacity-70 leading-tight">
                          + Subir QR o Logo
                        </span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-600 dark:text-amber-400">
                    Ingresa tu Red TRC20 o Binance Pay ID abajo para incluirlos en esta planilla.
                  </div>
                )}
              </div>
            )}

            {/* Si no hay método de pago activo pero hay QR / logo subido */}
            {paymentMethod === 'none' && companyLogo && (
              <div className="pt-2 border-t border-slate-700/20 dark:border-slate-700/60 flex items-center justify-between px-2">
                <div className="text-xs">
                  <span className="text-[9px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Escanea Y Paga
                  </span>
                  <span style={{ color: colors.textColor }} className="font-bold">{companyName.trim() || 'Cobro Inmediato'}</span>
                </div>
                <div className="h-16 w-28 flex items-center justify-end">
                  <img
                    src={companyLogo}
                    alt="QR / Logo"
                    className="max-h-16 max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}

            {/* Marca de agua al pie del comprobante */}
            <div className="flex items-center justify-between text-[9px] opacity-50 pt-1 border-t border-black/5 dark:border-white/5">
              <span>TasaToday • Actualización en vivo</span>
              <span>Venezuela</span>
            </div>
          </div>

          {/* BOTONES DE COPIADO RÁPIDO INDIVIDUAL (1 Toque) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: colors.textColor }}>
                Copiar Datos de 1 Toque:
              </span>
              <span style={{ color: colors.mutedTextColor }} className="text-[10px]">
                Toca para copiar
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {/* Botón copiar monto exacto */}
              <button
                type="button"
                onClick={() => handleCopyField(resultDisplay.replace('Bs. ', '').trim(), 'monto')}
                style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                className="p-2 border rounded text-left transition-all active:scale-95 hover:border-emerald-500 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                  <span>Monto Total</span>
                  {copiedField === 'monto' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </div>
                <span className="text-xs font-bold text-emerald-500 truncate">{resultDisplay}</span>
              </button>

              {/* Botones según método seleccionado */}
              {paymentMethod === 'pago_movil' && (
                <>
                  <button
                    type="button"
                    disabled={!pagoMovil.banco.trim()}
                    onClick={() => handleCopyField(pagoMovil.banco.trim(), 'banco')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-emerald-500 cursor-pointer flex flex-col justify-between ${
                      !pagoMovil.banco.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Banco</span>
                      {copiedField === 'banco' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate">{pagoMovil.banco || 'Sin banco'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!pagoMovil.cedula.trim()}
                    onClick={() => handleCopyField(pagoMovil.cedula.trim(), 'cedula')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-emerald-500 cursor-pointer flex flex-col justify-between ${
                      !pagoMovil.cedula.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Cédula</span>
                      {copiedField === 'cedula' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate">{pagoMovil.cedula || 'Sin cédula'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!pagoMovil.telefono.trim()}
                    onClick={() => handleCopyField(pagoMovil.telefono.trim(), 'telefono')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-emerald-500 cursor-pointer flex flex-col justify-between ${
                      !pagoMovil.telefono.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Teléfono</span>
                      {copiedField === 'telefono' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate">{pagoMovil.telefono || 'Sin tlf'}</span>
                  </button>
                </>
              )}

              {paymentMethod === 'zelle' && (
                <>
                  <button
                    type="button"
                    disabled={!zelle.titular.trim()}
                    onClick={() => handleCopyField(zelle.titular.trim(), 'titular')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-purple-500 cursor-pointer flex flex-col justify-between ${
                      !zelle.titular.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Titular</span>
                      {copiedField === 'titular' ? <Check size={12} className="text-purple-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate">{zelle.titular || 'Sin titular'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!zelle.correo.trim()}
                    onClick={() => handleCopyField(zelle.correo.trim(), 'correo')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-purple-500 cursor-pointer flex flex-col justify-between col-span-2 ${
                      !zelle.correo.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Correo / Tlf Zelle</span>
                      {copiedField === 'correo' ? <Check size={12} className="text-purple-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate">{zelle.correo || 'Sin correo/tlf'}</span>
                  </button>
                </>
              )}

              {paymentMethod === 'usdt' && (
                <>
                  <button
                    type="button"
                    disabled={!usdt.trc20.trim()}
                    onClick={() => handleCopyField(usdt.trc20.trim(), 'trc20')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-amber-500 cursor-pointer flex flex-col justify-between col-span-2 ${
                      !usdt.trc20.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Billetera TRC20</span>
                      {copiedField === 'trc20' ? <Check size={12} className="text-amber-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate font-mono">{usdt.trc20 || 'Sin dirección'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!usdt.binanceId.trim()}
                    onClick={() => handleCopyField(usdt.binanceId.trim(), 'binanceId')}
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
                    className={`p-2 border rounded text-left transition-all active:scale-95 hover:border-amber-500 cursor-pointer flex flex-col justify-between ${
                      !usdt.binanceId.trim() ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                      <span>Binance ID</span>
                      {copiedField === 'binanceId' ? <Check size={12} className="text-amber-500" /> : <Copy size={12} />}
                    </div>
                    <span className="text-xs font-bold truncate">{usdt.binanceId || 'Sin ID'}</span>
                  </button>
                </>
              )}

              {paymentMethod === 'none' && (
                <div className="col-span-3 p-2 border rounded text-xs opacity-75 flex items-center justify-center">
                  <span>Modo solo cálculo (sin datos bancarios)</span>
                </div>
              )}
            </div>
          </div>

          {/* SELECCIÓN Y CONFIGURACIÓN DE TODOS LOS MEDIOS DE PAGO */}
          <div 
            style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor }}
            className="p-3 rounded-lg border space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: colors.textColor }}>
                <Landmark size={14} className="text-emerald-500" />
                Medio de Pago para Cobrar:
              </span>
              <span style={{ color: colors.mutedTextColor }} className="text-[10px]">
                Define el botón de la Calculadora
              </span>
            </div>

            {/* Los 4 Cuadros de selección */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {paymentOptions.map((item) => {
                const isSelected = paymentMethod === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`btn-calc-pay-method-${item.id}`}
                    type="button"
                    onClick={() => handleSelectPaymentMethod(item.id as PaymentOption)}
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

            {/* Formulario editable para Pago Móvil */}
            {paymentMethod === 'pago_movil' && (
              <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/10 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Banco
                    </label>
                    <input
                      list="bancos-venezuela-calc"
                      type="text"
                      value={pagoMovil.banco}
                      onChange={(e) => setPagoMovil((prev) => ({ ...prev, banco: e.target.value }))}
                      placeholder="Ej: Banesco (0134)"
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-emerald-500"
                    />
                    <datalist id="bancos-venezuela-calc">
                      {POPULAR_BANKS.map((b) => (
                        <option key={b.code} value={`${b.name} (${b.code})`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Cédula / RIF
                    </label>
                    <input
                      type="text"
                      value={pagoMovil.cedula}
                      onChange={(e) => setPagoMovil((prev) => ({ ...prev, cedula: e.target.value }))}
                      placeholder="Ej: V-12345678"
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={pagoMovil.telefono}
                      onChange={(e) => setPagoMovil((prev) => ({ ...prev, telefono: e.target.value }))}
                      placeholder="Ej: 0414-1234567"
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formulario editable para Zelle */}
            {paymentMethod === 'zelle' && (
              <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/10 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Nombre del Titular Zelle
                    </label>
                    <input
                      type="text"
                      value={zelle.titular}
                      onChange={(e) => setZelle((prev) => ({ ...prev, titular: e.target.value }))}
                      placeholder="Ej: Juan Pérez"
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Correo Electrónico / Teléfono Zelle
                    </label>
                    <input
                      type="text"
                      value={zelle.correo}
                      onChange={(e) => setZelle((prev) => ({ ...prev, correo: e.target.value }))}
                      placeholder="Ej: pagos@ejemplo.com o +1..."
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formulario editable para USDT */}
            {paymentMethod === 'usdt' && (
              <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/10 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Dirección de Billetera TRC20 (Tron)
                    </label>
                    <input
                      type="text"
                      value={usdt.trc20}
                      onChange={(e) => setUsdt((prev) => ({ ...prev, trc20: e.target.value }))}
                      placeholder="Ej: T..."
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                      Binance Pay ID / Correo
                    </label>
                    <input
                      type="text"
                      value={usdt.binanceId}
                      onChange={(e) => setUsdt((prev) => ({ ...prev, binanceId: e.target.value }))}
                      placeholder="Ej: 12345678 o usuario@binance"
                      style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                      className="w-full text-xs p-2 rounded border outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Configuración del QR de Pago Inmediato o Logo */}
            <div 
              style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor }}
              className="p-3 rounded-lg border space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider flex items-center gap-1.5" style={{ color: colors.textColor }}>
                  <QrCode size={15} className="text-emerald-500" />
                  Coloca tu QR para pago inmediato O coloca el logo de tu empresa:
                </span>
                {companyLogo ? (
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 shrink-0 ml-2">
                    <Check size={12} /> Implantado en planilla
                  </span>
                ) : (
                  <span style={{ color: colors.mutedTextColor }} className="text-[10px] shrink-0 ml-2">
                    Opcional
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Miniatura actual o botón de subida */}
                {companyLogo ? (
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-700/30 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      <img 
                        src={companyLogo} 
                        alt="QR o Logo" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Upload size={13} />
                        Cambiar QR / Logo
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Trash2 size={13} />
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <QrCode size={16} />
                    <span>Subir QR de Pago o Logo desde tu Teléfono</span>
                  </button>
                )}

                {/* Nombre de la empresa o comercio */}
                <div className="w-full sm:flex-1">
                  <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                    Nombre de tu Empresa / Negocio (Opcional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ej: Inversiones Ávila C.A. / Mi Tienda"
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor, color: colors.textColor }}
                    className="w-full text-xs p-2 rounded border outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <p className="text-[10px] opacity-60 leading-normal">
                Tu logo se guarda en tu teléfono y se implanta automáticamente en la planilla para que le llegue a la otra persona con el logo de tu empresa cobradora.
              </p>
            </div>

            {/* Concepto opcional */}
            <div>
              <label className="text-[10px] uppercase font-bold opacity-75 block mb-1">
                Nota / Concepto (Opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Deuda pendiente, Servicio, Almuerzo..."
                style={{ backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, color: colors.textColor }}
                className="w-full text-xs p-2 rounded border outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Vista previa de la plantilla en texto */}
          <div className="space-y-1 pt-1">
            <label style={{ color: colors.secondaryTextColor }} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Copy size={12} />
              Plantilla de texto a compartir
            </label>
            <div
              style={{
                backgroundColor: isDark ? '#0B132B' : '#F1F5F9',
                borderColor: colors.borderColor,
                color: colors.textColor,
              }}
              className="border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed select-all shadow-inner"
            >
              {buildShareText()}
            </div>
          </div>

          {/* Botones de acción al final */}
          <div className="pt-2 pb-1 space-y-2">
            <button
              id="btn-share-calc-primary-bottom"
              type="button"
              disabled={isGenerating}
              onClick={handleSharePlanilla}
              className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-75"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Compartiendo...</span>
                </>
              ) : (
                <>
                  <Share2 size={18} className="shrink-0" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div 
          style={{ borderColor: colors.borderColor }}
          className="p-3 border-t bg-black/5 dark:bg-white/5 flex items-center justify-between text-xs"
        >
          <span style={{ color: colors.mutedTextColor }} className="text-[11px]">
            TasaToday • Cobro inmediato
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 font-bold text-xs transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
