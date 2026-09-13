import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AsyncStorage } from '../utils/asyncStorage';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type ThemeMode = ThemePreference;
export type ActiveTheme = 'light' | 'dark';

export interface ThemeColors {
  mode: ActiveTheme;
  backgroundColor: string;       // Fondo principal de la app
  surfaceColor: string;          // Fondo de tarjetas y paneles
  cardBg: string;                // Fondo de tarjetas / cuadros interactivos
  headerBackground: string;      // Fondo del header
  headerGradient: string;        // Degradado del header para soporte de barra superior y modo oscuro
  headerBorder: string;          // Borde del header
  tabBarBackground: string;      // Fondo del tab bar inferior
  tabBarActiveBg: string;        // Fondo de la pestaña activa
  tabBarBorder: string;          // Borde del tab bar inferior
  tabBarInactive: string;        // Color texto/icono inactivo
  textColor: string;             // Texto principal de la app
  secondaryTextColor: string;    // Texto secundario / subtítulos
  mutedTextColor: string;        // Texto atenuado / timestamps
  borderColor: string;           // Bordes de contenedores
  inputBackground: string;       // Fondo de inputs / calculadora
  inputBorder: string;           // Borde de inputs
  cardHover: string;             // Hover de tarjetas
  
  // COLORES ESTRICTAMENTE PRESERVADOS (TARJETAS OFICIALES):
  // No deben cambiar con el modo oscuro bajo ninguna circunstancia
  usdtColor: string;             // Verde USDT (#2C9945)
  bcvColor: string;              // Rojo Vinotinto BCV (#8B1538)
  euroColor: string;             // Azul Euro (#1A5276)
  btcColor: string;              // Naranja BTC (#F7931A)
  oroColor: string;              // Dorado Onza de Oro (#D4AF37)
  venezuelaBarColor: string;     // Barra superior (#3F9047)
}

// 4. PALETA DE COLORES DINÁMICA
export const themeColors: Record<ActiveTheme, ThemeColors> = {
  light: {
    mode: 'light',
    backgroundColor: '#EAEAEA',
    surfaceColor: '#FFFFFF',
    cardBg: '#FFFFFF',
    headerBackground: '#FFFFFF',
    headerGradient: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
    headerBorder: '#DDDDDD',
    tabBarBackground: '#FFFFFF',
    tabBarActiveBg: '#2C9945',
    tabBarBorder: '#CCCCCC',
    tabBarInactive: '#666666',
    textColor: '#1E293B',
    secondaryTextColor: '#555555',
    mutedTextColor: '#888888',
    borderColor: '#E2E8F0',
    inputBackground: '#F8FAFC',
    inputBorder: '#CBD5E1',
    cardHover: '#F8FAFC',
    
    // Tarjetas intactas
    usdtColor: '#2C9945',
    bcvColor: '#8B1538',
    euroColor: '#1A5276',
    btcColor: '#F7931A',
    oroColor: '#D4AF37',
    venezuelaBarColor: '#3F9047',
  },
  dark: {
    mode: 'dark',
    backgroundColor: '#0F172A',     // Slate oscuro profundo
    surfaceColor: '#1E293B',        // Superficie de tarjetas oscura
    cardBg: '#1E293B',
    headerBackground: '#18202E',    // Header oscuro
    headerGradient: 'linear-gradient(180deg, #18202E 0%, #2E3D52 100%)', // Degradado gris a gris más claro
    headerBorder: '#334155',        // Borde sutil oscuro
    tabBarBackground: '#1E293B',    // Tab bar oscuro
    tabBarActiveBg: '#2C9945',      // Verde activo idéntico
    tabBarBorder: '#334155',        // Borde tab bar
    tabBarInactive: '#94A3B8',      // Gris claro para inactivos
    textColor: '#F8FAFC',           // Blanco roto de alta legibilidad
    secondaryTextColor: '#CBD5E1',  // Gris neutro claro
    mutedTextColor: '#94A3B8',      // Gris medio
    borderColor: '#334155',         // Separadores oscuros
    inputBackground: '#0F172A',     // Inputs oscuros
    inputBorder: '#475569',
    cardHover: '#243247',
    
    // EXACTAMENTE LOS MISMOS COLORES DE MARCA:
    usdtColor: '#2C9945',
    bcvColor: '#8B1538',
    euroColor: '#1A5276',
    btcColor: '#F7931A',
    oroColor: '#D4AF37',
    venezuelaBarColor: '#3F9047',
  },
};

const THEME_STORAGE_KEY = '@tasa_today_theme_preference';

/**
 * 2. LÓGICA DEL MODO AUTOMÁTICO (ZONA HORARIA LOCAL)
 * Regla horaria:
 * - 18:00 (6:00 PM) a 05:59 (5:59 AM) => forzar 'dark'
 * - 06:00 (6:00 AM) a 17:59 (5:59 PM) => forzar 'light'
 */
export const calculateAutoTheme = (): ActiveTheme => {
  const currentHour = new Date().getHours();
  if (currentHour >= 18 || currentHour < 6) {
    return 'dark';
  }
  return 'light';
};

interface ThemeContextType {
  themePreference: ThemePreference;
  themeMode: ThemePreference;
  activeTheme: ActiveTheme;
  colors: ThemeColors;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  setThemeMode: (pref: ThemePreference) => Promise<void>;
  cycleTheme: () => Promise<ThemePreference>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto');
  const [autoTheme, setAutoTheme] = useState<ActiveTheme>(() => calculateAutoTheme());

  // 1. Cargar preferencia guardada en AsyncStorage al iniciar
  useEffect(() => {
    let isMounted = true;
    const loadStoredTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && isMounted && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
          setThemePreferenceState(stored as ThemePreference);
        }
      } catch (e) {
        console.warn('Error al cargar preferencia de tema:', e);
      }
    };
    loadStoredTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Monitoreo en vivo de la hora para el modo 'auto'
  useEffect(() => {
    const updateAuto = () => {
      const calculated = calculateAutoTheme();
      setAutoTheme(calculated);
    };

    updateAuto();
    // Revisar cada 30 segundos si ha cambiado la hora
    const interval = setInterval(updateAuto, 30000);
    return () => clearInterval(interval);
  }, []);

  // Tema efectivo activo ('light' o 'dark')
  const activeTheme: ActiveTheme = useMemo(() => {
    if (themePreference === 'auto') {
      return autoTheme;
    }
    return themePreference;
  }, [themePreference, autoTheme]);

  const isDark = activeTheme === 'dark';
  const colors = themeColors[activeTheme];

  // Sincronizar clase 'dark', meta theme-color y barra de estado de iOS/Android
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.style.backgroundColor = '#18202E';
        if (document.body) document.body.style.backgroundColor = '#18202E';
      } else {
        root.classList.remove('dark');
        root.style.backgroundColor = '#F8FAFC';
        if (document.body) document.body.style.backgroundColor = '#F8FAFC';
      }

      // Sincronizar meta theme-color para navegadores móviles (Safari iOS y Chrome Android)
      const themeColorValue = isDark ? '#18202E' : '#F8FAFC';
      const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
      if (metaThemes.length > 0) {
        metaThemes.forEach(meta => meta.setAttribute('content', themeColorValue));
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', themeColorValue);
        document.head.appendChild(meta);
      }

      // Sincronizar barra de estado para PWA / Web Clip en iOS
      let metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!metaApple) {
        metaApple = document.createElement('meta');
        metaApple.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(metaApple);
      }
      metaApple.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
  }, [isDark]);

  // Guardar preferencia del usuario en AsyncStorage
  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (e) {
      console.warn('Error al guardar preferencia de tema:', e);
    }
  }, []);

  // 3. Ciclar entre los tres modos al presionar el botón: Noche -> Día -> Automático -> Noche
  const cycleTheme = useCallback(async (): Promise<ThemePreference> => {
    let nextTheme: ThemePreference = 'dark';
    if (themePreference === 'dark') {
      nextTheme = 'light';
    } else if (themePreference === 'light') {
      nextTheme = 'auto';
    } else {
      nextTheme = 'dark';
    }
    await setThemePreference(nextTheme);
    return nextTheme;
  }, [themePreference, setThemePreference]);

  const value = useMemo(
    () => ({
      themePreference,
      themeMode: themePreference,
      activeTheme,
      colors,
      isDark,
      setThemePreference,
      setThemeMode: setThemePreference,
      cycleTheme,
    }),
    [themePreference, activeTheme, colors, isDark, setThemePreference, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
};
