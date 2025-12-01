// Remote Backup Download Service
// Downloads backup files directly to remote Windows MSSQL server via SSH
import { executeRemoteCommand, getRemoteBackupPath, verifyRemoteFile, downloadFileToRemote, uploadFileBufferToRemote } from './remote-execution';
import { downloadFileFromDrive, calculateFileHash } from './google-drive';
import { downloadBackupFromStorage } from './backup-storage';
import crypto from 'crypto';

export interface RemoteDownloadResult {
  remoteFilePath: string;
  fileSize: number;
  fileHash: string;
}

/**
 * Download backup file from Google Drive to remote Windows server
 */
export async function downloadBackupFromDriveToRemote(
  fileId: string,
  fileName: string
): Promise<RemoteDownloadResult> {
  const operationId = `gdrive-remote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`📥 [Remote Download] Starting Google Drive download [${operationId}]`);
  console.log(`   [Remote Download] File ID: ${fileId}`);
  console.log(`   [Remote Download] File Name: ${fileName}`);

  try {
    // Step 1: Get remote backup path
    const remoteFilePath = await getRemoteBackupPath(fileName);
    console.log(`   [Remote Download] Remote path: ${remoteFilePath}`);

    // Step 2: Stream file from Google Drive directly to remote server in chunks
    console.log(`   [Remote Download] Step 1: Streaming from Google Drive to remote server...`);
    
    // Get file size first
    const { getDriveClient } = await import('./google-drive');
    const drive = await getDriveClient();
    const fileMetadata = await drive.files.get({ fileId, fields: 'size' });
    const fileSize = parseInt((fileMetadata.data as any).size || '0', 10);
    
    console.log(`   [Remote Download] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Stream file in chunks and upload to remote server using SFTP
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const totalChunks = Math.ceil(fileSize / chunkSize);
    let downloadedBytes = 0;
    const fileHash = crypto.createHash('md5');
    const allChunks: Buffer[] = [];

    console.log(`   [Remote Download] Streaming ${totalChunks} chunks from Google Drive...`);

    // Download all chunks from Google Drive first
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startByte = chunkIndex * chunkSize;
      const endByte = Math.min(startByte + chunkSize - 1, fileSize - 1);
      const currentChunkSize = endByte - startByte + 1;

      console.log(`   [Remote Download] Downloading chunk ${chunkIndex + 1}/${totalChunks} (${(currentChunkSize / 1024 / 1024).toFixed(2)} MB)...`);

      // Download chunk from Google Drive with range request
      const chunkResponse = await drive.files.get(
        { fileId, alt: 'media' },
        { 
          responseType: 'arraybuffer',
          headers: {
            Range: `bytes=${startByte}-${endByte}`
          }
        }
      );

      const chunkBuffer = Buffer.from(chunkResponse.data as ArrayBuffer);
      fileHash.update(chunkBuffer);
      allChunks.push(chunkBuffer);
      downloadedBytes += chunkBuffer.length;

      const progress = ((downloadedBytes / fileSize) * 100).toFixed(1);
      console.log(`   [Remote Download] Download progress: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB / ${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Combine all chunks into single buffer
    console.log(`   [Remote Download] Combining chunks and uploading via SFTP...`);
    const fullBuffer = Buffer.concat(allChunks);
    const finalHash = fileHash.digest('hex');
    const finalFileSize = downloadedBytes;

    // Upload complete file via SFTP (much more efficient than PowerShell commands)
    const sftpRemotePath = remoteFilePath.replace(/\\/g, '/'); // SFTP uses forward slashes
    await uploadFileBufferToRemote(fullBuffer, sftpRemotePath, (uploaded, total) => {
      const progress = ((uploaded / total) * 100).toFixed(1);
      if (uploaded % (10 * 1024 * 1024) === 0 || uploaded === total) {
        console.log(`   [Remote Download] Upload progress: ${progress}% (${(uploaded / 1024 / 1024).toFixed(2)} MB / ${(total / 1024 / 1024).toFixed(2)} MB)`);
      }
    });

    console.log(`   [Remote Download] File hash: ${finalHash}`);

    // Step 3: Verify file on remote server
    console.log(`   [Remote Download] Step 2: Verifying file on remote server...`);
    const verified = await verifyRemoteFile(remoteFilePath);
    
    if (!verified) {
      throw new Error('File verification failed on remote server');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Remote Download] Google Drive download completed [${operationId}] in ${duration}ms`);
    console.log(`   [Remote Download] Remote file: ${remoteFilePath}`);
    console.log(`   [Remote Download] File size: ${finalFileSize} bytes`);
    console.log(`   [Remote Download] File hash: ${finalHash}`);

    return {
      remoteFilePath,
      fileSize: finalFileSize,
      fileHash: finalHash,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Remote Download] Google Drive download failed [${operationId}] after ${duration}ms`);
    console.error(`   [Remote Download] Error: ${error.message}`);
    if (error.stack) {
      console.error(`   [Remote Download] Stack: ${error.stack}`);
    }
    throw error;
  }
}

/**
 * Download backup file from Supabase Storage to remote Windows server
 */
export async function downloadBackupFromStorageToRemote(
  storagePath: string
): Promise<RemoteDownloadResult> {
  const operationId = `storage-remote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const fileName = storagePath.split('/').pop() || `backup_${Date.now()}.bak`;

  console.log(`📥 [Remote Download] Starting Supabase Storage download [${operationId}]`);
  console.log(`   [Remote Download] Storage path: ${storagePath}`);
  console.log(`   [Remote Download] File name: ${fileName}`);

  try {
    // Step 1: Get remote backup path
    const remoteFilePath = await getRemoteBackupPath(fileName);
    console.log(`   [Remote Download] Remote path: ${remoteFilePath}`);

    // Step 2: Stream file from Supabase Storage directly to remote server in chunks
    console.log(`   [Remote Download] Step 1: Streaming from Supabase Storage to remote server...`);
    
    // Note: Supabase storage download might not support range requests
    // So we'll download in chunks if possible, otherwise download full file in memory-safe chunks
    const { downloadBackupFromStorage } = await import('./backup-storage');
    
    // For now, download the full file but process it in chunks
    // In the future, we could implement range requests if Supabase supports it
    console.log(`   [Remote Download] Downloading file from Supabase Storage...`);
    const fileBuffer = await downloadBackupFromStorage(storagePath);
    const fileSize = fileBuffer.length;
    
    console.log(`   [Remote Download] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Calculate hash and upload via SFTP
    const storageFileHash = crypto.createHash('md5');
    storageFileHash.update(fileBuffer);
    const finalHash = storageFileHash.digest('hex');

    console.log(`   [Remote Download] File hash: ${finalHash}`);
    console.log(`   [Remote Download] Uploading via SFTP...`);

    // Upload complete file via SFTP (much more efficient than PowerShell commands)
    const sftpRemotePath = remoteFilePath.replace(/\\/g, '/'); // SFTP uses forward slashes
    await uploadFileBufferToRemote(fileBuffer, sftpRemotePath, (uploaded, total) => {
      const progress = ((uploaded / total) * 100).toFixed(1);
      if (uploaded % (10 * 1024 * 1024) === 0 || uploaded === total) {
        console.log(`   [Remote Download] Upload progress: ${progress}% (${(uploaded / 1024 / 1024).toFixed(2)} MB / ${(total / 1024 / 1024).toFixed(2)} MB)`);
      }
    });

    // Step 3: Verify file on remote server
    console.log(`   [Remote Download] Step 2: Verifying file on remote server...`);
    const verified = await verifyRemoteFile(remoteFilePath);
    
    if (!verified) {
      throw new Error('File verification failed on remote server');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Remote Download] Supabase Storage download completed [${operationId}] in ${duration}ms`);
    console.log(`   [Remote Download] Remote file: ${remoteFilePath}`);
    console.log(`   [Remote Download] File size: ${fileSize} bytes`);
    console.log(`   [Remote Download] File hash: ${finalHash}`);

    return {
      remoteFilePath,
      fileSize,
      fileHash: finalHash,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Remote Download] Supabase Storage download failed [${operationId}] after ${duration}ms`);
    console.error(`   [Remote Download] Error: ${error.message}`);
    if (error.stack) {
      console.error(`   [Remote Download] Stack: ${error.stack}`);
    }
    throw error;
  }
}

