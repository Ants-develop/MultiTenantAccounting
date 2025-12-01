// Google Drive Service for Backup & Restore
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost';
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

// Create OAuth2 client
function getOAuth2Client(): OAuth2Client {
  const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  
  if (REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN,
    });
  }
  
  return oauth2Client;
}

/**
 * Generate OAuth2 authorization URL
 */
export function generateAuthUrl(): { url: string; clientId: string } {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return {
    url: authUrl,
    clientId: CLIENT_ID,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{ refreshToken: string; accessToken: string }> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. Make sure to set access_type to "offline" and prompt to "consent"');
  }

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token || '',
  };
}

/**
 * Get Google Drive API client
 */
export async function getDriveClient() {
  const oauth2Client = getOAuth2Client();
  
  if (!REFRESH_TOKEN) {
    throw new Error('Google Drive refresh token is not configured');
  }

  // Refresh access token if needed
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
  } catch (error) {
    console.error('Error refreshing Google Drive token:', error);
    throw new Error('Failed to refresh Google Drive access token');
  }

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * List .bak files from Google Drive
 */
export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  mimeType: string;
}

export async function listBackupFiles(): Promise<DriveFile[]> {
  try {
    const drive = await getDriveClient();
    
    const response = await drive.files.list({
      q: "name contains '.bak' and trashed=false",
      fields: 'files(id, name, size, modifiedTime, mimeType)',
      orderBy: 'modifiedTime desc',
      pageSize: 100,
    });

    const files = (response.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      size: parseInt(file.size || '0', 10),
      modifiedTime: file.modifiedTime || '',
      mimeType: file.mimeType || 'application/octet-stream',
    }));

    return files;
  } catch (error: any) {
    console.error('Error listing Google Drive files:', error);
    throw new Error(`Failed to list Google Drive files: ${error.message}`);
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  try {
    const drive = await getDriveClient();
    
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, size, modifiedTime, mimeType',
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      size: parseInt(response.data.size || '0', 10),
      modifiedTime: response.data.modifiedTime || '',
      mimeType: response.data.mimeType || 'application/octet-stream',
    };
  } catch (error: any) {
    console.error('Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Download file from Google Drive to buffer
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  try {
    const drive = await getDriveClient();
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    console.error('Error downloading file from Google Drive:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Calculate file hash (MD5)
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Cleanup temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }
}

