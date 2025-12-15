// Storage API Client
import { apiRequest } from "@/lib/queryClient";

export interface Bucket {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
  created_at: string;
  updated_at: string;
  fileCount?: number;
}

export interface StorageFile {
  name: string;
  fullPath: string;
  id: string;
  size: number;
  mimeType: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface StorageFolder {
  name: string;
  path: string;
  id: string;
  created_at: string;
  updated_at: string;
}

export interface FileListResponse {
  folders: StorageFolder[];
  files: StorageFile[];
}

export interface UploadResult {
  success: number;
  failed: number;
  results: Array<{
    success: boolean;
    fileName: string;
    path?: string;
    id?: string;
    error?: string;
  }>;
}

export const storageApi = {
  /**
   * List all buckets
   */
  listBuckets: async (): Promise<Bucket[]> => {
    const response = await apiRequest("GET", "/api/storage/buckets");
    return response.json();
  },

  /**
   * Get bucket details
   */
  getBucket: async (name: string): Promise<Bucket> => {
    const response = await apiRequest("GET", `/api/storage/buckets/${encodeURIComponent(name)}`);
    return response.json();
  },

  /**
   * Create a new bucket
   */
  createBucket: async (name: string, isPublic: boolean = false): Promise<Bucket> => {
    const response = await apiRequest("POST", "/api/storage/buckets", {
      name,
      public: isPublic,
    });
    return response.json();
  },

  /**
   * Delete a bucket
   */
  deleteBucket: async (name: string): Promise<{ message: string }> => {
    const response = await apiRequest("DELETE", `/api/storage/buckets/${encodeURIComponent(name)}`);
    return response.json();
  },

  /**
   * List files in a bucket
   */
  listFiles: async (
    bucket: string,
    path: string = "",
    limit: number = 1000,
    offset: number = 0
  ): Promise<FileListResponse> => {
    const params = new URLSearchParams();
    if (path) params.append("path", path);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiRequest(
      "GET",
      `/api/storage/buckets/${encodeURIComponent(bucket)}/files?${params.toString()}`
    );
    return response.json();
  },

  /**
   * Upload file(s) to a bucket
   */
  uploadFile: async (
    bucket: string,
    files: File[],
    path: string = ""
  ): Promise<UploadResult> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    if (path) {
      formData.append("path", path);
    }

    // Import supabase locally to avoid circular dependency
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`/api/storage/buckets/${encodeURIComponent(bucket)}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text}`);
    }

    return response.json();
  },

  /**
   * Download a file from a bucket
   */
  downloadFile: async (bucket: string, filePath: string): Promise<Blob> => {
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");
    const response = await apiRequest(
      "GET",
      `/api/storage/buckets/${encodeURIComponent(bucket)}/files/${encodedPath}`
    );
    return response.blob();
  },

  /**
   * Delete a file from a bucket
   */
  deleteFile: async (bucket: string, filePath: string): Promise<{ message: string }> => {
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");
    const response = await apiRequest(
      "DELETE",
      `/api/storage/buckets/${encodeURIComponent(bucket)}/files/${encodedPath}`
    );
    return response.json();
  },

  /**
   * Move/rename a file
   */
  moveFile: async (
    bucket: string,
    oldPath: string,
    newPath: string
  ): Promise<{ message: string }> => {
    const encodedPath = encodeURIComponent(oldPath).replace(/%2F/g, "/");
    const response = await apiRequest(
      "POST",
      `/api/storage/buckets/${encodeURIComponent(bucket)}/files/${encodedPath}/move`,
      { newPath }
    );
    return response.json();
  },

  /**
   * Create a folder
   */
  createFolder: async (bucket: string, path: string, name: string): Promise<{ message: string; path: string }> => {
    const response = await apiRequest(
      "POST",
      `/api/storage/buckets/${encodeURIComponent(bucket)}/folders`,
      { path, name }
    );
    return response.json();
  },
};

