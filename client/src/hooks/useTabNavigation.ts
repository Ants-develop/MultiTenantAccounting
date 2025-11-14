import { useGoldenLayout } from "./useGoldenLayout";

/**
 * Hook that provides navigation that opens tabs in Golden Layout
 * Always uses tabs - no fallback to regular navigation
 */
export function useTabNavigation() {
  const goldenLayout = useGoldenLayout();

  const navigate = (path: string, params?: Record<string, string>, title?: string) => {
    if (!goldenLayout) {
      console.error("Golden Layout context not available for navigation");
      return;
    }
    // Always open as tab in Golden Layout
    goldenLayout.openTab(path, params, title);
  };

  return { navigate };
}

