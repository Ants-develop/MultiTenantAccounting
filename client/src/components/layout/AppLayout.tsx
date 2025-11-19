import { useRef, useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import FlexLayoutContainer from "./FlexLayoutContainer";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { FlexLayoutProvider, FlexLayoutContextValue, TabState } from "@/hooks/useFlexLayout";

interface AppLayoutProps {
  hideSidebar?: boolean;
  defaultPath?: string;
}

function AppLayoutContent({ hideSidebar = false, defaultPath = "/home" }: AppLayoutProps) {
  const { open } = useSidebar();
  const [location] = useLocation();
  const flexLayoutRef = useRef<FlexLayoutContextValue | null>(null);

  // Use current location as default if provided, otherwise use prop
  // After initial load, URL should remain unchanged
  const initialPath = location !== "/" && location !== "/login" && location !== "/setup"
    ? location
    : defaultPath;

  // Create a proxy context value that forwards to the actual FlexLayoutContainer
  const proxyContextValue: FlexLayoutContextValue = {
    openTab: (path: string, params?: Record<string, string>, title?: string) => {
      if (flexLayoutRef.current) {
        flexLayoutRef.current.openTab(path, params, title);
      }
    },
    closeTab: (tabId: string) => {
      if (flexLayoutRef.current) {
        flexLayoutRef.current.closeTab(tabId);
      }
    },
    getActiveTab: (): TabState | null => {
      return flexLayoutRef.current?.getActiveTab() || null;
    },
    getAllTabs: (): TabState[] => {
      return flexLayoutRef.current?.getAllTabs() || [];
    },
    setActiveTab: (tabId: string) => {
      if (flexLayoutRef.current) {
        flexLayoutRef.current.setActiveTab(tabId);
      }
    },
  };

  return (
    <FlexLayoutProvider value={proxyContextValue}>
      <div className="w-screen h-screen overflow-hidden bg-background">
        <div className="flex h-screen overflow-hidden app-scale-75">
          {!hideSidebar && <Sidebar />}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${!open && !hideSidebar ? 'ml-0' : ''}`}>
            <TopBar />
            <main className="flex-1 overflow-hidden bg-background">
              <FlexLayoutContainer
                defaultPath={initialPath}
                onContextReady={(context) => {
                  flexLayoutRef.current = context;
                }}
              />
            </main>
          </div>
        </div>
      </div>
    </FlexLayoutProvider>
  );
}

export default function AppLayout({ hideSidebar = false, defaultPath = "/home" }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppLayoutContent hideSidebar={hideSidebar} defaultPath={defaultPath} />
    </SidebarProvider>
  );
}
