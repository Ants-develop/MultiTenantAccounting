import { apiRequest } from "@/lib/queryClient";

export interface VerifiedCompany {
  id: number;
  name: string;
  code: string;
  companyName: string;
  companyTin: string;
  verificationStatus: string;
}

export interface SyncProgress {
  company: string;
  step: string;
  progress: number;
  message: string;
}

export interface SyncResult {
  company: string;
  type: string;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  error?: boolean;
  message?: string;
}

export interface SyncResponse {
  success: boolean;
  summary: {
    totalCompanies: number;
    totalInserted: number;
    totalUpdated: number;
    totalSkipped: number;
    totalRecords: number;
    errors: number;
  };
  results: SyncResult[];
  progress: SyncProgress[];
}

export interface SyncRequest {
  companyNames: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  autoAssociate?: boolean;
  parallelMode?: boolean;
  maxParallel?: number;
}

/**
 * Get list of verified companies with RS credentials
 */
export async function getVerifiedCompanies(): Promise<{ companies: VerifiedCompany[] }> {
  return apiRequest<{ companies: VerifiedCompany[] }>("/api/rs-sync/verified-companies", {
    method: "GET",
  });
}

/**
 * Start RS data sync for one or more companies
 */
export async function startSync(payload: SyncRequest): Promise<SyncResponse> {
  return apiRequest<SyncResponse>("/api/rs-sync/sync", {
    method: "POST",
    body: JSON.stringify({
      companyNames: payload.companyNames,
      startDate: payload.startDate,
      endDate: payload.endDate,
      autoAssociate: payload.autoAssociate ?? true,
      parallelMode: payload.parallelMode ?? false,
      maxParallel: payload.maxParallel ?? 3,
    }),
  });
}

