import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiRequest } from "@/lib/queryClient";

interface ClientOption {
  id: number;
  name: string;
  code: string;
}

export function useClientFilter(module: string) {
  const { user } = useAuth();
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  
  // Fetch user's accessible clients for this module
  const { data: accessibleClients, isLoading, error } = useQuery({
    queryKey: ['/api/permissions/my-clients', module],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/permissions/my-clients?module=${module}`);
      const data = await res.json();
      console.log(`[useClientFilter] Fetched ${data.length} clients for module ${module}:`, data);
      return data as ClientOption[];
    },

    retry: false, // Don't retry on error
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`clientFilter_${module}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedClientIds(parsed);
          return;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    // Default to first client if available
    if (accessibleClients && accessibleClients.length > 0) {
      setSelectedClientIds([accessibleClients[0].id]);
    }
  }, [module, accessibleClients]);

  // Save to localStorage on change
  const updateSelection = (ids: number[]) => {
    setSelectedClientIds(ids);
    localStorage.setItem(`clientFilter_${module}`, JSON.stringify(ids));
  };

  return {
    selectedClientIds,
    setSelectedClientIds: updateSelection,
    accessibleClients: accessibleClients || [],
    isLoading,
    queryString: selectedClientIds.length > 0 ? `?clientIds=${selectedClientIds.join(',')}` : '',
  };
}

