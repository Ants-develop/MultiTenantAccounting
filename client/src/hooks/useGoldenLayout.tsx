import { useContext, createContext, ReactNode } from "react";

export interface TabState {
  id: string;
  path: string;
  title: string;
  params?: Record<string, string>;
}

export interface GoldenLayoutContextValue {
  openTab: (path: string, params?: Record<string, string>, title?: string) => void;
  closeTab: (tabId: string) => void;
  getActiveTab: () => TabState | null;
  getAllTabs: () => TabState[];
  setActiveTab: (tabId: string) => void;
}

const GoldenLayoutContext = createContext<GoldenLayoutContextValue | null>(null);

export function GoldenLayoutProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: GoldenLayoutContextValue;
}) {
  return (
    <GoldenLayoutContext.Provider value={value}>
      {children}
    </GoldenLayoutContext.Provider>
  );
}

export function useGoldenLayout(): GoldenLayoutContextValue | null {
  return useContext(GoldenLayoutContext);
}

