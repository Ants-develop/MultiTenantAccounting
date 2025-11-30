// Backup Download Service (Phase 1)
// Handles downloading .bak files from Google Drive to local server storage
import { db } from '../db';
import { gdriveDownloads } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { downloadFileFromDrive, calculateFileHash } from './google-drive';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export interface DownloadResult {
  downloadId: number;
  localFilePath: string;
  fileSize: number;
  fileHash: string;
}

/**
 * Get or create the backup directory
 * Default: /var/opt/mssql/backup/ (or from env: MSSQL_BACKUP_DIR)
 */
async function ensureBackupDirectory(): Promise<string> {
  const backupDir = process.env.MSSQL_BACKUP_DIR || '/var/opt/mssql/backup';
  
  try {
    await fs.access(backupDir);
    // Directory exists
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`✅ Created backup directory: ${backupDir}`);
  }
  
  return backupDir;
}

/**
 * Download .bak file from Google Drive to local server storage
 * @param fileId Google Drive file ID
 * @param fileName Original filename
 * @param userId Optional user ID who initiated the download
 * @returns Download record ID and file information
 */
export async function downloadBackupFromDrive(
  fileId: string,
  fileName: string,
  userId?: number
): Promise<DownloadResult> {
  // Create download record
  const [downloadRecord] = await db
    .insert(gdriveDownloads)
    .values({
      gdriveFileId: fileId,
      filename: fileName,
      status: 'downloading',
      localFilePath: '', // Will be updated after download
      createdBy: userId || null,
    })
    .returning();

  const downloadId = downloadRecord.id;
  let localFilePath = '';

  try {
    // Ensure backup directory exists
    const backupDir = await ensureBackupDirectory();
    
    // Generate local file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    localFilePath = path.join(backupDir, `${timestamp}_${safeFileName}`);

    // Download file from Google Drive
    const fileBuffer = await downloadFileFromDrive(fileId);
    const fileSize = fileBuffer.length;
    const fileHash = calculateFileHash(fileBuffer);

    // Save to local file system
    await fs.writeFile(localFilePath, fileBuffer);

    // Update download record with file information
    await db
      .update(gdriveDownloads)
      .set({
        localFilePath,
        fileSizeBytes: fileSize.toString(),
        fileHash,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(gdriveDownloads.id, downloadId));

    console.log(`✅ Downloaded backup file: ${fileName} -> ${localFilePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    return {
      downloadId,
      localFilePath,
      fileSize,
      fileHash,
    };
  } catch (error: any) {
    console.error(`❌ Error downloading backup file ${fileName}:`, error);
    
    // Update download record with error
    await db
      .update(gdriveDownloads)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(gdriveDownloads.id, downloadId));

    throw new Error(`Failed to download backup file: ${error.message}`);
  }
}

/**
 * Get download record by ID
 */
export async function getDownloadRecord(downloadId: number) {
  const [record] = await db
    .select()
    .from(gdriveDownloads)
    .where(eq(gdriveDownloads.id, downloadId))
    .limit(1);
  
  return record || null;
}

/**
 * List all downloads
 */
export async function listDownloads(limit: number = 50, offset: number = 0) {
  const records = await db
    .select()
    .from(gdriveDownloads)
    .orderBy(gdriveDownloads.downloadTimestamp)
    .limit(limit)
    .offset(offset);
  
  return records;
}

/**
 * Delete download record and local file
 */
export async function deleteDownload(downloadId: number): Promise<void> {
  const record = await getDownloadRecord(downloadId);
  
  if (!record) {
    throw new Error(`Download record ${downloadId} not found`);
  }

  // Delete local file if it exists
  if (record.localFilePath) {
    try {
      await fs.unlink(record.localFilePath);
      console.log(`✅ Deleted local file: ${record.localFilePath}`);
    } catch (error: any) {
      console.warn(`⚠️ Could not delete local file ${record.localFilePath}:`, error.message);
      // Continue with record deletion even if file deletion fails
    }
  }

  // Delete download record
  await db
    .delete(gdriveDownloads)
    .where(eq(gdriveDownloads.id, downloadId));
}

