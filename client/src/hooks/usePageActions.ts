import { useCallback } from 'react';

// Global state for triggering page actions
let globalTriggers: Record<string, () => void> = {};

export function usePageActions() {
  const registerTrigger = useCallback((actionType: string, callback: () => void) => {
    globalTriggers[actionType] = callback;
  }, []);

  const triggerAction = useCallback((actionType: string) => {
    if (globalTriggers[actionType]) {
      globalTriggers[actionType]();
      return true;
    }
    return false;
  }, []);

  return {
    registerTrigger,
    triggerAction,
  };
}

// Global function to trigger actions from anywhere
export function triggerPageAction(actionType: string): boolean {
  if (globalTriggers[actionType]) {
    globalTriggers[actionType]();
    return true;
  }
  return false;
} 