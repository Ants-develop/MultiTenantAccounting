import { apiRequest } from "@/lib/queryClient";

// =====================================================
// Types
// =====================================================

export interface ClientProfile {
  client: {
    id: number;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
  };
  teamAssignments: Array<{
    id: number;
    userId: number;
    role: string;
    assignedAt: string;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  servicePackages: Array<{
    id: number;
    packageName: string;
    services: any[];
    startDate: string;
    endDate?: string;
    isActive: boolean;
  }>;
}

export interface ClientDocument {
  id: number;
  name: string;
  category: string;
  fileType?: string;
  fileSize: number;
  version: number;
  expirationDate?: string;
  uploadedBy?: number;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface OnboardingStatus {
  steps: Array<{
    id: number;
    clientId: number;
    stepName: string;
    stepType: string;
    isCompleted: boolean;
    completedAt?: string;
    metadata?: any;
  }>;
  forms: Array<{
    id: number;
    clientId: number;
    formType: string;
    formData: any;
    status: string;
    completedAt?: string;
  }>;
  progress: number;
  completedSteps: number;
  totalSteps: number;
}

// =====================================================
// Client Profile API
// =====================================================

export async function fetchClientProfile(clientId: number): Promise<ClientProfile> {
  return apiRequest(`/api/clients/${clientId}/profile`, {
    method: "GET",
  });
}

export async function updateClientProfile(
  clientId: number,
  updates: Partial<ClientProfile["client"]>
): Promise<ClientProfile["client"]> {
  return apiRequest(`/api/clients/${clientId}/profile`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// =====================================================
// Client Documents API
// =====================================================

export async function fetchClientDocuments(
  clientId: number,
  category?: string
): Promise<ClientDocument[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiRequest(`/api/clients/${clientId}/documents${params}`, {
    method: "GET",
  });
}

export async function uploadClientDocument(
  clientId: number,
  file: File,
  name: string,
  category: string,
  expirationDate?: string
): Promise<ClientDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("category", category);
  if (expirationDate) {
    formData.append("expirationDate", expirationDate);
  }

  return apiRequest(`/api/clients/${clientId}/documents`, {
    method: "POST",
    body: formData,
    // Don't set Content-Type header, browser will set it with boundary
    headers: {},
  });
}

export async function downloadClientDocument(
  clientId: number,
  docId: number
): Promise<Blob> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || ""}/api/clients/${clientId}/documents/${docId}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`);
  }

  return response.blob();
}

export async function deleteClientDocument(
  clientId: number,
  docId: number
): Promise<void> {
  return apiRequest(`/api/clients/${clientId}/documents/${docId}`, {
    method: "DELETE",
  });
}

export async function fetchExpiringDocuments(
  clientId: number,
  days: number = 30
): Promise<ClientDocument[]> {
  return apiRequest(`/api/clients/${clientId}/documents/expiring?days=${days}`, {
    method: "GET",
  });
}

// =====================================================
// Client Onboarding API
// =====================================================

export async function startClientOnboarding(
  clientId: number,
  steps: Array<{ name: string; type: string; metadata?: any }>
): Promise<any[]> {
  return apiRequest(`/api/clients/${clientId}/onboarding/start`, {
    method: "POST",
    body: JSON.stringify({ steps }),
  });
}

export async function fetchOnboardingStatus(clientId: number): Promise<OnboardingStatus> {
  return apiRequest(`/api/clients/${clientId}/onboarding/status`, {
    method: "GET",
  });
}

export async function completeOnboardingStep(
  clientId: number,
  stepId: number
): Promise<any> {
  return apiRequest(`/api/clients/${clientId}/onboarding/complete-step`, {
    method: "POST",
    body: JSON.stringify({ stepId }),
  });
}

// =====================================================
// API Client Export
// =====================================================

export const clientManagementApi = {
  // Profile
  fetchClientProfile,
  updateClientProfile,
  
  // Documents
  fetchClientDocuments,
  uploadClientDocument,
  downloadClientDocument,
  deleteClientDocument,
  fetchExpiringDocuments,
  
  // Onboarding
  startClientOnboarding,
  fetchOnboardingStatus,
  completeOnboardingStep,
};

