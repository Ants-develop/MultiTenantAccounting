import { ChevronDown, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyValidation } from "@/hooks/useCompanyValidation";
import { useTranslation } from "react-i18next";
import { forwardRef } from "react";

// Forward ref wrapper for Button to fix ref warnings
const ButtonWithRef = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  (props, ref) => <Button ref={ref} {...props} />
);
ButtonWithRef.displayName = 'ButtonWithRef';

export default function CompanySwitcher() {
  const { switchCompany, isSwitchPending } = useAuth();
  const { currentCompany, companies, switchToCompany, currentCompanyId, isInitialized } = useCompany();
  const { data: validation, isLoading: validationLoading } = useCompanyValidation();
  const { t } = useTranslation();

  const handleSwitchCompany = async (companyId: number) => {
    // Don't switch if already on this company
    if (companyId === currentCompanyId) {
      return;
    }

    try {
      console.log(`Switching to company ${companyId}`);
      
      // Call the backend API first
      await switchCompany(companyId);
      
      // Only update local state after successful backend call
      switchToCompany(companyId);
      
      console.log(`Successfully switched to company ${companyId}`);
    } catch (error) {
      console.error('Failed to switch company:', error);
      
      // Don't update local state if backend call fails
      // The error will be handled by the useAuth hook's error handling
    }
  };

  const getCompanyInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading state while initializing
  if (!isInitialized || validationLoading) {
    return (
      <div className="company-switcher opacity-50">
        <div className="flex items-center">
          <div className="company-avatar bg-muted text-muted-foreground animate-pulse">
            ...
          </div>
          <span className="text-sm font-medium text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Show error state if no company is available
  if (!currentCompany || !validation?.hasCompany) {
    return (
      <div className="company-switcher">
        <div className="flex items-center">
          <div className="company-avatar bg-destructive text-destructive-foreground">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-destructive">No Company Selected</span>
            <span className="text-xs text-muted-foreground">{validation?.message || 'Please select a company'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .company-switcher {
          min-width: 200px;
        }
        .company-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          margin-right: 8px;
        }
      `}</style>
      <DropdownMenu>
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <ButtonWithRef variant="ghost" className="company-switcher" disabled={isSwitchPending}>
                  <div className="flex items-center">
                    <div className="company-avatar bg-primary text-primary-foreground relative">
                      {getCompanyInitials(currentCompany.name)}
                      {validation?.hasCompany && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">{currentCompany.name}</span>
                      {validation?.hasCompany && (
                        <span className="text-xs text-green-600">Active</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="text-muted-foreground w-4 h-4" />
                </ButtonWithRef>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t('companySwitcher.switchCompany')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent className="w-56">
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => handleSwitchCompany(company.id)}
              className="flex items-center"
              disabled={isSwitchPending || company.id === currentCompanyId}
            >
              <div className="company-avatar bg-primary text-primary-foreground">
                {getCompanyInitials(company.name)}
              </div>
              <div className="flex-1">
                <div className="font-medium">{company.name}</div>
                <div className="text-xs text-muted-foreground">{company.role}</div>
              </div>
              {company.id === currentCompanyId && (
                <div className="text-xs text-primary font-medium">Current</div>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
