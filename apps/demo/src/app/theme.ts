export type ThemeChoice = 'light' | 'dark' | 'system';

const storageKey = 'uhr-theme';

export function getTheme(): ThemeChoice {
  const stored = localStorage.getItem(storageKey);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function setTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(storageKey, theme);
}
