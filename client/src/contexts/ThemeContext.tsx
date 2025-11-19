import { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode, useRef } from "react";
import { useModeAnimation, ThemeAnimationType } from "react-theme-switch-animation";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  // Animation hook ref for toggle button
  animationRef: React.RefObject<HTMLElement> | null;
  toggleTheme: () => void;
  // Custom color support
  customPrimaryColor: string | null;
  setCustomPrimaryColor: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme-preference";
const CUSTOM_PRIMARY_COLOR_KEY = "custom-primary-color";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme from localStorage or default to "light"
  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return stored || "light";
  };

  const getInitialResolvedTheme = (theme: Theme): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    getInitialResolvedTheme(getInitialTheme())
  );

  // Custom primary color state
  const [customPrimaryColor, setCustomPrimaryColorState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CUSTOM_PRIMARY_COLOR_KEY);
  });

  // Track previous resolved theme to detect changes and prevent unnecessary toggles
  const prevResolvedThemeRef = useRef<"light" | "dark">(resolvedTheme);
  const isUpdatingFromLibraryRef = useRef(false);

  // Use the animation library hook
  // Initialize with resolved theme (converted to boolean)
  const initialDarkMode = resolvedTheme === "dark";
  const { ref, toggleSwitchTheme, isDarkMode: libraryIsDarkMode } = useModeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    isDarkMode: initialDarkMode,
    globalClassName: "dark",
    onDarkModeChange: (isDark: boolean) => {
      // Mark that update is coming from library to prevent loop
      isUpdatingFromLibraryRef.current = true;

      // When library changes theme via toggle, update our state
      // Only update if we're not in system mode (or if we are, switch to explicit)
      if (theme === "system") {
        // Switch from system to explicit theme
        setThemeState(isDark ? "dark" : "light");
        setResolvedTheme(isDark ? "dark" : "light");
        prevResolvedThemeRef.current = isDark ? "dark" : "light";
      } else {
        // Update resolved theme to match library
        setResolvedTheme(isDark ? "dark" : "light");
        prevResolvedThemeRef.current = isDark ? "dark" : "light";
      }

      // Reset flag after a brief delay to allow state updates to complete
      setTimeout(() => {
        isUpdatingFromLibraryRef.current = false;
      }, 0);
    },
  });

  // Helper function to adjust color brightness
  const adjustColorBrightness = (color: string, percent: number): string => {
    // Convert hex to RGB
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Adjust brightness
    const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
    const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
    const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));

    // Convert back to hex
    return `#${Math.round(newR).toString(16).padStart(2, "0")}${Math.round(newG).toString(16).padStart(2, "0")}${Math.round(newB).toString(16).padStart(2, "0")}`;
  };

  // Apply theme and custom color immediately on mount (synchronously before paint) to prevent flash
  useLayoutEffect(() => {
    const root = document.documentElement;
    const initialTheme = getInitialTheme();
    const initialResolved = getInitialResolvedTheme(initialTheme);

    if (initialResolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply custom primary color if set
    if (customPrimaryColor) {
      root.style.setProperty("--user-primary", customPrimaryColor);
      // Calculate hover color (slightly darker)
      const hoverColor = adjustColorBrightness(customPrimaryColor, -10);
      root.style.setProperty("--user-primary-hover", hoverColor);
    }
  }, [customPrimaryColor]);

  // Set custom primary color
  const setCustomPrimaryColor = (color: string | null) => {
    setCustomPrimaryColorState(color);
    if (typeof window !== "undefined") {
      if (color) {
        localStorage.setItem(CUSTOM_PRIMARY_COLOR_KEY, color);
        const root = document.documentElement;
        root.style.setProperty("--user-primary", color);
        const hoverColor = adjustColorBrightness(color, -10);
        root.style.setProperty("--user-primary-hover", hoverColor);
      } else {
        localStorage.removeItem(CUSTOM_PRIMARY_COLOR_KEY);
        const root = document.documentElement;
        root.style.removeProperty("--user-primary");
        root.style.removeProperty("--user-primary-hover");
      }
    }
  };

  // Sync library state when our theme state changes (from radio buttons)
  useEffect(() => {
    // Skip if update is coming from library (to prevent loops)
    if (isUpdatingFromLibraryRef.current) {
      return;
    }

    if (theme === "system") {
      // For system theme, we need to manually manage based on system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const updateResolvedTheme = () => {
        const newResolved = mediaQuery.matches ? "dark" : "light";
        const prevResolved = prevResolvedThemeRef.current;

        // Only update if changed
        if (newResolved !== prevResolved) {
          prevResolvedThemeRef.current = newResolved;
          setResolvedTheme(newResolved);

          // If library state doesn't match, trigger animation
          if (libraryIsDarkMode !== (newResolved === "dark")) {
            toggleSwitchTheme();
          } else {
            // Manually update DOM class if no animation needed
            const root = document.documentElement;
            if (newResolved === "dark") {
              root.classList.add("dark");
            } else {
              root.classList.remove("dark");
            }
          }
        }
      };

      // Set initial value
      updateResolvedTheme();

      // Listen for changes
      mediaQuery.addEventListener("change", updateResolvedTheme);
      return () => mediaQuery.removeEventListener("change", updateResolvedTheme);
    } else {
      // For explicit themes, sync with library
      const shouldBeDark = theme === "dark";
      const newResolved = theme;
      const prevResolved = prevResolvedThemeRef.current;

      // Only update if changed
      if (newResolved !== prevResolved) {
        prevResolvedThemeRef.current = newResolved;
        setResolvedTheme(newResolved);

        // If library state doesn't match, trigger animation
        if (libraryIsDarkMode !== shouldBeDark) {
          toggleSwitchTheme();
        } else {
          // Manually update DOM class if no animation needed
          const root = document.documentElement;
          if (shouldBeDark) {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }
        }
      }
    }
  }, [theme, libraryIsDarkMode, toggleSwitchTheme]);

  // Helper function to apply theme with View Transitions API support
  const applyThemeWithTransition = (callback: () => void) => {
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      // Use View Transitions API if available
      (document as any).startViewTransition(() => {
        callback();
      });
    } else {
      // Fallback for browsers without View Transitions API
      callback();
    }
  };

  // Persist theme to localStorage with View Transitions support
  const setTheme = (newTheme: Theme) => {
    applyThemeWithTransition(() => {
      setThemeState(newTheme);
      if (typeof window !== "undefined") {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      }
    });
  };

  // Toggle function for the animated button
  const toggleTheme = () => {
    if (theme === "system") {
      // If system, toggle based on current resolved theme and switch to explicit
      const newTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
      applyThemeWithTransition(() => {
        setTheme(newTheme);
        // The library will handle the animation via its toggle
        // But we need to trigger it manually since we're changing theme state
        toggleSwitchTheme();
      });
    } else {
      // If explicit theme, use library's toggle which will trigger animation
      applyThemeWithTransition(() => {
        toggleSwitchTheme();
      });
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    animationRef: ref,
    toggleTheme,
    customPrimaryColor,
    setCustomPrimaryColor,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Hook specifically for getting animation ref and toggle function
export function useThemeAnimation() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeAnimation must be used within a ThemeProvider");
  }
  return {
    ref: context.animationRef,
    toggleTheme: context.toggleTheme,
    isDarkMode: context.resolvedTheme === "dark",
  };
}
