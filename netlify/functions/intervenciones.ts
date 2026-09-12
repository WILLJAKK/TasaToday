// netlify/functions/intervenciones.ts
// Backend Scraper Serverless para Intervenciones Cambiarias del BCV
// Banco Central de Venezuela (bcv.org.ve/politica-cambiaria/intervencion-cambiaria)

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface IntervencionItem {
  fecha: string;
  nro: string;
  tipoCambioBsEur: string;
  tipoCambioBsUsd: string;
  paridadEurUsd: string;
  isRecent?: boolean;
}

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  path: string;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Caché en memoria de 5 minutos (300.000 ms) para no saturar al servidor del BCV
let cachedIntervenciones: IntervencionItem[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Obtiene la paridad internacional EUR/USD (oficial o referencial)
async function fetchParityEurUsd(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const [dolarRes, euroRes] = await Promise.allSettled([
      fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: controller.signal, cache: 'no-store' }),
      fetch('https://ve.dolarapi.com/v1/euros/oficial', { signal: controller.signal, cache: 'no-store' }),
    ]);

    clearTimeout(timeoutId);

    if (dolarRes.status === 'fulfilled' && euroRes.status === 'fulfilled') {
      if (dolarRes.value.ok && euroRes.value.ok) {
        const dolarData = await dolarRes.value.json();
        const euroData = await euroRes.value.json();
        const usd = typeof dolarData?.promedio === 'number' ? dolarData.promedio : parseFloat(dolarData?.promedio);
        const eur = typeof euroData?.promedio === 'number' ? euroData.promedio : parseFloat(euroData?.promedio);
        if (usd > 0 && eur > 0) {
          return eur / usd;
        }
      }
    }
  } catch {}
  return 1.1633;
}

// Scraper principal del portal oficial del Banco Central de Venezuela
async function scrapeBcvIntervenciones(): Promise<IntervencionItem[]> {
  const parity = await fetchParityEurUsd();
  const paridadStr = parity.toFixed(4).replace('.', ',');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  const response = await fetch('https://www.bcv.org.ve/politica-cambiaria/intervencion-cambiaria', {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-VE,es-ES,es;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Error en servidor BCV: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Localizar la tabla views-table que contiene el histórico oficial de intervenciones
  const tableMatch = html.match(/<table[^>]*class="[^"]*views-table[^"]*"[\s\S]*?<\/table>/i);
  const tableHtml = tableMatch ? tableMatch[0] : html;

  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const items: IntervencionItem[] = [];

  for (const row of rows) {
    const cols = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((col) =>
      col[1].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim()
    );

    if (cols.length >= 3) {
      const fecha = cols[0];
      const nro = cols[1];
      const tipoCambioBsEur = cols[2];

      // Validar formato de fecha (DD-MM-YYYY)
      if (/^\d{2}-\d{2}-\d{4}$/.test(fecha) && nro && tipoCambioBsEur) {
        const eurNum = parseFloat(tipoCambioBsEur.replace(/\./g, '').replace(',', '.'));
        const usdNum = !isNaN(eurNum) && parity > 0 ? eurNum / parity : 0;
        const tipoCambioBsUsd = usdNum > 0 ? usdNum.toFixed(2).replace('.', ',') : '0,00';

        items.push({
          fecha,
          nro,
          tipoCambioBsEur,
          tipoCambioBsUsd,
          paridadEurUsd: paridadStr,
          isRecent: items.length === 0,
        });
      }
    }
  }

  if (items.length === 0) {
    throw new Error('No se pudieron extraer filas válidas de la tabla del BCV');
  }

  return items;
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  // Manejo de peticiones OPTIONS para pre-flight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  const now = Date.now();

  // Responder desde la caché en memoria si tiene menos de 5 minutos
  if (cachedIntervenciones && now - lastCacheTime < CACHE_TTL_MS) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
      body: JSON.stringify(cachedIntervenciones),
    };
  }

  try {
    const data = await scrapeBcvIntervenciones();
    cachedIntervenciones = data;
    lastCacheTime = now;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    // Si falla el scraping pero tenemos caché anterior, entregarla con código 200
    if (cachedIntervenciones && cachedIntervenciones.length > 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        },
        body: JSON.stringify(cachedIntervenciones),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Error al obtener las intervenciones del BCV',
        message: error?.message || 'Fallo de conexión',
      }),
    };
  }
};
