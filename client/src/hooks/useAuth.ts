import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login, logout, register, switchCompany } from "@/lib/auth";
import type { AuthResponse } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<AuthResponse | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        return await getCurrentUser();
      } catch (error: any) {
        if (error.message.includes('401')) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => register(userData),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);
      toast({
        title: "Registration successful",
        description: "Welcome to AccountFlow Pro!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
  });

  const switchCompanyMutation = useMutation({
    mutationFn: switchCompany,
    onSuccess: (data) => {
      // Update localStorage before reload
      const companyId = data?.companyId || localStorage.getItem('currentCompanyId');
      if (companyId) {
        localStorage.setItem('currentCompanyId', companyId.toString());
      }
      
      // Just reload the page - simplest solution
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Company switch error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('NO_COMPANY_SELECTED')) {
        toast({
          title: "Company Selection Required",
          description: "Please select a company to continue",
          variant: "destructive",
        });
      } else if (error.message?.includes('Access denied')) {
        toast({
          title: "Access Denied",
          description: "You don't have access to this company",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Switch failed",
          description: error.message || "Failed to switch company",
          variant: "destructive",
        });
      }
    },
  });

  return {
    user: data?.user || null,
    companies: data?.companies || [],
    isLoading,
    error,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    switchCompany: switchCompanyMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isSwitchPending: switchCompanyMutation.isPending,
  };
}
