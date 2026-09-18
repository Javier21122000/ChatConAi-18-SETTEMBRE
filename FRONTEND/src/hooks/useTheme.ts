import { useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('txtr-theme', next); } catch { /* Theme still works without storage. */ }
    setTheme(next);
  }
  return { theme, toggleTheme };
}
