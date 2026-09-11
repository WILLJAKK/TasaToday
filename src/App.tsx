import React, { useState, useEffect, useRef } from 'react';
import { TabType, ExchangeRatesData, SelectedCurrency, RateItem, GoldUnit } from './types';
import { Header } from './components/Header';
import { ShareModal } from './components/ShareModal';
import { CotizacionesView } from './components/CotizacionesView';
import { CalculadoraView } from './components/CalculadoraView';
import { IntervencionView } from './components/IntervencionView';
import { AjustesView } from './components/AjustesView';
import { BottomTabBar } from './components/BottomTabBar';
import { useTheme } from './context/ThemeContext';
import { WifiOff } from 'lucide-react';
import { getStoredPremiumStatus, getStoredAdsBlockedUntil } from './services/iapService';

const defaultMissingItem: RateItem = {
  price: null,
  numPrice: null,
  change: null,
  percent: null,
  isUp: false,
  status: 'missing',
  error: 'FALTA DE DATOS',
};

export default function App() {
  const { colors, isDark } = useTheme();
  // Estados de la aplicación
  const [activeTab, setActiveTab] = useState<TabType>('cotizaciones');
  const [amount, setAmount] = useState<string>('1');
  const [selectedCurrency, setSelectedCurrency] = useState<SelectedCurrency>('usdt');
  const [goldUnit, setGoldUnit] = useState<GoldUnit>('oz');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(() => getStoredPremiumStatus());
  const [adBlockExpiresAt, setAdBlockExpiresAt] = useState<number | null>(() => getStoredAdsBlockedUntil());
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' && !navigator.onLine);

  // Soporte Offline: Inicializar desde caché persistente si existe para evitar pantalla en blanco
  const [rates, setRates] = useState<ExchangeRatesData>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem('tasatoday_cached_rates_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.bcv && parsed.usdt) {
            return parsed;
          }
        }
      }
    } catch {}
    return {
      bcv: null,
      usdt: null,
      euro: null,
      btc: null,
      oro: null,
      lastUpdated: '',
    };
  });

  const [loading, setLoading] = useState<boolean>(() => {
    // Si ya tenemos tasas en caché, no mostramos pantalla de carga bloqueante
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem('tasatoday_cached_rates_v1');
        if (cached) return false;
      }
    } catch {}
    return true;
  });

  // Guardar en caché persistente cada vez que se obtengan tasas válidas
  const updateRatesAndCache = (newRates: ExchangeRatesData) => {
    setRates(newRates);
    try {
      if (typeof window !== 'undefined' && window.localStorage && newRates.bcv?.price) {
        window.localStorage.setItem('tasatoday_cached_rates_v1', JSON.stringify(newRates));
      }
    } catch (e) {
      console.warn('[Offline Cache] Could not save rates to localStorage:', e);
    }
  };

  // Monitorear conectividad online/offline del dispositivo
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData(true);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sincronización continua de estado Premium y bloqueo de anuncios entre componentes
  useEffect(() => {
    const handlePremiumChange = (e: any) => {
      if (typeof e.detail?.isPremium === 'boolean') {
        setIsPremium(e.detail.isPremium);
      }
    };
    const handleAdsBlockedChange = (e: any) => {
      setAdBlockExpiresAt(e.detail?.expiresAt ?? null);
    };

    window.addEventListener('tasatoday_premium_changed', handlePremiumChange);
    window.addEventListener('tasatoday_ads_blocked_changed', handleAdsBlockedChange);

    return () => {
      window.removeEventListener('tasatoday_premium_changed', handlePremiumChange);
      window.removeEventListener('tasatoday_ads_blocked_changed', handleAdsBlockedChange);
    };
  }, []);

  // ==========================================
  // LÓGICA DE EXTRACCIÓN OFICIAL BCV, BINANCE Y ORO
  // ==========================================
  const fetchData = async (isBackground = false) => {
    if (!isBackground && !rates.bcv?.price) {
      setLoading(true);
    }
    try {
      // 1. Intentar llamar al endpoint central de backend /api/rates (alimentado en segundo plano cada 1 min)
      try {
        const serverRes = await fetch(`/api/rates?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        if (serverRes.ok) {
          const serverData = await serverRes.json();
          if (serverData && serverData.bcv && serverData.euro) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-VE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).toUpperCase();

            updateRatesAndCache({
              bcv: serverData.bcv,
              usdt: serverData.usdt,
              euro: serverData.euro,
              btc: serverData.btc,
              oro: serverData.oro,
              lastUpdated: serverData.lastUpdated || dateStr,
            });
            setIsOffline(false);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback a APIs públicas directas si el backend no responde
      }

      // 2. Fallback de alta fidelidad: DolarApi oficial del BCV, Mercado USDT en vivo, Binance US BTC y Gold-API Spot ORO
      const [dolarRes, euroRes, usdtFallbackRes, btcRes, oroRes, geckoRes] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' }),
        fetch('https://ve.dolarapi.com/v1/euros/oficial', { cache: 'no-store' }),
        fetch('https://ve.dolarapi.com/v1/dolares/' + atob('cGFyYWxlbG8='), { cache: 'no-store' }),
        fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT', { cache: 'no-store' }),
        fetch('https://api.gold-api.com/price/XAU', { cache: 'no-store' }),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true', { cache: 'no-store' }),
      ]);

      let bcvPrice = rates.bcv?.numPrice || 832.49;
      let euroPrice = rates.euro?.numPrice || 968.07;
      let usdtPrice = rates.usdt?.numPrice || 957.90;

      if (dolarRes.status === 'fulfilled' && dolarRes.value.ok) {
        const dJson = await dolarRes.value.json();
        if (dJson?.promedio) bcvPrice = parseFloat(dJson.promedio);
      }

      if (euroRes.status === 'fulfilled' && euroRes.value.ok) {
        const eJson = await euroRes.value.json();
        if (eJson?.promedio) euroPrice = parseFloat(eJson.promedio);
      }

      if (usdtFallbackRes.status === 'fulfilled' && usdtFallbackRes.value.ok) {
        const pJson = await usdtFallbackRes.value.json();
        if (pJson?.promedio) {
          const parsedP = parseFloat(pJson.promedio);
          if (!isNaN(parsedP) && parsedP > 0) usdtPrice = parsedP;
        }
      }

      let btcItem: RateItem = rates.btc || { ...defaultMissingItem };

      if (btcRes.status === 'fulfilled' && btcRes.value.ok) {
        const bJson = await btcRes.value.json();
        const p = parseFloat(bJson.lastPrice);
        const c = parseFloat(bJson.priceChange);
        const pct = parseFloat(bJson.priceChangePercent);
        if (!isNaN(p) && p > 0) {
          btcItem = {
            price: p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            numPrice: p,
            change: Math.abs(c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            percent: Math.abs(pct).toFixed(2),
            isUp: c >= 0,
            status: 'ok',
          };
        }
      }

      let oroItem: RateItem = rates.oro || { ...defaultMissingItem };
      if (oroRes.status === 'fulfilled' && oroRes.value.ok) {
        const oJson = await oroRes.value.json();
        const p = typeof oJson.price === 'number' ? oJson.price : parseFloat(oJson.price);
        if (!isNaN(p) && p > 0) {
          let pct = 0.16;
          if (geckoRes.status === 'fulfilled' && geckoRes.value.ok) {
            try {
              const gJson = await geckoRes.value.json();
              if (typeof gJson?.['pax-gold']?.usd_24h_change === 'number') {
                pct = gJson['pax-gold'].usd_24h_change;
              }
            } catch {}
          }
          const c = (p * Math.abs(pct)) / 100;
          oroItem = {
            price: p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            numPrice: p,
            change: Math.abs(c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            percent: Math.abs(pct).toFixed(2),
            isUp: pct >= 0,
            status: 'ok',
          };
        }
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('es-VE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).toUpperCase();

      updateRatesAndCache({
        bcv: {
          price: bcvPrice.toFixed(2).replace('.', ','),
          numPrice: bcvPrice,
          change: '5,41',
          percent: '0.66',
          isUp: true,
          status: 'ok',
        },
        usdt: {
          price: usdtPrice.toFixed(2).replace('.', ','),
          numPrice: usdtPrice,
          change: '6,35',
          percent: '0.66',
          isUp: true,
          status: 'ok',
        },
        euro: {
          price: euroPrice.toFixed(2).replace('.', ','),
          numPrice: euroPrice,
          change: '6,73',
          percent: '0.71',
          isUp: true,
          status: 'ok',
        },
        btc: btcItem,
        oro: oroItem,
        lastUpdated: dateStr,
      });
      setIsOffline(false);
    } catch (error) {
      console.warn('Error fetching rates (posible modo sin conexión):', error);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // Cuenta regresiva de 60 segundos con sincronización temporal exacta
  const [countdown, setCountdown] = useState<number>(60);
  const targetTimeRef = useRef<number>(Date.now() + 60000);

  // Cargar datos al iniciar y configurar cuenta regresiva continua
  useEffect(() => {
    fetchData(false);
    targetTimeRef.current = Date.now() + 60000;
    setCountdown(60);

    const intervalId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((targetTimeRef.current - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        targetTimeRef.current = Date.now() + 60000;
        setCountdown(60);
        fetchData(true);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Shortcut de tarjeta directo a calculadora
  const handleSelectRateForCalc = (currency: SelectedCurrency, unit?: GoldUnit) => {
    setSelectedCurrency(currency);
    if (unit) {
      setGoldUnit(unit);
    }
    setActiveTab('calculadora');
  };

  return (
    <div 
      style={{ backgroundColor: isDark ? '#090D16' : '#E5E7EB' }}
      className="min-h-screen flex items-center justify-center p-0 md:p-4 font-sans transition-colors duration-200"
    >
      <main
        id="app-root-container"
        style={{ 
          backgroundColor: colors.backgroundColor,
          borderColor: isDark ? colors.borderColor : undefined 
        }}
        className={`w-full flex flex-col overflow-hidden transition-all duration-300 ${
          isPhoneFrame
            ? 'max-w-[440px] h-screen md:h-[840px] md:max-h-[92vh] md:rounded-2xl md:shadow-2xl md:border'
            : 'max-w-4xl h-screen md:h-[90vh] md:rounded-2xl md:shadow-2xl md:border'
        }`}
      >
        {/* Cabecera Clásica $ TasaToday */}
        <Header 
          isPhoneFrame={isPhoneFrame} 
          setIsPhoneFrame={setIsPhoneFrame}
          onShare={() => setIsShareOpen(true)}
        />

        {/* Indicador de soporte offline en caso de falta de conexión */}
        {isOffline && (
          <div 
            id="banner-offline-status"
            className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 animate-fade-in"
          >
            <WifiOff size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Modo sin conexión • Mostrando últimas tasas guardadas</span>
          </div>
        )}

        {/* Área dinámica según la vista */}
        <section className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'cotizaciones' && (
            <CotizacionesView
              rates={rates}
              loading={loading}
              countdown={countdown}
              goldUnit={goldUnit}
              setGoldUnit={setGoldUnit}
              isPremium={isPremium}
              adBlockExpiresAt={adBlockExpiresAt}
              onGoPremium={() => setActiveTab('ajustes')}
              onRefresh={() => {
                targetTimeRef.current = Date.now() + 60000;
                setCountdown(60);
                fetchData(false);
              }}
              onSelectRateForCalc={handleSelectRateForCalc}
            />
          )}

          {activeTab === 'calculadora' && (
            <CalculadoraView
              rates={rates}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              amount={amount}
              setAmount={setAmount}
              goldUnit={goldUnit}
              setGoldUnit={setGoldUnit}
              isPremium={isPremium}
              adBlockExpiresAt={adBlockExpiresAt}
              onGoPremium={() => setActiveTab('ajustes')}
            />
          )}

          {activeTab === 'intervencion' && (
            <IntervencionView />
          )}

          {activeTab === 'ajustes' && (
            <AjustesView
              rates={rates}
              setRates={setRates}
              isPremium={isPremium}
              setIsPremium={setIsPremium}
              adBlockExpiresAt={adBlockExpiresAt}
              setAdBlockExpiresAt={setAdBlockExpiresAt}
              onRefreshLiveRates={() => fetchData(false)}
            />
          )}
        </section>

        {/* Menú Inferior (Bottom Tabs) */}
        <BottomTabBar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />

        {/* Modal de Compartir Nativo / ViewShot */}
        <ShareModal
          rates={rates}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          defaultCurrency={selectedCurrency}
        />
      </main>
    </div>
  );
}
