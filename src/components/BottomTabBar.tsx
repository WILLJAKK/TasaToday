import React from 'react';
import { TabType } from '../types';
import { TrendingUp, Calculator, Landmark, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface BottomTabBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, setActiveTab }) => {
  const { colors, isDark } = useTheme();

  const tabs: { id: TabType; label: string; icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> }[] = [
    { id: 'cotizaciones', label: 'COTIZACIONES', icon: TrendingUp },
    { id: 'calculadora', label: 'CALCULADORA', icon: Calculator },
    { id: 'intervencion', label: 'INTERVENCIÓN BANCARIA', icon: Landmark },
    { id: 'ajustes', label: 'AJUSTES', icon: Settings },
  ];

  return (
    <nav 
      id="bottom-tab-bar"
      style={{ 
        backgroundColor: colors.tabBarBackground, 
        borderColor: colors.tabBarBorder 
      }}
      className="h-[62px] border-t flex items-stretch select-none shrink-0 z-20 transition-colors duration-200"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            id={`tab-btn-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              backgroundColor: isActive ? colors.tabBarActiveBg : colors.tabBarBackground,
            }}
            className="flex-1 flex flex-col items-center justify-center px-0.5 transition-colors cursor-pointer hover:opacity-90"
          >
            <IconComponent 
              size={17} 
              style={{
                color: isActive ? '#FFFFFF' : colors.tabBarInactive,
              }}
              className="mb-0.5 shrink-0" 
            />
            <span
              style={{
                color: isActive ? '#FFFFFF' : colors.tabBarInactive,
              }}
              className="text-[9.5px] sm:text-[11px] font-bold tracking-tight text-center leading-[11px] line-clamp-2"
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

