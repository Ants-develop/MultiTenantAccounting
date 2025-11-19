import { useLocation } from "react-router-dom";
import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  KanbanSquare, 
  CheckSquare, 
  FileText, 
  MessageSquare,
  Calendar,
  DollarSign, 
  Settings,
  Building2,
  LogOut,
  Shield,
  Briefcase,
  FolderKanban,
  ChevronDown,
  Database,
  Landmark,
  BookOpen,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthProvider";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const topLevelNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
];

const practiceManagementNavigation = [
  { name: "CRM", href: "/crm", icon: Briefcase },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Workflows", href: "/workflows", icon: KanbanSquare },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

const dataWarehouseNavigation = [
  { name: "Bank Data", href: "/data-warehouse/bank-data", icon: Landmark },
  { name: "Journal Entries", href: "/data-warehouse/journal-entries", icon: BookOpen },
  { name: "rs.ge Data", href: "/data-warehouse/rs-ge-data", icon: Globe },
  { name: "Documents", href: "/documents", icon: FileText },
];

  const bottomNavigation = [
    { name: "Billing", href: "/billing", icon: DollarSign },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

const adminNavigation = [
  { name: "Admin Panel", href: "/admin", icon: Shield },
];

export const Sidebar = () => {
  const location = useLocation();
  const { profile, signOut, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  
  // Auto-expand Practice Management if any of its routes are active
  const [practiceManagementOpen, setPracticeManagementOpen] = React.useState(() => {
    return practiceManagementNavigation.some(
      item => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    );
  });

  // Update open state when route changes
  React.useEffect(() => {
    const isActive = practiceManagementNavigation.some(
      item => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    );
    if (isActive) {
      setPracticeManagementOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Data Warehouse if any of its routes are active
  const [dataWarehouseOpen, setDataWarehouseOpen] = React.useState(() => {
    return dataWarehouseNavigation.some(
      item => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    ) || location.pathname.startsWith('/data-warehouse');
  });

  // Update open state when route changes
  React.useEffect(() => {
    const isActive = dataWarehouseNavigation.some(
      item => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    ) || location.pathname.startsWith('/data-warehouse');
    if (isActive) {
      setDataWarehouseOpen(true);
    }
  }, [location.pathname]);
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isRouteActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <SidebarRoot collapsible="icon" className="border-r border-sidebar-border">
      {/* Header with Logo */}
      <SidebarHeader>
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <Building2 className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-bold text-sidebar-foreground">AccuFlow</span>
        </div>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent>
        {/* Top-level: Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            {topLevelNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={isRouteActive(item.href)}>
                    <NavLink to={item.href}>
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Practice Management Collapsible Group */}
        <Collapsible
          open={practiceManagementOpen}
          onOpenChange={setPracticeManagementOpen}
          className="group/collapsible"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium">
                <FolderKanban className="h-4 w-4" />
                <span className="flex-1 text-left">Practice Management</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenuSub>
                  {practiceManagementNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuSubItem key={item.name}>
                        <SidebarMenuSubButton asChild isActive={isRouteActive(item.href)}>
                          <NavLink to={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Data Warehouse Collapsible Group */}
        <Collapsible
          open={dataWarehouseOpen}
          onOpenChange={setDataWarehouseOpen}
          className="group/collapsible"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium">
                <Database className="h-4 w-4" />
                <span className="flex-1 text-left">Data Warehouse</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenuSub>
                  {dataWarehouseNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuSubItem key={item.name}>
                        <SidebarMenuSubButton asChild isActive={isRouteActive(item.href)}>
                          <NavLink to={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Bottom-level: Billing, Settings */}
        <SidebarGroup>
          <SidebarMenu>
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={isRouteActive(item.href)}>
                    <NavLink to={item.href}>
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Admin Section (conditional) */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarSeparator />
            <SidebarMenu>
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isRouteActive(item.href)}>
                      <NavLink to={item.href}>
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter>
        <div className="border-t border-sidebar-border p-4 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.full_name ? getInitials(profile.full_name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {profile?.job_title || "Staff"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </SidebarRoot>
  );
};
