'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface ThemeStore {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyThemeToDOM(resolved: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (resolved === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme);
        applyThemeToDOM(resolved);
        set({ theme, resolvedTheme: resolved });
      },
    }),
    {
      name: 'clawroute-theme',
      partialize: (state) => ({ theme: state.theme } as Partial<ThemeStore>),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme);
          applyThemeToDOM(resolved);
          state.resolvedTheme = resolved;
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      const resolved = getSystemTheme();
      applyThemeToDOM(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  });
}
