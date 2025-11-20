import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode } from "react";

interface SimplePageLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

function SimplePageLayoutContent({ children, hideSidebar = false }: SimplePageLayoutProps) {
  return (
    <>
        {!hideSidebar && <Sidebar />}
      <SidebarInset>
          <TopBar />
        <div className="flex-1 overflow-auto border-t border-border p-6">
            {children}
        </div>
      </SidebarInset>
    </>
  );
}

export default function SimplePageLayout({ children, hideSidebar = false }: SimplePageLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <SimplePageLayoutContent hideSidebar={hideSidebar}>
        {children}
      </SimplePageLayoutContent>
    </SidebarProvider>
  );
}

