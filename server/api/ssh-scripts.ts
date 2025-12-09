import express, { Response, Request } from 'express';
import { db } from '../db';
import { sshScripts, connections } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Client as SSHClient } from 'ssh2';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Helper to write SSE messages and flush immediately if supported
function writeSSE(res: Response, payload: any) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  if ((res as any).flush) {
    (res as any).flush();
  }
}

/**
 * GET /api/ssh-terminal/scripts
 * List all SSH scripts (predefined + custom)
 */
router.get('/scripts', requireAuth, async (req, res) => {
  try {
    const scripts = await db.select().from(sshScripts).orderBy(sshScripts.category);
    res.json(scripts);
  } catch (error: any) {
    console.error('[SSH Scripts] Error fetching scripts:', error);
    res.status(500).json({ message: 'Failed to fetch scripts' });
  }
});

/**
 * POST /api/ssh-terminal/scripts
 * Create a new SSH script
 */
router.post('/scripts', requireAuth, async (req, res) => {
  try {
    const { name, description, command, category } = req.body;
    const userId = req.session?.userId;

    if (!name || !command) {
      return res.status(400).json({ message: 'Name and command are required' });
    }

    const newScript = await db.insert(sshScripts).values({
      name,
      description: description || null,
      command,
      category: category || 'custom',
      createdBy: userId,
    }).returning();

    console.log('[SSH Scripts] Created new script:', newScript[0].id);
    res.status(201).json(newScript[0]);
  } catch (error: any) {
    console.error('[SSH Scripts] Error creating script:', error);
    res.status(500).json({ message: 'Failed to create script' });
  }
});

/**
 * DELETE /api/ssh-terminal/scripts/:id
 * Delete a custom SSH script
 */
router.delete('/scripts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;

    // Only allow deleting custom scripts created by the user
    const script = await db.select().from(sshScripts).where(eq(sshScripts.id, parseInt(id))).limit(1);

    if (!script.length) {
      return res.status(404).json({ message: 'Script not found' });
    }

    if (script[0].category === 'predefined') {
      return res.status(403).json({ message: 'Cannot delete predefined scripts' });
    }

    await db.delete(sshScripts).where(eq(sshScripts.id, parseInt(id)));

    console.log('[SSH Scripts] Deleted script:', id);
    res.json({ message: 'Script deleted' });
  } catch (error: any) {
    console.error('[SSH Scripts] Error deleting script:', error);
    res.status(500).json({ message: 'Failed to delete script' });
  }
});

/**
 * POST /api/ssh-terminal/run-script
 * Execute an SSH script and stream output via SSE
 */
router.post('/run-script', requireAuth, (req, res) => {
  try {
    const { sshConnectionId, scriptId, command } = req.body;
    const userId = req.session?.userId;

    if (!sshConnectionId || (!scriptId && !command)) {
      return res.status(400).json({ message: 'SSH connection ID and either scriptId or command are required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    writeSSE(res, { type: 'status', status: 'connecting' });

    executeScriptOverSSH(sshConnectionId, scriptId, command, res, userId).catch((error) => {
      console.error('[SSH Script Exec] Error:', error);
      writeSSE(res, { type: 'error', message: error.message });
      res.end();
    });
  } catch (error: any) {
    console.error('[SSH Script Exec] Error setting up:', error);
    res.status(500).json({ message: 'Failed to run script' });
  }
});

/**
 * GET /api/ssh-terminal/run-script
 * Execute an SSH script and stream output via SSE (EventSource-friendly)
 */
router.get('/run-script', requireAuth, (req, res) => {
  try {
    const sshConnectionId = req.query.sshConnectionId ? Number(req.query.sshConnectionId) : undefined;
    const scriptId = req.query.scriptId ? Number(req.query.scriptId) : undefined;
    const command = typeof req.query.command === 'string' ? req.query.command : undefined;
    const userId = req.session?.userId;

    if (!sshConnectionId || (!scriptId && !command)) {
      return res.status(400).json({ message: 'sshConnectionId and scriptId or command are required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    writeSSE(res, { type: 'status', status: 'connecting' });

    executeScriptOverSSH(sshConnectionId, scriptId ?? null, command ?? null, res, userId).catch((error) => {
      console.error('[SSH Script Exec] Error:', error);
      writeSSE(res, { type: 'error', message: error.message });
      res.end();
    });
  } catch (error: any) {
    console.error('[SSH Script Exec] Error setting up (GET):', error);
    res.status(500).json({ message: 'Failed to run script' });
  }
});

/**
 * Execute an SSH script and stream output
 */
async function executeScriptOverSSH(
  connectionId: number,
  scriptId: number | null,
  customCommand: string | null,
  res: Response,
  userId: number | undefined
): Promise<void> {
  try {
    // Fetch connection details
    const connResult = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);

    if (!connResult.length) {
      throw new Error('SSH connection not found');
    }

    const conn = connResult[0];

    // Get command to execute
    let commandToRun = customCommand;
    if (scriptId && !customCommand) {
      const scriptResult = await db.select().from(sshScripts).where(eq(sshScripts.id, scriptId)).limit(1);
      if (scriptResult.length) {
        commandToRun = scriptResult[0].command;
      }
    }

    if (!commandToRun) {
      throw new Error('No command found to execute');
    }

    console.log(`[SSH Script Exec] Running command on ${conn.server}: ${commandToRun}`);

    // Create SSH connection
    const sshConn = new SSHClient();

    return new Promise((resolve, reject) => {
      sshConn.on('ready', () => {
        sshConn.exec(commandToRun!, (err, stream) => {
          if (err) {
            reject(err);
            sshConn.end();
            return;
          }

          // Stream stdout
          stream.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            lines.forEach((line) => {
              if (line.trim()) {
                writeSSE(res, { type: 'output', message: line });
              }
            });
          });

          // Stream stderr
          stream.stderr.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            lines.forEach((line) => {
              if (line.trim()) {
                writeSSE(res, { type: 'error', message: line });
              }
            });
          });

          // Handle close
          stream.on('close', (code: number, signal: string) => {
            sshConn.end();
            const status = code === 0 ? 'completed' : 'failed';
            writeSSE(res, { type: 'status', status, exitCode: code });
            res.end();
            resolve();
          });

          stream.on('error', (err: Error) => {
            sshConn.end();
            writeSSE(res, { type: 'error', message: err.message });
            res.end();
            reject(err);
          });
        });
      });

      sshConn.on('error', (err: Error) => {
        reject(err);
      });

      // Connect with appropriate auth
      const connectConfig: any = {
        host: conn.server,
        port: conn.port || 22,
        username: conn.username,
        algorithms: {
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
          serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256'],
        },
        readyTimeout: 30000,
      };

      if (conn.privateKey) {
        connectConfig.privateKey = conn.privateKey;
      } else if (conn.password) {
        connectConfig.password = conn.password;
      } else {
        reject(new Error('No SSH authentication method available'));
        return;
      }

      sshConn.connect(connectConfig);
    });
  } catch (error: any) {
    console.error('[SSH Script Exec] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
}

export default router;

