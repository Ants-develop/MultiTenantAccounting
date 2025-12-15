import { Router, Request, Response } from 'express';
import { restoreBackupViaPowerShellScripts, extractDateFromBackupFilename } from '../services/mssql-restore';
import { RestoreProgress } from '../services/mssql-restore';

const router = Router();

/**
 * GET /api/mssql/restore-ssh
 * Execute restore via PowerShell scripts with Server-Sent Events for real-time logging
 * Uses GET because EventSource doesn't support POST with body
 */
router.get('/restore-ssh', async (req: Request, res: Response) => {
    const fileName = req.query.fileName as string;
    const clientId = req.query.clientId ? (req.query.clientId as string) : undefined;

    if (!fileName) {
        return res.status(400).json({ error: 'fileName query parameter is required' });
    }

    console.log(`📡 [API] SSH Restore request received`);
    console.log(`   [API] File: ${fileName}`);
    console.log(`   [API] Client ID: ${clientId || 'none'}`);

    // Validate filename format
    const extractedDate = extractDateFromBackupFilename(fileName);
    if (!extractedDate) {
        return res.status(400).json({
            error: 'Invalid filename format. Expected: Ants_dd.MM.yyyy.bak (e.g., Ants_19.05.2025.bak)'
        });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to restore stream',
        extractedDate
    })}\n\n`);

    try {
        // Execute restore with progress callback
        const restoreId = await restoreBackupViaPowerShellScripts(
            fileName,
            { clientId },
            (progress: RestoreProgress) => {
                // Stream progress to client via SSE
                res.write(`data: ${JSON.stringify({
                    type: 'progress',
                    ...progress
                })}\n\n`);
            }
        );

        // Send completion message
        res.write(`data: ${JSON.stringify({
            type: 'completed',
            restoreId,
            message: 'Restore completed successfully'
        })}\n\n`);

        res.end();
    } catch (error: any) {
        console.error(`❌ [API] Restore failed:`, error.message);

        // Send error message
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message,
            error: error.toString()
        })}\n\n`);

        res.end();
    }
});

/**
 * POST /api/mssql/restore-ssh-async
 * Execute restore via PowerShell scripts asynchronously (returns immediately)
 */
router.post('/restore-ssh-async', async (req: Request, res: Response) => {
    const { fileName, clientId } = req.body;

    if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
    }

    console.log(`📡 [API] Async SSH Restore request received`);
    console.log(`   [API] File: ${fileName}`);
    console.log(`   [API] Client ID: ${clientId || 'none'}`);

    // Validate filename format
    const extractedDate = extractDateFromBackupFilename(fileName);
    if (!extractedDate) {
        return res.status(400).json({
            error: 'Invalid filename format. Expected: Ants_dd.MM.yyyy.bak (e.g., Ants_19.05.2025.bak)'
        });
    }

    try {
        // Start restore in background
        const restorePromise = restoreBackupViaPowerShellScripts(
            fileName,
            { clientId },
            (progress: RestoreProgress) => {
                // Log progress to console
                console.log(`   [API] Progress: ${progress.status} - ${progress.message}`);
            }
        );

        // Return immediately with extracted date
        res.json({
            message: 'Restore started in background',
            fileName,
            extractedDate,
            status: 'started'
        });

        // Wait for completion in background
        restorePromise
            .then((restoreId: number) => {
                console.log(`✅ [API] Background restore completed successfully. Restore ID: ${restoreId}`);
            })
            .catch((error: any) => {
                console.error(`❌ [API] Background restore failed:`, error.message);
            });

    } catch (error: any) {
        console.error(`❌ [API] Failed to start restore:`, error.message);
        return res.status(500).json({
            error: 'Failed to start restore',
            message: error.message
        });
    }
});

/**
 * POST /api/mssql/extract-date
 * Extract date from backup filename (utility endpoint)
 */
router.post('/extract-date', async (req: Request, res: Response) => {
    const { fileName } = req.body;

    if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
    }

    const extractedDate = extractDateFromBackupFilename(fileName);

    if (!extractedDate) {
        return res.status(400).json({
            error: 'Invalid filename format',
            message: 'Expected format: Ants_dd.MM.yyyy.bak (e.g., Ants_19.05.2025.bak)',
            fileName
        });
    }

    res.json({
        fileName,
        extractedDate,
        valid: true
    });
});

export default router;
