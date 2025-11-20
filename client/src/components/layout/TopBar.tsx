import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useFlexLayout } from '@/hooks/useFlexLayout';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Bell,
  User,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { allNavigation } from "@/config/navigation";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";

export default function TopBar() {
  const { user, logout, mainCompany } = useAuth();
  const [location, setLocation] = useLocation();
  const flexLayout = useFlexLayout();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggleSidebar, isMobile } = useSidebar();

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getPageTitle = () => {
    if (location === '/' || location === '/home') return 'Dashboard';
    if (location.startsWith('/tasks')) return 'Tasks';
    if (location.startsWith('/clients')) return 'Clients';
    if (location.startsWith('/accounting')) return 'Accounting';
    if (location.startsWith('/reports')) return 'Reports';
    if (location.startsWith('/settings')) return 'Settings';
    return 'AccountFlow';
  };

  const handleNewEntry = () => {
    // Logic for new entry based on context
    console.log("New entry clicked");
  };

  const getNewEntryText = () => {
    return "New Entry";
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex flex-1 items-center gap-4">
          <SidebarTrigger />
          
          <div>
            <h2 className="text-xl font-semibold text-foreground">{getPageTitle()}</h2>
            {mainCompany && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (flexLayout) {
                    flexLayout.openTab('/home', undefined, 'Dashboard');
                  } else {
                    setLocation('/home');
                  }
                }}
                className="text-xs text-muted-foreground mt-0.5 hover:text-foreground hover:underline transition-colors cursor-pointer text-left"
              >
                {mainCompany.name}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* New Tab Button */}
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setSearchOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Tab
          </Button>

          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-auto py-1.5 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {user ? getUserInitials(user.firstName, user.lastName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </span>
                  {user?.globalRole && (
                    <span className="text-xs text-muted-foreground capitalize">{user.globalRole}</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <User className="w-4 h-4 mr-2" />
                {t('topBar.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search pages, clients, tasks..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {allNavigation.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  if (flexLayout) {
                    flexLayout.openTab(item.href, undefined, item.name);
                  } else {
                    setLocation(item.href);
                  }
                  setSearchOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
