import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole?: string;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  role: string;
}

export interface AuthResponse {
  user: AuthUser;
  companies: Company[];
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  return response.json();
}

export async function register(userData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  const response = await apiRequest('POST', '/api/auth/register', userData);
  return response.json();
}

export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const response = await apiRequest('GET', '/api/auth/me');
  return response.json();
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
