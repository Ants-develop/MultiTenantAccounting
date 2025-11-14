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
  const res = await apiRequest("GET", `/api/clients/${clientId}/profile`);
  return res.json();
}

export async function updateClientProfile(
  clientId: number,
  updates: Partial<ClientProfile["client"]>
): Promise<ClientProfile["client"]> {
  const res = await apiRequest("PUT", `/api/clients/${clientId}/profile`, updates);
  return res.json();
}

// =====================================================
// Client Documents API
// =====================================================

export async function fetchClientDocuments(
  clientId: number,
  category?: string
): Promise<ClientDocument[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await apiRequest("GET", `/api/clients/${clientId}/documents${params}`);
  return res.json();
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

  const res = await fetch(`/api/clients/${clientId}/documents`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
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
  await apiRequest("DELETE", `/api/clients/${clientId}/documents/${docId}`);
}

export async function fetchExpiringDocuments(
  clientId: number,
  days: number = 30
): Promise<ClientDocument[]> {
  const res = await apiRequest("GET", `/api/clients/${clientId}/documents/expiring?days=${days}`);
  return res.json();
}

// =====================================================
// Client Onboarding API
// =====================================================

export async function startClientOnboarding(
  clientId: number,
  steps: Array<{ name: string; type: string; metadata?: any }>
): Promise<any[]> {
  const res = await apiRequest("POST", `/api/clients/${clientId}/onboarding/start`, { steps });
  return res.json();
}

export async function fetchOnboardingStatus(clientId: number): Promise<OnboardingStatus> {
  const res = await apiRequest("GET", `/api/clients/${clientId}/onboarding/status`);
  return res.json();
}

export async function completeOnboardingStep(
  clientId: number,
  stepId: number
): Promise<any> {
  const res = await apiRequest("POST", `/api/clients/${clientId}/onboarding/complete-step`, { stepId });
  return res.json();
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

