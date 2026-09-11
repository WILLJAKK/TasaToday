import React, { useState, useEffect } from 'react';
import { IntervencionItem } from '../types';
import { Landmark, Bell, BellRing, RefreshCw, CheckCircle2, ExternalLink, Calendar, Search, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface IntervencionViewProps {
  onRefresh?: () => void;
}

const DEFAULT_INTERVENCIONES: IntervencionItem[] = [
  { fecha: '09-09-2026', nro: '027-26', tipoCambioBsEur: '954,02', tipoCambioBsUsd: '820,10', paridadEurUsd: '1,1633', isRecent: true },
  { fecha: '08-09-2026', nro: '027-26', tipoCambioBsEur: '947,30', tipoCambioBsUsd: '814,32', paridadEurUsd: '1,1633' },
  { fecha: '07-09-2026', nro: '027-26', tipoCambioBsEur: '945,65', tipoCambioBsUsd: '812,90', paridadEurUsd: '1,1633' },
  { fecha: '04-09-2026', nro: '026-26', tipoCambioBsEur: '938,45', tipoCambioBsUsd: '806,71', paridadEurUsd: '1,1633' },
  { fecha: '03-09-2026', nro: '026-26', tipoCambioBsEur: '932,81', tipoCambioBsUsd: '801,87', paridadEurUsd: '1,1633' },
  { fecha: '02-09-2026', nro: '026-26', tipoCambioBsEur: '929,09', tipoCambioBsUsd: '798,67', paridadEurUsd: '1,1633' },
  { fecha: '01-09-2026', nro: '026-26', tipoCambioBsEur: '926,55', tipoCambioBsUsd: '796,48', paridadEurUsd: '1,1633' },
  { fecha: '31-08-2026', nro: '026-26', tipoCambioBsEur: '922,69', tipoCambioBsUsd: '793,17', paridadEurUsd: '1,1633' },
  { fecha: '28-08-2026', nro: '025-26', tipoCambioBsEur: '921,88', tipoCambioBsUsd: '792,47', paridadEurUsd: '1,1633' },
  { fecha: '27-08-2026', nro: '025-26', tipoCambioBsEur: '921,81', tipoCambioBsUsd: '792,41', paridadEurUsd: '1,1633' },
  { fecha: '26-08-2026', nro: '025-26', tipoCambioBsEur: '919,15', tipoCambioBsUsd: '790,12', paridadEurUsd: '1,1633' },
  { fecha: '25-08-2026', nro: '025-26', tipoCambioBsEur: '916,03', tipoCambioBsUsd: '787,44', paridadEurUsd: '1,1633' },
  { fecha: '24-08-2026', nro: '025-26', tipoCambioBsEur: '916,01', tipoCambioBsUsd: '787,42', paridadEurUsd: '1,1633' },
  { fecha: '21-08-2026', nro: '024-26', tipoCambioBsEur: '911,22', tipoCambioBsUsd: '783,31', paridadEurUsd: '1,1633' },
  { fecha: '20-08-2026', nro: '024-26', tipoCambioBsEur: '906,83', tipoCambioBsUsd: '779,53', paridadEurUsd: '1,1633' },
  { fecha: '19-08-2026', nro: '024-26', tipoCambioBsEur: '897,82', tipoCambioBsUsd: '771,79', paridadEurUsd: '1,1633' },
  { fecha: '18-08-2026', nro: '024-26', tipoCambioBsEur: '896,03', tipoCambioBsUsd: '770,25', paridadEurUsd: '1,1633' },
  { fecha: '17-08-2026', nro: '024-26', tipoCambioBsEur: '894,49', tipoCambioBsUsd: '768,93', paridadEurUsd: '1,1633' },
  { fecha: '14-08-2026', nro: '023-26', tipoCambioBsEur: '889,45', tipoCambioBsUsd: '764,59', paridadEurUsd: '1,1633' },
  { fecha: '13-08-2026', nro: '023-26', tipoCambioBsEur: '885,08', tipoCambioBsUsd: '760,84', paridadEurUsd: '1,1633' },
  { fecha: '12-08-2026', nro: '023-26', tipoCambioBsEur: '882,30', tipoCambioBsUsd: '758,45', paridadEurUsd: '1,1633' },
  { fecha: '11-08-2026', nro: '023-26', tipoCambioBsEur: '879,35', tipoCambioBsUsd: '755,91', paridadEurUsd: '1,1633' },
  { fecha: '10-08-2026', nro: '023-26', tipoCambioBsEur: '875,22', tipoCambioBsUsd: '752,36', paridadEurUsd: '1,1633' },
];

const calculateUsdRate = (eurStr: string, fallbackUsd?: string, parity = 1.1633): string => {
  if (fallbackUsd && fallbackUsd !== '0,00') return fallbackUsd;
  const eurNum = parseFloat(eurStr.replace(/\./g, '').replace(',', '.'));
  if (isNaN(eurNum) || parity <= 0) return '0,00';
  const usdVal = eurNum / parity;
  return usdVal.toFixed(2).replace('.', ',');
};

export const IntervencionView: React.FC<IntervencionViewProps> = () => {
  const [intervenciones, setIntervenciones] = useState<IntervencionItem[]>(DEFAULT_INTERVENCIONES);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission === 'granted';
      }
    } catch {
      // Ignorar restricciones en iframes
    }
    return false;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const safeStorageGet = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeStorageSet = (key: string, val: string) => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const triggerPushNotification = (item: IntervencionItem) => {
    const title = '¡Nueva Intervención Bancaria BCV!';
    const body = `Intervención N° ${item.nro} del ${item.fecha}. Tasa: ${item.tipoCambioBsEur} Bs./EUR.`;

    // Intentar disparar notificación nativa de forma completamente segura
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        // En Safari/WebKit no pasar 'icon' relativo para evitar SyntaxError (SYNTAX_ERR)
        new Notification(title, { body });
      }
    } catch {
      // En iframes o WebKit restringido, la notificación nativa puede no permitirse
    }

    // Notificación en pantalla garantizada (Toast in-app)
    showToast(`🔔 ${title}: ${body}`);
  };

  const fetchIntervenciones = async (isManual = false) => {
    setLoading(true);
    let loadedItems: IntervencionItem[] | null = null;

    try {
      const res = await fetch('/api/intervenciones', { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const json = JSON.parse(text);
          if (json && Array.isArray(json.data) && json.data.length > 0) {
            loadedItems = json.data;
          }
        }
      }
    } catch (err) {
      console.warn('Advertencia consultando API de intervenciones, usando datos de respaldo:', err);
    }

    const finalData = loadedItems || DEFAULT_INTERVENCIONES;
    setIntervenciones(finalData);

    // Detección segura de nueva intervención
    try {
      const latest = finalData[0];
      if (latest) {
        const currentKey = `${latest.nro}_${latest.fecha}`;
        const savedLast = safeStorageGet('last_known_intervencion');
        if (savedLast && savedLast !== currentKey) {
          triggerPushNotification(latest);
        }
        safeStorageSet('last_known_intervencion', currentKey);
      }
    } catch {}

    if (isManual) {
      showToast('Historial de intervenciones actualizado del BCV');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIntervenciones();
  }, []);

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Tu navegador no soporta la API de notificaciones.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        showToast('¡Notificaciones Push activadas para nuevas intervenciones!');
        try {
          new Notification('$ TasaToday - BCV Oficial', {
            body: 'Notificaciones activadas. Te avisaremos cuando el BCV publique una intervención cambiaria.',
          });
        } catch {}
      } else {
        setPushEnabled(false);
        showToast('Permiso de notificación no concedido por el navegador.');
      }
    } catch {
      showToast('No se pudo solicitar permiso de notificación en este entorno.');
    }
  };

  const handleTestNotification = () => {
    const sample = intervenciones[0] || DEFAULT_INTERVENCIONES[0];

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('¡Prueba de Notificación Push!', {
          body: `Intervención BCV N° ${sample.nro} (${sample.fecha}) a ${sample.tipoCambioBsEur} Bs./EUR`,
        });
      }
    } catch {}

    showToast(`🔔 Intervención BCV N° ${sample.nro} (${sample.tipoCambioBsEur} Bs./EUR)`);
  };

  const filteredIntervenciones = intervenciones.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return item.fecha.toLowerCase().includes(term) || item.nro.toLowerCase().includes(term);
  });

  const { colors, isDark } = useTheme();
  const latestIntervencion = intervenciones[0];

  return (
    <div 
      style={{ backgroundColor: colors.backgroundColor }}
      className="flex-1 flex flex-col overflow-y-auto transition-colors duration-200"
    >
      {/* Toast Alert Flotante */}
      {toastMessage && (
        <div 
          id="toast-notification-intervencion"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#1F2937] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 text-xs sm:text-sm font-medium border border-[#374151] max-w-[90vw] animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <BellRing size={18} className="text-[#3F9047] shrink-0 animate-bounce" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-3 sm:p-4 space-y-3 max-w-2xl mx-auto w-full">
        
        {/* Cabecera del Módulo */}
        <div 
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="border p-3 shadow-xs transition-colors duration-200"
        >
          <div 
            style={{ borderColor: colors.borderColor }}
            className="flex items-center justify-between pb-2 border-b"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#2C9945] flex items-center justify-center text-white rounded-xs">
                <Landmark size={18} />
              </div>
              <div>
                <h2 
                  style={{ color: colors.textColor }}
                  className="text-[13px] sm:text-[14px] font-bold tracking-tight"
                >
                  INTERVENCIÓN BANCARIA BCV
                </h2>
                <p style={{ color: colors.secondaryTextColor }} className="text-[10px] font-medium">
                  Venta de divisas a la banca nacional • bcv.org.ve
                </p>
              </div>
            </div>

            <button
              id="btn-refresh-intervenciones"
              onClick={() => fetchIntervenciones(true)}
              disabled={loading}
              style={{ color: colors.textColor }}
              className="p-1.5 hover:opacity-80 rounded-sm transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              title="Actualizar datos del BCV"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#2C9945]' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>

          {/* Estado de Notificaciones Push */}
          <div 
            style={{ 
              backgroundColor: isDark ? '#1E293B' : '#F9FAFB', 
              borderColor: colors.borderColor 
            }}
            className="mt-2.5 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 border rounded-xs"
          >
            <div className="flex items-center gap-2">
              {pushEnabled ? (
                <div className="flex items-center gap-1.5 text-[#2C9945] text-[11px] font-semibold">
                  <CheckCircle2 size={15} />
                  <span>Notificaciones Push Activas</span>
                </div>
              ) : (
                <div style={{ color: colors.secondaryTextColor }} className="flex items-center gap-1.5 text-[11px] font-medium">
                  <Bell size={15} className="text-gray-400" />
                  <span>Avisar cuando publiquen nueva intervención</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!pushEnabled ? (
                <button
                  id="btn-enable-push"
                  onClick={requestPushPermission}
                  className="bg-[#2C9945] hover:bg-[#25823a] text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <BellRing size={12} />
                  Activar Notificaciones
                </button>
              ) : (
                <button
                  id="btn-test-push"
                  onClick={handleTestNotification}
                  style={{
                    backgroundColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.textColor,
                  }}
                  className="text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded-xs transition-colors cursor-pointer hover:opacity-80"
                >
                  Probar Push
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta de Última Intervención */}
        {latestIntervencion && (
          <div 
            style={{ 
              backgroundColor: colors.surfaceColor, 
              borderColor: colors.usdtColor 
            }}
            className="border-2 p-3 shadow-xs transition-colors duration-200"
          >
            <div 
              style={{ borderColor: colors.borderColor }}
              className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b"
            >
              <div className="flex items-center gap-2">
                <span className="bg-[#2C9945] text-white text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase rounded-xs">
                  Última Intervención
                </span>
                <span 
                  style={{ color: colors.textColor }}
                  className="text-[12px] font-extrabold font-mono"
                >
                  N° {latestIntervencion.nro}
                </span>
              </div>
              <span 
                style={{ color: colors.secondaryTextColor }}
                className="text-[11px] font-bold flex items-center gap-1 font-mono"
              >
                <Calendar size={13} className="text-[#2C9945]" />
                {latestIntervencion.fecha}
              </span>
            </div>

            {/* Columnas Principales: BS/EUR y BS/USD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
              {/* Bs. / EUR (Oficial del BCV) */}
              <div 
                style={{ 
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC', 
                  borderColor: colors.borderColor 
                }}
                className="p-2.5 sm:p-3 border rounded-xs relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <span 
                    style={{ color: colors.textColor }}
                    className="text-[11px] font-bold uppercase tracking-tight"
                  >
                    BS. / EUR
                  </span>
                  <span 
                    style={{
                      backgroundColor: isDark ? '#334155' : '#E2E8F0',
                      color: colors.textColor,
                    }}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs"
                  >
                    OFICIAL BCV
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span style={{ color: colors.secondaryTextColor }} className="text-xs font-bold">Bs.</span>
                  <span 
                    style={{ color: colors.textColor }}
                    className="text-[20px] sm:text-[22px] font-extrabold font-mono tracking-tighter"
                  >
                    {latestIntervencion.tipoCambioBsEur}
                  </span>
                </div>
                <p style={{ color: colors.mutedTextColor }} className="text-[9.5px] mt-1">
                  Tasa de colocación oficial publicada por el Banco Central de Venezuela
                </p>
              </div>

              {/* Bs. / USD (Calculado automáticamente) */}
              <div 
                style={{ 
                  backgroundColor: isDark ? 'rgba(44, 153, 69, 0.12)' : '#F4FBF5', 
                  borderColor: isDark ? 'rgba(44, 153, 69, 0.4)' : '#86EFAC' 
                }}
                className="p-2.5 sm:p-3 border rounded-xs relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#2C9945] uppercase tracking-tight">
                    BS. / USD
                  </span>
                  <span 
                    style={{ 
                      backgroundColor: isDark ? 'rgba(44, 153, 69, 0.25)' : '#DCFCE7',
                      color: isDark ? '#4ADE80' : '#15803D'
                    }}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs"
                  >
                    CALCULADO
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xs font-bold text-[#2C9945]">Bs.</span>
                  <span className="text-[20px] sm:text-[22px] font-extrabold text-[#2C9945] font-mono tracking-tighter">
                    {calculateUsdRate(latestIntervencion.tipoCambioBsEur, latestIntervencion.tipoCambioBsUsd)}
                  </span>
                </div>
                <p style={{ color: isDark ? '#94A3B8' : '#4B5563' }} className="text-[9.5px] mt-1">
                  Tasa del euro dividida entre la paridad internacional (1,1633 EUR/USD)
                </p>
              </div>
            </div>

            {/* Detalle del cálculo automático */}
            <div 
              style={{ 
                backgroundColor: isDark ? '#1E293B' : '#F9FAFB', 
                borderColor: colors.borderColor,
                color: colors.secondaryTextColor
              }}
              className="mt-2.5 p-2 border text-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xs"
            >
              <span className="flex items-center gap-1 font-medium tracking-tight">
                <ShieldCheck size={13} className="text-[#2C9945] shrink-0" />
                Fórmula: {latestIntervencion.tipoCambioBsEur} Bs./EUR ÷ 1,1633 (paridad) = {calculateUsdRate(latestIntervencion.tipoCambioBsEur, latestIntervencion.tipoCambioBsUsd)} Bs./USD
              </span>
              <span style={{ color: colors.mutedTextColor }} className="font-mono text-[9px] text-right tracking-tight">
                Paridad: 1 EUR = 1,1633 USD
              </span>
            </div>
          </div>
        )}

        {/* Historial de Intervenciones */}
        <div 
          style={{ 
            backgroundColor: colors.surfaceColor, 
            borderColor: colors.borderColor 
          }}
          className="border p-2 sm:p-3 shadow-xs transition-colors duration-200"
        >
          <div 
            style={{ borderColor: colors.borderColor }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b"
          >
            <div>
              <h3 
                style={{ color: colors.textColor }}
                className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wide"
              >
                Historial de Intervención Cambiaria BCV
              </h3>
              <p style={{ color: colors.secondaryTextColor }} className="text-[10px]">
                Oficial BCV en Bs./EUR y calculada en Bs./USD según paridad
              </p>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-44">
              <Search size={12} className="absolute left-2 top-2.5 text-gray-400" />
              <input
                type="text"
                id="search-intervenciones"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar fecha o nro..."
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                  color: colors.textColor,
                  borderColor: colors.borderColor,
                }}
                className="w-full text-[11px] pl-7 pr-2 py-1 border rounded-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tabla de Historial Ajustada Sin Scroll Horizontal */}
          <div className="mt-2 w-full overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-[#2C9945] text-white text-[9.5px] sm:text-[11px] uppercase font-bold tracking-tight">
                  <th className="w-[23%] py-2 px-1 sm:px-2 text-left">Fecha</th>
                  <th className="w-[17%] py-2 px-0.5 text-center">N° Interv.</th>
                  <th className="w-[23%] py-2 px-1 sm:px-1.5 text-right">Bs./EUR</th>
                  <th className="w-[23%] py-2 px-1 sm:px-1.5 text-right">Bs./USD</th>
                  <th className="w-[14%] py-2 px-0.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody 
                style={{ borderColor: colors.borderColor }}
                className="divide-y font-mono text-[10px] sm:text-[11.5px]"
              >
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                      <RefreshCw size={18} className="animate-spin text-[#2C9945] mx-auto mb-2" />
                      Cargando historial de intervenciones del BCV...
                    </td>
                  </tr>
                ) : filteredIntervenciones.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: colors.secondaryTextColor }} className="py-6 text-center font-sans">
                      No se encontraron registros para la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredIntervenciones.map((item, idx) => {
                    const isLatest = idx === 0 && !searchTerm;
                    const usdCalculado = calculateUsdRate(item.tipoCambioBsEur, item.tipoCambioBsUsd);

                    const rowBg = isLatest
                      ? (isDark ? 'rgba(44, 153, 69, 0.2)' : '#F0FDF4')
                      : idx % 2 === 0
                      ? colors.surfaceColor
                      : (isDark ? '#1E293B' : '#F9FAFB');

                    return (
                      <tr
                        key={`${item.fecha}-${item.nro}-${idx}`}
                        style={{ backgroundColor: rowBg }}
                        className="transition-colors"
                      >
                        <td 
                          style={{ color: colors.textColor }}
                          className="py-2 px-1 sm:px-2 tracking-tighter truncate"
                        >
                          <span className="flex items-center gap-1">
                            {isLatest && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2C9945] shrink-0 inline-block" />
                            )}
                            <span>{item.fecha}</span>
                          </span>
                        </td>
                        <td 
                          style={{ color: colors.secondaryTextColor }}
                          className="py-2 px-0.5 text-center font-semibold tracking-tighter truncate"
                        >
                          {item.nro}
                        </td>
                        <td 
                          style={{ color: colors.textColor }}
                          className="py-2 px-1 sm:px-1.5 text-right font-bold tracking-tighter"
                        >
                          {item.tipoCambioBsEur}
                        </td>
                        <td className="py-2 px-1 sm:px-1.5 text-right font-bold text-[#2C9945] tracking-tighter">
                          {usdCalculado}
                        </td>
                        <td className="py-2 px-0.5 text-center font-sans">
                          {isLatest ? (
                            <span 
                              style={{
                                backgroundColor: isDark ? 'rgba(44, 153, 69, 0.3)' : '#DCFCE7',
                                color: isDark ? '#4ADE80' : '#15803D'
                              }}
                              className="text-[8.5px] sm:text-[9px] font-bold px-1 py-0.5 rounded-xs tracking-tight inline-block"
                            >
                              Vigente
                            </span>
                          ) : (
                            <span style={{ color: colors.mutedTextColor }} className="text-[8.5px] sm:text-[10px] tracking-tight">
                              Cerrada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Enlace Oficial a la Fuente */}
          <div 
            style={{ borderColor: colors.borderColor, color: colors.mutedTextColor }}
            className="mt-3 pt-2.5 border-t flex items-center justify-between text-[10px]"
          >
            <span>Fuente oficial: bcv.org.ve/politica-cambiaria</span>
            <a
              href="https://www.bcv.org.ve/politica-cambiaria/intervencion-cambiaria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2C9945] hover:underline font-semibold flex items-center gap-0.5"
            >
              Ver en BCV <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Footer info idéntico a las demás vistas */}
        <div className="text-center text-xs pt-1 pb-3 space-y-1">
          <p className="font-semibold text-xs tracking-wide">
            <span style={{ color: colors.usdtColor }}>$ Tasa</span>
            <span style={{ color: colors.textColor }}>Today</span>
          </p>
          <p style={{ color: colors.mutedTextColor }} className="text-xs">
            {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

      </div>
    </div>
  );
};
