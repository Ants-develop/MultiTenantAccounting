import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { SidebarProvider } from "@/hooks/useSidebar";
import { ReactNode } from "react";

interface SimplePageLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

function SimplePageLayoutContent({ children, hideSidebar = false }: SimplePageLayoutProps) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-background">
      <div className="flex h-screen overflow-hidden app-scale-75">
        {!hideSidebar && <Sidebar />}
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SimplePageLayout({ children, hideSidebar = false }: SimplePageLayoutProps) {
  return (
    <SidebarProvider>
      <SimplePageLayoutContent hideSidebar={hideSidebar}>
        {children}
      </SimplePageLayoutContent>
    </SidebarProvider>
  );
}

