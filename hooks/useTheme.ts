import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'sqribpdf-theme';

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const readStoredPreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    // Private browsing and locked-down profiles can throw on access.
    return 'system';
  }
};

/**
 * Applies the preference by stamping `data-theme` on the root element.
 *
 * "system" deliberately removes the attribute rather than resolving to a
 * concrete value, so the stylesheet's `prefers-color-scheme` query stays in
 * charge and the page follows the OS if it changes mid-session.
 */
const applyPreference = (preference: ThemePreference) => {
  const root = document.documentElement;
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }
};

export const useTheme = () => {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);

  useEffect(() => {
    applyPreference(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Persisting is a convenience; the session still honours the choice.
    }
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference(current =>
      current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'
    );
  }, []);

  return { preference, setPreference, cycle };
};
