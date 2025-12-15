import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Document {
  id: number;
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  clientId: number | null;
  uploadedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      return response.json();
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: { name: string; url: string; type?: string; size?: number }) => {
      const response = await apiRequest("POST", "/api/documents", document);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
