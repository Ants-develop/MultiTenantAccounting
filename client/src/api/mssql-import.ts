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
   * Unified endpoint that accepts a type parameter
   */
  startMigration: async (data: { 
    type: 'general-ledger' | 'audit' | 'update' | 'rs' | 'audit-table' | 'full-audit-export';
    tenantCode?: number;
    clientId?: number;
    batchSize?: number;
    postingsPeriodFrom?: string;
    postingsPeriodTo?: string;
    tableName?: string;
    companyTin?: string;
  }) => {
    const response = await apiRequest('POST', '/api/mssql/start-migration', data);
    return response.json();
  },

  /**
   * Start data update (incremental sync) - legacy method, uses unified endpoint
   */
  startUpdate: async (data: { tenantCode: number; clientId: number; batchSize?: number; postingsPeriodFrom?: string; postingsPeriodTo?: string }) => {
    const response = await apiRequest('POST', '/api/mssql/start-migration', {
      type: 'update',
      ...data,
    });
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

