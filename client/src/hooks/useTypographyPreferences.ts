import { useState, useEffect } from 'react';

const TYPOGRAPHY_PREFERENCE_KEY = 'typography-preferences';

export type FontWeight = 'light' | 'normal' | 'medium' | 'semibold';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface TypographyPreference {
  fontWeight: FontWeight;
  fontSize: FontSize;
}

const fontWeightMap: Record<FontWeight, number> = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
};

const fontSizeMap: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '15px',
  xlarge: '16px',
};

const defaultPreferences: TypographyPreference = {
  fontWeight: 'normal',
  fontSize: 'medium',
};

/**
 * Hook to manage user's typography preferences (font weight and size)
 * Stored in localStorage and applied via CSS custom properties
 */
export function useTypographyPreferences() {
  const [preferences, setPreferences] = useState<TypographyPreference>(() => {
    try {
      const stored = localStorage.getItem(TYPOGRAPHY_PREFERENCE_KEY);
      if (stored) {
        return JSON.parse(stored) as TypographyPreference;
      }
    } catch (error) {
      console.error('Error reading typography preference:', error);
    }
    return defaultPreferences;
  });

  // Apply preferences to document on mount and when they change
  useEffect(() => {
    applyTypographyPreferences(preferences);
  }, [preferences]);

  const setTypographyPreference = (newPreferences: Partial<TypographyPreference>) => {
    const updated: TypographyPreference = {
      ...preferences,
      ...newPreferences,
    };
    try {
      localStorage.setItem(TYPOGRAPHY_PREFERENCE_KEY, JSON.stringify(updated));
      setPreferences(updated);
    } catch (error) {
      console.error('Error saving typography preference:', error);
    }
  };

  const resetToDefaults = () => {
    try {
      localStorage.removeItem(TYPOGRAPHY_PREFERENCE_KEY);
      setPreferences(defaultPreferences);
    } catch (error) {
      console.error('Error resetting typography preference:', error);
    }
  };

  return {
    preferences,
    setFontWeight: (weight: FontWeight) => setTypographyPreference({ fontWeight: weight }),
    setFontSize: (size: FontSize) => setTypographyPreference({ fontSize: size }),
    setTypographyPreference,
    resetToDefaults,
    fontWeightMap,
    fontSizeMap,
  };
}

/**
 * Apply typography preferences to document root
 */
export function applyTypographyPreferences(preferences: TypographyPreference) {
  const root = document.documentElement;
  root.style.setProperty('--app-font-weight', String(fontWeightMap[preferences.fontWeight]));
  root.style.setProperty('--app-font-size', fontSizeMap[preferences.fontSize]);
}

/**
 * Initialize typography preferences on app load (call from App.tsx)
 */
export function initializeTypographyPreferences() {
  try {
    const stored = localStorage.getItem(TYPOGRAPHY_PREFERENCE_KEY);
    if (stored) {
      const preferences = JSON.parse(stored) as TypographyPreference;
      applyTypographyPreferences(preferences);
    } else {
      applyTypographyPreferences(defaultPreferences);
    }
  } catch (error) {
    console.error('Error initializing typography preference:', error);
    applyTypographyPreferences(defaultPreferences);
  }
}

