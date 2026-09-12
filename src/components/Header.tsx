import React, { useState } from 'react';
import { Lock, Unlock, Smartphone, Monitor, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean | ((prev: boolean) => boolean)) => void;
  onShare?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isPhoneFrame, setIsPhoneFrame, onShare }) => {
  const { colors, isDark } = useTheme();
  const [locked, setLocked] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const todayFormatted = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const toggleLock = () => {
    setLocked(prev => !prev);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  return (
    <header 
      style={{ 
        backgroundColor: colors.headerBackground, 
        borderColor: colors.headerBorder 
      }}
      className="relative h-[56px] px-3.5 flex items-center justify-between border-b select-none shrink-0 z-20 transition-colors duration-200"
    >
      {/* Left controls: Theme toggle & Desktop frame toggle */}
      <div className="flex items-center gap-1.5 min-w-[70px]">
        <ThemeToggle />

        {/* Toggle desktop frame on wide screens */}
        <button
          id="btn-toggle-frame"
          onClick={() => setIsPhoneFrame(prev => !prev)}
          style={{
            backgroundColor: isDark ? '#334155' : '#F1F5F9',
            borderColor: colors.borderColor,
            color: colors.secondaryTextColor,
          }}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border transition-colors hover:opacity-80"
          title="Alternar tamaño de pantalla"
        >
          {isPhoneFrame ? <Monitor size={15} /> : <Smartphone size={15} />}
        </button>
      </div>

      {/* Center: App Name & Date */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center leading-none">
          <span 
            style={{ color: colors.usdtColor }}
            className="text-[23px] font-bold italic leading-none select-none"
          >
            $
          </span>
          <span 
            style={{ color: colors.usdtColor }}
            className="text-[21px] font-bold italic tracking-[-1px] leading-none"
          >
            Tasa
          </span>
          <span 
            style={{ color: colors.textColor }}
            className="text-[21px] font-bold italic tracking-[-1px] leading-none transition-colors duration-200"
          >
            Today
          </span>
        </div>
        <span 
          style={{ color: colors.mutedTextColor }}
          className="text-[12px] font-medium tracking-wide mt-0.5 font-mono transition-colors duration-200"
        >
          {todayFormatted}
        </span>
      </div>

      {/* Right controls: Share & Lock / Security Icon */}
      <div className="flex items-center justify-end gap-1.5 min-w-[70px]">
        {onShare && (
          <button
            id="btn-header-share"
            onClick={onShare}
            style={{
              backgroundColor: isDark ? '#334155' : '#F1F5F9',
              borderColor: colors.borderColor,
              color: colors.textColor,
            }}
            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:opacity-80 active:scale-95 shadow-2xs"
            title="Compartir cotización con imagen y texto"
          >
            <Share2 size={15} />
          </button>
        )}

        <button
          id="btn-toggle-lock"
          onClick={toggleLock}
          style={{
            backgroundColor: isDark ? '#334155' : '#F1F5F9',
            borderColor: colors.borderColor,
          }}
          className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer hover:opacity-80"
          title={locked ? 'Protección activa' : 'Desbloqueado'}
        >
          {locked ? (
            <Lock size={15} style={{ color: colors.textColor }} />
          ) : (
            <Unlock size={15} style={{ color: colors.mutedTextColor }} />
          )}
        </button>
      </div>

      {showToast && (
        <div className="absolute top-[60px] right-4 bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg animate-fade-in border border-gray-700 z-50 font-sans">
          {locked ? '🔒 Modo protegido activo' : '🔓 Modo edición libre'}
        </div>
      )}
    </header>
  );
};

