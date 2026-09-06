import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'lyfflow-site-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function useSiteTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return {
    theme,
    toggleTheme: () => {
      setTheme((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
        return next;
      });
    },
  };
}
