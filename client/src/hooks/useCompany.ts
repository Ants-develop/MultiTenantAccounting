import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

const CURRENT_COMPANY_KEY = 'currentCompanyId';

export function useCompany() {
  const { companies, user } = useAuth();
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize current company from localStorage or first available company
  useEffect(() => {
    if (companies.length > 0 && !isInitialized) {
      // Try to get from localStorage first
      const storedCompanyId = localStorage.getItem(CURRENT_COMPANY_KEY);
      const parsedId = storedCompanyId ? parseInt(storedCompanyId) : null;
      
      // Check if stored company ID is still valid (user still has access)
      const validStoredId = parsedId && companies.some(c => c.id === parsedId);
      
      if (validStoredId) {
        setCurrentCompanyId(parsedId);
      } else {
        // Fallback to first company if no valid stored ID
        const firstCompanyId = companies[0].id;
        setCurrentCompanyId(firstCompanyId);
        localStorage.setItem(CURRENT_COMPANY_KEY, firstCompanyId.toString());
      }
      
      setIsInitialized(true);
    }
  }, [companies, isInitialized]);
  
  // Find the current company based on stored ID
  const currentCompany = companies.find(company => company.id === currentCompanyId) || 
    (companies.length > 0 ? companies[0] : null);
  
  const switchToCompany = useCallback((companyId: number) => {
    setCurrentCompanyId(companyId);
    localStorage.setItem(CURRENT_COMPANY_KEY, companyId.toString());
  }, []);
  
  // Clear company selection when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentCompanyId(null);
      setIsInitialized(false);
      localStorage.removeItem(CURRENT_COMPANY_KEY);
    }
  }, [user]);
  
  return {
    currentCompany,
    companies,
    hasCompanies: companies.length > 0,
    switchToCompany,
    currentCompanyId,
    isInitialized,
  };
}
