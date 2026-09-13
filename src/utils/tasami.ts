// Utilidades centralizadas para TasaMi (tasa personalizada en Bs./$ por dispositivo)

export const TASAMI_STORAGE_KEY = 'tasatoday_tasami_rate';
export const DEFAULT_TASAMI_RATE = 950.0;

export const getStoredTasamiRate = (): number => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(TASAMI_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[TasaMi] Error al leer tasa almacenada:', e);
  }
  return DEFAULT_TASAMI_RATE;
};

export const saveTasamiRate = (rate: number): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TASAMI_STORAGE_KEY, rate.toString());
      window.dispatchEvent(new CustomEvent('tasatoday_tasami_changed', { detail: { rate } }));
    }
  } catch (e) {
    console.warn('[TasaMi] Error al guardar tasa:', e);
  }
};

export const formatTasamiRate = (rate: number): string => {
  return rate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
