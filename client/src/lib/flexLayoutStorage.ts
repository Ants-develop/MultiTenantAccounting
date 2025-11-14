import { IJsonModel } from "flexlayout-react";

const STORAGE_KEY = "flexLayoutState";
const STORAGE_VERSION = "1.0.0";

interface SavedLayoutState {
  version: string;
  config: IJsonModel;
  timestamp: number;
}

/**
 * Save FlexLayout state to localStorage
 */
export function saveLayoutState(config: IJsonModel): void {
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
 * Load FlexLayout state from localStorage
 */
export function loadLayoutState(): IJsonModel | null {
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

    // Validate that it has the required FlexLayout structure
    if (!state.config.layout || typeof state.config.layout !== "object") {
      console.warn("Invalid FlexLayout model structure, clearing saved state");
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
    // Also clear old GoldenLayout state if it exists
    localStorage.removeItem("goldenLayoutState");
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

