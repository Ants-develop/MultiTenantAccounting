import { useFlexLayout } from "./useFlexLayout";

/**
 * Hook that provides navigation that opens tabs in FlexLayout
 * Always uses tabs - no fallback to regular navigation
 */
export function useTabNavigation() {
  const flexLayout = useFlexLayout();

  const navigate = (path: string, params?: Record<string, string>, title?: string) => {
    if (!flexLayout) {
      console.error("FlexLayout context not available for navigation");
      return;
    }
    // Always open as tab in FlexLayout
    flexLayout.openTab(path, params, title);
  };

  return { navigate };
}

