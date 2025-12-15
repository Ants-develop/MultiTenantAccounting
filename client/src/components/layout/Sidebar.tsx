import { useLocation, Link } from "wouter";
import { useFlexLayout } from "@/hooks/useFlexLayout";
import { useLayoutPreference } from "@/hooks/useLayoutPreference";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  FolderKanban, LogOut, ChevronsUpDown, Building2, ChevronDown, Database, User, Settings
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  topLevelNavigation,
  practiceManagementNavigation,
  aiBookkeepingNavigation,
  dataWarehouseNavigation,
  reportingNavigation,
  auditNavigation,
  bottomNavigation,
  adminNavigation,
  additionalPagesNavigation,
  NavigationItem
} from "@/config/navigation";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { can, isGlobalAdministrator } = usePermissions();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  // Get FlexLayout context
  const flexLayoutContext = useFlexLayout();
  const { useFlexLayout: flexLayoutEnabled } = useLayoutPreference();

  // Track active tab path
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const prevActiveTabPathRef = useRef<string | null>(null);

  // Collapsible states - load from localStorage on mount
  const [practiceManagementOpen, setPracticeManagementOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_practiceManagementOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [aiBookkeepingOpen, setAiBookkeepingOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_aiBookkeepingOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [dataWarehouseOpen, setDataWarehouseOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_dataWarehouseOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [reportingOpen, setReportingOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_reportingOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [auditOpen, setAuditOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_auditOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [additionalPagesOpen, setAdditionalPagesOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_additionalPagesOpen');
    return stored !== null ? JSON.parse(stored) : false;
  });

  // Persist collapsible states to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_practiceManagementOpen', JSON.stringify(practiceManagementOpen));
  }, [practiceManagementOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_aiBookkeepingOpen', JSON.stringify(aiBookkeepingOpen));
  }, [aiBookkeepingOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_dataWarehouseOpen', JSON.stringify(dataWarehouseOpen));
  }, [dataWarehouseOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_reportingOpen', JSON.stringify(reportingOpen));
  }, [reportingOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_auditOpen', JSON.stringify(auditOpen));
  }, [auditOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar_additionalPagesOpen', JSON.stringify(additionalPagesOpen));
  }, [additionalPagesOpen]);

  // Subscribe to active tab changes
  useEffect(() => {
    if (!flexLayoutContext) return;

    const interval = setInterval(() => {
      const activeTab = flexLayoutContext.getActiveTab();
      const currentPath = activeTab?.path || null;

      if (currentPath !== prevActiveTabPathRef.current) {
        prevActiveTabPathRef.current = currentPath;
        setActiveTabPath(currentPath);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [flexLayoutContext]);

  const isActive = (href: string) => {
    const currentPath = activeTabPath || location;
    return currentPath === href || (href !== "/home" && currentPath.startsWith(href));
  };

  const handleNavigation = (e: React.MouseEvent, href: string, title: string) => {
    e.preventDefault();

    // Pages that should navigate outside of FlexLayout (full page navigation)
    const fullPageRoutes = ['/profile', '/settings', '/company-profile'];

    // If FlexLayout is disabled by user preference, always use simple navigation
    if (!flexLayoutEnabled || fullPageRoutes.includes(href)) {
      setLocation(href);
    } else if (flexLayoutContext) {
      // Use FlexLayout tab system for all other routes when enabled
      flexLayoutContext.openTab(href, undefined, title);
    } else {
      // Fallback to wouter navigation
      setLocation(href);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filterItems = (items: NavigationItem[]) => {
    return items.filter(item => {
      if (item.requiresGlobalAdmin && !isGlobalAdministrator()) return false;
      if (item.permission && !can(item.permission as any)) return false;
      return true;
    });
  };

  const visibleTopLevel = filterItems(topLevelNavigation);
  const visiblePractice = filterItems(practiceManagementNavigation);
  const visibleAiBookkeeping = filterItems(aiBookkeepingNavigation);
  const visibleDataWarehouse = filterItems(dataWarehouseNavigation);
  const visibleReporting = filterItems(reportingNavigation);
  const visibleAudit = filterItems(auditNavigation);
  const visibleBottom = filterItems(bottomNavigation);
  const visibleAdmin = filterItems(adminNavigation);
  const visibleAdditionalPages = filterItems(additionalPagesNavigation);

  return (
    <SidebarRoot collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar">
      {/* Header with Logo */}
      <SidebarHeader>
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground truncate">AccuFlow</span>
        </div>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="[&>[data-radix-scroll-area-viewport]]:!overflow-y-auto [&>[data-radix-scroll-area-viewport]]:scrollbar-hide">
        {/* Top-level: Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            {visibleTopLevel.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    onClick={(e) => handleNavigation(e, item.href, item.name)}
                    tooltip={item.name}
                  >
                    <a href={item.href} className="cursor-pointer">
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Practice Management Collapsible Group */}
        {visiblePractice.length > 0 && (
          <Collapsible
            open={practiceManagementOpen}
            onOpenChange={setPracticeManagementOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="flex-1 text-left">Practice Management</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    {visiblePractice.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            onClick={(e) => handleNavigation(e, item.href, item.name)}
                          >
                            <a href={item.href} className="cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* AI Bookkeeping Collapsible Group */}
        {visibleAiBookkeeping.length > 0 && (
          <Collapsible
            open={aiBookkeepingOpen}
            onOpenChange={setAiBookkeepingOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="flex-1 text-left">AI Bookkeeping</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    {visibleAiBookkeeping.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            onClick={(e) => handleNavigation(e, item.href, item.name)}
                          >
                            <a href={item.href} className="cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Data Warehouse Collapsible Group */}
        {visibleDataWarehouse.length > 0 && (
          <Collapsible
            open={dataWarehouseOpen}
            onOpenChange={setDataWarehouseOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <Database className="h-4 w-4" />
                  <span className="flex-1 text-left">Data Warehouse</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    {visibleDataWarehouse.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            onClick={(e) => handleNavigation(e, item.href, item.name)}
                          >
                            <a href={item.href} className="cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Reporting Collapsible Group */}
        {visibleReporting.length > 0 && (
          <Collapsible
            open={reportingOpen}
            onOpenChange={setReportingOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="flex-1 text-left">Reporting</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    {visibleReporting.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            onClick={(e) => handleNavigation(e, item.href, item.name)}
                          >
                            <a href={item.href} className="cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Audit Collapsible Group */}
        {visibleAudit.length > 0 && (
          <Collapsible
            open={auditOpen}
            onOpenChange={setAuditOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="flex-1 text-left">Audit</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    {visibleAudit.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            onClick={(e) => handleNavigation(e, item.href, item.name)}
                          >
                            <a href={item.href} className="cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Bottom-level: Billing, Settings */}
        {visibleBottom.length > 0 && (
          <SidebarGroup>
            <SidebarMenu>
              {visibleBottom.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      onClick={(e) => handleNavigation(e, item.href, item.name)}
                      tooltip={item.name}
                    >
                      <a href={item.href} className="cursor-pointer">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Admin Section (conditional) */}
        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarSeparator className="my-2" />
            <SidebarMenu>
              {visibleAdmin.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      onClick={(e) => handleNavigation(e, item.href, item.name)}
                      tooltip={item.name}
                    >
                      <a href={item.href} className="cursor-pointer">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Additional Pages Collapsible Section */}
        {visibleAdditionalPages.length > 0 && (
          <Collapsible
            open={additionalPagesOpen}
            onOpenChange={setAdditionalPagesOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarSeparator className="my-2" />
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <FolderKanban className="h-4 w-4" />
                  <span className="flex-1 text-left">Additional Pages</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    {visibleAdditionalPages.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuSubItem key={item.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            onClick={(e) => handleNavigation(e, item.href, item.name)}
                          >
                            <a href={item.href} className="cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="rounded-lg">
                      {user?.firstName && user?.lastName ? getInitials(user.firstName + " " + user.lastName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.firstName ? (user.firstName + " " + user.lastName) : "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.globalRole || "Staff"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleNavigation(e as any, '/profile', 'Profile'); }}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleNavigation(e as any, '/settings', 'Settings'); }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  );
}
