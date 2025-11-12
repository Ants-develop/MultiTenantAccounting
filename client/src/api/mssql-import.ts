// MSSQL Import API Client
import { apiRequest } from "@/lib/queryClient";

export const mssqlImportApi = {
  /**
   * Fetch available tenant codes from MSSQL
   */
  fetchTenantCodes: async () => {
    const response = await apiRequest('GET', '/api/mssql/tenant-codes');
    return response.json();
  },

  /**
   * Start data migration from MSSQL to PostgreSQL
   */
  startMigration: async (data: { tenantCode: number; companyId: number; batchSize?: number }) => {
    const response = await apiRequest('POST', '/api/mssql/start-migration', data);
    return response.json();
  },

  /**
   * Start data update (incremental sync)
   */
  startUpdate: async (data: { tenantCode: number; companyId: number }) => {
    const response = await apiRequest('POST', '/api/mssql/start-update', data);
    return response.json();
  },

  /**
   * Get current migration/update status
   */
  getMigrationStatus: async () => {
    const response = await apiRequest('GET', '/api/mssql/migration-status');
    return response.json();
  },

  /**
   * Stop active migration/update
   */
  stopMigration: async () => {
    const response = await apiRequest('POST', '/api/mssql/stop-migration');
    return response.json();
  },
};

