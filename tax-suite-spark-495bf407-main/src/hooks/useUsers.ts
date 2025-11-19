import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserWithRoles, AppRole } from "@/types/user";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // First get profiles
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          job_title,
          client_id,
          is_active,
          last_login_at,
          user_roles!user_roles_user_id_fkey (role),
          clients!profiles_client_id_fkey (name)
        `)
        .order("full_name");

      if (error) throw error;

      // Transform data to match UserWithRoles interface
      return (data || []).map((user): UserWithRoles => {
        // Extract client from array format (Supabase returns single relations as arrays)
        const client = Array.isArray(user.clients) && user.clients.length > 0 
          ? user.clients[0] 
          : null;

        return {
          id: user.id,
          email: user.email || "",
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          job_title: user.job_title,
          client_id: user.client_id,
          is_active: user.is_active,
          last_login_at: user.last_login_at,
          roles: (user.user_roles || []).map((r: any) => r.role as AppRole),
          clients: client as { name: string } | null,
        };
      });
    },
  });
};

export const useUserDetails = (userId: string) => {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_with_roles", {
        user_id: userId,
      });

      if (error) throw error;
      return data?.[0] as UserWithRoles;
    },
    enabled: !!userId,
  });
};

export const useManageUserRoles = () => {
  const queryClient = useQueryClient();

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("add_user_role", {
        _user_id: userId,
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign role");
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("remove_user_role", {
        _user_id: userId,
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove role");
    },
  });

  return { addRole, removeRole };
};

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: isActive,
          deactivated_at: isActive ? null : new Date().toISOString(),
          deactivated_by: isActive ? null : (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        variables.isActive ? "User activated successfully" : "User deactivated successfully"
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user status");
    },
  });
};
