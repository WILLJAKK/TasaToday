import React from 'react';
import { X, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'eula' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'eula',
}) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = React.useState<'eula' | 'privacy'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fade-in">
      <div 
        style={{ 
          backgroundColor: colors.surfaceColor, 
          borderColor: colors.borderColor,
          color: colors.textColor,
        }}
        className="border rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div 
          style={{ borderColor: colors.borderColor }}
          className="flex items-center justify-between p-4 border-b shrink-0"
        >
          <div className="flex items-center gap-2">
            {activeTab === 'eula' ? (
              <FileText size={18} style={{ color: colors.usdtColor }} />
            ) : (
              <ShieldCheck size={18} style={{ color: colors.usdtColor }} />
            )}
            <h3 className="font-bold text-base">
              {activeTab === 'eula' ? 'Términos de Uso (EULA)' : 'Política de Privacidad'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div 
          style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}
          className="flex p-1 m-3 rounded-lg shrink-0 gap-1"
        >
          <button
            onClick={() => setActiveTab('eula')}
            style={{
              backgroundColor: activeTab === 'eula' ? colors.surfaceColor : 'transparent',
              color: activeTab === 'eula' ? colors.textColor : colors.mutedTextColor,
            }}
            className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all shadow-2xs cursor-pointer text-center"
          >
            Términos (EULA)
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            style={{
              backgroundColor: activeTab === 'privacy' ? colors.surfaceColor : 'transparent',
              color: activeTab === 'privacy' ? colors.textColor : colors.mutedTextColor,
            }}
            className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all shadow-2xs cursor-pointer text-center"
          >
            Privacidad
          </button>
        </div>

        {/* Scrollable Legal Body */}
        <div className="p-4 overflow-y-auto text-xs space-y-4 leading-relaxed opacity-95">
          {activeTab === 'eula' ? (
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-sm mb-1" style={{ color: colors.usdtColor }}>
                  Acuerdo de Licencia de Usuario Final (EULA)
                </h4>
                <p style={{ color: colors.secondaryTextColor }}>
                  Última actualización: Septiembre 2026. Al descargar, acceder o utilizar Tasa Today, usted acepta los presentes términos.
                </p>
              </div>

              <div 
                style={{ 
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD'
                }}
                className="p-3 rounded-lg border space-y-1.5"
              >
                <h5 className="font-bold text-xs" style={{ color: isDark ? '#38BDF8' : '#0369A1' }}>
                  Condiciones de Suscripción Auto-Renovable (App Store & Google Play):
                </h5>
                <ul className="list-disc pl-4 space-y-1 text-[11px]" style={{ color: colors.textColor }}>
                  <li><strong>Nombre del servicio:</strong> Tasa Today Premium</li>
                  <li><strong>Duración:</strong> 1 Mes (período mensual auto-renovable)</li>
                  <li><strong>Precio:</strong> $0.99 USD / mes (o equivalente en moneda local)</li>
                  <li><strong>Facturación:</strong> El pago se cargará a su cuenta de Apple ID o Google Play al confirmar la compra.</li>
                  <li><strong>Renovación automática:</strong> La suscripción se renueva automáticamente a menos que se cancele al menos 24 horas antes de que finalice el período actual.</li>
                  <li><strong>Cargo por renovación:</strong> Se cobrará a la cuenta la renovación dentro de las 24 horas anteriores al final del período en curso por el monto de $0.99 USD.</li>
                  <li><strong>Administración y Cancelación:</strong> El usuario puede administrar sus suscripciones y desactivar la renovación automática ingresando a la Configuración de su cuenta en App Store o Google Play Store tras la adquisición.</li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold mb-1">1. Naturaleza Informativa</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  Tasa Today es una herramienta de consulta y cálculo basada en cotizaciones públicas del Banco Central de Venezuela (BCV), mercados de activos digitales (USDT, Bitcoin) y metales preciosos (Kitco). Los datos son referenciales y no constituyen asesoría de inversión financiera ni intermediación cambiaria bancaria.
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-1">2. Bloqueo de Anuncios Temporal</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  Los usuarios pueden desbloquear 12 horas libres de anuncios visualizando voluntariamente un anuncio bonificado nativo (Rewarded Ad). Al vencer el plazo, la experiencia regular se restablece automáticamente.
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-1">3. Jurisdicción y Cumplimiento</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  Este acuerdo se rige bajo los estándares internacionales de distribución digital para aplicaciones móviles de Apple Inc. y Google LLC.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-sm mb-1" style={{ color: colors.usdtColor }}>
                  Política de Privacidad
                </h4>
                <p style={{ color: colors.secondaryTextColor }}>
                  En Tasa Today nos comprometemos con la total transparencia y protección de la privacidad de los usuarios.
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-1">1. Cero Recopilación de Datos Financieros</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  La aplicación no solicita ni almacena números de tarjetas de crédito, cuentas bancarias ni credenciales personales. Todas las transacciones de suscripción son procesadas de manera segura y encriptada por Apple Inc. (In-App Purchase) o Google LLC (Google Play Billing).
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-1">2. Almacenamiento Local en Dispositivo</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  Las preferencias de la aplicación (modo oscuro/claro, estado de suscripción Premium local y marca de tiempo de bloqueo de anuncios por 12h) se almacenan exclusivamente en la memoria local del navegador o dispositivo (<code className="font-mono">localStorage</code>). No se transfieren a servidores externos.
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-1">3. Publicidad y Anuncios Bonificados</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  Las redes publicitarias asociadas (Google AdMob / Redes de Anuncios) pueden utilizar identificadores anónimos para la entrega de anuncios pertinentes y la validación técnica de anuncios bonificados completados. Los usuarios Premium quedan 100% exentos de rastreo publicitario dentro de la app.
                </p>
              </div>

              <div>
                <h5 className="font-bold mb-1">4. Contacto y Derechos</h5>
                <p style={{ color: colors.secondaryTextColor }}>
                  Para cualquier consulta sobre esta política o ejercicio de derechos ARCO/GDPR, el usuario puede contactar directamente a través del repositorio oficial de la aplicación.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          style={{ borderColor: colors.borderColor, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }}
          className="p-3 border-t flex items-center justify-between shrink-0"
        >
          <span style={{ color: colors.mutedTextColor }} className="text-[11px]">
            Cumplimiento App Store & Google Play
          </span>
          <button
            onClick={onClose}
            style={{ backgroundColor: colors.usdtColor }}
            className="px-4 py-1.5 text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
