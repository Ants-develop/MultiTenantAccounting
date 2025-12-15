import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Password {
  id: string;
  folder_id: string;
  title: string;
  username: string | null;
  password_encrypted: string;
  url: string | null;
  notes: string | null;
  tags: string[];
  expires_at: string | null;
  last_rotated_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  strength_score: number | null;
}

export interface PasswordFolder {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  parent_folder_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  children?: PasswordFolder[];
}

// Encrypt password (Base64 for MVP, upgrade to TweetNaCl in production)
export const encryptPassword = (password: string): string => {
  return btoa(password);
};

// Decrypt password
export const decryptPassword = (encrypted: string): string => {
  return atob(encrypted);
};

// Calculate password strength (simple scoring)
export const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 25;
  return Math.min(score, 100);
};

export const usePasswords = (folderId?: string, searchTerm?: string) => {
  return useQuery({
    queryKey: ["passwords", folderId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("passwords")
        .select("*")
        .eq("is_archived", false);

      if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query.order("title");

      if (error) throw error;

      // Filter by search term if provided
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (data || []).filter(
          (p) =>
            p.title.toLowerCase().includes(lower) ||
            p.username?.toLowerCase().includes(lower) ||
            p.notes?.toLowerCase().includes(lower)
        );
      }

      return data || [];
    },
  });
};

export const usePasswordFolders = (clientId?: string) => {
  return useQuery({
    queryKey: ["password-folders", clientId],
    queryFn: async () => {
      let query = supabase
        .from("password_folders")
        .select("*")
        .eq("is_archived", false);

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;

      // Build folder tree
      const folders = (data || []) as PasswordFolder[];
      const buildTree = (parentId: string | null = null): PasswordFolder[] => {
        return folders
          .filter((f) => f.parent_folder_id === parentId)
          .map((f) => ({
            ...f,
            children: buildTree(f.id),
          }));
      };

      return buildTree();
    },
  });
};

export const useCreatePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      folder_id: string;
      title: string;
      username?: string;
      password: string;
      url?: string;
      notes?: string;
      tags?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const encrypted = encryptPassword(input.password);
      const strength = calculatePasswordStrength(input.password);

      const { data, error } = await supabase.from("passwords").insert([
        {
          folder_id: input.folder_id,
          title: input.title,
          username: input.username || null,
          password_encrypted: encrypted,
          url: input.url || null,
          notes: input.notes || null,
          tags: input.tags || [],
          strength_score: strength,
          created_by: user.id,
        },
      ]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
    },
  });
};

export const useUpdatePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      username?: string;
      password?: string;
      url?: string;
      notes?: string;
      tags?: string[];
      expires_at?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const updates: any = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (input.title) updates.title = input.title;
      if (input.username !== undefined) updates.username = input.username;
      if (input.url !== undefined) updates.url = input.url;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.tags) updates.tags = input.tags;
      if (input.expires_at !== undefined) updates.expires_at = input.expires_at;

      if (input.password) {
        updates.password_encrypted = encryptPassword(input.password);
        updates.strength_score = calculatePasswordStrength(input.password);
        updates.last_rotated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("passwords")
        .update(updates)
        .eq("id", input.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
    },
  });
};

export const useDeletePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("passwords")
        .update({
          is_archived: true,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
    },
  });
};

export const useCreatePasswordFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      name: string;
      description?: string;
      parent_folder_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("password_folders")
        .insert([
          {
            client_id: input.client_id,
            name: input.name,
            description: input.description || null,
            parent_folder_id: input.parent_folder_id || null,
            created_by: user.id,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["password-folders"] });
    },
  });
};

export const useDeletePasswordFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("password_folders")
        .update({
          is_archived: true,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["password-folders"] });
    },
  });
};

export const useRevealPassword = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log the access
      await supabase.from("password_access_logs").insert([
        {
          password_id: id,
          user_id: user.id,
          action: "viewed",
          ip_address: null, // Would need server-side to get real IP
          user_agent: navigator.userAgent,
        },
      ]);

      const { data, error } = await supabase
        .from("passwords")
        .select("password_encrypted")
        .eq("id", id)
        .single();

      if (error) throw error;
      return decryptPassword(data.password_encrypted);
    },
  });
};

export const useCopyPassword = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log the access
      await supabase.from("password_access_logs").insert([
        {
          password_id: id,
          user_id: user.id,
          action: "copied",
          ip_address: null,
          user_agent: navigator.userAgent,
        },
      ]);

      const { data, error } = await supabase
        .from("passwords")
        .select("password_encrypted")
        .eq("id", id)
        .single();

      if (error) throw error;
      const password = decryptPassword(data.password_encrypted);

      // Copy to clipboard
      navigator.clipboard.writeText(password);
      return password;
    },
  });
};
