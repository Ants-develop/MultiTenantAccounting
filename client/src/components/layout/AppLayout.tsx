import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

function AppLayoutContent({ children, hideSidebar = false }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="w-screen h-screen overflow-hidden bg-background">
      <div className="flex h-screen overflow-hidden app-scale-75">
        {!hideSidebar && <Sidebar />}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed && !hideSidebar ? 'ml-0' : ''}`}>
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent hideSidebar={hideSidebar}>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
