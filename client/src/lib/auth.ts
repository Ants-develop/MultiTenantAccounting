import { apiRequest } from "./queryClient";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole?: string;
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
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

// JWT Token storage key
const ACCESS_TOKEN_KEY = 'jwt_access_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';

/**
 * Store JWT tokens in localStorage
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Check if a JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true; // If we can't parse it, consider it expired
  }
}

/**
 * Retrieve access token from localStorage
 * Automatically clears expired tokens
 */
export function getAccessToken(): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  
  // If token exists but is expired, clear it and return null
  if (token && isTokenExpired(token)) {
    clearTokens();
    return null;
  }
  
  return token;
}

/**
 * Retrieve refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear all tokens from localStorage
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Refresh access token using Supabase
 */
export async function refreshAccessTokenFn(): Promise<string | null> {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    // This app primarily uses server-side sessions (/api/auth/*).
    // Keep refresh behavior conservative to avoid noisy Supabase auth calls.
    if (!isSupabaseConfigured) {
      return refreshLegacyToken();
    }

    return refreshLegacyToken();
  } catch (error) {
    clearTokens();
    return null;
  }
}

async function refreshLegacyToken(): Promise<string | null> {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    }

    const data = await response.json();
    storeTokens(data.accessToken, getRefreshToken() || ''); // Keep old refresh token if not rotated
    return data.accessToken;
  } catch (error) {
    clearTokens();
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const response = await apiRequest('GET', '/api/auth/me');
  return response.json();
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  const legacyData = await response.json();
  if (legacyData.tokens?.accessToken && legacyData.tokens?.refreshToken) {
    storeTokens(legacyData.tokens.accessToken, legacyData.tokens.refreshToken);
  }
  return legacyData;
}

export async function register(userData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  // For register, we stick to legacy for now as it creates the local user
  // TODO: Migrate registration to Supabase + Trigger
  const response = await apiRequest('POST', '/api/auth/register', userData);
  const data = await response.json();
  
  if (data.tokens?.accessToken && data.tokens?.refreshToken) {
    storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
  }
  
  return data;
}

export async function logout(): Promise<void> {
  try {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await apiRequest('POST', '/api/auth/logout');
  } finally {
    clearTokens();
  }
}

export interface SwitchCompanyResponse {
  message: string;
  companyId: number;
  companyName: string;
}

export async function switchCompany(companyId: number): Promise<SwitchCompanyResponse> {
  const response = await apiRequest('POST', `/api/companies/${companyId}/switch`);
  return response.json();
}
