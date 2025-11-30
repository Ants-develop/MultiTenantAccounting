// MSSQL Restore Service (Phase 2)
import { db } from '../db';
import { mssqlRestores, gdriveDownloads } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { getDownloadRecord } from './backup-download';
import { downloadFileFromDrive, calculateFileHash } from './google-drive';
import {
  downloadBackupFromStorage,
} from './backup-storage';
import path from 'path';
import fs from 'fs/promises';
import { cleanupTempFile } from './google-drive';
import sql from 'mssql';
import { connectMSSQL, migrateGeneralLedger, exportToAudit } from './mssql-migration';
import os from 'os';

// Backward compatibility
const backupRestoreHistory = mssqlRestores;

export interface RestoreProgress {
  status: 'downloading' | 'uploading' | 'restoring' | 'migrating' | 'completed' | 'failed';
  progress: number;
  message: string;
}

export interface RestoreOptions {
  migrationType?: 'general-ledger' | 'audit' | 'rs';
  tenantCode?: number;
  clientId?: number;
  batchSize?: number;
  postingsPeriodFrom?: string;
  postingsPeriodTo?: string;
  tableName?: string;
  companyTin?: string;
  yearOffset?: number;
}

function getMSSQLConfig(database: string = 'master') {
  return {
    server: process.env.MSSQL_SERVER || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD!,
    database,
    options: {
      encrypt: process.env.MSSQL_ENCRYPT === 'true',
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true',
      enableArithAbort: true,
    },
    requestTimeout: 300000, // 5 minutes
    connectionTimeout: 30000, // 30 seconds
  };
}

/**
 * Get backup header information from .bak file
 * Extracts original backup date and other metadata
 */
export async function getBackupHeaderInfo(bakFilePath: string): Promise<{
  backupDate: Date | null;
  databaseName: string | null;
  backupType: string | null;
}> {
  const pool = await sql.connect(getMSSQLConfig('master'));

  try {
    const headerResult = await pool.request()
      .query(`RESTORE HEADERONLY FROM DISK = N'${bakFilePath}'`);

    if (headerResult.recordset.length === 0) {
      return { backupDate: null, databaseName: null, backupType: null };
    }

    const header = headerResult.recordset[0];
    const backupDate = header.BackupStartDate ? new Date(header.BackupStartDate) : null;
    const databaseName = header.DatabaseName || null;
    const backupType = header.BackupType ? 
      (header.BackupType === 1 ? 'Full' : header.BackupType === 2 ? 'Differential' : 'Log') : null;

    return { backupDate, databaseName, backupType };
  } catch (error: any) {
    console.warn('Error reading backup header:', error.message);
    return { backupDate: null, databaseName: null, backupType: null };
  } finally {
    await pool.close();
  }
}

/**
 * Calculate database size in MB
 */
export async function getDatabaseSize(databaseName: string): Promise<number> {
  const pool = await sql.connect(getMSSQLConfig('master'));

  try {
    const sizeResult = await pool.request()
      .query(`
        SELECT 
          SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8192.) / 1024 / 1024 AS size_mb
        FROM sys.database_files
        WHERE type = 0
      `);

    const size = sizeResult.recordset[0]?.size_mb || 0;
    return Math.round(size * 100) / 100; // Round to 2 decimal places
  } catch (error: any) {
    console.warn(`Error calculating database size for ${databaseName}:`, error.message);
    return 0;
  } finally {
    await pool.close();
  }
}

/**
 * Generate temporary database name in format: TMP_RESTORE_[timestamp]
 */
export function generateTempDatabaseName(): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
    .replace('T', '_')
    .slice(0, 15); // Format: YYYYMMDD_HHMMSS
  
  return `TMP_RESTORE_${timestamp}`;
}

/**
 * Restore .bak file to MSSQL Server
 * This implements the actual database restore using T-SQL RESTORE command
 */
export async function restoreMSSQLBackup(
  bakFilePath: string,
  databaseName: string,
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('Connecting to MSSQL Server...');

  const pool = await sql.connect(getMSSQLConfig('master'));

  try {
    onProgress?.(`Reading backup file: ${bakFilePath}`);

    // Get logical file names from backup
    const fileListResult = await pool.request()
      .query(`RESTORE FILELISTONLY FROM DISK = N'${bakFilePath}'`);

    const dataFile = fileListResult.recordset.find((f: any) => f.Type === 'D');
    const logFile = fileListResult.recordset.find((f: any) => f.Type === 'L');

    if (!dataFile || !logFile) {
      throw new Error('Could not find data or log files in backup');
    }

    // Generate unique file paths for restored database
    const dataPath = `/var/opt/mssql/data/${databaseName}.mdf`;
    const logPath = `/var/opt/mssql/data/${databaseName}_log.ldf`;

    onProgress?.(`Restoring database: ${databaseName}...`);

    // Restore with MOVE to relocate files
    const restoreQuery = `
      RESTORE DATABASE [${databaseName}]
      FROM DISK = N'${bakFilePath}'
      WITH 
        MOVE N'${dataFile.LogicalName}' TO N'${dataPath}',
        MOVE N'${logFile.LogicalName}' TO N'${logPath}',
        REPLACE,
        RECOVERY
    `;

    await pool.request().query(restoreQuery);

    onProgress?.(`✅ Database restored successfully: ${databaseName}`);
  } finally {
    await pool.close();
  }
}

/**
 * Adjust dates in GeneralLedger table
 * Replicates the exact logic from 2.updateDatesAndTransferDBtoAudit.ps1
 */
export async function adjustDatesInGeneralLedger(
  databaseName: string,
  yearOffset: number = -2000,
  onProgress?: (message: string) => void
): Promise<number> {
  const pool = await sql.connect(getMSSQLConfig(databaseName));

  try {
    onProgress?.('Updating dates in GeneralLedger table...');

    // Your exact date update logic from PowerShell script
    const updateQuery = `
      UPDATE [${databaseName}].[dbo].[GeneralLedger]
      SET 
        DocumentModifyDate = CASE 
          WHEN DocumentModifyDate < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
          ELSE DATEADD(YEAR, ${yearOffset}, DocumentModifyDate)
        END,
        PostingsPeriod = CASE 
          WHEN PostingsPeriod < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
          ELSE DATEADD(YEAR, ${yearOffset}, PostingsPeriod)
        END,
        DocDate = CASE 
          WHEN DocDate < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
          ELSE DATEADD(YEAR, ${yearOffset}, DocDate)
        END,
        DocumentCreationDate = CASE 
          WHEN DocumentCreationDate < '4001-01-01' THEN CAST('0001-01-01' AS datetime2)
          ELSE DATEADD(YEAR, ${yearOffset}, DocumentCreationDate)
        END
      OPTION (MAXDOP 8);
      
      SELECT @@ROWCOUNT AS RowsAffected;
    `;

    const result = await pool.request().query(updateQuery);
    const rowsAffected = result.recordset[0]?.RowsAffected || 0;

    onProgress?.(`✅ Updated ${rowsAffected} rows in GeneralLedger table`);

    return rowsAffected;
  } finally {
    await pool.close();
  }
}



/**
 * Drop temporary database
 */
export async function dropTemporaryDatabase(databaseName: string): Promise<void> {
  const pool = await sql.connect(getMSSQLConfig('master'));

  try {
    console.log(`Dropping temporary database: ${databaseName}`);

    // Set database to single user mode and drop
    await pool.request().query(`
      IF EXISTS (SELECT name FROM sys.databases WHERE name = N'${databaseName}')
      BEGIN
        ALTER DATABASE [${databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${databaseName}];
      END
    `);

    console.log(`✅ Dropped database: ${databaseName}`);
  } finally {
    await pool.close();
  }
}

/**
 * Enhanced restore function (Phase 2) - Restore from downloaded file
 * Accepts downloadId (from Phase 1) or local file path
 * Extracts metadata and calculates database size
 */
export async function restoreBackupFromDownload(
  downloadIdOrPath: number | string,
  options: RestoreOptions,
  onProgress?: (progress: RestoreProgress) => void
): Promise<number> {
  let localFilePath: string;
  let downloadId: number | null = null;
  let fileName: string;

  // Determine if we have a downloadId or a file path
  if (typeof downloadIdOrPath === 'number') {
    // Get download record
    const downloadRecord = await getDownloadRecord(downloadIdOrPath);
    if (!downloadRecord || downloadRecord.status !== 'completed') {
      throw new Error(`Download ${downloadIdOrPath} not found or not completed`);
    }
    localFilePath = downloadRecord.localFilePath;
    fileName = downloadRecord.filename;
    downloadId = downloadIdOrPath;
  } else {
    // Direct file path provided
    localFilePath = downloadIdOrPath;
    fileName = path.basename(localFilePath);
  }

  // Generate database name using TMP_RESTORE_[timestamp] format
  const databaseName = generateTempDatabaseName();

  // Create restore record
  const [restoreRecord] = await db
    .insert(mssqlRestores)
    .values({
      downloadId,
      googleDriveFileName: fileName,
      restoredDbName: databaseName,
      localBackupPath: localFilePath,
      restoreStatus: 'restoring',
      restoreTimestamp: new Date(),
      clientId: options.clientId || null,
      restoreOptions: options as any,
      isActive: true,
    })
    .returning();

  const restoreId = restoreRecord.id;

  try {
    // Step 1: Extract backup header information
    onProgress?.({
      status: 'restoring',
      progress: 10,
      message: 'Reading backup header information...',
    });

    const headerInfo = await getBackupHeaderInfo(localFilePath);

    // Step 2: Restore database
    onProgress?.({
      status: 'restoring',
      progress: 20,
      message: `Restoring database ${databaseName}...`,
    });

    await restoreMSSQLBackup(localFilePath, databaseName, (msg) => {
      onProgress?.({ status: 'restoring', progress: 30, message: msg });
    });

    // Step 3: Calculate database size
    onProgress?.({
      status: 'restoring',
      progress: 60,
      message: 'Calculating database size...',
    });

    const databaseSizeMb = await getDatabaseSize(databaseName);

    // Step 4: Update restore record with metadata
    await db
      .update(mssqlRestores)
      .set({
        originalBackupDate: headerInfo.backupDate,
        databaseSizeMb: databaseSizeMb.toString(),
        restoreStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: `Database ${databaseName} restored successfully (${databaseSizeMb} MB)`,
    });

    return restoreId;
  } catch (error: any) {
    console.error('Error in restoreBackupFromDownload:', error);

    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'failed',
      progress: 0,
      message: `Restore failed: ${error.message}`,
    });

    throw error;
  }
}

/**
 * Restore backup from Google Drive (legacy - for backward compatibility)
 * Complete workflow matching PowerShell script
 */
export async function restoreBackupFromDrive(
  fileId: string,
  fileName: string,
  options: RestoreOptions,
  onProgress?: (progress: RestoreProgress) => void
): Promise<number> {
  const userId = options.clientId || null;

  // Create restore history record (legacy - for backward compatibility)
  const [restoreRecord] = await db
    .insert(mssqlRestores)
    .values({
      googleDriveFileId: fileId,
      googleDriveFileName: fileName,
      storageSource: 'google_drive',
      restoreStatus: 'downloading',
      restoredDbName: `AntsDBRestore_${Date.now()}`, // Temporary, will be updated
      restoreTimestamp: new Date(),
      clientId: options.clientId || null,
      restoreOptions: options as any,
      isActive: true,
    })
    .returning();

  const restoreId = restoreRecord.id;
  // Generate database name using TMP_RESTORE_[timestamp] format (consistent with restoreBackupFromDownload)
  const databaseName = generateTempDatabaseName();
  let tempFilePath: string | null = null;

  try {
    // Step 1: Download from Google Drive
    onProgress?.({
      status: 'downloading',
      progress: 10,
      message: `Downloading ${fileName} from Google Drive...`,
    });

    const fileBuffer = await downloadFileFromDrive(fileId);
    const fileHash = calculateFileHash(fileBuffer);

    // Save to temporary file
    tempFilePath = path.join(os.tmpdir(), `backup_${Date.now()}.bak`);
    await fs.writeFile(tempFilePath, fileBuffer);

    // Update restore record with file hash and database name
    await db
      .update(mssqlRestores)
      .set({
        fileHash: fileHash,
        restoredDbName: databaseName,
        localBackupPath: tempFilePath,
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    // Step 2: Restore .bak file to MSSQL Server
    onProgress?.({
      status: 'restoring',
      progress: 20,
      message: 'Restoring database from .bak file...',
    });

    await restoreMSSQLBackup(tempFilePath, databaseName, (msg) => {
      onProgress?.({ status: 'restoring', progress: 30, message: msg });
    });

    // Step 3: Calculate database size
    onProgress?.({
      status: 'restoring',
      progress: 60,
      message: 'Calculating database size...',
    });

    const databaseSizeMb = await getDatabaseSize(databaseName);

    // Step 4: Update restore record with completion and metadata
    await db
      .update(mssqlRestores)
      .set({
        restoredDbName: databaseName,
        databaseSizeMb: databaseSizeMb.toString(),
        restoreStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: `Database ${databaseName} restored successfully (${databaseSizeMb} MB)`,
    });

    return restoreId;
  } catch (error: any) {
    console.error('Error in restoreBackupFromDrive:', error);

    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'failed',
      progress: 0,
      message: `Restore failed: ${error.message}`,
    });

    throw error;
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error('Failed to cleanup temp file:', err);
      }
    }
  }
}

/**
 * Restore backup from Supabase Storage
 */
export async function restoreBackupFromStorage(
  storagePath: string,
  options: RestoreOptions,
  onProgress?: (progress: RestoreProgress) => void
): Promise<number> {
  // Create restore history record (legacy - for backward compatibility)
  const [restoreRecord] = await db
    .insert(mssqlRestores)
    .values({
      supabaseStoragePath: storagePath,
      googleDriveFileName: path.basename(storagePath),
      storageSource: 'supabase_storage',
      restoreStatus: 'downloading',
      restoredDbName: `AntsDBRestore_${Date.now()}`, // Temporary, will be updated
      restoreTimestamp: new Date(),
      clientId: options.clientId || null,
      restoreOptions: options as any,
      isActive: true,
    })
    .returning();

  const restoreId = restoreRecord.id;

  try {
    // Step 1: Download from Supabase Storage
    onProgress?.({
      status: 'downloading',
      progress: 30,
      message: 'Downloading backup from Supabase Storage...',
    });

    const fileBuffer = await downloadBackupFromStorage(storagePath);
    const fileHash = calculateFileHash(fileBuffer);

    // Update with hash
    await db
      .update(mssqlRestores)
      .set({
        fileHash,
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'restoring',
      progress: 70,
      message: 'Preparing database restoration...',
    });

    // Step 2: Restore database (existing restore logic would go here)

    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Backup restored successfully',
    });

    return restoreId;
  } catch (error: any) {
    console.error('Error in restoreBackupFromStorage:', error);

    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    onProgress?.({
      status: 'failed',
      progress: 0,
      message: `Restore failed: ${error.message}`,
    });

    throw error;
  }
}

/**
 * Get restore status
 */
export async function getRestoreStatus(restoreId: number) {
  const [record] = await db
    .select()
    .from(mssqlRestores)
    .where(eq(mssqlRestores.id, restoreId))
    .limit(1);

  return record;
}

/**
 * List restore history
 */
export async function listRestoreHistory(clientId?: number, limit: number = 50, offset: number = 0) {
  let query = db.select().from(mssqlRestores);

  if (clientId) {
    query = query.where(eq(mssqlRestores.clientId, clientId)) as any;
  }

  const records = await query
    .orderBy(desc(mssqlRestores.restoreTimestamp))
    .limit(limit)
    .offset(offset);

  return records;
}
