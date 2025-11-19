import { useRef } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import FlexLayoutContainer from "./FlexLayoutContainer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { FlexLayoutProvider, FlexLayoutContextValue, TabState } from "@/hooks/useFlexLayout";

interface AppLayoutProps {
  hideSidebar?: boolean;
  defaultPath?: string;
}

function AppLayoutContent({ hideSidebar = false, defaultPath = "/home" }: AppLayoutProps) {
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
      {!hideSidebar && <Sidebar />}
      <SidebarInset className="overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-hidden border-t border-border">
          <FlexLayoutContainer
            defaultPath={initialPath}
            onContextReady={(context) => {
              flexLayoutRef.current = context;
            }}
          />
        </div>
      </SidebarInset>
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
