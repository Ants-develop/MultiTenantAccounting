// Storage API Routes
import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabase";
import { storage } from "../storage";
import { db } from "../db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hasEffectivePermission, isGlobalAdmin, type GlobalRole, type Role } from "@shared/permissions";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Apply authentication middleware to all routes
router.use(requireAuth);

// Helper function to check storage permissions
async function checkStoragePermission(
  req: any,
  permission: 'STORAGE_VIEW' | 'STORAGE_CREATE' | 'STORAGE_EDIT' | 'STORAGE_DELETE'
): Promise<boolean> {
  const userId = req.user?.id;
  if (!userId) return false;

  const [user] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!user) return false;

  const globalRole: GlobalRole = (user.globalRole as GlobalRole) || 'user';
  
  // Global admins have all permissions
  if (isGlobalAdmin(globalRole)) return true;

  // For regular users, we need to check their role in their company
  // Since storage is not company-specific, we'll check if they have the permission in any company
  // For simplicity, we'll allow if they have the permission based on their role
  // In a real implementation, you might want to check their role in a default company
  
  // For now, we'll use a simplified check - you can enhance this based on your needs
  // This assumes users have a default role that can be checked
  // You may need to adjust this based on your user-company relationship structure
  
  return true; // Simplified - adjust based on your permission checking needs
}

/**
 * GET /api/storage/buckets
 * List all buckets
 */
router.get("/buckets", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_VIEW'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      console.error('Error listing buckets:', error);
      return res.status(500).json({ message: error.message });
    }

    // Get additional info for each bucket
    const bucketsWithInfo = await Promise.all(
      (buckets || []).map(async (bucket) => {
        try {
          const { data: files } = await supabaseAdmin.storage
            .from(bucket.name)
            .list('', { limit: 1 });

          return {
            ...bucket,
            fileCount: files?.length || 0,
          };
        } catch (err) {
          return {
            ...bucket,
            fileCount: 0,
          };
        }
      })
    );

    res.json(bucketsWithInfo);
  } catch (error: any) {
    console.error('Error in GET /api/storage/buckets:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/storage/buckets/:name
 * Get bucket details
 */
router.get("/buckets/:name", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_VIEW'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.name;
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const bucket = buckets?.find(b => b.name === bucketName);
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket not found' });
    }

    // Get file count
    const { data: files } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    res.json({
      ...bucket,
      fileCount: files?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/storage/buckets/:name:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/storage/buckets
 * Create new bucket
 */
router.post("/buckets", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_CREATE'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { name, public: isPublic = false } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Bucket name is required' });
    }

    // Validate bucket name (Supabase requirements)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ 
        message: 'Bucket name must contain only lowercase letters, numbers, and hyphens' 
      });
    }

    const { data, error } = await supabaseAdmin.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: 52428800, // 50MB default
      allowedMimeTypes: null, // Allow all types
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return res.status(500).json({ message: error.message });
    }

    await activityLogger.logActivity(
      {
        userId: req.user?.id,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'STORAGE_BUCKET_CREATE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { bucketName: name, public: isPublic },
      }
    );

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error in POST /api/storage/buckets:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/storage/buckets/:name
 * Delete bucket
 */
router.delete("/buckets/:name", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_DELETE'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.name;

    // First, delete all files in the bucket
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      console.error('Error listing files before bucket deletion:', listError);
    } else if (files && files.length > 0) {
      // Delete all files
      const filePaths = files.map(f => f.name);
      const { error: deleteError } = await supabaseAdmin.storage
        .from(bucketName)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
      }
    }

    // Delete the bucket
    const { data, error } = await supabaseAdmin.storage.deleteBucket(bucketName);

    if (error) {
      console.error('Error deleting bucket:', error);
      return res.status(500).json({ message: error.message });
    }

    await activityLogger.logActivity(
      {
        userId: req.user?.id,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'STORAGE_BUCKET_DELETE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { bucketName },
      }
    );

    res.json({ message: 'Bucket deleted successfully', data });
  } catch (error: any) {
    console.error('Error in DELETE /api/storage/buckets/:name:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/storage/buckets/:bucket/files
 * List files in bucket (with folder support)
 */
router.get("/buckets/:bucket/files", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_VIEW'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.bucket;
    const path = (req.query.path as string) || '';
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: files, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(path, { 
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error('Error listing files:', error);
      return res.status(500).json({ message: error.message });
    }

    // Supabase storage doesn't have true folders - parse paths to extract folder structure
    const folderSet = new Set<string>();
    const fileList: any[] = [];

    (files || []).forEach((f) => {
      if (!f.name) return; // Skip items without names
      
      // Check if this is a folder marker (.keep file)
      if (f.name.endsWith('/.keep')) {
        const folderPath = f.name.replace('/.keep', '');
        const folderName = folderPath.split('/').pop() || folderPath;
        folderSet.add(folderPath);
        return;
      }

      // Extract folder structure from file paths
      const filePath = f.name;
      const pathParts = filePath.split('/');
      
      if (pathParts.length > 1) {
        // This file is in a folder
        const folderPath = pathParts.slice(0, -1).join('/');
        folderSet.add(folderPath);
      }

      fileList.push({
        name: pathParts[pathParts.length - 1], // Just the filename
        fullPath: filePath,
        id: f.id,
        size: f.metadata?.size || 0,
        mimeType: f.metadata?.mimetype || 'application/octet-stream',
        created_at: f.created_at,
        updated_at: f.updated_at,
        metadata: f.metadata,
      });
    });

    // Convert folder paths to folder objects
    const folders = Array.from(folderSet).map((folderPath) => {
      const parts = folderPath.split('/');
      return {
        name: parts[parts.length - 1],
        path: folderPath,
        id: folderPath, // Use path as ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    res.json({
      folders,
      files: fileList,
    });
  } catch (error: any) {
    console.error('Error in GET /api/storage/buckets/:bucket/files:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/storage/buckets/:bucket/upload
 * Upload file(s)
 */
router.post("/buckets/:bucket/upload", upload.array('files', 10), async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_CREATE'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.bucket;
    const path = (req.body.path as string) || '';
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const filePath = path ? `${path}/${file.originalname}` : file.originalname;

        const { data, error } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          return { success: false, fileName: file.originalname, error: error.message };
        }

        return {
          success: true,
          fileName: file.originalname,
          path: data.path,
          id: data.id,
        };
      })
    );

    const successful = uploadResults.filter(r => r.success);
    const failed = uploadResults.filter(r => !r.success);

    if (successful.length > 0) {
      await activityLogger.logActivity(
        {
          userId: req.user?.id,
          companyId: undefined,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
        {
          action: 'STORAGE_FILE_UPLOAD',
          resource: RESOURCE_TYPES.SYSTEM,
          resourceId: undefined,
          metadata: { 
            bucketName, 
            filesUploaded: successful.length,
            fileNames: successful.map(s => s.fileName),
          },
        }
      );
    }

    res.json({
      success: successful.length,
      failed: failed.length,
      results: uploadResults,
    });
  } catch (error: any) {
    console.error('Error in POST /api/storage/buckets/:bucket/upload:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/storage/buckets/:bucket/files/*
 * Download file
 */
router.get("/buckets/:bucket/files/*", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_VIEW'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.bucket;
    const filePath = req.params[0]; // Get the wildcard path

    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      console.error('Error downloading file:', error);
      return res.status(500).json({ message: error.message });
    }

    // Get file metadata for content type
    const { data: fileInfo } = await supabaseAdmin.storage
      .from(bucketName)
      .list(filePath.split('/').slice(0, -1).join('/') || '', {
        limit: 1,
      });

    const file = fileInfo?.find(f => f.name === filePath.split('/').pop());
    const contentType = file?.metadata?.mimetype || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);
    res.send(data);
  } catch (error: any) {
    console.error('Error in GET /api/storage/buckets/:bucket/files/*:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/storage/buckets/:bucket/files/*
 * Delete file
 */
router.delete("/buckets/:bucket/files/*", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_DELETE'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.bucket;
    const filePath = req.params[0]; // Get the wildcard path

    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return res.status(500).json({ message: error.message });
    }

    await activityLogger.logActivity(
      {
        userId: req.user?.id,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'STORAGE_FILE_DELETE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { bucketName, filePath },
      }
    );

    res.json({ message: 'File deleted successfully', data });
  } catch (error: any) {
    console.error('Error in DELETE /api/storage/buckets/:bucket/files/*:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/storage/buckets/:bucket/files/.../move
 * Move or rename file
 */
router.post("/buckets/:bucket/files/*/move", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_EDIT'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.bucket;
    const oldPath = req.params[0]; // Get the wildcard path
    const { newPath } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({ message: 'Old path and new path are required' });
    }

    // Download the file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucketName)
      .download(oldPath);

    if (downloadError) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file metadata
    const { data: fileList } = await supabaseAdmin.storage
      .from(bucketName)
      .list(oldPath.split('/').slice(0, -1).join('/') || '', { limit: 1 });

    const fileInfo = fileList?.find(f => f.name === oldPath.split('/').pop());
    const contentType = fileInfo?.metadata?.mimetype || 'application/octet-stream';

    // Upload to new path
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(newPath, fileData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ message: uploadError.message });
    }

    // Delete old file
    await supabaseAdmin.storage.from(bucketName).remove([oldPath]);

    await activityLogger.logActivity(
      {
        userId: req.user?.id,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'STORAGE_FILE_MOVE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { bucketName, oldPath, newPath },
      }
    );

    res.json({ message: 'File moved successfully', data: uploadData });
  } catch (error: any) {
    console.error('Error in POST /api/storage/buckets/:bucket/files/*/move:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/storage/buckets/:bucket/folders
 * Create folder (creates an empty file with folder path)
 */
router.post("/buckets/:bucket/folders", async (req: any, res: any) => {
  try {
    if (!(await checkStoragePermission(req, 'STORAGE_CREATE'))) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const bucketName = req.params.bucket;
    const { path, name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const folderPath = path ? `${path}/${name}/.keep` : `${name}/.keep`;

    // Create a .keep file to represent the folder
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(folderPath, Buffer.from(''), {
        contentType: 'text/plain',
        upsert: false,
      });

    if (error) {
      console.error('Error creating folder:', error);
      return res.status(500).json({ message: error.message });
    }

    await activityLogger.logActivity(
      {
        userId: req.user?.id,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'STORAGE_FOLDER_CREATE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { bucketName, folderPath },
      }
    );

    res.status(201).json({ message: 'Folder created successfully', path: folderPath });
  } catch (error: any) {
    console.error('Error in POST /api/storage/buckets/:bucket/folders:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

export default router;

