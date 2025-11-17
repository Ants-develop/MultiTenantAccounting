import { useContext, createContext, ReactNode } from "react";

export interface TabState {
  id: string;
  path: string;
  title: string;
  params?: Record<string, string>;
}

export interface FlexLayoutContextValue {
  openTab: (path: string, params?: Record<string, string>, title?: string) => void;
  closeTab: (tabId: string) => void;
  getActiveTab: () => TabState | null;
  getAllTabs: () => TabState[];
  setActiveTab: (tabId: string) => void;
}

const FlexLayoutContext = createContext<FlexLayoutContextValue | null>(null);

export function FlexLayoutProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FlexLayoutContextValue;
}) {
  return (
    <FlexLayoutContext.Provider value={value}>
      {children}
    </FlexLayoutContext.Provider>
  );
}

export function useFlexLayout(): FlexLayoutContextValue | null {
  return useContext(FlexLayoutContext);
}

