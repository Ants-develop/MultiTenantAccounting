import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CompanyValidationResponse {
  hasCompany: boolean;
  companyId?: number;
  companyName?: string;
  userId?: number;
  message?: string;
}

export function useCompanyValidation() {
  return useQuery<CompanyValidationResponse>({
    queryKey: ['/api/companies/current'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/companies/current');
      return response.json();
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
  });
}
