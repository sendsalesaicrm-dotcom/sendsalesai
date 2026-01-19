import React, { createContext, useContext, useEffect, useState } from 'react';

export type PrimaryColorKey = 'blue' | 'purple' | 'petrol' | 'black';

type PrimaryColorDefinition = {
  label: string;
  primaryRgb: string; // "R G B" (ex.: "0 74 60")
  primaryDarkRgb: string;
  secondaryRgb: string;
  secondaryDarkRgb: string;
};

export const PRIMARY_COLOR_OPTIONS: Record<PrimaryColorKey, PrimaryColorDefinition> = {
  blue: {
    label: 'Azul escuro (#0A2766)',
    primaryRgb: '10 39 102',
    primaryDarkRgb: '9 33 87',
    // Complementar: ciano elétrico
    secondaryRgb: '0 229 255',
    secondaryDarkRgb: '0 195 215',
  },
  purple: {
    label: 'Roxo escuro (#730A6E)',
    primaryRgb: '115 10 110',
    primaryDarkRgb: '98 9 94',
    // Complementar: rosa choque
    secondaryRgb: '255 46 220',
    secondaryDarkRgb: '220 35 190',
  },
  petrol: {
    label: 'Azul petróleo escuro (#004A3C)',
    primaryRgb: '0 74 60',
    primaryDarkRgb: '0 63 51',
    // Complementar: verde lima
    secondaryRgb: '180 255 42',
    secondaryDarkRgb: '150 220 30',
  },
  black: {
    label: 'Preto (#121212)',
    primaryRgb: '18 18 18',
    // No tema preto, usamos um "pressed" cinza (como no relógio)
    primaryDarkRgb: '38 38 38',
    // Complementar: cinza claro para textos/bordas de destaque
    secondaryRgb: '200 200 200',
    secondaryDarkRgb: '160 160 160',
  },
};

const PRIMARY_COLOR_STORAGE_KEY = 'sendsales_primaryColor';
const DEFAULT_PRIMARY_COLOR: PrimaryColorKey = 'petrol';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  primaryColor: PrimaryColorKey;
  setPrimaryColor: (color: PrimaryColorKey) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('sendsales_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [primaryColor, setPrimaryColor] = useState<PrimaryColorKey>(() => {
    const saved = localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY) as PrimaryColorKey | null;
    return saved && saved in PRIMARY_COLOR_OPTIONS ? saved : DEFAULT_PRIMARY_COLOR;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('sendsales_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('sendsales_theme', 'light');
    }

    // Cleanup: Remove dark class when component unmounts (e.g. logout to login page)
    return () => {
      root.classList.remove('dark');
    };
  }, [isDarkMode]);

  useEffect(() => {
    const root = window.document.documentElement;
    const def = PRIMARY_COLOR_OPTIONS[primaryColor] ?? PRIMARY_COLOR_OPTIONS[DEFAULT_PRIMARY_COLOR];
    root.style.setProperty('--ss-primary', def.primaryRgb);
    root.style.setProperty('--ss-primary-dark', def.primaryDarkRgb);
    root.style.setProperty('--ss-secondary', def.secondaryRgb);
    root.style.setProperty('--ss-secondary-dark', def.secondaryDarkRgb);
    localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, primaryColor);
  }, [primaryColor]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};