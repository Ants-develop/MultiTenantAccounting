import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login, logout, register } from "@/lib/auth";
import type { AuthResponse } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<AuthResponse | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await getCurrentUser();
        return response;
      } catch (error: any) {
        // Check if it's an authentication error (401, 404)
        const errorMsg = error?.message || '';
        const status = error?.status || (errorMsg.match(/^(\d+):/)?.[1]);
        
        // Handle authentication errors by returning null (not throwing)
        if (status === '401' || status === '404' || 
            errorMsg.includes('401') || errorMsg.includes('404') || 
            errorMsg.includes('User not found') || errorMsg.includes('session invalidated')) {
          // Immediately set query data to null to stop loading state
          queryClient.setQueryData(['/api/auth/me'], null);
          // Return null to indicate no user is authenticated
          return null;
        }
        // For other errors, return null to prevent infinite loading
        console.error('Auth error:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false, // Prevent refetch loops
    refetchOnMount: true, // Refetch on mount to check auth status
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: 5 * 60 * 1000, // 5 minutes - normal stale time
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      // Supabase login uses email, but our form field is 'username' which might be email or username.
      // For now, let's assume the user enters email in the username field if they want to login.
      // Or we can try to resolve username to email if needed, but Supabase requires email.
      // Let's assume the input is email for now.
      login(username, password),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);
      const companyName = data?.mainCompany?.name || 'AccountFlow Pro';
      toast({
        title: "Login successful",
        description: `Welcome back to ${companyName}!`,
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
      const companyName = data?.mainCompany?.name || 'AccountFlow Pro';
      toast({
        title: "Registration successful",
        description: `Welcome to ${companyName}!`,
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

  return {
    user: data?.user || null,
    mainCompany: data?.mainCompany || null,
    needsSetup: data?.needsSetup || false,
    isLoading,
    error,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
  };
}
