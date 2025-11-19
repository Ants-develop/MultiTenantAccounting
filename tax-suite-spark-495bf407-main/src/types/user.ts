export type AppRole = 'admin' | 'manager' | 'accountant' | 'reviewer' | 'client';

export interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string | null;
  client_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  roles: AppRole[];
  clients?: {
    name: string;
  } | null;
}

export interface PermissionLevel {
  level: 'none' | 'view' | 'edit' | 'manage' | 'full';
  description: string;
  icon: string;
}

export interface RolePermissions {
  role: AppRole;
  label: string;
  color: string;
  modules: {
    [key: string]: PermissionLevel;
  };
}

export interface UserInvitation {
  id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  invited_by: string;
  initial_roles: AppRole[];
  client_id: string | null;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  custom_message: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}
