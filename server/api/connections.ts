// Connections API - MSSQL and SSH connection status
import express from "express";
import { requireAuth } from "../middleware/auth";
import { connectMSSQL } from "../services/mssql-migration";
import { connectSSH, executeRemoteCommand } from "../services/remote-execution";

const router = express.Router();

// Apply authentication middleware
router.use(requireAuth);

/**
 * GET /api/connections/mssql-status
 * Test MSSQL connection and return status
 */
router.get("/mssql-status", async (req, res) => {
  try {
    const config = {
      server: process.env.MSSQL_SERVER || 'localhost',
      database: process.env.MSSQL_DATABASE || 'Audit',
      username: process.env.MSSQL_USERNAME || process.env.MSSQL_USER || 'sa',
      port: parseInt(process.env.MSSQL_PORT || '1433'),
      encrypt: process.env.MSSQL_ENCRYPT === 'true' || true,
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true' || true,
      passwordSet: !!process.env.MSSQL_PASSWORD,
    };

    // Try to connect
    let connected = false;
    let error: any = null;
    let connectionTime: number | null = null;
    let databases: string[] = [];

    try {
      const startTime = Date.now();
      const pool = await connectMSSQL();
      connectionTime = Date.now() - startTime;
      connected = pool.connected;

      // Try to query databases
      try {
        const result = await pool.request().query(`
          SELECT name FROM sys.databases 
          WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
          ORDER BY name
        `);
        databases = result.recordset.map((row: any) => row.name);
      } catch (queryError) {
        console.error('Error querying databases:', queryError);
      }

      // Close the pool
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Error closing pool:', closeError);
      }
    } catch (connError: any) {
      error = {
        message: connError.message,
        code: connError.code,
        type: connError.constructor.name,
      };
    }

    res.json({
      connected,
      config: {
        ...config,
        password: config.passwordSet ? '***' : 'NOT SET',
      },
      connectionTime,
      databases,
      error,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      connected: false,
      error: {
        message: error.message,
        code: error.code,
        type: error.constructor.name,
      },
    });
  }
});

/**
 * GET /api/connections/ssh-status
 * Test SSH connection to remote MSSQL server and return status
 */
router.get("/ssh-status", async (req, res) => {
  try {
    const config = {
      host: process.env.MSSQL_SSH_HOST || process.env.MSSQL_SERVER || 'localhost',
      port: parseInt(process.env.MSSQL_SSH_PORT || '22'),
      username: process.env.MSSQL_SSH_USER || 'administrator',
      authMethod: process.env.MSSQL_SSH_KEY_PATH ? 'Private Key' : (process.env.MSSQL_SSH_PASSWORD ? 'Password' : 'NOT SET'),
      passwordSet: !!process.env.MSSQL_SSH_PASSWORD,
      keyPathSet: !!process.env.MSSQL_SSH_KEY_PATH,
    };

    // Try to connect
    let connected = false;
    let error: any = null;
    let connectionTime: number | null = null;
    let testCommandResult: string | null = null;

    try {
      const startTime = Date.now();
      
      // Test connection by executing a simple command
      // executeRemoteCommand will create and manage its own connection
      try {
        const result = await executeRemoteCommand('Write-Host "SSH Connection Test Successful"; $PSVersionTable.PSVersion.ToString()', { 
          logOutput: false 
        });
        connectionTime = Date.now() - startTime;
        connected = true;
        testCommandResult = result.stdout.trim();
      } catch (cmdError: any) {
        // If command execution fails, it might be a connection issue
        connectionTime = Date.now() - startTime;
        console.error('Error executing test command:', cmdError);
        testCommandResult = `Command execution failed: ${cmdError.message}`;
        // Don't mark as connected if command failed
        connected = false;
        error = {
          message: cmdError.message,
          code: cmdError.code || 'SSH_COMMAND_ERROR',
          type: cmdError.constructor.name,
        };
      }
    } catch (connError: any) {
      error = {
        message: connError.message,
        code: connError.code || 'SSH_CONNECTION_ERROR',
        type: connError.constructor.name,
      };
    }

    res.json({
      connected,
      config: {
        ...config,
        password: config.passwordSet ? '***' : 'NOT SET',
        keyPath: config.keyPathSet ? 'SET' : 'NOT SET',
      },
      connectionTime,
      testCommandResult,
      error,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      connected: false,
      error: {
        message: error.message,
        code: error.code || 'SSH_ERROR',
        type: error.constructor.name,
      },
    });
  }
});

/**
 * POST /api/connections/ssh-execute
 * Execute SSH command and stream output via Server-Sent Events
 */
router.post("/ssh-execute", async (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command is required' });
  }

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for SSE

  const sendEvent = (type: string, data: any) => {
    try {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  };

  // Handle client disconnect
  req.on('close', () => {
    console.log('SSH execute client disconnected');
  });

  try {
    sendEvent('start', { message: 'Connecting to SSH server...' });

    const client = await connectSSH();
    sendEvent('connected', { message: 'SSH connection established' });

    // Execute command with streaming output
    const operationId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sendEvent('executing', { message: `Executing: ${command}`, operationId });

    client.exec(`powershell.exe -Command "${command.replace(/"/g, '\\"')}"`, (err: Error | undefined, stream: any) => {
      if (err) {
        sendEvent('error', { message: `Failed to execute command: ${err.message}` });
        sendEvent('end', { exitCode: 1 });
        res.end();
        return;
      }

      stream.on('data', (data: Buffer) => {
        const output = data.toString();
        sendEvent('output', { data: output });
      });

      stream.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        sendEvent('error-output', { data: output });
      });

      stream.on('close', (code: number, signal?: string) => {
        sendEvent('end', { exitCode: code || 0, signal });
        
        // Close connection gracefully
        setTimeout(() => {
          try {
            client.end();
            res.end();
          } catch (closeError: any) {
            console.error('Error closing SSH connection:', closeError);
            res.end();
          }
        }, 100);
      });
    });
  } catch (error: any) {
    sendEvent('error', { message: error.message });
    sendEvent('end', { exitCode: 1 });
    res.end();
  }
});

export default router;

