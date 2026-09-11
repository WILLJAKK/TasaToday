export type TabType = 'cotizaciones' | 'calculadora' | 'intervencion' | 'ajustes';

export interface IntervencionItem {
  fecha: string;
  nro: string;
  tipoCambioBsEur: string;
  tipoCambioBsUsd?: string;
  paridadEurUsd?: string;
  isRecent?: boolean;
}

export type RateStatus = 'ok' | 'missing' | 'loading';

export interface RateItem {
  price: string | null;
  numPrice: number | null;
  change?: string | null;
  percent?: string | null;
  isUp?: boolean;
  bid?: string | null;
  ask?: string | null;
  source?: string | null;
  status: RateStatus;
  error?: 'FALTA DE DATOS' | string | null;
}

export interface ExchangeRatesData {
  bcv: RateItem | null;
  usdt: RateItem | null;
  euro: RateItem | null;
  btc: RateItem | null;
  oro: RateItem | null;
  lastUpdated: string;
}

export type SelectedCurrency = 'usdt' | 'bcv' | 'euro' | 'btc' | 'oro';
export type GoldUnit = 'g' | 'oz' | 'kg';
export const GRAMS_PER_TROY_OZ = 31.1034768; // 31.1034768 gramos por Onza Troy (Estándar Internacional LBMA)
export const TROY_OZ_PER_KG = 1000 / 31.1034768; // 32.15074657461495 Troy Ounces por Kilogramo

export interface ScanResult {
  detectedPrice: number;
  rawText: string;
  confidence: number;
  timestamp: string;
}
