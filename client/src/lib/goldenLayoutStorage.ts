const STORAGE_KEY = "goldenLayoutState";
const STORAGE_VERSION = "1.0.0";

interface SavedLayoutState {
  version: string;
  config: any;
  timestamp: number;
}

/**
 * Save Golden Layout state to localStorage
 */
export function saveLayoutState(config: any): void {
  try {
    const state: SavedLayoutState = {
      version: STORAGE_VERSION,
      config,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save layout state:", error);
  }
}

/**
 * Recursively check if config has any non-string title values
 */
function hasInvalidTitles(config: any): boolean {
  if (!config || typeof config !== "object") return false;
  
  if ("title" in config) {
    const title = config.title;
    if (title !== null && title !== undefined && typeof title !== "string") {
      return true;
    }
  }
  
  if (config.content && Array.isArray(config.content)) {
    return config.content.some((item: any) => hasInvalidTitles(item));
  }
  
  if (config.contentItems && Array.isArray(config.contentItems)) {
    return config.contentItems.some((item: any) => hasInvalidTitles(item));
  }
  
  return false;
}

/**
 * Load Golden Layout state from localStorage
 */
export function loadLayoutState(): any | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: SavedLayoutState = JSON.parse(stored);
    
    // Validate version (for future migrations)
    if (state.version !== STORAGE_VERSION) {
      console.warn("Layout state version mismatch, clearing saved state");
      clearLayoutState();
      return null;
    }

    // Validate config structure
    if (!state.config || typeof state.config !== "object") {
      console.warn("Invalid layout state structure, clearing saved state");
      clearLayoutState();
      return null;
    }

    // Check for invalid title values (non-strings) that would cause trimStart errors
    if (hasInvalidTitles(state.config)) {
      console.warn("Layout state contains invalid title values, clearing saved state");
      clearLayoutState();
      return null;
    }

    return state.config;
  } catch (error) {
    console.error("Failed to load layout state:", error);
    clearLayoutState();
    return null;
  }
}

/**
 * Clear saved layout state
 */
export function clearLayoutState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear layout state:", error);
  }
}

/**
 * Check if saved layout state exists
 */
export function hasLayoutState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

