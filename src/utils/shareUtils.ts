/**
 * Utilidades para formateo y compartir tasas (Web y React Native)
 */

export interface PaymentDetailsPayload {
  method: 'none' | 'pago_movil' | 'zelle' | 'usdt';
  pagoMovil?: { banco: string; cedula: string; telefono: string };
  zelle?: { titular: string; correo: string };
  usdt?: { trc20: string; binanceId: string };
}

export interface ShareMessageParams {
  currencyLabel: string;
  price: string;
  date?: Date;
  paymentDetails?: PaymentDetailsPayload;
}

/**
 * Formatea la sección de datos de pago para el mensaje dinámico
 */
export function formatPaymentDetailsSection(payment?: PaymentDetailsPayload): string {
  if (!payment || payment.method === 'none') return '';

  if (payment.method === 'pago_movil' && payment.pagoMovil) {
    const { banco, cedula, telefono } = payment.pagoMovil;
    const lines: string[] = [];
    if (banco.trim()) lines.push(`🏦 Banco: ${banco.trim()}`);
    if (cedula.trim()) lines.push(`🪪 Cédula/RIF: ${cedula.trim()}`);
    if (telefono.trim()) lines.push(`📱 Teléfono: ${telefono.trim()}`);
    if (lines.length === 0) return '';
    return `\n📌 Datos para Pago Móvil:\n${lines.join('\n')}\n`;
  }

  if (payment.method === 'zelle' && payment.zelle) {
    const { titular, correo } = payment.zelle;
    const lines: string[] = [];
    if (titular.trim()) lines.push(`👤 Titular: ${titular.trim()}`);
    if (correo.trim()) lines.push(`💵 Zelle (Correo/Tlf): ${correo.trim()}`);
    if (lines.length === 0) return '';
    return `\n📌 Datos para Zelle:\n${lines.join('\n')}\n`;
  }

  if (payment.method === 'usdt' && payment.usdt) {
    const { trc20, binanceId } = payment.usdt;
    const lines: string[] = [];
    if (trc20.trim()) lines.push(`🔗 Red TRC20: ${trc20.trim()}`);
    if (binanceId.trim()) lines.push(`🆔 Binance Pay / ID: ${binanceId.trim()}`);
    if (lines.length === 0) return '';
    return `\n📌 Datos para USDT:\n${lines.join('\n')}\n`;
  }

  return '';
}

/**
 * Formato ESTRICTO requerido:
 * Tasa [Moneda Activa]: 1$ = Bs. [Valor Actual]
 * 
 * [Datos de Pago Opcionales]
 * 
 * Fecha valor: [Día de la semana], [Fecha Actual en formato DD/MM/YY]
 * 
 * ¡Descarga la app! 📲
 * [Enlace de TasaDolar]
 */
export function buildDynamicShareText({
  currencyLabel,
  price,
  date = new Date(),
  paymentDetails,
}: ShareMessageParams): string {
  // Día de la semana en español capitalizado (ej: "Miércoles", "Jueves")
  const rawDay = date.toLocaleDateString('es-VE', { weekday: 'long' });
  const capitalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

  // Fecha en formato estricto DD/MM/YY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}/${month}/${year}`;

  const isBtc = currencyLabel.toUpperCase().includes('BTC') || currencyLabel.toUpperCase().includes('BITCOIN');
  const isOro = currencyLabel.toUpperCase().includes('ORO') || currencyLabel.toUpperCase().includes('GOLD');
  const rateFormula = isBtc 
    ? `1 BTC = $ ${price}` 
    : isOro 
      ? `1 Onza = $ ${price}` 
      : `1$ = Bs. ${price}`;

  const paymentSection = formatPaymentDetailsSection(paymentDetails);

  return `Tasa ${currencyLabel}: ${rateFormula}
${paymentSection}
Fecha valor: ${capitalizedDay}, ${formattedDate}`.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Construye el texto consolidado de todas las tasas si se desea compartir la pizarra completa
 */
export function buildFullBoardShareText(
  rates: {
    usdt?: string | null;
    bcv?: string | null;
    euro?: string | null;
    btc?: string | null;
    oro?: string | null;
  },
  date = new Date(),
  paymentDetails?: PaymentDetailsPayload
): string {
  const rawDay = date.toLocaleDateString('es-VE', { weekday: 'long' });
  const capitalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}/${month}/${year}`;

  const paymentSection = formatPaymentDetailsSection(paymentDetails);

  return `💵 Tasa Today Venezuela
Tasa USDT: 1$ = Bs. ${rates.usdt || 'N/D'}
Tasa BCV: 1$ = Bs. ${rates.bcv || 'N/D'}
Tasa EURO: 1€ = Bs. ${rates.euro || 'N/D'}
Tasa BTC: 1 BTC = $ ${rates.btc || 'N/D'}
Tasa ORO: 1 Oz = $ ${rates.oro || 'N/D'}
${paymentSection}
Fecha valor: ${capitalizedDay}, ${formattedDate}`.replace(/\n{3,}/g, '\n\n').trim();
}
