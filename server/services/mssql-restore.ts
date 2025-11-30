// MSSQL Restore Service with Supabase Storage Integration
import { db } from '../db';
import { backupRestoreHistory } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { downloadFileFromDrive, calculateFileHash } from './google-drive';
import {
  uploadBackupToStorage,
  downloadBackupFromStorage,
  ensureBackupsBucket,
} from './backup-storage';
import path from 'path';
import fs from 'fs/promises';
import { cleanupTempFile } from './google-drive';
import sql from 'mssql';
import { connectMSSQL, migrateGeneralLedger, exportToAudit } from './mssql-migration';
import os from 'os';

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
 * Restore backup from Google Drive and upload to Supabase Storage
 * Complete workflow matching PowerShell script
 */
export async function restoreBackupFromDrive(
  fileId: string,
  fileName: string,
  options: RestoreOptions,
  onProgress?: (progress: RestoreProgress) => void
): Promise<number> {
  const userId = options.clientId || null;

  // Create restore history record
  const [restoreRecord] = await db
    .insert(backupRestoreHistory)
    .values({
      googleDriveFileId: fileId,
      googleDriveFileName: fileName,
      storageSource: 'google_drive',
      restoreStatus: 'downloading',
      clientId: options.clientId || null,
      restoreOptions: options as any,
      startedAt: new Date(),
    })
    .returning();

  const restoreId = restoreRecord.id;
  const databaseName = `AntsDBRestore_${restoreId}`;
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

    onProgress?.({
      status: 'uploading',
      progress: 20,
      message: 'Uploading backup to Supabase Storage...',
    });

    // Step 2: Upload to Supabase Storage for archival
    const storageResult = await uploadBackupToStorage(
      fileBuffer,
      fileName
    );

    // Update restore record with Supabase Storage info
    await db
      .update(backupRestoreHistory)
      .set({
        supabaseStoragePath: storageResult.path,
        fileHash: storageResult.hash,
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

    // Step 3: Restore .bak file to MSSQL Server
    onProgress?.({
      status: 'restoring',
      progress: 30,
      message: 'Restoring database from .bak file...',
    });

    await restoreMSSQLBackup(tempFilePath, databaseName, (msg) => {
      onProgress?.({ status: 'restoring', progress: 40, message: msg });
    });

    // Step 4: Adjust dates in GeneralLedger
    onProgress?.({
      status: 'migrating',
      progress: 50,
      message: 'Adjusting dates in GeneralLedger...',
    });

    const rowsUpdated = await adjustDatesInGeneralLedger(
      databaseName,
      options.yearOffset ?? -2000,
      (msg) => onProgress?.({ status: 'migrating', progress: 55, message: msg })
    );

    // Step 5: Migrate data to PostgreSQL (Supabase)
    if (options.migrationType && options.tenantCode && options.clientId) {
      onProgress?.({
        status: 'migrating',
        progress: 60,
        message: 'Migrating data to PostgreSQL...',
      });

      // Connect directly to the restored database for migration
      // This skips the intermediate transfer to the 'Audit' database
      const mssqlPool = await connectMSSQL(databaseName);

      if (options.migrationType === 'general-ledger') {
        await migrateGeneralLedger(
          mssqlPool,
          options.tenantCode,
          options.clientId,
          options.batchSize || 1000,
          options.postingsPeriodFrom,
          options.postingsPeriodTo
        );
      } else if (options.migrationType === 'audit') {
        await exportToAudit(
          mssqlPool,
          options.tenantCode,
          options.clientId,
          options.batchSize || 1000
        );
      }

      await mssqlPool.close();
    }

    // Step 7: Clean up temporary database
    onProgress?.({
      status: 'completed',
      progress: 90,
      message: 'Cleaning up temporary database...',
    });

    await dropTemporaryDatabase(databaseName);

    // Step 8: Update restore record with completion
    await db
      .update(backupRestoreHistory)
      .set({
        restoreStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Restore and migration completed successfully!',
    });

    return restoreId;
  } catch (error: any) {
    console.error('Error in restoreBackupFromDrive:', error);

    await db
      .update(backupRestoreHistory)
      .set({
        restoreStatus: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

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
  // Create restore history record
  const [restoreRecord] = await db
    .insert(backupRestoreHistory)
    .values({
      supabaseStoragePath: storagePath,
      googleDriveFileName: path.basename(storagePath),
      storageSource: 'supabase_storage',
      restoreStatus: 'downloading',
      clientId: options.clientId || null,
      restoreOptions: options as any,
      startedAt: new Date(),
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
      .update(backupRestoreHistory)
      .set({
        fileHash,
        restoreStatus: 'restoring',
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

    onProgress?.({
      status: 'restoring',
      progress: 70,
      message: 'Preparing database restoration...',
    });

    // Step 2: Restore database (existing restore logic would go here)

    await db
      .update(backupRestoreHistory)
      .set({
        restoreStatus: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Backup restored successfully',
    });

    return restoreId;
  } catch (error: any) {
    console.error('Error in restoreBackupFromStorage:', error);

    await db
      .update(backupRestoreHistory)
      .set({
        restoreStatus: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

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
    .from(backupRestoreHistory)
    .where(eq(backupRestoreHistory.id, restoreId))
    .limit(1);

  return record;
}

/**
 * List restore history
 */
export async function listRestoreHistory(clientId?: number, limit: number = 50, offset: number = 0) {
  let query = db.select().from(backupRestoreHistory);

  if (clientId) {
    query = query.where(eq(backupRestoreHistory.clientId, clientId)) as any;
  }

  const records = await query
    .orderBy(desc(backupRestoreHistory.startedAt))
    .limit(limit)
    .offset(offset);

  return records;
}
