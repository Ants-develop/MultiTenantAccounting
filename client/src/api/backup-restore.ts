// Backup Restore API Client with Supabase Storage Integration
import { apiRequest } from "@/lib/queryClient";

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  mimeType: string;
}

export interface StorageBackup {
  path: string;
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
}

export interface RestoreOptions {
  migrationType?: "general-ledger" | "audit" | "rs";
  tenantCode?: number;
  clientId?: number;
  batchSize?: number;
  postingsPeriodFrom?: string;
  postingsPeriodTo?: string;
  tableName?: string;
  companyTin?: string;
}

export interface RestoreStatus {
  id: number;
  googleDriveFileId?: string;
  googleDriveFileName: string;
  supabaseStoragePath?: string;
  fileHash?: string;
  storageSource: "google_drive" | "supabase_storage";
  tempDatabaseName?: string;
  restoreStatus: "pending" | "downloading" | "uploading" | "restoring" | "migrating" | "completed" | "failed";
  clientId?: number;
  restoreOptions?: RestoreOptions;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  progress?: number;
  message?: string;
}

export interface RestoreHistory {
  id: number;
  googleDriveFileId?: string;
  googleDriveFileName: string;
  supabaseStoragePath?: string;
  fileHash?: string;
  storageSource: "google_drive" | "supabase_storage";
  tempDatabaseName?: string;
  restoreStatus: string;
  clientId?: number;
  restoreOptions?: RestoreOptions;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  createdBy?: number;
}

export interface ConfigStatus {
  googleDrive: {
    configured: boolean;
    missing: {
      clientId: boolean;
      clientSecret: boolean;
      refreshToken: boolean;
    };
  };
  supabase: {
    configured: boolean;
    missing: {
      url: boolean;
      serviceRoleKey: boolean;
    };
  };
  message: string;
}

export interface BackupMetadata {
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export const backupRestoreApi = {
  /**
   * Check configuration status for Google Drive and Supabase Storage
   */
  checkConfigStatus: async (): Promise<ConfigStatus> => {
    const response = await apiRequest("GET", "/api/backup-restore/config-status");
    return response.json();
  },

  /**
   * Generate OAuth2 authorization URL for Google Drive
   */
  generateAuthUrl: async (): Promise<{ url: string; clientId: string }> => {
    const response = await apiRequest("GET", "/api/backup-restore/auth-url");
    return response.json();
  },

  /**
   * Exchange authorization code for refresh token
   */
  exchangeCode: async (code: string): Promise<{ refreshToken: string; message: string; instructions: string[] }> => {
    const response = await apiRequest("POST", "/api/backup-restore/exchange-code", { code });
    return response.json();
  },

  /**
   * Fetch available .bak files from Google Drive
   */
  fetchDriveFiles: async (): Promise<DriveFile[]> => {
    const response = await apiRequest("GET", "/api/backup-restore/drive-files");
    return response.json();
  },

  /**
   * List backup files from Supabase Storage
   */
  listStorageBackups: async (): Promise<StorageBackup[]> => {
    const response = await apiRequest("GET", "/api/backup-restore/storage-files");
    return response.json();
  },

  /**
   * Get backup file metadata from Supabase Storage
   */
  getBackupMetadata: async (storagePath: string): Promise<BackupMetadata> => {
    const encodedPath = encodeURIComponent(storagePath).replace(/%2F/g, "/");
    const response = await apiRequest("GET", `/api/backup-restore/storage-files/${encodedPath}/metadata`);
    return response.json();
  },

  /**
   * Upload .bak file directly to Supabase Storage
   */
  uploadBackupToStorage: async (file: File): Promise<{ id: number; path: string; hash: string; size: number; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/backup-restore/upload-to-storage", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text}`);
    }

    return response.json();
  },

  /**
   * Start restore process from Google Drive or Supabase Storage
   */
  startRestore: async (
    fileId?: string,
    fileName?: string,
    storagePath?: string,
    options?: RestoreOptions
  ): Promise<{ restoreId: number; message: string }> => {
    const response = await apiRequest("POST", "/api/backup-restore/restore", {
      fileId,
      fileName,
      storagePath,
      options,
    });
    return response.json();
  },

  /**
   * Get restore status
   */
  getRestoreStatus: async (restoreId: number): Promise<RestoreStatus> => {
    const response = await apiRequest("GET", `/api/backup-restore/status/${restoreId}`);
    return response.json();
  },

  /**
   * Cancel active restore
   */
  cancelRestore: async (restoreId: number): Promise<{ message: string }> => {
    const response = await apiRequest("POST", `/api/backup-restore/cancel/${restoreId}`);
    return response.json();
  },

  /**
   * Fetch restore history
   */
  fetchRestoreHistory: async (clientId?: number, limit = 50, offset = 0): Promise<RestoreHistory[]> => {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId.toString());
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiRequest("GET", `/api/backup-restore/history?${params.toString()}`);
    return response.json();
  },

  /**
   * Delete backup file from Supabase Storage
   */
  deleteBackupFromStorage: async (storagePath: string): Promise<{ message: string }> => {
    const encodedPath = encodeURIComponent(storagePath).replace(/%2F/g, "/");
    const response = await apiRequest("DELETE", `/api/backup-restore/storage-files/${encodedPath}`);
    return response.json();
  },

  /**
   * List all restored MSSQL databases
   */
  listRestoredDatabases: async (clientId?: number, isActive: boolean = true): Promise<RestoredDatabase[]> => {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId.toString());
    if (!isActive) params.append("isActive", "false");

    const response = await apiRequest("GET", `/api/backup-restore/restored-databases?${params.toString()}`);
    return response.json();
  },

  /**
   * Execute migration from restored database
   */
  executeMigration: async (options: MigrationOptions): Promise<{ success: boolean; message: string; migrationLogId: number }> => {
    const response = await apiRequest("POST", "/api/backup-restore/migrate", options);
    return response.json();
  },

  /**
   * Get migration logs
   */
  getMigrationLogs: async (restoreId?: number, limit: number = 50, offset: number = 0): Promise<MigrationLog[]> => {
    const params = new URLSearchParams();
    if (restoreId) params.append("restoreId", restoreId.toString());
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiRequest("GET", `/api/backup-restore/migration-logs?${params.toString()}`);
    return response.json();
  },

  /**
   * Get specific migration log details
   */
  getMigrationLog: async (id: number): Promise<MigrationLog> => {
    const response = await apiRequest("GET", `/api/backup-restore/migration-logs/${id}`);
    return response.json();
  },
};

export interface RestoredDatabase {
  id: number;
  downloadId?: number;
  googleDriveFileId?: string;
  googleDriveFileName: string;
  supabaseStoragePath?: string;
  fileHash?: string;
  storageSource: "google_drive" | "supabase_storage";
  restoredDbName: string;
  restoreTimestamp: string;
  originalBackupDate?: string;
  databaseSizeMb?: string;
  isActive: boolean;
  localBackupPath?: string;
  restoreStatus: string;
  clientId?: number;
  restoreOptions?: RestoreOptions;
  completedAt?: string;
  errorMessage?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MigrationOptions {
  restoreId: number;
  migrationType: "general-ledger" | "audit" | "rs";
  tenantCode: number;
  clientId: number;
  batchSize?: number;
  postingsPeriodFrom?: string;
  postingsPeriodTo?: string;
}

export interface MigrationLog {
  id: number;
  restoreId: number;
  sourceTable: string;
  targetTable: string;
  recordsProcessed: number;
  recordsInserted: number;
  recordsFailed: number;
  migrationTimestamp: string;
  status: "pending" | "running" | "completed" | "failed";
  errorLog?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

