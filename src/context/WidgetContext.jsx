import React, { createContext, useContext, useState, useEffect } from 'react';

const WidgetContext = createContext(null);

const THEMES = {
  sky:     { primary: '#87CEEB', accent: '#0ea5e9' },
  slate:   { primary: '#94a3b8', accent: '#475569' },
  violet:  { primary: '#a78bfa', accent: '#7c3aed' },
  rose:    { primary: '#fb7185', accent: '#e11d48' },
  emerald: { primary: '#6ee7b7', accent: '#059669' },
  amber:   { primary: '#fcd34d', accent: '#d97706' },
};

export function WidgetProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('lyfflow_theme_id') || 'sky';
  });
  const [widgetColor, setWidgetColor] = useState('#0ea5e9');
  const [widgetGreeting, setWidgetGreeting] = useState('Hi there \u{1F44B} How can we help you?');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');

  // Apply theme to document globally when it changes
  useEffect(() => {
    const t = THEMES[themeId];
    if (t) {
      document.documentElement.style.setProperty('--bg-primary', t.primary);
      document.documentElement.style.setProperty('--accent', t.accent); // Just in case it's used elsewhere
      localStorage.setItem('lyfflow_theme_id', themeId);
    }
  }, [themeId]);

  return (
    <WidgetContext.Provider value={{
      themeId, setThemeId,
      widgetColor, setWidgetColor,
      widgetGreeting, setWidgetGreeting,
      widgetPosition, setWidgetPosition,
    }}>
      {children}
    </WidgetContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWidget() {
  return useContext(WidgetContext);
}

