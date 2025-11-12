import { Plus, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { triggerPageAction } from "@/hooks/usePageActions";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function TopBar() {
  const { user, logout, companies } = useAuth();
  const currentCompany = companies?.[0] || null;
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-green-100 text-green-800';
      case 'accountant':
        return 'bg-blue-100 text-blue-800';
      case 'assistant':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1) + ' Role';
  };

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
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-foreground">{getPageTitle()}</h2>
          {currentCompany && (
            <Badge className={`ml-4 ${getRoleColor(currentCompany.role)}`}>
              {formatRole(currentCompany.role)}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleNewEntry}
          >
            <Plus className="w-4 h-4 mr-2" />
            {getNewEntryText()}
          </Button>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <LanguageSwitcher />
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {user ? getUserInitials(user.firstName, user.lastName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocation('/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  {t('topBar.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
