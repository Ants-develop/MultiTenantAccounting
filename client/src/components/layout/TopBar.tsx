import { Plus, Bell, User, Search, Settings, LogOut, Building2, ChevronDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { triggerPageAction } from "@/hooks/usePageActions";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useState } from "react";

// Module definitions for navigation
const MODULES = {
  'client-management': { name: 'Client Management', icon: Building2, color: 'bg-blue-100 text-blue-800' },
  'workflow-tasks': { name: 'Workflow & Tasks', icon: User, color: 'bg-green-100 text-green-800' },
  'communication': { name: 'Communication', icon: Bell, color: 'bg-purple-100 text-purple-800' },
  'accounting': { name: 'Accounting', icon: User, color: 'bg-indigo-100 text-indigo-800' },
  'billing-payments': { name: 'Billing & Payments', icon: User, color: 'bg-yellow-100 text-yellow-800' },
  'reporting-analytics': { name: 'Reporting & Analytics', icon: User, color: 'bg-pink-100 text-pink-800' },
  'administration': { name: 'Administration', icon: Settings, color: 'bg-gray-100 text-gray-800' },
};

// Get current module from route
const getCurrentModule = (path: string) => {
  if (path.startsWith('/clients') || path.startsWith('/client')) return 'client-management';
  if (path.startsWith('/tasks') || path.startsWith('/pipelines') || path.startsWith('/jobs') || path.startsWith('/calendar')) return 'workflow-tasks';
  if (path.startsWith('/accounting')) return 'accounting';
  if (path.startsWith('/audit') || path.startsWith('/financial-statements') || path.startsWith('/trial-balance') || path.startsWith('/custom-reports')) return 'reporting-analytics';
  if (path.startsWith('/global-administration') || path.startsWith('/user-management') || path.startsWith('/permissions-management') || path.startsWith('/company-profile')) return 'administration';
  return null;
};

export default function TopBar() {
  const { user, logout, mainCompany } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const currentModule = getCurrentModule(location);
  const moduleInfo = currentModule ? MODULES[currentModule] : null;

  const getPageTitle = () => {
    if (location.includes('/dashboard')) return t('navigation.dashboard');
    if (location.includes('/chart-of-accounts')) return t('navigation.chartOfAccounts');
    if (location.includes('/general-ledger')) return t('navigation.generalLedger');
    if (location.includes('/journal-entries')) return t('navigation.journalEntries');
    if (location.includes('/invoices')) return t('navigation.invoices');
    if (location.includes('/financial-statements')) return t('navigation.financialStatements');
    if (location.includes('/user-management')) return t('navigation.userManagement');
    if (location.includes('/role-management')) return t('navigation.roleManagement');
    if (location.includes('/profile')) return t('navigation.profile');
    if (location.includes('/tasks')) return 'Tasks';
    if (location.includes('/pipelines')) return 'Pipelines';
    if (location.includes('/jobs')) return 'Jobs';
    if (location.includes('/calendar')) return 'Calendar';
    if (location.includes('/clients')) return 'Clients';
    return t('navigation.dashboard');
  };

  const handleNewEntry = () => {
    let actionTriggered = false;

    // Try to trigger the appropriate action based on current page
    if (location.includes('/journal-entries')) {
      actionTriggered = triggerPageAction('newJournalEntry');
    } else if (location.includes('/invoices')) {
      actionTriggered = triggerPageAction('newInvoice');
    } else if (location.includes('/chart-of-accounts')) {
      actionTriggered = triggerPageAction('newAccount');
    } else if (location.includes('/user-management')) {
      actionTriggered = triggerPageAction('newUser');
    } else if (location.includes('/role-management')) {
      actionTriggered = triggerPageAction('newRole');
    }

    // If no action was triggered or we're on a different page, navigate to journal entries
    if (!actionTriggered) {
      if (location !== '/journal-entries') {
        setLocation('/journal-entries');
        toast({
          title: t('topBar.redirecting'),
          description: t('topBar.redirectMessage'),
        });
      }
    }
  };

  const getNewEntryText = () => {
    if (location.includes('/journal-entries')) return t('topBar.newEntry');
    if (location.includes('/invoices')) return t('topBar.newInvoice');
    if (location.includes('/chart-of-accounts')) return t('topBar.newAccount');
    if (location.includes('/user-management')) return t('topBar.newUser');
    if (location.includes('/role-management')) return t('topBar.newRole');
    return t('topBar.newEntry');
  };

  return (
    <>
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Module Indicator */}
            {moduleInfo && (
              <Badge className={moduleInfo.color}>
                {moduleInfo.name}
              </Badge>
            )}
            <div>
              <h2 className="text-xl font-semibold text-foreground">{getPageTitle()}</h2>
              {mainCompany && (
                <p className="text-xs text-muted-foreground mt-0.5">{mainCompany.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Global Search */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Quick Actions */}
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleNewEntry}
            >
              <Plus className="w-4 h-4 mr-2" />
              {getNewEntryText()}
            </Button>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>
            
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
                <DropdownMenuItem onClick={() => setLocation('/company-profile')}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Company Settings
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
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search pages, clients, tasks..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => { setLocation('/home'); setSearchOpen(false); }}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => { setLocation('/tasks'); setSearchOpen(false); }}>
              <User className="mr-2 h-4 w-4" />
              <span>Tasks</span>
            </CommandItem>
            <CommandItem onSelect={() => { setLocation('/accounting/journal-entries'); setSearchOpen(false); }}>
              <User className="mr-2 h-4 w-4" />
              <span>Journal Entries</span>
            </CommandItem>
            <CommandItem onSelect={() => { setLocation('/clients'); setSearchOpen(false); }}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>Clients</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
