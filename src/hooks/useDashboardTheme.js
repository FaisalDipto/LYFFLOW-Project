import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'lyfflow-dashboard-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return 'light';
};

export function useDashboardTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.dashboardTheme = theme;
    document.documentElement.style.colorScheme = theme;

    return () => {
      delete document.documentElement.dataset.dashboardTheme;
      document.documentElement.style.colorScheme = '';
    };
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark'),
  };
}
