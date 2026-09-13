import React, { useState } from 'react';
import { ExchangeRatesData, SelectedCurrency, RateItem, GoldUnit, TROY_OZ_PER_KG, GRAMS_PER_TROY_OZ } from '../types';
import { ShareModal } from './ShareModal';
import { AdBanner } from './AdBanner';
import { RefreshCw, Share2, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CotizacionesViewProps {
  rates: ExchangeRatesData;
  loading: boolean;
  countdown?: number;
  goldUnit?: GoldUnit;
  setGoldUnit?: (unit: GoldUnit) => void;
  onRefresh?: () => void;
  onSelectRateForCalc: (currency: SelectedCurrency, goldUnit?: GoldUnit) => void;
  isPremium?: boolean;
  adBlockExpiresAt?: number | null;
  onGoPremium?: () => void;
}

export const CotizacionesView: React.FC<CotizacionesViewProps> = ({
  rates,
  loading,
  countdown = 60,
  goldUnit = 'oz',
  setGoldUnit,
  onRefresh,
  onSelectRateForCalc,
  isPremium = false,
  adBlockExpiresAt = null,
  onGoPremium,
}) => {
  const { colors, isDark } = useTheme();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedCurrencyToShare, setSelectedCurrencyToShare] = useState<SelectedCurrency | 'all'>('usdt');

  // Componente reutilizable para cada fila de precio + variación
  const RateRow: React.FC<{
    label: string;
    data: RateItem | null;
    isCrypto: boolean;
    currencyKey: SelectedCurrency;
  }> = ({ label, data, isCrypto, currencyKey }) => {
    const isMissing = !data || data.status === 'missing' || data.error === 'FALTA DE DATOS' || data.numPrice === null;
    const symbol = isCrypto ? '$' : 'Bs.';
    const isOro = currencyKey === 'oro';
    const activeGoldUnit = goldUnit || 'oz';

    // Cálculo dinámico para Oro según unidad activa (G, Oz o Kg según estándar Kitco/LBMA)
    let displayPrice = data?.price;
    let displayChange = data?.change;
    let displayBid = data?.bid;
    let displayAsk = data?.ask;

    if (isOro && data?.numPrice) {
      if (activeGoldUnit === 'kg') {
        const kgPrice = data.numPrice * TROY_OZ_PER_KG;
        displayPrice = kgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (data.change) {
          const rawChange = parseFloat(data.change.replace(/,/g, '')) || 0;
          const kgChange = rawChange * TROY_OZ_PER_KG;
          displayChange = Math.abs(kgChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (data.bid) {
          const rawBid = parseFloat(data.bid.replace(/,/g, '')) || 0;
          displayBid = (rawBid * TROY_OZ_PER_KG).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (data.ask) {
          const rawAsk = parseFloat(data.ask.replace(/,/g, '')) || 0;
          displayAsk = (rawAsk * TROY_OZ_PER_KG).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      } else if (activeGoldUnit === 'g') {
        const gPrice = data.numPrice / GRAMS_PER_TROY_OZ;
        displayPrice = gPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (data.change) {
          const rawChange = parseFloat(data.change.replace(/,/g, '')) || 0;
          const gChange = rawChange / GRAMS_PER_TROY_OZ;
          displayChange = Math.abs(gChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (data.bid) {
          const rawBid = parseFloat(data.bid.replace(/,/g, '')) || 0;
          displayBid = (rawBid / GRAMS_PER_TROY_OZ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (data.ask) {
          const rawAsk = parseFloat(data.ask.replace(/,/g, '')) || 0;
          displayAsk = (rawAsk / GRAMS_PER_TROY_OZ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
    }

    // COLORES DE MARCA PRESERVADOS: Verde USDT, Rojo BCV, Azul Euro, Naranja BTC, Dorado ORO, Violeta TasaMi
    const colorConfig: Record<SelectedCurrency, { hex: string; badge: string }> = {
      usdt: { hex: colors.usdtColor, badge: 'bg-[#2C9945]' },
      bcv: { hex: colors.bcvColor, badge: 'bg-[#8B1538]' },
      euro: { hex: colors.euroColor, badge: 'bg-[#1A5276]' },
      btc: { hex: colors.btcColor, badge: 'bg-[#F7931A]' },
      oro: { hex: colors.oroColor, badge: 'bg-[#D4AF37]' },
      tasami: { hex: '#7C3AED', badge: 'bg-[#7C3AED]' },
    };
    const cfg = colorConfig[currencyKey];

    return (
      <div 
        id={`rate-row-${currencyKey}`}
        onClick={() => onSelectRateForCalc(currencyKey, isOro ? activeGoldUnit : undefined)}
        style={{ borderColor: colors.borderColor }}
        className="w-full flex items-center justify-between mb-4 pb-3 border-b last:border-b-0 last:mb-0 px-2 py-1.5 rounded transition-all cursor-pointer group hover:opacity-90"
        title={isMissing ? 'Cotización no disponible' : `Clic para calcular con ${label}${isOro ? ` (${activeGoldUnit.toUpperCase()})` : ''}`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs transition-transform group-hover:scale-125"
            style={{ backgroundColor: cfg.hex }}
            title={`Moneda: ${label}`}
          />
          <div className="flex items-center gap-1">
            <span 
              style={{ color: colors.textColor }}
              className="text-[22px] font-light tracking-wide transition-colors leading-none"
            >
              {label}
            </span>
            <button
              id={`btn-share-row-${currencyKey}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCurrencyToShare(currencyKey);
                setIsShareOpen(true);
              }}
              style={{ color: colors.secondaryTextColor }}
              className="p-1 rounded-full hover:bg-black/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer shrink-0"
              title={`Compartir captura de ${label}`}
            >
              <Share2 size={14} />
            </button>
          </div>

          {isOro && (
            /* Selector vertical de arriba 👆 hacia abajo 👇 (G / Oz / Kg) para no reducir espacio del precio */
            <div 
              id="gold-unit-selector-row"
              className="flex flex-col bg-black/5 dark:bg-white/10 p-0.5 rounded border border-amber-500/30 text-[9px] font-bold shrink-0 ml-0.5 shadow-2xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                id="btn-unit-g"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGoldUnit?.('g');
                }}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer text-center leading-none ${
                  activeGoldUnit === 'g'
                    ? 'bg-[#D4AF37] text-white shadow-xs font-black'
                    : 'text-[#D4AF37] hover:bg-amber-500/20'
                }`}
                title="Cotización oficial por Gramo de Oro"
              >
                G
              </button>
              <button
                id="btn-unit-oz"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGoldUnit?.('oz');
                }}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer text-center leading-none ${
                  activeGoldUnit === 'oz'
                    ? 'bg-[#D4AF37] text-white shadow-xs font-black'
                    : 'text-[#D4AF37] hover:bg-amber-500/20'
                }`}
                title="Cotización oficial por Onza Troy"
              >
                Oz
              </button>
              <button
                id="btn-unit-kg"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGoldUnit?.('kg');
                }}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer text-center leading-none ${
                  activeGoldUnit === 'kg'
                    ? 'bg-[#D4AF37] text-white shadow-xs font-black'
                    : 'text-[#D4AF37] hover:bg-amber-500/20'
                }`}
                title="Cotización oficial por Kilogramo"
              >
                Kg
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end text-right shrink-0">
          {isMissing ? (
            <div className="flex flex-col items-end">
              <span className="text-[15px] sm:text-[17px] font-bold text-[#EF4444] bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded tracking-wide">
                FALTA DE DATOS
              </span>
              <span className="text-[10px] text-red-400 font-medium mt-0.5">
                Sin registro en base de datos
              </span>
            </div>
          ) : (
            <>
              <span 
                style={{ color: colors.textColor }}
                className={`${isOro && activeGoldUnit === 'kg' ? 'text-[24px] sm:text-[28px]' : 'text-[30px] sm:text-[34px]'} font-light tracking-tight leading-none whitespace-nowrap`}
              >
                {symbol} {displayPrice}
              </span>
              <span className={`text-[12px] font-semibold mt-0.5 tracking-tight whitespace-nowrap ${data.isUp ? 'text-[#3F9047]' : 'text-[#EF4444]'}`}>
                {data.isUp ? '↑' : '↓'} {data.isUp ? '+' : '-'}{displayChange} {isCrypto ? 'USD' : 'Bs'} ({data.isUp ? '+' : '-'}{data.percent}%)
              </span>
              {isOro && displayBid && displayAsk && (
                <span style={{ color: colors.secondaryTextColor }} className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  Bid ${displayBid} · Ask ${displayAsk} ({activeGoldUnit === 'kg' ? 'Kg' : activeGoldUnit === 'g' ? 'G' : 'Oz'})
                </span>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      style={{ backgroundColor: colors.backgroundColor }}
      className="flex-1 overflow-y-auto p-2.5 sm:p-3 select-none flex flex-col justify-between transition-colors duration-200"
    >
      <div className="w-full max-w-md mx-auto space-y-3">
        
        {/* BARRA VERDE: VENEZUELA (COLOR PRESERVADO) */}
        <div 
          id="venezuela-bar"
          style={{ backgroundColor: colors.venezuelaBarColor }}
          className="h-[45px] flex items-center justify-between px-4 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-white text-[18px] font-normal tracking-wide">
              VENEZUELA
            </span>
          </div>
          {/* Cuenta regresiva en tiempo real para la actualización de 1 minuto */}
          <div 
            id="live-auto-sync-countdown"
            className="flex items-center gap-1.5 text-white text-[11px] font-semibold tracking-wide bg-black/20 px-2.5 py-1 rounded-full border border-white/15 shadow-xs"
            title={`Próxima actualización en ${countdown} segundos`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 ${loading ? 'opacity-100 duration-500' : 'opacity-75'}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <Clock size={12} className={loading ? "animate-spin text-emerald-300" : "text-white/90"} />
            <span className="font-mono tabular-nums">
              {loading ? 'Actualizando...' : `00:${countdown.toString().padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {/* TARJETA DE TASAS (SUPERFICIE ADAPTABLE) */}
        <div 
          id="card-rates"
          style={{ 
            backgroundColor: colors.surfaceColor,
            borderColor: colors.borderColor 
          }}
          className="relative py-4 px-5 flex flex-col items-center shadow-xs border transition-colors duration-200 overflow-hidden"
        >
          {/* Barra sutil de progreso de cuenta regresiva de 60 segundos */}
          <div 
            className="absolute top-0 left-0 h-[2px] bg-emerald-500/80 transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, (countdown / 60) * 100))}%` }}
          />
          {loading ? (
            <div className="my-8 flex flex-col items-center justify-center gap-2">
              <div 
                style={{ borderColor: colors.venezuelaBarColor, borderTopColor: 'transparent' }}
                className="w-10 h-10 border-4 rounded-full animate-spin" 
              />
              <span 
                style={{ color: colors.secondaryTextColor }}
                className="text-xs font-medium tracking-wide"
              >
                Consultando cotizaciones y variación 24h...
              </span>
            </div>
          ) : (
            <div className="w-full">
              {/* Fecha en mayúsculas y botón rápido de compartir */}
              <div className="flex items-center justify-between mb-4 px-1">
                <span 
                  style={{ color: colors.mutedTextColor }}
                  className="text-[12px] font-medium tracking-wider font-mono"
                >
                  {rates.lastUpdated ? rates.lastUpdated.toUpperCase() : 'COTIZACIONES EN VIVO'}
                </span>
                <button
                  id="btn-card-quick-share"
                  onClick={() => {
                    setSelectedCurrencyToShare('all');
                    setIsShareOpen(true);
                  }}
                  style={{ color: colors.usdtColor }}
                  className="text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  title="Compartir tarjeta completa"
                >
                  <Share2 size={13} />
                  <span>Compartir</span>
                </button>
              </div>

              {/* Filas de cotizaciones */}
              <RateRow label="USDT" data={rates.usdt} isCrypto={false} currencyKey="usdt" />
              <RateRow label="BCV" data={rates.bcv} isCrypto={false} currencyKey="bcv" />
              <RateRow label="EURO" data={rates.euro} isCrypto={false} currencyKey="euro" />
              <RateRow label="BTC" data={rates.btc} isCrypto={true} currencyKey="btc" />
              <RateRow label="ORO" data={rates.oro} isCrypto={true} currencyKey="oro" />
            </div>
          )}
        </div>

        {/* Banner de Anuncios / AdBanner (Se oculta automáticamente si isPremium === true o bloqueo de 12h activo) */}
        <AdBanner
          isPremium={isPremium}
          adBlockExpiresAt={adBlockExpiresAt}
          onGoPremium={onGoPremium}
        />

        {/* BOTÓN COMPARTIR */}
        <button
          id="btn-share-cotizaciones"
          onClick={() => {
            setSelectedCurrencyToShare('usdt');
            setIsShareOpen(true);
          }}
          style={{ backgroundColor: colors.venezuelaBarColor }}
          className="w-full hover:opacity-95 text-white py-3 text-center text-[16px] font-bold shadow-xs active:scale-[0.99] transition-transform cursor-pointer flex items-center justify-center gap-2"
        >
          <Share2 size={18} />
          <span>Compartir cotización</span>
        </button>

        {/* Descargo Legal Financiero - Google Play Financial Services & Apple Guideline 5.1.1 */}
        <div 
          id="financial-disclaimer-cotizaciones"
          style={{ 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
            borderColor: colors.borderColor 
          }}
          className="p-3 rounded-lg border text-center my-1"
        >
          <p style={{ color: colors.mutedTextColor }} className="text-[10px] leading-relaxed">
            <strong>Aviso de Responsabilidad Financiera:</strong> Los valores y cotizaciones exhibidos (BCV, USDT, Euro, Oro y Cripto) son de carácter estrictamente informativo y referencial. TasaToday no presta servicios bancarios ni de intermediación cambiaria, captación o remesas.
          </p>
        </div>

        {/* Info & Fecha */}
        <div className="text-center text-xs pt-2 pb-3 space-y-1">
          <p className="font-semibold text-xs tracking-wide">
            <span style={{ color: colors.usdtColor }}>$ Tasa</span>
            <span style={{ color: colors.textColor }}>Today</span>
          </p>
          <p style={{ color: colors.mutedTextColor }} className="text-xs">
            {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

      </div>

      <ShareModal
        rates={rates}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        defaultCurrency={selectedCurrencyToShare}
      />
    </div>
  );
};
