// Backup Storage Service - Integrates Supabase Storage with Backup & Restore
import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

const BACKUP_BUCKET_NAME = 'backups';

/**
 * Ensure backups bucket exists, create if it doesn't
 */
export async function ensureBackupsBucket(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some(b => b.name === BACKUP_BUCKET_NAME);
    
    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BACKUP_BUCKET_NAME, {
        public: false,
        fileSizeLimit: 5242880000, // 5GB limit for backup files
        allowedMimeTypes: ['application/octet-stream', 'application/x-sql', 'application/x-bak'],
      });

      if (createError) {
        throw new Error(`Failed to create backups bucket: ${createError.message}`);
      }
      
      console.log(`✅ Created backups bucket: ${BACKUP_BUCKET_NAME}`);
    }
  } catch (error: any) {
    console.error('Error ensuring backups bucket:', error);
    throw error;
  }
}

/**
 * Generate backup file path in Supabase Storage
 * Format: {YYYY-MM-DD}/{filename}.bak
 */
export function generateBackupPath(fileName: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Sanitize filename
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return `${dateStr}/${sanitizedFileName}`;
}

/**
 * Upload backup file to Supabase Storage
 */
export async function uploadBackupToStorage(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ path: string; hash: string; size: number }> {
  try {
    // Ensure bucket exists
    await ensureBackupsBucket();

    // Generate file path
    const storagePath = generateBackupPath(fileName);

    // Calculate file hash
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Failed to upload backup to Supabase Storage: ${error.message}`);
    }

    return {
      path: storagePath,
      hash,
      size: fileBuffer.length,
    };
  } catch (error: any) {
    console.error('Error uploading backup to storage:', error);
    throw error;
  }
}

/**
 * Download backup file from Supabase Storage
 */
export async function downloadBackupFromStorage(storagePath: string): Promise<Buffer> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET_NAME)
      .download(storagePath);

    if (error) {
      throw new Error(`Failed to download backup from Supabase Storage: ${error.message}`);
    }

    // Convert Blob to Buffer
    if (data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return Buffer.from(data);
  } catch (error: any) {
    console.error('Error downloading backup from storage:', error);
    throw error;
  }
}

/**
 * Get backup file metadata from Supabase Storage
 */
export async function getBackupMetadata(storagePath: string): Promise<{
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}> {
  try {
    const pathParts = storagePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folderPath = pathParts.slice(0, -1).join('/');

    const { data: files, error } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET_NAME)
      .list(folderPath, {
        limit: 1,
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    const file = files?.find(f => f.name === fileName);
    
    if (!file) {
      throw new Error(`Backup file not found: ${storagePath}`);
    }

    return {
      name: file.name,
      size: file.metadata?.size || 0,
      created_at: file.created_at,
      updated_at: file.updated_at,
      metadata: file.metadata,
    };
  } catch (error: any) {
    console.error('Error getting backup metadata:', error);
    throw error;
  }
}

/**
 * List backup files from Supabase Storage
 * Recursively lists all .bak files from all date folders
 */
export async function listBackupsFromStorage(): Promise<Array<{
  path: string;
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
}>> {
  try {
    // Check if bucket exists without creating it
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.warn('Failed to list buckets, returning empty array:', listError.message);
      return [];
    }

    const bucketExists = buckets?.some(b => b.name === BACKUP_BUCKET_NAME);
    
    if (!bucketExists) {
      // Bucket doesn't exist - return empty array instead of creating it
      console.log(`Backups bucket does not exist, returning empty array`);
      return [];
    }

    // List all folders (date folders) in the root
    const { data: folders, error: foldersError } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET_NAME)
      .list('', {
        limit: 1000,
      });

    if (foldersError) {
      console.warn('Failed to list folders, returning empty array:', foldersError.message);
      return [];
    }

    const backups: Array<{
      path: string;
      name: string;
      size: number;
      created_at: string;
      updated_at: string;
    }> = [];

    // Iterate through each date folder
    for (const folder of folders || []) {
      if (folder.id && folder.name) {
        // This is a folder (date folder like YYYY-MM-DD)
        const { data: files, error: filesError } = await supabaseAdmin.storage
          .from(BACKUP_BUCKET_NAME)
          .list(folder.name, {
            limit: 1000,
          });

        if (filesError) {
          console.warn(`Error listing files in folder ${folder.name}:`, filesError);
          continue;
        }

        // Add .bak files from this folder
        (files || [])
          .filter(f => f.name && f.name.endsWith('.bak'))
          .forEach(file => {
            backups.push({
              path: `${folder.name}/${file.name}`,
              name: file.name,
              size: file.metadata?.size || 0,
              created_at: file.created_at,
              updated_at: file.updated_at,
            });
          });
      } else if (folder.name && folder.name.endsWith('.bak')) {
        // Direct .bak file in root (legacy or direct upload)
        backups.push({
          path: folder.name,
          name: folder.name,
          size: folder.metadata?.size || 0,
          created_at: folder.created_at,
          updated_at: folder.updated_at,
        });
      }
    }

    // Sort by created_at descending
    backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return backups;
  } catch (error: any) {
    // Gracefully handle errors - return empty array instead of throwing
    // This allows the UI to work even if Supabase Storage is not configured or bucket doesn't exist
    console.warn('Error listing backups from storage (returning empty array):', error.message);
    return [];
  }
}

/**
 * Delete backup file from Supabase Storage
 */
export async function deleteBackupFromStorage(storagePath: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error deleting backup from storage:', error);
    throw error;
  }
}

