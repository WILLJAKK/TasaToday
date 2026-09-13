import { Capacitor } from '@capacitor/core';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
    ? 'https://tasatoday.netlify.app'
    : '');

export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
