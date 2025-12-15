import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  globalRole?: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
}

export interface MainCompany {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  fiscalYearStart?: number;
  currency: string;
  dateFormat: string;
  decimalPlaces: number;
}

export interface AuthResponse {
  user: AuthUser;
  mainCompany: MainCompany | null;
  needsSetup: boolean;
}

export async function getCurrentUser(): Promise<AuthResponse | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.user) {
    return null;
  }

  // Fetch user data from backend API (which bypasses RLS)
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch user data from API:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('Error fetching user data:', e);
    return null;
  }
}

export async function login(emailOrUsername: string, password: string): Promise<AuthResponse> {
  let email = emailOrUsername;
  
  // If the input doesn't look like an email, we need an email for Supabase
  // Try the username as-is first, if it fails, provide helpful message
  if (!emailOrUsername.includes('@')) {
    throw new Error('Please use your email address to log in (e.g., admin@example.com). If you don\'t have an account, please register first.');
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Provide more helpful error messages
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. If you don\'t have an account, please register first.');
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Login succeeded but user data could not be retrieved");
  
  return user;
}

export async function register(userData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  // Get the current origin (e.g., http://localhost:4000)
  const redirectUrl = window.location.origin;
  
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
      }
    }
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        global_role: 'user'
      });
      
    if (profileError) {
      console.error("Error creating profile:", profileError);
    }
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Registration succeeded but user data could not be retrieved");

  return user;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export interface SwitchCompanyResponse {
  message: string;
  companyId: number;
  companyName: string;
}

export async function switchCompany(companyId: number): Promise<SwitchCompanyResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`/api/companies/${companyId}/switch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  
  if (!response.ok) {
    throw new Error("Failed to switch company");
  }
  
  return response.json();
}

// Token management utilities for backward compatibility
export function getAccessToken(): string | null {
  // With Supabase, we need to get the session synchronously
  // This is a workaround for code that needs sync access to the token
  const session = supabase.auth.getSession();
  return null; // Will be replaced by async version
}

export function getRefreshToken(): string | null {
  return null; // Supabase manages refresh tokens internally
}

export function clearTokens(): void {
  // Tokens are managed by Supabase, clearing is done via signOut
  supabase.auth.signOut();
}

export async function refreshAccessTokenFn(): Promise<string> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    throw new Error("Failed to refresh session");
  }
  return data.session.access_token;
}

// Get access token asynchronously (preferred method)
export async function getAccessTokenAsync(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
