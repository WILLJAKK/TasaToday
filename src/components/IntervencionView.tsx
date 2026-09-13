import React, { useState, useEffect, useCallback } from 'react';
import { IntervencionItem } from '../types';
import { 
  Landmark, Bell, BellRing, RefreshCw, CheckCircle2, ExternalLink, Calendar, 
  Search, ShieldCheck, Zap, Smartphone, AlertTriangle, Lock, Info, HelpCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToBCVIntervencionPush,
  unsubscribeFromBCVIntervencionPush,
  getExistingPushSubscription,
  triggerTestPushNotification,
} from '../services/pushNotificationService';

interface IntervencionViewProps {
  onRefresh?: () => void;
}

export const IntervencionView: React.FC<IntervencionViewProps> = () => {
  const [intervenciones, setIntervenciones] = useState<IntervencionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { colors, isDark } = useTheme();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5500);
  };

  // Verificar estado de suscripción real del Service Worker al montar
  useEffect(() => {
    async function checkSubscription() {
      if (isPushNotificationSupported()) {
        const sub = await getExistingPushSubscription();
        setPushEnabled(!!sub);
      }
    }
    checkSubscription();
  }, []);

  const safeStorageGet = (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch {}
    return null;
  };

  const safeStorageSet = (key: string, val: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, val);
      }
    } catch {}
  };

  const fetchIntervenciones = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/intervenciones', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Error en servidor: HTTP ${res.status}`);
      }

      const json = await res.json();
      const rawList: IntervencionItem[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];

      if (rawList.length > 0) {
        setIntervenciones(rawList);

        const latest = rawList[0];
        if (latest) {
          const currentKey = `${latest.nro}_${latest.fecha}`;
          safeStorageSet('last_known_intervencion', currentKey);
        }

        if (isManual) {
          showToast('Historial de intervenciones actualizado del BCV');
        }
      }
    } catch (err: any) {
      console.error('Error al obtener intervenciones cambiarias:', err);
      if (isManual) {
        showToast('No se pudo conectar con el servicio del BCV.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntervenciones();
  }, [fetchIntervenciones]);

  // Activar Notificaciones de Primer Plano (Web Push)
  const handleTogglePush = async () => {
    if (pushEnabled) {
      setIsSubscribing(true);
      const ok = await unsubscribeFromBCVIntervencionPush();
      if (ok) {
        setPushEnabled(false);
        showToast('Notificaciones push desactivadas.');
      }
      setIsSubscribing(false);
      return;
    }

    setIsSubscribing(true);
    const result = await subscribeToBCVIntervencionPush();
    setIsSubscribing(false);

    if (result.success) {
      setPushEnabled(true);
      showToast('¡Notificaciones Push activadas! Se ha enviado una alerta de prueba a tu teléfono.');
    } else {
      showToast(result.error || 'No se pudo activar las notificaciones.');
    }
  };

  const filteredIntervenciones = intervenciones.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return item.fecha.toLowerCase().includes(term) || item.nro.toLowerCase().includes(term);
  });

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
            borderColor: colors.borderColor,
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

          {/* Notificaciones Push */}
          <div
            id="card-bcv-push-notification"
            style={{
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
            }}
            className="mt-3 p-3.5 border rounded-lg transition-all space-y-3"
          >
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: pushEnabled
                    ? (isDark ? 'rgba(44, 153, 69, 0.2)' : '#DCFCE7')
                    : (isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9'),
                  color: pushEnabled ? '#2C9945' : colors.mutedTextColor,
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs mt-0.5"
              >
                <Bell size={18} className={pushEnabled ? 'animate-bounce' : ''} />
              </div>
              <div className="flex-1 space-y-1">
                <h3
                  style={{ color: colors.textColor }}
                  className="font-bold text-sm leading-snug"
                >
                  Notificaciones Push
                </h3>
                <p
                  style={{ color: colors.secondaryTextColor }}
                  className="text-xs leading-relaxed"
                >
                  Se te avisará con una notificación al teléfono en el momento que se publique una intervención en el Banco Central de Venezuela (www.bcv.org.ve).
                </p>
              </div>
            </div>

            {/* Botones de control de notificaciones push */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
              <button
                id="btn-enable-push"
                onClick={handleTogglePush}
                disabled={isSubscribing}
                className={`text-xs font-bold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ${
                  pushEnabled
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
                    : 'bg-[#2C9945] hover:bg-[#25823a] text-white'
                }`}
              >
                <Bell size={14} />
                <span>
                  {isSubscribing
                    ? 'Procesando...'
                    : pushEnabled
                    ? 'Desactivar Notificaciones Push'
                    : 'Activar Notificaciones Push'}
                </span>
              </button>

              {pushEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-test-push-now"
                    type="button"
                    onClick={async () => {
                      setIsSubscribing(true);
                      const res = await triggerTestPushNotification(0);
                      setIsSubscribing(false);
                      if (res.success) {
                        showToast('🔔 ¡Notificación de prueba enviada a tu teléfono!');
                      } else {
                        showToast(res.error || 'Error al enviar prueba');
                      }
                    }}
                    disabled={isSubscribing}
                    className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Zap size={14} />
                    <span>Probar Notificación Ahora</span>
                  </button>
                  <div className="hidden sm:flex items-center gap-1.5 text-[#2C9945] text-xs font-bold">
                    <CheckCircle2 size={16} />
                    <span>Activas</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta de Última Intervención Oficial */}
        {latestIntervencion && (
          <div
            style={{
              backgroundColor: colors.surfaceColor,
              borderColor: colors.usdtColor,
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
                  borderColor: colors.borderColor,
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

              {/* Bs. / USD (Calculado automáticamente con paridad) */}
              <div
                style={{
                  backgroundColor: isDark ? 'rgba(44, 153, 69, 0.12)' : '#F4FBF5',
                  borderColor: isDark ? 'rgba(44, 153, 69, 0.4)' : '#86EFAC',
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
                      color: isDark ? '#4ADE80' : '#15803D',
                    }}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs"
                  >
                    CALCULADO
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xs font-bold text-[#2C9945]">Bs.</span>
                  <span className="text-[20px] sm:text-[22px] font-extrabold text-[#2C9945] font-mono tracking-tighter">
                    {latestIntervencion.tipoCambioBsUsd || '0,00'}
                  </span>
                </div>
                <p style={{ color: isDark ? '#94A3B8' : '#4B5563' }} className="text-[9.5px] mt-1">
                  Tasa del euro dividida entre la paridad internacional ({latestIntervencion.paridadEurUsd || '1,1633'} EUR/USD)
                </p>
              </div>
            </div>

            {/* Detalle del cálculo automático */}
            <div
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                borderColor: colors.borderColor,
                color: colors.secondaryTextColor,
              }}
              className="mt-2.5 p-2 border text-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xs"
            >
              <span className="flex items-center gap-1 font-medium tracking-tight">
                <ShieldCheck size={13} className="text-[#2C9945] shrink-0" />
                Fórmula: {latestIntervencion.tipoCambioBsEur} Bs./EUR ÷ {latestIntervencion.paridadEurUsd || '1,1633'} (paridad) = {latestIntervencion.tipoCambioBsUsd} Bs./USD
              </span>
              <span style={{ color: colors.mutedTextColor }} className="font-mono text-[9px] text-right tracking-tight">
                Paridad: 1 EUR = {latestIntervencion.paridadEurUsd || '1,1633'} USD
              </span>
            </div>
          </div>
        )}

        {/* Historial de Intervenciones */}
        <div
          style={{
            backgroundColor: colors.surfaceColor,
            borderColor: colors.borderColor,
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

          {/* Tabla de Historial Dinámica */}
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
                {loading && intervenciones.length === 0 ? (
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
                          {item.tipoCambioBsUsd || '0,00'}
                        </td>
                        <td className="py-2 px-0.5 text-center font-sans">
                          {isLatest ? (
                            <span
                              style={{
                                backgroundColor: isDark ? 'rgba(44, 153, 69, 0.3)' : '#DCFCE7',
                                color: isDark ? '#4ADE80' : '#15803D',
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
