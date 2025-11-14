import { useRef, useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import FlexLayoutContainer from "./FlexLayoutContainer";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";
import { useLocation } from "wouter";
import { GoldenLayoutProvider, GoldenLayoutContextValue, TabState } from "@/hooks/useGoldenLayout";

interface AppLayoutProps {
  hideSidebar?: boolean;
  defaultPath?: string;
}

function AppLayoutContent({ hideSidebar = false, defaultPath = "/home" }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();
  const [location] = useLocation();
  const goldenLayoutRef = useRef<GoldenLayoutContextValue | null>(null);
  
  // Use current location as default if provided, otherwise use prop
  // After initial load, URL should remain unchanged
  const initialPath = location !== "/" && location !== "/login" && location !== "/setup" 
    ? location 
    : defaultPath;
  
  // Create a proxy context value that forwards to the actual GoldenLayoutContainer
  const proxyContextValue: GoldenLayoutContextValue = {
    openTab: (path: string, params?: Record<string, string>, title?: string) => {
      if (goldenLayoutRef.current) {
        goldenLayoutRef.current.openTab(path, params, title);
      }
    },
    closeTab: (tabId: string) => {
      if (goldenLayoutRef.current) {
        goldenLayoutRef.current.closeTab(tabId);
      }
    },
    getActiveTab: (): TabState | null => {
      return goldenLayoutRef.current?.getActiveTab() || null;
    },
    getAllTabs: (): TabState[] => {
      return goldenLayoutRef.current?.getAllTabs() || [];
    },
    setActiveTab: (tabId: string) => {
      if (goldenLayoutRef.current) {
        goldenLayoutRef.current.setActiveTab(tabId);
      }
    },
  };
  
  return (
    <GoldenLayoutProvider value={proxyContextValue}>
      <div className="w-screen h-screen overflow-hidden bg-background">
        <div className="flex h-screen overflow-hidden app-scale-75">
          {!hideSidebar && <Sidebar />}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed && !hideSidebar ? 'ml-0' : ''}`}>
            <TopBar />
            <main className="flex-1 overflow-hidden bg-background">
              <FlexLayoutContainer 
                defaultPath={initialPath} 
                onContextReady={(context) => {
                  goldenLayoutRef.current = context;
                }}
              />
            </main>
          </div>
        </div>
      </div>
    </GoldenLayoutProvider>
  );
}

export default function AppLayout({ hideSidebar = false, defaultPath = "/home" }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent hideSidebar={hideSidebar} defaultPath={defaultPath} />
    </SidebarProvider>
  );
}
