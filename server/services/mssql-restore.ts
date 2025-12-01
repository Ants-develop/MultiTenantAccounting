// MSSQL Restore Service (Phase 2)
import { db } from '../db';
import { mssqlRestores, gdriveDownloads } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { getDownloadRecord } from './backup-download';
import { downloadFileFromDrive, calculateFileHash } from './google-drive';
import {
  downloadBackupFromStorage,
} from './backup-storage';
import {
  downloadBackupFromDriveToRemote,
  downloadBackupFromStorageToRemote,
} from './remote-backup-download';
import path from 'path';
import fs from 'fs/promises';
import { cleanupTempFile } from './google-drive';
import sql from 'mssql';
import { connectMSSQL, migrateGeneralLedger, exportToAudit } from './mssql-migration';
import os from 'os';
import { ensureBackupDirectory } from './backup-download';

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
 * Get SQL Server-accessible backup path
 * On Windows, SQL Server service account needs access to the file location
 */
async function getSQLServerBackupPath(fileName: string): Promise<string> {
  const isWindows = os.platform() === 'win32';
  
  if (isWindows) {
    // On Windows, use a location SQL Server can access
    // Try common SQL Server backup directories first
    const possiblePaths = [
      process.env.MSSQL_BACKUP_PATH,
      'C:\\Program Files\\Microsoft SQL Server\\MSSQL15.MSSQLSERVER\\MSSQL\\Backup',
      'C:\\Program Files\\Microsoft SQL Server\\MSSQL14.MSSQLSERVER\\MSSQL\\Backup',
      'C:\\Program Files\\Microsoft SQL Server\\MSSQL13.MSSQLSERVER\\MSSQL\\Backup',
      'C:\\MSSQLBackups',
      path.join(process.cwd(), 'backups'),
    ].filter(Boolean) as string[];

    // Try to use existing backup directory from backup-download service
    try {
      const backupDir = await ensureBackupDirectory();
      return path.join(backupDir, fileName);
    } catch (error) {
      console.warn('Could not use backup directory service, trying alternatives:', error);
    }

    // Find first accessible directory or create one
    for (const dirPath of possiblePaths) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        // Test write access
        const testFile = path.join(dirPath, '.test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        return path.join(dirPath, fileName);
      } catch (error) {
        continue;
      }
    }

    // Fallback: use temp directory (may fail, but better than nothing)
    console.warn('⚠️  Could not find SQL Server-accessible directory, using temp (may fail)');
    return path.join(os.tmpdir(), fileName);
  } else {
    // On Linux, try backup directory service first, then fallbacks
    try {
      const backupDir = await ensureBackupDirectory();
      return path.join(backupDir, fileName);
    } catch (error) {
      console.warn('Could not use backup directory service, trying alternatives:', error);
    }

    // Try alternative paths that might be writable
    const possiblePaths = [
      process.env.MSSQL_BACKUP_PATH,
      path.join(process.cwd(), 'backups'),
      path.join(process.cwd(), 'uploads', 'backups'),
      os.tmpdir(),
    ].filter(Boolean) as string[];

    // Find first accessible directory or create one
    for (const dirPath of possiblePaths) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        // Test write access
        const testFile = path.join(dirPath, '.test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        console.log(`✅ Using backup directory: ${dirPath}`);
        return path.join(dirPath, fileName);
      } catch (error) {
        continue;
      }
    }

    // Last resort: use temp directory
    console.warn('⚠️  Could not find writable backup directory, using temp (may fail with SQL Server)');
    return path.join(os.tmpdir(), fileName);
  }
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
    // Normalize path for SQL Server (Windows needs backslashes escaped)
    const normalizedPath = bakFilePath.replace(/\\/g, '\\\\');
    const headerResult = await pool.request()
      .query(`RESTORE HEADERONLY FROM DISK = N'${normalizedPath}'`);

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
  const operationId = `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`🔄 [MSSQL Restore] Starting database restore operation [${operationId}]`);
  console.log(`   [MSSQL Restore] Database: ${databaseName}`);
  console.log(`   [MSSQL Restore] Backup file: ${bakFilePath}`);

  onProgress?.('Connecting to MSSQL Server...');
  console.log(`   [MSSQL Restore] Connecting to MSSQL server...`);

  const pool = await sql.connect(getMSSQLConfig('master'));

  try {
    console.log(`✅ [MSSQL Restore] Connected to MSSQL server [${operationId}]`);

    // Normalize path for SQL Server (Windows needs backslashes escaped)
    const normalizedPath = bakFilePath.replace(/\\/g, '\\\\').replace(/'/g, "''");
    
    onProgress?.(`Reading backup file: ${bakFilePath}`);
    console.log(`   [MSSQL Restore] Reading backup file list from: ${bakFilePath}`);

    // Get logical file names from backup
    const fileListStartTime = Date.now();
    const fileListResult = await pool.request()
      .query(`RESTORE FILELISTONLY FROM DISK = N'${normalizedPath}'`);

    const fileListDuration = Date.now() - fileListStartTime;
    console.log(`✅ [MSSQL Restore] Retrieved file list in ${fileListDuration}ms [${operationId}]`);
    console.log(`   [MSSQL Restore] Found ${fileListResult.recordset.length} files in backup`);

    const dataFile = fileListResult.recordset.find((f: any) => f.Type === 'D');
    const logFile = fileListResult.recordset.find((f: any) => f.Type === 'L');

    if (!dataFile || !logFile) {
      console.error(`❌ [MSSQL Restore] Could not find data or log files in backup [${operationId}]`);
      throw new Error('Could not find data or log files in backup');
    }

    console.log(`   [MSSQL Restore] Data file logical name: ${dataFile.LogicalName}`);
    console.log(`   [MSSQL Restore] Log file logical name: ${logFile.LogicalName}`);

    // Generate unique file paths for restored database
    // Use Windows paths since we're restoring to remote Windows server
    const dataPath = `C:\\Program Files\\Microsoft SQL Server\\MSSQL15.MSSQLSERVER\\MSSQL\\DATA\\${databaseName}.mdf`;
    const logPath = `C:\\Program Files\\Microsoft SQL Server\\MSSQL15.MSSQLSERVER\\MSSQL\\DATA\\${databaseName}_log.ldf`;

    console.log(`   [MSSQL Restore] Data file path: ${dataPath}`);
    console.log(`   [MSSQL Restore] Log file path: ${logPath}`);

    // Escape paths for SQL
    const normalizedDataPath = dataPath.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const normalizedLogPath = logPath.replace(/\\/g, '\\\\').replace(/'/g, "''");

    onProgress?.(`Restoring database: ${databaseName}...`);
    console.log(`   [MSSQL Restore] Executing RESTORE DATABASE command [${operationId}]`);

    // Restore with MOVE to relocate files
    const restoreQuery = `
      RESTORE DATABASE [${databaseName}]
      FROM DISK = N'${normalizedPath}'
      WITH 
        MOVE N'${dataFile.LogicalName.replace(/'/g, "''")}' TO N'${normalizedDataPath}',
        MOVE N'${logFile.LogicalName.replace(/'/g, "''")}' TO N'${normalizedLogPath}',
        REPLACE,
        RECOVERY
    `;

    const restoreStartTime = Date.now();
    await pool.request().query(restoreQuery);
    const restoreDuration = Date.now() - restoreStartTime;

    const totalDuration = Date.now() - startTime;
    console.log(`✅ [MSSQL Restore] Database restored successfully [${operationId}]`);
    console.log(`   [MSSQL Restore] Restore duration: ${restoreDuration}ms`);
    console.log(`   [MSSQL Restore] Total operation time: ${totalDuration}ms`);

    onProgress?.(`✅ Database restored successfully: ${databaseName}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [MSSQL Restore] Restore failed [${operationId}] after ${duration}ms`);
    console.error(`   [MSSQL Restore] Error: ${error.message}`);
    console.error(`   [MSSQL Restore] Database: ${databaseName}`);
    console.error(`   [MSSQL Restore] Backup file: ${bakFilePath}`);
    if (error.stack) {
      console.error(`   [MSSQL Restore] Stack: ${error.stack}`);
    }
    throw error;
  } finally {
    await pool.close();
    console.log(`🔌 [MSSQL Restore] Closed MSSQL connection [${operationId}]`);
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

  // Step 1: Read backup header FIRST to get original database name
  onProgress?.({
    status: 'restoring',
    progress: 10,
    message: 'Reading backup header information...',
  });

  const headerInfo = await getBackupHeaderInfo(localFilePath);
  // Use database name from backup header, fallback to 'Audit' if not available
  const databaseName = headerInfo.databaseName || 'Audit';

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
    // Step 2: Restore database (will overwrite if database exists due to REPLACE)
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
  // Database name will be updated after reading backup header
  const [restoreRecord] = await db
    .insert(mssqlRestores)
    .values({
      googleDriveFileId: fileId,
      googleDriveFileName: fileName,
      storageSource: 'google_drive',
      restoreStatus: 'downloading',
      restoredDbName: 'Audit', // Placeholder, will be updated from backup header
      restoreTimestamp: new Date(),
      clientId: options.clientId || null,
      restoreOptions: options as any,
      isActive: true,
    })
    .returning();

  const restoreId = restoreRecord.id;
  let tempFilePath: string | null = null;
  let databaseName: string = 'Audit'; // Default fallback

  try {
    // Step 0: Test SSH connection to remote MSSQL server
    console.log(`🔄 [Restore] Starting restore from Google Drive [Restore ID: ${restoreId}]`);
    console.log(`   [Restore] File ID: ${fileId}`);
    console.log(`   [Restore] File Name: ${fileName}`);
    
    onProgress?.({
      status: 'downloading',
      progress: 5,
      message: 'Connecting to remote MSSQL server...',
    });

    console.log(`🔌 [Restore] Testing SSH connection to remote MSSQL server...`);
    try {
      const { connectSSH, executeRemoteCommand } = await import('./remote-execution');
      const testClient = await connectSSH();
      // Test with a simple command
      await executeRemoteCommand('Write-Host "Connection test successful"', { logOutput: false });
      testClient.end();
      console.log(`✅ [Restore] SSH connection verified successfully`);
    } catch (sshError: any) {
      console.error(`❌ [Restore] SSH connection test failed: ${sshError.message}`);
      throw new Error(`Failed to connect to remote MSSQL server via SSH: ${sshError.message}. Please verify SSH configuration (MSSQL_SSH_HOST, MSSQL_SSH_USER, MSSQL_SSH_PASSWORD).`);
    }

    // Step 1: Download from Google Drive to remote Windows MSSQL server
    onProgress?.({
      status: 'downloading',
      progress: 10,
      message: `Downloading ${fileName} from Google Drive to remote MSSQL server...`,
    });

    // Update database status to downloading
    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'downloading',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    console.log(`📥 [Restore] Starting download to remote MSSQL server...`);
    const downloadResult = await downloadBackupFromDriveToRemote(fileId, fileName);
    tempFilePath = downloadResult.remoteFilePath;
    const fileHash = downloadResult.fileHash;

    console.log(`✅ [Restore] File downloaded to remote server: ${tempFilePath}`);
    console.log(`   [Restore] File size: ${downloadResult.fileSize} bytes`);
    console.log(`   [Restore] File hash: ${fileHash}`);
    console.log(`🔄 [Restore] Download complete. Proceeding to restore operation...`);

    // Step 2: Read backup header to get original database name
    onProgress?.({
      status: 'restoring',
      progress: 15,
      message: 'Download complete. Reading backup header information from remote server...',
    });

    // Update database status - transitioning from downloading to restoring
    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    console.log(`📖 [Restore] Reading backup header from: ${tempFilePath}`);
    const headerInfo = await getBackupHeaderInfo(tempFilePath);
    // Use database name from backup header, fallback to 'Audit' if not available
    databaseName = headerInfo.databaseName || 'Audit';

    console.log(`   [Restore] Database name from header: ${databaseName}`);
    console.log(`   [Restore] Backup date: ${headerInfo.backupDate || 'Unknown'}`);
    console.log(`   [Restore] Backup type: ${headerInfo.backupType || 'Unknown'}`);

    // Update restore record with file hash and database name
    await db
      .update(mssqlRestores)
      .set({
        fileHash: fileHash,
        restoredDbName: databaseName,
        localBackupPath: tempFilePath,
        restoreStatus: 'restoring',
        originalBackupDate: headerInfo.backupDate,
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    // Step 3: Restore .bak file to MSSQL Server (will overwrite if database exists due to REPLACE)
    onProgress?.({
      status: 'restoring',
      progress: 20,
      message: `Restoring database ${databaseName} from .bak file on remote server...`,
    });

    console.log(`🔄 [Restore] Starting database restore operation`);
    console.log(`   [Restore] Database: ${databaseName}`);
    console.log(`   [Restore] Backup file: ${tempFilePath}`);
    console.log(`   [Restore] Restoring .bak file to MSSQL Server...`);

    if (!tempFilePath) {
      throw new Error('Failed to create backup file path');
    }
    
    // Restore the database from the .bak file
    await restoreMSSQLBackup(tempFilePath, databaseName, (msg) => {
      console.log(`   [Restore] Restore progress: ${msg}`);
      onProgress?.({ status: 'restoring', progress: 30, message: `Restoring database: ${msg}` });
    });
    
    // Update database status after restore completes
    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));
    
    console.log(`✅ [Restore] Database restore operation completed`);

    // Step 4: Calculate database size
    onProgress?.({
      status: 'restoring',
      progress: 60,
      message: 'Calculating database size...',
    });

    console.log(`📊 [Restore] Calculating database size for: ${databaseName}`);
    const databaseSizeMb = await getDatabaseSize(databaseName);
    console.log(`   [Restore] Database size: ${databaseSizeMb} MB`);

    // Step 5: Update restore record with completion and metadata
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

    console.log(`✅ [Restore] Restore completed successfully [Restore ID: ${restoreId}]`);
    console.log(`   [Restore] Database: ${databaseName}`);
    console.log(`   [Restore] Size: ${databaseSizeMb} MB`);
    console.log(`   [Restore] Backup file: ${tempFilePath}`);

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: `Database ${databaseName} restored successfully (${databaseSizeMb} MB)`,
    });

    return restoreId;
  } catch (error: any) {
    console.error(`❌ [Restore] Restore failed [Restore ID: ${restoreId}]`);
    console.error(`   [Restore] Error: ${error.message}`);
    if (error.stack) {
      console.error(`   [Restore] Stack: ${error.stack}`);
    }

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
    // Note: We don't cleanup the remote file as it's on the MSSQL server
    // and may be needed for future operations or reference
    // The file will remain on the remote server at the backup location
    console.log(`   [Restore] Backup file retained on remote server: ${tempFilePath}`);
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
  // Database name will be updated after reading backup header
  const [restoreRecord] = await db
    .insert(mssqlRestores)
    .values({
      supabaseStoragePath: storagePath,
      googleDriveFileName: path.basename(storagePath),
      storageSource: 'supabase_storage',
      restoreStatus: 'downloading',
      restoredDbName: 'Audit', // Placeholder, will be updated from backup header
      restoreTimestamp: new Date(),
      clientId: options.clientId || null,
      restoreOptions: options as any,
      isActive: true,
    })
    .returning();

  const restoreId = restoreRecord.id;
  let databaseName: string = 'Audit'; // Default fallback

  try {
    // Step 0: Test SSH connection to remote MSSQL server
    console.log(`🔄 [Restore] Starting restore from Supabase Storage [Restore ID: ${restoreId}]`);
    console.log(`   [Restore] Storage path: ${storagePath}`);
    
    onProgress?.({
      status: 'downloading',
      progress: 5,
      message: 'Connecting to remote MSSQL server...',
    });

    console.log(`🔌 [Restore] Testing SSH connection to remote MSSQL server...`);
    try {
      const { connectSSH, executeRemoteCommand } = await import('./remote-execution');
      const testClient = await connectSSH();
      // Test with a simple command
      await executeRemoteCommand('Write-Host "Connection test successful"', { logOutput: false });
      testClient.end();
      console.log(`✅ [Restore] SSH connection verified successfully`);
    } catch (sshError: any) {
      console.error(`❌ [Restore] SSH connection test failed: ${sshError.message}`);
      throw new Error(`Failed to connect to remote MSSQL server via SSH: ${sshError.message}. Please verify SSH configuration (MSSQL_SSH_HOST, MSSQL_SSH_USER, MSSQL_SSH_PASSWORD).`);
    }

    // Step 1: Download from Supabase Storage to remote Windows MSSQL server
    onProgress?.({
      status: 'downloading',
      progress: 30,
      message: 'Downloading backup from Supabase Storage to remote MSSQL server...',
    });

    // Update database status to downloading
    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'downloading',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    console.log(`📥 [Restore] Starting download to remote MSSQL server...`);
    const downloadResult = await downloadBackupFromStorageToRemote(storagePath);
    const tempFilePath = downloadResult.remoteFilePath;
    const fileHash = downloadResult.fileHash;

    console.log(`✅ [Restore] File downloaded to remote server: ${tempFilePath}`);
    console.log(`   [Restore] File size: ${downloadResult.fileSize} bytes`);
    console.log(`   [Restore] File hash: ${fileHash}`);
    console.log(`🔄 [Restore] Download complete. Proceeding to restore operation...`);

    // Step 2: Read backup header to get original database name
    onProgress?.({
      status: 'restoring',
      progress: 40,
      message: 'Download complete. Reading backup header information from remote server...',
    });

    // Update database status - transitioning from downloading to restoring
    await db
      .update(mssqlRestores)
      .set({
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    console.log(`📖 [Restore] Reading backup header from: ${tempFilePath}`);
    const headerInfo = await getBackupHeaderInfo(tempFilePath);
    // Use database name from backup header, fallback to 'Audit' if not available
    databaseName = headerInfo.databaseName || 'Audit';

    console.log(`   [Restore] Database name from header: ${databaseName}`);
    console.log(`   [Restore] Backup date: ${headerInfo.backupDate || 'Unknown'}`);
    console.log(`   [Restore] Backup type: ${headerInfo.backupType || 'Unknown'}`);

    // Update with hash and database name
    await db
      .update(mssqlRestores)
      .set({
        fileHash,
        restoredDbName: databaseName,
        localBackupPath: tempFilePath,
        originalBackupDate: headerInfo.backupDate,
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(mssqlRestores.id, restoreId));

    // Step 3: Restore database (will overwrite if database exists due to REPLACE)
    onProgress?.({
      status: 'restoring',
      progress: 50,
      message: `Restoring database ${databaseName} from remote server...`,
    });

    console.log(`🔄 [Restore] Starting database restore operation`);
    console.log(`   [Restore] Database: ${databaseName}`);
    console.log(`   [Restore] Backup file: ${tempFilePath}`);
    console.log(`   [Restore] Restoring .bak file to MSSQL Server...`);

    await restoreMSSQLBackup(tempFilePath, databaseName, (msg) => {
      console.log(`   [Restore] Restore progress: ${msg}`);
      onProgress?.({ status: 'restoring', progress: 60, message: `Restoring database: ${msg}` });
    });
    
    console.log(`✅ [Restore] Database restore operation completed`);

    // Step 4: Calculate database size
    onProgress?.({
      status: 'restoring',
      progress: 70,
      message: 'Calculating database size...',
    });

    console.log(`📊 [Restore] Calculating database size for: ${databaseName}`);
    const databaseSizeMb = await getDatabaseSize(databaseName);
    console.log(`   [Restore] Database size: ${databaseSizeMb} MB`);

    // Step 5: Update restore record with completion and metadata
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

    console.log(`✅ [Restore] Restore completed successfully [Restore ID: ${restoreId}]`);
    console.log(`   [Restore] Database: ${databaseName}`);
    console.log(`   [Restore] Size: ${databaseSizeMb} MB`);
    console.log(`   [Restore] Backup file: ${tempFilePath}`);

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: `Database ${databaseName} restored successfully (${databaseSizeMb} MB)`,
    });

    return restoreId;
  } catch (error: any) {
    console.error(`❌ [Restore] Restore failed [Restore ID: ${restoreId}]`);
    console.error(`   [Restore] Error: ${error.message}`);
    if (error.stack) {
      console.error(`   [Restore] Stack: ${error.stack}`);
    }

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
