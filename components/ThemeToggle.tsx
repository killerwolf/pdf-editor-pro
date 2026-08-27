import React from 'react';
import { useTheme, type ThemePreference } from '../hooks/useTheme';
import { MonitorIcon, MoonIcon, SunIcon } from './icons';

const LABELS: Record<ThemePreference, string> = {
  system: 'Theme: follow system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

const ICONS: Record<ThemePreference, React.FC<{ className?: string }>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

/**
 * Cycles system → light → dark. A three-state control rather than a binary
 * switch so "follow my OS" stays reachable once someone has picked a side.
 */
export const ThemeToggle: React.FC = () => {
  const { preference, cycle } = useTheme();
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABELS[preference]}
      aria-label={LABELS[preference]}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};
