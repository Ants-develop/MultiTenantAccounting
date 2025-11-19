import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const TopBar = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex flex-1 items-center gap-4">
        <SidebarTrigger />
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients, tasks, documents..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationDropdown />
      </div>
    </header>
  );
};
