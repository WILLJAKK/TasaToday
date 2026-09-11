import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { themePreference, activeTheme, cycleTheme, colors } = useTheme();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleClick = async () => {
    await cycleTheme();
    // Determinamos el siguiente estado para dar feedback inmediato
    let nextMsg = '';
    if (themePreference === 'light') {
      nextMsg = 'Modo Oscuro';
    } else if (themePreference === 'dark') {
      const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
      nextMsg = `Modo Auto (${isNight ? 'Noche: Oscuro' : 'Día: Claro'})`;
    } else {
      nextMsg = 'Modo Claro';
    }
    setTooltip(nextMsg);
    setTimeout(() => {
      setTooltip(null);
    }, 2000);
  };

  const renderIcon = () => {
    switch (themePreference) {
      case 'light':
        return (
          <motion.div
            key="light"
            initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center text-amber-500"
          >
            <Sun size={17} strokeWidth={2.2} />
          </motion.div>
        );
      case 'dark':
        return (
          <motion.div
            key="dark"
            initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center text-indigo-300"
          >
            <Moon size={17} strokeWidth={2.2} />
          </motion.div>
        );
      case 'auto':
      default:
        return (
          <motion.div
            key="auto"
            initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center relative text-emerald-500"
          >
            <Clock size={17} strokeWidth={2.2} />
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-slate-800 ${
                activeTheme === 'dark' ? 'bg-indigo-400' : 'bg-amber-400'
              }`}
            />
          </motion.div>
        );
    }
  };

  const getLabelText = () => {
    if (themePreference === 'light') return 'Claro';
    if (themePreference === 'dark') return 'Oscuro';
    return 'Automático';
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        id="btn-theme-toggle"
        onClick={handleClick}
        style={{
          backgroundColor: colors.mode === 'dark' ? '#334155' : '#F1F5F9',
          borderColor: colors.borderColor,
        }}
        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer select-none active:scale-95 ${className}`}
        title={`Tema: ${getLabelText()} (Presiona para cambiar: Claro → Oscuro → Auto)`}
        aria-label="Cambiar tema de la aplicación"
      >
        <AnimatePresence mode="wait" initial={false}>
          {renderIcon()}
        </AnimatePresence>
      </button>

      {showLabel && (
        <span 
          style={{ color: colors.secondaryTextColor }}
          className="ml-2 text-xs font-medium"
        >
          {getLabelText()}
        </span>
      )}

      {/* Tooltip flotante con transición */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-medium shadow-lg z-50 pointer-events-none border border-slate-700 font-sans"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
