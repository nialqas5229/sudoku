import { FontSize, ThemeMode } from '../core/types';

let mediaQuery: MediaQueryList | null = null;
let currentThemeSetting: ThemeMode = 'system';

function resolveEffectiveTheme(mode: ThemeMode): string {
  if (mode !== 'system') return mode;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function applyTheme(mode: ThemeMode): void {
  currentThemeSetting = mode;
  const effective = resolveEffectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', effective);

  if (typeof window !== 'undefined' && window.matchMedia && !mediaQuery) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (currentThemeSetting === 'system') {
        document.documentElement.setAttribute('data-theme', resolveEffectiveTheme('system'));
      }
    });
  }
}

export function applyFontSize(size: FontSize): void {
  document.documentElement.setAttribute('data-font-size', size);
}
