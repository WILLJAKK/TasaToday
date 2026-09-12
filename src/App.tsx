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
  // LÓGICA DE EXTRACCIÓN OFICIAL: ESTRICTAMENTE /api/rates
  // ==========================================
  const fetchData = async (isBackground = false) => {
    if (!isBackground && !rates.bcv?.price) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/rates?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const serverData = await res.json();
      if (!serverData || !serverData.bcv || !serverData.usdt) {
        throw new Error('Respuesta inválida desde /api/rates');
      }

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
        bcv: serverData.bcv || null,
        usdt: serverData.usdt || null,
        euro: serverData.euro || null,
        btc: serverData.btc || null,
        oro: serverData.oro || null,
        lastUpdated: serverData.lastUpdated || dateStr,
      });
      setIsOffline(false);
    } catch (error) {
      console.warn('[Fetch Error] Falló la consulta a /api/rates:', error);
      // Si el fetch hacia /api/rates falla, retorna null para los valores, forzando a la UI a mostrar el estado "FALTA DE DATOS"
      setRates({
        bcv: null,
        usdt: null,
        euro: null,
        btc: null,
        oro: null,
        lastUpdated: '',
      });
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
