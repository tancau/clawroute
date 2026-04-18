'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/use-theme-store';

const themes: Array<{ value: 'dark' | 'light' | 'system'; icon: typeof Moon; label: string }> = [
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const currentIndex = themes.findIndex((t) => t.value === theme);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + 1) % themes.length;

  const currentTheme = themes[safeIndex]!;
  const nextTheme = themes[nextIndex]!;

  const NextIcon = nextTheme.icon;

  return (
    <button
      onClick={() => setTheme(nextTheme.value)}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-7 hover:text-neutral-10 hover:bg-surface-overlay transition-colors duration-fast"
      aria-label={`Switch theme to ${nextTheme.label}`}
      title={`Theme: ${currentTheme.label}`}
    >
      <NextIcon className="h-4 w-4" />
    </button>
  );
}
