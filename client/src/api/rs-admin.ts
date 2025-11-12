import { apiRequest } from "@/lib/queryClient";

export interface MainUserValidationResponse {
  serviceUsers: string[];
  rsUserId: string | null;
}

export interface ServiceUserValidationResponse {
  unId: string;
  serviceUserId: string | null;
  companyTin: string;
  companyName: string | null;
}

export interface RsCredential {
  id: number;
  companyId: number | null;
  companyName: string | null;
  companyTin: string | null;
  mainUser: string | null;
  serviceUser: string | null;
  rsUserId: string | null;
  unId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateRsCredentialPayload {
  mainUser: string;
  mainPassword: string;
  serviceUser: string;
  servicePassword: string;
  companyTin: string;
  companyName: string;
  rsUserId?: string | null;
  unId?: string | null;
}

export interface UpdateRsCredentialPayload {
  mainUser: string;
  mainPassword?: string;
  serviceUser: string;
  servicePassword?: string;
  companyTin: string;
  companyName: string;
  rsUserId?: string | null;
  unId?: string | null;
}

export async function validateMainUserCredentials(payload: {
  username: string;
  password: string;
}): Promise<MainUserValidationResponse> {
  const response = await apiRequest("POST", "/api/rs-admin/main-user/validate", payload);
  return response.json();
}

export async function validateServiceUserCredentials(payload: {
  serviceUser: string;
  servicePassword: string;
}): Promise<ServiceUserValidationResponse> {
  const response = await apiRequest("POST", "/api/rs-admin/service-user/validate", payload);
  return response.json();
}

export async function fetchRsCredentials(scope: "company" | "all" = "company"): Promise<RsCredential[]> {
  const query = scope === "all" ? "?scope=all" : "";
  const response = await apiRequest("GET", `/api/rs-admin/credentials${query}`);
  const data = await response.json();
  return data?.data ?? [];
}

export async function createRsCredential(payload: CreateRsCredentialPayload): Promise<RsCredential> {
  const response = await apiRequest("POST", "/api/rs-admin/credentials", payload);
  const data = await response.json();
  return data?.credential;
}

export async function updateRsCredential(id: number, payload: UpdateRsCredentialPayload): Promise<RsCredential> {
  const response = await apiRequest("PUT", `/api/rs-admin/credentials/${id}`, payload);
  const data = await response.json();
  return data?.credential;
}

export async function deleteRsCredential(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/rs-admin/credentials/${id}`);
}

