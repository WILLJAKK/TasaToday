import React, { useState, useEffect } from 'react';
import { ExchangeRatesData, SelectedCurrency, GoldUnit, TROY_OZ_PER_KG, GRAMS_PER_TROY_OZ, PaymentOption } from '../types';
import { AdBanner } from './AdBanner';
import { ArrowRightLeft, Calculator, TrendingUp, Share2, Smartphone, DollarSign, Coins } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ShareCalculationModal } from './ShareCalculationModal';
import { getStoredTasamiRate, formatTasamiRate } from '../utils/tasami';

interface CalculadoraViewProps {
  rates: ExchangeRatesData;
  selectedCurrency: SelectedCurrency;
  setSelectedCurrency: (curr: SelectedCurrency) => void;
  amount: string;
  setAmount: (val: string) => void;
  goldUnit?: GoldUnit;
  setGoldUnit?: (unit: GoldUnit) => void;
  isPremium?: boolean;
  adBlockExpiresAt?: number | null;
  onGoPremium?: () => void;
}

export interface CurrencyTheme {
  id: SelectedCurrency;
  name: string;
  shortLabel: string;
  badgeSub: string;
  symbol: string;
  hex: string;
  activePillBg: string;
  activeDirectionBg: string;
  borderHover: string;
  textAccent: string;
  badgeForeignBg: string;
  badgeBsBg: string;
  textResult: string;
  tagBg: string;
}

export const CURRENCY_THEMES: Record<SelectedCurrency, CurrencyTheme> = {
  usdt: {
    id: 'usdt',
    name: 'USDT',
    shortLabel: 'USDT',
    badgeSub: 'P2P',
    symbol: '$',
    hex: '#2C9945', // Verde Tether / Dólar estándar
    activePillBg: 'bg-[#2C9945]',
    activeDirectionBg: 'bg-[#2C9945]',
    borderHover: 'hover:border-[#2C9945] hover:text-[#2C9945]',
    textAccent: 'text-[#2C9945]',
    badgeForeignBg: 'bg-[#2C9945]',
    badgeBsBg: 'bg-[#1E7034]',
    textResult: 'text-[#2C9945]',
    tagBg: 'bg-emerald-50 text-[#2C9945] border-emerald-300',
  },
  bcv: {
    id: 'bcv',
    name: 'BCV',
    shortLabel: 'BCV (Oficial)',
    badgeSub: 'Oficial',
    symbol: '$',
    hex: '#8B1538', // Rojo Vino / Vinotinto Oficial de Venezuela
    activePillBg: 'bg-[#8B1538]',
    activeDirectionBg: 'bg-[#8B1538]',
    borderHover: 'hover:border-[#8B1538] hover:text-[#8B1538]',
    textAccent: 'text-[#8B1538]',
    badgeForeignBg: 'bg-[#8B1538]',
    badgeBsBg: 'bg-[#670D28]',
    textResult: 'text-[#8B1538]',
    tagBg: 'bg-rose-50 text-[#8B1538] border-rose-300',
  },
  euro: {
    id: 'euro',
    name: 'EURO',
    shortLabel: 'EURO (BCV)',
    badgeSub: 'Unión Europea',
    symbol: '€',
    hex: '#003399', // Azul Bandera Unión Europea
    activePillBg: 'bg-[#003399]',
    activeDirectionBg: 'bg-[#003399]',
    borderHover: 'hover:border-[#003399] hover:text-[#003399]',
    textAccent: 'text-[#003399]',
    badgeForeignBg: 'bg-[#003399]',
    badgeBsBg: 'bg-[#002266]',
    textResult: 'text-[#003399]',
    tagBg: 'bg-blue-50 text-[#003399] border-blue-300',
  },
  btc: {
    id: 'btc',
    name: 'BTC',
    shortLabel: 'BTC (Bitcoin)',
    badgeSub: 'Bitcoin Spot',
    symbol: 'BTC',
    hex: '#F7931A', // Naranja Oficial Bitcoin
    activePillBg: 'bg-[#F7931A]',
    activeDirectionBg: 'bg-[#F7931A]',
    borderHover: 'hover:border-[#F7931A] hover:text-[#F7931A]',
    textAccent: 'text-[#F7931A]',
    badgeForeignBg: 'bg-[#F7931A]',
    badgeBsBg: 'bg-[#D07409]',
    textResult: 'text-[#F7931A]',
    tagBg: 'bg-amber-50 text-[#D07409] border-amber-300',
  },
  oro: {
    id: 'oro',
    name: 'ORO',
    shortLabel: 'ORO (Onza)',
    badgeSub: 'Onza Troy Spot',
    symbol: 'Oz',
    hex: '#D4AF37', // Dorado Oro Puro
    activePillBg: 'bg-[#D4AF37]',
    activeDirectionBg: 'bg-[#D4AF37]',
    borderHover: 'hover:border-[#D4AF37] hover:text-[#D4AF37]',
    textAccent: 'text-[#D4AF37]',
    badgeForeignBg: 'bg-[#D4AF37]',
    badgeBsBg: 'bg-[#B08D26]',
    textResult: 'text-[#D4AF37]',
    tagBg: 'bg-amber-50 text-[#B08D26] border-amber-300',
  },
  tasami: {
    id: 'tasami',
    name: 'TASAMI',
    shortLabel: 'TASAMI (Personal)',
    badgeSub: 'Personalizada',
    symbol: '$',
    hex: '#7C3AED', // Violeta / Púrpura elegante
    activePillBg: 'bg-[#7C3AED]',
    activeDirectionBg: 'bg-[#7C3AED]',
    borderHover: 'hover:border-[#7C3AED] hover:text-[#7C3AED]',
    textAccent: 'text-[#7C3AED]',
    badgeForeignBg: 'bg-[#7C3AED]',
    badgeBsBg: 'bg-[#6D28D9]',
    textResult: 'text-[#7C3AED]',
    tagBg: 'bg-purple-50 text-[#7C3AED] border-purple-300 dark:bg-purple-950/40 dark:border-purple-800',
  },
};

export const CalculadoraView: React.FC<CalculadoraViewProps> = ({
  rates,
  selectedCurrency,
  setSelectedCurrency,
  amount,
  setAmount,
  goldUnit = 'oz',
  setGoldUnit,
  isPremium = false,
  adBlockExpiresAt = null,
  onGoPremium,
}) => {
  const { colors, isDark } = useTheme();
  const [conversionDirection, setConversionDirection] = useState<'USD_TO_BS' | 'BS_TO_USD'>('USD_TO_BS');
  const [isShareCalcOpen, setIsShareCalcOpen] = useState<boolean>(false);

  // Estado reactivo para TasaMi personalizada
  const [tasamiRate, setTasamiRate] = useState<number>(() => getStoredTasamiRate());

  useEffect(() => {
    const handleTasamiChanged = (e: any) => {
      const newRate = typeof e?.detail?.rate === 'number' ? e.detail.rate : getStoredTasamiRate();
      setTasamiRate(newRate);
    };
    const handleStorage = () => {
      setTasamiRate(getStoredTasamiRate());
    };

    window.addEventListener('tasatoday_tasami_changed', handleTasamiChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('tasatoday_tasami_changed', handleTasamiChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Método de pago activo para cobros (sincronizado con Ajustes y Modal de Compartir)
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>(() => {
    try {
      return (localStorage.getItem('tasadolar_share_payment_method') as PaymentOption) || 'pago_movil';
    } catch {
      return 'pago_movil';
    }
  });

  useEffect(() => {
    const handleMethodChanged = (e: any) => {
      if (e?.detail) {
        setPaymentMethod(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('tasadolar_share_payment_method') as PaymentOption;
          if (saved) setPaymentMethod(saved);
        } catch {}
      }
    };
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('tasadolar_share_payment_method') as PaymentOption;
        if (saved) setPaymentMethod(saved);
      } catch {}
    };

    window.addEventListener('payment-method-changed', handleMethodChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('payment-method-changed', handleMethodChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Configuración del botón de compartir cobro
  const getShareButtonConfig = () => {
    switch (paymentMethod) {
      case 'pago_movil':
        return {
          text: 'Compartir Cobro',
          shortText: 'Cobro',
          Icon: Share2,
          bgClass: 'bg-emerald-600 hover:bg-emerald-500',
          badgeColor: 'text-emerald-500 hover:bg-emerald-500/10',
          iconColor: '#2C9945',
        };
      case 'zelle':
        return {
          text: 'Compartir Cobro',
          shortText: 'Cobro',
          Icon: Share2,
          bgClass: 'bg-purple-600 hover:bg-purple-500',
          badgeColor: 'text-purple-500 hover:bg-purple-500/10',
          iconColor: '#7C3AED',
        };
      case 'usdt':
        return {
          text: 'Compartir Cobro',
          shortText: 'Cobro',
          Icon: Share2,
          bgClass: 'bg-amber-600 hover:bg-amber-500',
          badgeColor: 'text-amber-500 hover:bg-amber-500/10',
          iconColor: '#F59E0B',
        };
      case 'none':
      default:
        return {
          text: 'Compartir Cobro',
          shortText: 'Cobro',
          Icon: Share2,
          bgClass: 'bg-emerald-700 hover:bg-emerald-600',
          badgeColor: 'text-emerald-500 hover:bg-emerald-500/10',
          iconColor: colors.textColor,
        };
    }
  };

  const shareBtnConfig = getShareButtonConfig();

  const theme = CURRENCY_THEMES[selectedCurrency];
  const isBTC = selectedCurrency === 'btc';
  const isOro = selectedCurrency === 'oro';
  const isTasami = selectedCurrency === 'tasami';

  // Active rate value & validación estricta de falta de datos
  const activeItem = isTasami
    ? {
        price: formatTasamiRate(tasamiRate),
        numPrice: tasamiRate,
        change: '0,00',
        percent: '0.00',
        isUp: true,
        status: 'ok' as const,
        source: 'Personalizada (Ajustes)',
      }
    : (rates ? rates[selectedCurrency] : null);
  const isMissingData = !activeItem || activeItem.status === 'missing' || activeItem.error === 'FALTA DE DATOS' || activeItem.numPrice === null || (activeItem.numPrice <= 0 && !isBTC && !isOro);
  const currentRate = activeItem && activeItem.numPrice ? activeItem.numPrice : 0;
  
  const currencyLabels: Record<SelectedCurrency, string> = {
    usdt: 'Tasa USDT (Binance P2P)',
    bcv: 'BCV (Oficial)',
    euro: 'EURO (BCV Oficial)',
    btc: 'Bitcoin (Binance Spot)',
    oro: goldUnit === 'kg' ? 'Kilo de Oro Internacional' : goldUnit === 'g' ? 'Gramo de Oro Spot' : 'Onza de Oro Spot',
    tasami: 'TasaMi (Personalizada)',
  };

  // Compute conversion (BLOQUEO ESTRICTO SI FALTA DE DATOS)
  const parsedAmount = parseFloat(amount || '0');
  const validAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

  let resultDisplay = '';
  let subTextDisplay = '';
  let resultTitle = '';
  let bcvEquivalent = '';
  let usdtEquivalent = '';
  let diffBsNumber = 0;
  let diffUsdNumber = 0;
  let diffBsFormatted = '';
  let diffUsdFormatted = '';

  if (isMissingData) {
    // REGLA 4: Si el estado es "FALTA DE DATOS", deshabilitar cualquier cálculo
    resultTitle = 'Cálculo Bloqueado';
    resultDisplay = 'FALTA DE DATOS';
    subTextDisplay = `No hay cotización registrada en la base de datos para ${theme.name} en esta fecha. Cálculo matemático deshabilitado para evitar resultados incorrectos o NaN.`;
  } else if (isBTC) {
    // BTC calculations are EXCLUSIVELY in USD (Bitcoin a Dólares y Dólares a Bitcoin)
    if (conversionDirection === 'USD_TO_BS') {
      // BTC ➔ USD (Input: BTC, Result: USD)
      const usdValue = validAmount * (rates.btc?.numPrice || 0);
      resultTitle = 'Total en Dólares (USD)';
      resultDisplay = `$ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      subTextDisplay = `Calculado a cotización Binance Spot: 1 BTC = $${rates.btc?.price || '0'} USD`;
    } else {
      // USD ➔ BTC (Input: USD, Result: BTC)
      const btcPrice = rates.btc?.numPrice || 0;
      const btcValue = btcPrice > 0 ? (validAmount / btcPrice).toFixed(8) : '0';
      resultTitle = 'Total en Bitcoin (BTC)';
      resultDisplay = `${btcValue} BTC`;
      const satoshis = btcPrice > 0 ? Math.round((validAmount / btcPrice) * 100000000) : 0;
      subTextDisplay = `≈ ${satoshis.toLocaleString('es-VE')} Satoshis • Cotización: 1 BTC = $${rates.btc?.price || '0'} USD`;
    }
  } else if (isOro) {
    // Oro calculations según unidad seleccionada (Gramo, Onza Troy o Kilo Internacional)
    const goldOzPrice = rates.oro?.numPrice || 0;
    const isKg = goldUnit === 'kg';
    const isG = goldUnit === 'g';
    const goldRate = isKg 
      ? goldOzPrice * TROY_OZ_PER_KG 
      : isG 
        ? goldOzPrice / GRAMS_PER_TROY_OZ 
        : goldOzPrice;
    const goldRateFormatted = goldRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (conversionDirection === 'USD_TO_BS') {
      // ORO (G, Oz o Kg) ➔ USD
      const usdValue = validAmount * goldRate;
      resultTitle = 'Total en Dólares (USD)';
      resultDisplay = `$ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      subTextDisplay = isKg
        ? `Calculado a cotización Internacional: 1 Kg = $${goldRateFormatted} USD (32.1507 Oz/Kg)`
        : isG
          ? `Calculado a cotización Spot: 1 Gramo = $${goldRateFormatted} USD (1 Oz = 31.1035g)`
          : `Calculado a cotización Spot: 1 Onza Troy = $${rates.oro?.price || '0'} USD (31.10g)`;
    } else {
      // USD ➔ ORO (G, Oz o Kg)
      if (isKg) {
        const goldKgValue = goldRate > 0 ? (validAmount / goldRate) : 0;
        const grams = goldRate > 0 ? (goldKgValue * 1000).toFixed(1) : '0';
        resultTitle = 'Total en Kilos de Oro';
        resultDisplay = `${goldKgValue.toFixed(4)} Kg Oro`;
        subTextDisplay = `≈ ${grams} gramos de oro fino • Cotización: 1 Kg = $${goldRateFormatted} USD`;
      } else if (isG) {
        const goldGValue = goldRate > 0 ? (validAmount / goldRate) : 0;
        const troyOz = goldRate > 0 ? (goldGValue / GRAMS_PER_TROY_OZ).toFixed(4) : '0';
        resultTitle = 'Total en Gramos de Oro';
        resultDisplay = `${goldGValue.toFixed(2)} Gramos Oro`;
        subTextDisplay = `≈ ${troyOz} Onzas Troy • Cotización: 1 G = $${goldRateFormatted} USD`;
      } else {
        const goldOzValue = goldRate > 0 ? (validAmount / goldRate) : 0;
        const grams = goldRate > 0 ? (goldOzValue * GRAMS_PER_TROY_OZ).toFixed(2) : '0';
        resultTitle = 'Total en Onzas de Oro';
        resultDisplay = `${goldOzValue.toFixed(4)} Oz Oro`;
        subTextDisplay = `≈ ${grams} gramos de oro fino (31.1g/oz) • Cotización: 1 Oz = $${rates.oro?.price || '0'} USD`;
      }
    }
  } else {
    const isEuro = selectedCurrency === 'euro';
    const symbol = isEuro ? '€' : '$';
    const officialRateItem = isEuro ? rates.euro : rates.bcv;
    const officialNumPrice = officialRateItem?.numPrice || 0;
    const usdtNumPrice = rates.usdt?.numPrice || 0;

    if (conversionDirection === 'USD_TO_BS') {
      const totalBs = validAmount * currentRate;
      resultTitle = 'Total en Bolívares';
      resultDisplay = `Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      subTextDisplay = isTasami
        ? `Calculado a TasaMi personalizada (Bs. ${activeItem?.price || '0'} por $)`
        : `Calculado a tasa ${currencyLabels[selectedCurrency]} (Bs. ${activeItem?.price || '0'} por ${symbol})`;
      bcvEquivalent = officialNumPrice > 0 
        ? `Bs. ${(validAmount * officialNumPrice).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : 'FALTA DE DATOS';
      usdtEquivalent = usdtNumPrice > 0 
        ? `Bs. ${(validAmount * usdtNumPrice).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : 'FALTA DE DATOS';

      if (officialNumPrice > 0 && usdtNumPrice > 0 && validAmount > 0) {
        const oficialBs = validAmount * officialNumPrice;
        const usdtBs = validAmount * usdtNumPrice;
        diffBsNumber = Math.abs(usdtBs - oficialBs);
        diffUsdNumber = diffBsNumber / usdtNumPrice;
      }
    } else {
      const converted = validAmount > 0 && currentRate > 0 ? validAmount / currentRate : 0;
      resultTitle = isEuro ? 'Total en Euros' : 'Total en Dólares';
      resultDisplay = `${symbol} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      subTextDisplay = isTasami
        ? `Equivalente en Dólares a TasaMi personalizada (Bs. ${activeItem?.price || '0'} por $)`
        : `Equivalente en ${isEuro ? 'Euros' : 'Dólares'} a tasa ${currencyLabels[selectedCurrency]} (Bs. ${activeItem?.price || '0'} por ${symbol})`;
      bcvEquivalent = officialNumPrice > 0 
        ? `${isEuro ? '€' : '$'} ${(validAmount / officialNumPrice).toFixed(2).replace('.', ',')}` 
        : 'FALTA DE DATOS';
      usdtEquivalent = usdtNumPrice > 0 
        ? `$ ${(validAmount / usdtNumPrice).toFixed(2).replace('.', ',')}` 
        : 'FALTA DE DATOS';

      if (officialNumPrice > 0 && usdtNumPrice > 0 && validAmount > 0) {
        const unitsAtOficial = validAmount / officialNumPrice;
        const bsCostAtUsdt = unitsAtOficial * usdtNumPrice;
        diffBsNumber = Math.abs(bsCostAtUsdt - validAmount);
        diffUsdNumber = diffBsNumber / usdtNumPrice;
      }
    }

    diffBsFormatted = `Bs. ${diffBsNumber.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    diffUsdFormatted = `$ ${diffUsdNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const toggleDirection = () => {
    setConversionDirection(prev => prev === 'USD_TO_BS' ? 'BS_TO_USD' : 'USD_TO_BS');
  };

  const handleSelectCurrency = (curr: SelectedCurrency) => {
    const isCurrentCryptoOrGold = selectedCurrency === 'btc' || selectedCurrency === 'oro';
    const isNewCryptoOrGold = curr === 'btc' || curr === 'oro';

    if (isNewCryptoOrGold && !isCurrentCryptoOrGold) {
      if (parseFloat(amount || '0') > 100) {
        setAmount('1');
      }
    } else if (!isNewCryptoOrGold && isCurrentCryptoOrGold) {
      if (parseFloat(amount || '0') <= 1) {
        setAmount('10');
      }
    }
    setSelectedCurrency(curr);
  };

  return (
    <div 
      style={{ backgroundColor: colors.backgroundColor }}
      className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col justify-between transition-colors duration-200"
    >
      <div className="max-w-lg mx-auto w-full space-y-3.5">
        {/* Calc Header con Indicador Activo de Moneda */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className={theme.textAccent} size={20} />
            <h2 
              style={{ color: colors.textColor }}
              className="text-base sm:text-lg font-bold"
            >
              Conversor
            </h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${theme.tagBg} transition-colors flex items-center gap-1.5`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.hex }} />
              <span>{theme.name}</span>
            </span>
          </div>
          
          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isMissingData && (
              <button
                id="btn-calc-share-top"
                type="button"
                onClick={() => setIsShareCalcOpen(true)}
                style={{ 
                  backgroundColor: colors.surfaceColor, 
                  borderColor: colors.borderColor,
                  color: colors.textColor 
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold border ${theme.borderHover} px-2.5 py-1.5 rounded shadow-2xs transition-colors cursor-pointer hover:border-emerald-500`}
                title={shareBtnConfig.text}
              >
                <shareBtnConfig.Icon size={13} style={{ color: shareBtnConfig.iconColor }} />
                <span className="hidden xs:inline">{shareBtnConfig.shortText}</span>
              </button>
            )}

            {/* Quick Swap Direction Badge */}
            <button
              onClick={toggleDirection}
            style={{ 
              backgroundColor: colors.surfaceColor, 
              borderColor: colors.borderColor,
              color: colors.textColor 
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold border ${theme.borderHover} px-2.5 py-1.5 rounded shadow-2xs transition-colors cursor-pointer`}
          >
            <ArrowRightLeft size={13} className={theme.textAccent} />
            <span>
              {isBTC
                ? (conversionDirection === 'USD_TO_BS' ? 'BTC ➔ $' : '$ ➔ BTC')
                : isOro
                  ? (conversionDirection === 'USD_TO_BS' 
                      ? (goldUnit === 'kg' ? 'Kg ➔ $' : goldUnit === 'g' ? 'G ➔ $' : 'Oz ➔ $') 
                      : (goldUnit === 'kg' ? '$ ➔ Kg' : goldUnit === 'g' ? '$ ➔ G' : '$ ➔ Oz'))
                  : (conversionDirection === 'USD_TO_BS'
                      ? (selectedCurrency === 'euro' ? '€ ➔ Bs.' : '$ ➔ Bs.')
                      : (selectedCurrency === 'euro' ? 'Bs. ➔ €' : 'Bs. ➔ $'))
              }
            </span>
          </button>
        </div>
      </div>

        {/* Currency Selector Pills con Código de Color: USDT BCV EURO BTC ORO TASAMI */}
        <div 
          style={{ 
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
            borderColor: colors.borderColor 
          }}
          className="grid grid-cols-6 gap-1 p-1 rounded-md border"
        >
          {(['usdt', 'bcv', 'euro', 'btc', 'oro', 'tasami'] as SelectedCurrency[]).map((curr) => {
            const isSelected = selectedCurrency === curr;
            const itemTheme = CURRENCY_THEMES[curr];
            const pillLabel = curr === 'oro' ? 'ORO' : (curr === 'tasami' ? 'TASAMI' : itemTheme.name);
            return (
              <button
                key={curr}
                id={`btn-calc-currency-${curr}`}
                onClick={() => handleSelectCurrency(curr)}
                className={`text-[11px] sm:text-xs font-bold py-2 px-0.5 sm:px-1 rounded transition-all truncate text-center flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                  isSelected 
                    ? `${itemTheme.activePillBg} text-white shadow-xs` 
                    : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-white/70'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 transition-transform ${isSelected ? 'bg-white scale-110' : ''}`}
                  style={{ backgroundColor: isSelected ? '#FFFFFF' : itemTheme.hex }}
                />
                <span className="truncate">{pillLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Selector de Unidad de Oro: G vs Oz vs Kg */}
        {isOro && (
          <div 
            id="calc-gold-unit-selector"
            style={{ 
              backgroundColor: colors.surfaceColor, 
              borderColor: colors.borderColor 
            }}
            className="flex items-center justify-between p-2 sm:p-2.5 rounded border shadow-2xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: colors.textColor }}>
                Unidad de Oro:
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-[#D4AF37] border border-amber-500/25 leading-none">
                {goldUnit === 'kg' ? 'Kilo (1 Kg = 32.15 Oz)' : goldUnit === 'g' ? 'Gramo (1 Oz = 31.10g)' : 'Onza Troy (31.10g)'}
              </span>
            </div>
            <div className="flex items-center bg-black/10 dark:bg-white/10 p-0.5 rounded border border-amber-500/30 text-xs font-bold shrink-0">
              <button
                id="calc-gold-unit-g"
                type="button"
                onClick={() => setGoldUnit?.('g')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  goldUnit === 'g'
                    ? 'bg-[#D4AF37] text-white shadow-xs font-black'
                    : 'text-[#D4AF37] hover:bg-amber-500/20'
                }`}
                title="Gramo de Oro"
              >
                G
              </button>
              <button
                id="calc-gold-unit-oz"
                type="button"
                onClick={() => setGoldUnit?.('oz')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  goldUnit === 'oz'
                    ? 'bg-[#D4AF37] text-white shadow-xs font-black'
                    : 'text-[#D4AF37] hover:bg-amber-500/20'
                }`}
                title="Onza Troy"
              >
                Oz
              </button>
              <button
                id="calc-gold-unit-kg"
                type="button"
                onClick={() => setGoldUnit?.('kg')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  goldUnit === 'kg'
                    ? 'bg-[#D4AF37] text-white shadow-xs font-black'
                    : 'text-[#D4AF37] hover:bg-amber-500/20'
                }`}
                title="Kilogramo"
              >
                Kg
              </button>
            </div>
          </div>
        )}

        {/* Selector de Dirección con el color de la divisa seleccionada */}
        <div 
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="border rounded p-1 flex items-center shadow-xs"
        >
          <button
            id="btn-dir-usd-to-bs"
            onClick={() => setConversionDirection('USD_TO_BS')}
            style={{
              color: conversionDirection === 'USD_TO_BS' ? '#FFFFFF' : colors.secondaryTextColor,
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-1 text-xs font-bold rounded transition-all cursor-pointer ${
              conversionDirection === 'USD_TO_BS'
                ? `${theme.activeDirectionBg} text-white shadow-xs`
                : 'hover:opacity-80'
            }`}
          >
            <span>{isBTC ? 'BTC ➔ $' : isOro ? (goldUnit === 'kg' ? 'Kg ➔ $' : goldUnit === 'g' ? 'G ➔ $' : 'Oz ➔ $') : selectedCurrency === 'euro' ? '€ ➔ Bs.' : '$ ➔ Bs.'}</span>
            <span className="font-semibold text-[11px] hidden sm:inline">
              ({isBTC ? 'Bitcoin a Dólares' : isOro ? (goldUnit === 'kg' ? 'Kilos a Dólares' : goldUnit === 'g' ? 'Gramos a Dólares' : 'Onzas a Dólares') : selectedCurrency === 'euro' ? 'Euros a Bs.' : 'Dólares a Bs.'})
            </span>
          </button>

          <button
            onClick={toggleDirection}
            style={{ color: colors.mutedTextColor }}
            className="p-1.5 mx-1 hover:opacity-80 rounded-full transition-colors shrink-0 cursor-pointer"
            title="Invertir dirección de cálculo"
          >
            <ArrowRightLeft size={15} className={theme.textAccent} />
          </button>

          <button
            id="btn-dir-bs-to-usd"
            onClick={() => setConversionDirection('BS_TO_USD')}
            style={{
              color: conversionDirection === 'BS_TO_USD' ? '#FFFFFF' : colors.secondaryTextColor,
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-1 text-xs font-bold rounded transition-all cursor-pointer ${
              conversionDirection === 'BS_TO_USD'
                ? `${theme.activeDirectionBg} text-white shadow-xs`
                : 'hover:opacity-80'
            }`}
          >
            <span>{isBTC ? '$ ➔ BTC' : isOro ? (goldUnit === 'kg' ? '$ ➔ Kg' : goldUnit === 'g' ? '$ ➔ G' : '$ ➔ Oz') : selectedCurrency === 'euro' ? 'Bs. ➔ €' : 'Bs. ➔ $'}</span>
            <span className="font-semibold text-[11px] hidden sm:inline">
              ({isBTC ? 'Dólares a Bitcoin' : isOro ? (goldUnit === 'kg' ? 'Dólares a Kilos' : goldUnit === 'g' ? 'Dólares a Gramos' : 'Dólares a Onzas') : selectedCurrency === 'euro' ? 'Bs. a Euros' : 'Bs. a Dólares'})
            </span>
          </button>
        </div>

        {/* Input con Badge de Moneda personalizado según el código de color */}
        <div>
          <div 
            style={{ 
              backgroundColor: colors.surfaceColor, 
              borderColor: colors.borderColor 
            }}
            className="flex h-[62px] border shadow-xs rounded-xs overflow-hidden"
          >
            <button
              type="button"
              onClick={toggleDirection}
              title="Toca para invertir la dirección"
              className={`${
                conversionDirection === 'USD_TO_BS'
                  ? theme.badgeForeignBg
                  : theme.badgeBsBg
              } w-[78px] flex flex-col items-center justify-center text-white font-bold select-none shrink-0 transition-colors hover:opacity-95 cursor-pointer`}
            >
              <span className="text-xl leading-none">
                {isBTC 
                  ? (conversionDirection === 'USD_TO_BS' ? 'BTC' : '$')
                  : isOro
                    ? (conversionDirection === 'USD_TO_BS' ? (goldUnit === 'kg' ? 'Kg' : goldUnit === 'g' ? 'G' : 'Oz') : '$')
                    : (conversionDirection === 'USD_TO_BS' ? (selectedCurrency === 'euro' ? '€' : '$') : 'Bs')}
              </span>
              <span className="text-[9px] opacity-85 flex items-center gap-0.5 mt-0.5 font-sans font-medium">
                <ArrowRightLeft size={9} />
                Cambiar
              </span>
            </button>
            <input
              id="input-calc-amount"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              disabled={isMissingData}
              value={isMissingData ? '' : amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={
                isMissingData
                  ? 'Cálculo deshabilitado: FALTA DE DATOS'
                  : isBTC
                    ? (conversionDirection === 'USD_TO_BS' ? 'Monto en Bitcoin (ej. 0.05)' : 'Monto en Dólares $ (ej. 100)')
                    : isOro
                      ? (conversionDirection === 'USD_TO_BS'
                          ? (goldUnit === 'kg' ? 'Cantidad de Kilos (ej. 0.5 ó 1)' : goldUnit === 'g' ? 'Cantidad de Gramos (ej. 10 ó 50)' : 'Cantidad de Onzas (ej. 1 ó 2)')
                          : (goldUnit === 'kg' ? 'Monto en Dólares $ (ej. 50000)' : goldUnit === 'g' ? 'Monto en Dólares $ (ej. 500)' : 'Monto en Dólares $ (ej. 1000)'))
                      : (conversionDirection === 'USD_TO_BS'
                          ? `Monto en ${selectedCurrency === 'euro' ? 'Euros (€)' : 'Dólares ($)'}`
                          : 'Monto en Bolívares (Bs.)')
              }
              style={{
                backgroundColor: colors.surfaceColor,
                color: isMissingData ? '#EF4444' : colors.textColor,
              }}
              className={`flex-1 px-3 text-2xl font-bold outline-none w-full placeholder:text-sm sm:placeholder:text-base placeholder:font-normal ${
                isMissingData 
                  ? 'bg-red-500/10 text-red-500 placeholder:text-red-400 cursor-not-allowed'
                  : 'placeholder:text-gray-400'
              }`}
            />
            {amount && !isMissingData && (
              <button
                onClick={() => setAmount('')}
                style={{ color: colors.mutedTextColor }}
                className="px-3 hover:opacity-80 text-sm font-bold flex items-center justify-center cursor-pointer"
                title="Limpiar"
              >
                ✕
              </button>
            )}
          </div>

          {/* Atajos Rápidos */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs">
            <span style={{ color: colors.mutedTextColor }} className="text-[10px] font-medium pr-1 shrink-0">Atajos:</span>
            {(isBTC
              ? (conversionDirection === 'USD_TO_BS' ? [0.001, 0.005, 0.01, 0.05, 0.1, 0.5] : [10, 20, 50, 100, 500, 1000])
              : isOro
                ? (goldUnit === 'kg'
                    ? (conversionDirection === 'USD_TO_BS' ? [0.05, 0.1, 0.25, 0.5, 1, 2] : [1000, 5000, 10000, 25000, 50000, 100000])
                    : goldUnit === 'g'
                      ? (conversionDirection === 'USD_TO_BS' ? [1, 5, 10, 20, 50, 100] : [50, 100, 200, 500, 1000, 5000])
                      : (conversionDirection === 'USD_TO_BS' ? [0.1, 0.25, 0.5, 1, 2, 5] : [50, 100, 200, 500, 1000, 2000]))
                : (conversionDirection === 'USD_TO_BS' ? [1, 5, 10, 20, 50, 100] : [50, 100, 200, 500, 1000, 5000])
            ).map((val) => (
              <button
                key={val}
                disabled={isMissingData}
                onClick={() => setAmount(val.toString())}
                style={{
                  backgroundColor: colors.surfaceColor,
                  borderColor: colors.borderColor,
                  color: isMissingData ? colors.mutedTextColor : colors.textColor,
                }}
                className={`border px-2.5 py-1 rounded text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer ${
                  isMissingData
                    ? 'cursor-not-allowed opacity-50'
                    : `${theme.borderHover} hover:opacity-90`
                }`}
              >
                {isBTC
                  ? (conversionDirection === 'USD_TO_BS' ? `${val} BTC` : `$${val}`)
                  : isOro
                    ? (conversionDirection === 'USD_TO_BS' 
                        ? `${val} ${goldUnit === 'kg' ? 'Kg' : goldUnit === 'g' ? 'G' : 'Oz'}` 
                        : `$${val >= 1000 ? val.toLocaleString('en-US') : val}`)
                    : (conversionDirection === 'USD_TO_BS'
                        ? (selectedCurrency === 'euro' ? `€${val}` : `$${val}`)
                        : `Bs. ${val >= 1000 ? val.toLocaleString('es-VE') : val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Resultado Principal con el color característico o Bloqueo por FALTA DE DATOS */}
        <div 
          style={{
            backgroundColor: isMissingData ? undefined : colors.surfaceColor,
            borderColor: isMissingData ? undefined : colors.borderColor,
          }}
          className={`p-4 sm:p-5 rounded-xs border shadow-xs text-center transition-all ${
            isMissingData
              ? 'bg-red-500/10 border-red-500/40'
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div 
              style={{ color: isMissingData ? '#EF4444' : colors.mutedTextColor }}
              className="text-[11px] uppercase tracking-wider font-bold"
            >
              {resultTitle}
            </div>
            {!isMissingData && (
              <button
                id="btn-calc-share-badge"
                type="button"
                onClick={() => setIsShareCalcOpen(true)}
                style={{ color: colors.mutedTextColor }}
                className={`p-1 ${shareBtnConfig.badgeColor} rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold`}
                title={shareBtnConfig.text}
              >
                <shareBtnConfig.Icon size={13} />
                <span>{shareBtnConfig.shortText}</span>
              </button>
            )}
          </div>
          <div className={`text-3xl sm:text-4xl font-black tracking-tight leading-none break-all ${
            isMissingData ? 'text-[#EF4444]' : theme.textResult
          }`}>
            {resultDisplay}
          </div>
          <div 
            style={{ color: isMissingData ? '#EF4444' : colors.secondaryTextColor }}
            className="text-xs sm:text-sm mt-2 font-medium"
          >
            {subTextDisplay}
          </div>

          {!isMissingData && (
            <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/10">
              <button
                id="btn-calc-share-main"
                type="button"
                onClick={() => setIsShareCalcOpen(true)}
                className={`w-full py-2.5 px-3 rounded-lg ${shareBtnConfig.bgClass} active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer`}
              >
                <shareBtnConfig.Icon size={16} />
                <span>{shareBtnConfig.text}</span>
              </button>
            </div>
          )}
        </div>

        {/* Ficha técnica informativa de Oro (Onza · Kilo · Gramo) */}
        {!isMissingData && isOro && (
          <div 
            style={{ 
              backgroundColor: colors.surfaceColor, 
              borderColor: colors.borderColor 
            }}
            className="rounded border p-3 shadow-2xs"
          >
            <div 
              style={{ color: colors.textColor, borderColor: colors.borderColor }}
              className="flex items-center justify-between text-xs font-bold mb-2 border-b pb-1.5"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp size={14} className={theme.textAccent} />
                Valores de Referencia Internacional
              </span>
              <span style={{ color: colors.mutedTextColor }} className="text-[10px] font-normal">
                Oro Puro Spot
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div 
                style={{ borderColor: 'rgba(212, 175, 55, 0.3)', backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.06)' }}
                className="border rounded p-1.5"
              >
                <div className="text-[9px] uppercase font-bold text-[#D4AF37]">1 Onza Troy</div>
                <div className="text-xs sm:text-sm font-bold text-[#D4AF37] mt-0.5">${rates.oro?.price || '0.00'}</div>
                <div style={{ color: colors.mutedTextColor }} className="text-[9px] mt-0.5 font-medium">
                  31.10 gramos
                </div>
              </div>

              <div 
                style={{ borderColor: 'rgba(212, 175, 55, 0.3)', backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.06)' }}
                className="border rounded p-1.5"
              >
                <div className="text-[9px] uppercase font-bold text-[#D4AF37]">1 Kilogramo</div>
                <div className="text-xs sm:text-sm font-bold text-[#D4AF37] mt-0.5">
                  ${((rates.oro?.numPrice || 0) * TROY_OZ_PER_KG).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ color: colors.mutedTextColor }} className="text-[9px] mt-0.5 font-medium">
                  32.1507 Oz
                </div>
              </div>

              <div 
                style={{ borderColor: 'rgba(212, 175, 55, 0.3)', backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.06)' }}
                className="border rounded p-1.5"
              >
                <div className="text-[9px] uppercase font-bold text-[#D4AF37]">1 Gramo</div>
                <div className="text-xs sm:text-sm font-bold text-[#D4AF37] mt-0.5">
                  ${(((rates.oro?.numPrice || 0) * TROY_OZ_PER_KG) / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ color: colors.mutedTextColor }} className="text-[9px] mt-0.5 font-medium">
                  Oro Spot
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparativa Simultánea BCV/EURO (Oficial) vs. USDT (Verde) */}
        {!isMissingData && validAmount > 0 && selectedCurrency !== 'btc' && selectedCurrency !== 'oro' && (
          <div 
            style={{ 
              backgroundColor: colors.surfaceColor, 
              borderColor: colors.borderColor 
            }}
            className="rounded border p-3 shadow-2xs"
          >
            <div 
              style={{ color: colors.textColor, borderColor: colors.borderColor }}
              className="flex items-center justify-between text-xs font-bold mb-2 border-b pb-1.5"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp size={14} className={theme.textAccent} />
                {selectedCurrency === 'euro' ? 'Comparativa EURO Oficial vs. USDT' : 'Comparativa BCV vs. USDT'}
              </span>
              <span style={{ color: colors.mutedTextColor }} className="text-[10px] font-normal">
                Mismo monto en ambas tasas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Oficial: Vinotinto para BCV, Azul para EURO */}
              <div 
                style={{ 
                  borderColor: selectedCurrency === 'euro' ? 'rgba(30, 64, 175, 0.3)' : 'rgba(139, 21, 56, 0.3)', 
                  backgroundColor: selectedCurrency === 'euro'
                    ? (isDark ? 'rgba(30, 64, 175, 0.15)' : 'rgba(30, 64, 175, 0.05)')
                    : (isDark ? 'rgba(139, 21, 56, 0.15)' : 'rgba(139, 21, 56, 0.05)')
                }}
                className="border rounded p-2"
              >
                <div 
                  className="text-[10px] uppercase font-bold"
                  style={{ color: selectedCurrency === 'euro' ? (isDark ? '#93C5FD' : '#1D4ED8') : '#8B1538' }}
                >
                  Tasa Oficial ({selectedCurrency === 'euro' ? 'EURO' : 'BCV'})
                </div>
                <div 
                  className="text-sm sm:text-base font-bold mt-0.5"
                  style={{ color: selectedCurrency === 'euro' ? (isDark ? '#93C5FD' : '#1D4ED8') : '#8B1538' }}
                >
                  {bcvEquivalent}
                </div>
                <div style={{ color: colors.mutedTextColor }} className="text-[10px] mt-0.5 font-medium">
                  {selectedCurrency === 'euro' 
                    ? `1 € = Bs. ${rates.euro?.price || 'FALTA DE DATOS'}`
                    : `1 $ = Bs. ${rates.bcv?.price || 'FALTA DE DATOS'}`}
                </div>
              </div>

              {/* USDT: Verde (Color de marca preservado) */}
              <div 
                style={{ borderColor: 'rgba(44, 153, 69, 0.3)', backgroundColor: isDark ? 'rgba(44, 153, 69, 0.15)' : 'rgba(44, 153, 69, 0.05)' }}
                className="border rounded p-2"
              >
                <div className="text-[10px] uppercase font-bold text-[#2C9945]">Tasa USDT</div>
                <div className="text-sm sm:text-base font-bold text-[#2C9945] mt-0.5">{usdtEquivalent}</div>
                <div style={{ color: colors.mutedTextColor }} className="text-[10px] mt-0.5 font-medium">
                  1 $ = Bs. {rates.usdt?.price || 'FALTA DE DATOS'}
                </div>
              </div>
            </div>

            {/* Diferencia siempre colocada debajo, bien calculada en Bs. y en $ */}
            {diffBsNumber > 0 && (
              <div 
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC',
                  borderColor: colors.borderColor 
                }}
                className="mt-2.5 p-2 rounded border flex flex-col sm:flex-row items-center justify-between gap-1.5"
              >
                <span style={{ color: colors.mutedTextColor }} className="text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                  Diferencia entre Oficial y USDT:
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded">
                    {diffBsFormatted}
                  </span>
                  <span style={{ color: colors.mutedTextColor }} className="text-[11px] font-bold">≈</span>
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {diffUsdFormatted}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
              <span style={{ color: colors.mutedTextColor }} className="text-[10px]">
                ¿Cobrando a un cliente o deuda pendiente?
              </span>
              <button
                id="btn-comparativa-share-link"
                type="button"
                onClick={() => setIsShareCalcOpen(true)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <shareBtnConfig.Icon size={12} />
                <span>{shareBtnConfig.text}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Banner de Anuncios / AdBanner */}
      <AdBanner
        isPremium={isPremium}
        adBlockExpiresAt={adBlockExpiresAt}
        onGoPremium={onGoPremium}
      />

      {/* Descargo Legal Financiero */}
      <div 
        id="financial-disclaimer-calculadora"
        style={{ 
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
          borderColor: colors.borderColor 
        }}
        className="p-3 rounded-lg border text-center my-1"
      >
        <p style={{ color: colors.mutedTextColor }} className="text-[10px] leading-relaxed">
          <strong>Aviso Legal y Financiero:</strong> Las conversiones y valores expresados son estrictamente referenciales para fines informativos. TasaToday no es una entidad bancaria ni presta servicios de intermediación cambiaria o remesas.
        </p>
      </div>

      {/* Info & Fecha */}
      <div className="text-center text-xs py-3 space-y-1">
        <p className="font-semibold text-xs tracking-wide">
          <span style={{ color: colors.usdtColor }}>$ Tasa</span>
          <span style={{ color: colors.textColor }}>Today</span>
        </p>
        <p style={{ color: colors.mutedTextColor }} className="text-xs font-mono">
          {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </div>

      {/* Modal de Compartir Cobro / Cálculo con Medios de Pago */}
      <ShareCalculationModal
        isOpen={isShareCalcOpen}
        onClose={() => setIsShareCalcOpen(false)}
        rates={rates}
        selectedCurrency={selectedCurrency}
        conversionDirection={conversionDirection}
        amount={amount}
        resultDisplay={resultDisplay}
        subTextDisplay={subTextDisplay}
        resultTitle={resultTitle}
        bcvEquivalent={bcvEquivalent}
        usdtEquivalent={usdtEquivalent}
        goldUnit={goldUnit}
        initialPaymentMethod={paymentMethod}
        onPaymentMethodChange={(m) => setPaymentMethod(m)}
      />
    </div>
  );
};
