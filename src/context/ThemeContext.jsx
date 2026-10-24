import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('reducedMotion') === 'true');

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },[theme]);

  useEffect(()=>{
    if(reducedMotion) document.documentElement.style.setProperty('--motion','none');
    else document.documentElement.style.removeProperty('--motion');
    document.documentElement.toggleAttribute('data-reduced-motion', reducedMotion);
    localStorage.setItem('reducedMotion', reducedMotion);
  },[reducedMotion]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, reducedMotion, setReducedMotion }}>
      {children}
    </ThemeContext.Provider>
  );
}
