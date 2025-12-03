// Remote Execution Service for Windows MSSQL Server
// Handles SSH connections and remote command execution on Windows server
// @ts-ignore - ssh2 types
import { Client, ConnectConfig } from 'ssh2';
import path from 'path';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface RemoteCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  exitSignal?: string;
}

/**
 * Get SSH configuration from environment variables
 */
async function getSSHConfig(): Promise<SSHConfig> {
  const host = process.env.MSSQL_SSH_HOST || process.env.MSSQL_SERVER || 'localhost';
  const port = parseInt(process.env.MSSQL_SSH_PORT || '22', 10);
  const username = process.env.MSSQL_SSH_USER || 'administrator';
  const password = process.env.MSSQL_SSH_PASSWORD;
  const privateKeyPath = process.env.MSSQL_SSH_KEY_PATH;
  const passphrase = process.env.MSSQL_SSH_KEY_PASSPHRASE;

  if (!password && !privateKeyPath) {
    throw new Error('Either MSSQL_SSH_PASSWORD or MSSQL_SSH_KEY_PATH must be set');
  }

  const config: SSHConfig = {
    host,
    port,
    username,
  };

  if (privateKeyPath) {
    const fs = await import('fs/promises');
    try {
      const keyContent = await fs.readFile(privateKeyPath, 'utf8');
      config.privateKey = keyContent;
      if (passphrase) {
        config.passphrase = passphrase;
      }
    } catch (error: any) {
      console.error(`❌ [SSH] Failed to read private key from ${privateKeyPath}:`, error.message);
      throw new Error(`Failed to read SSH private key: ${error.message}`);
    }
  } else if (password) {
    config.password = password;
  }

  return config;
}

/**
 * Create and connect SSH client with comprehensive logging
 */
export async function connectSSH(): Promise<Client> {
  const config = await getSSHConfig();
  const startTime = Date.now();

  console.log(`🔌 [SSH] Connecting to ${config.username}@${config.host}:${config.port}...`);
  console.log(`   [SSH] Authentication method: ${config.privateKey ? 'Private Key' : 'Password'}`);

  return new Promise((resolve, reject) => {
    const client = new Client();

    // Connection event handlers with logging
    client.on('ready', () => {
      const duration = Date.now() - startTime;
      console.log(`✅ [SSH] Connected successfully in ${duration}ms`);
      console.log(`   [SSH] Server: ${config.host}:${config.port}`);
      console.log(`   [SSH] User: ${config.username}`);
      resolve(client);
    });

    client.on('error', (error: Error) => {
      const duration = Date.now() - startTime;
      console.error(`❌ [SSH] Connection failed after ${duration}ms`);
      console.error(`   [SSH] Error: ${error.message}`);
      console.error(`   [SSH] Host: ${config.host}:${config.port}`);
      console.error(`   [SSH] User: ${config.username}`);
      if (error.stack) {
        console.error(`   [SSH] Stack: ${error.stack}`);
      }
      reject(error);
    });

    client.on('close', () => {
      console.log(`🔌 [SSH] Connection closed to ${config.host}:${config.port}`);
    });

    client.on('end', () => {
      console.log(`🔌 [SSH] Connection ended to ${config.host}:${config.port}`);
    });

    client.on('error', (err: Error) => {
      // Only log if not already handled by the 'error' event handler above
      if (err.message !== 'Connection closed') {
        console.error(`❌ [SSH] Connection error event: ${err.message}`);
      }
    });

    // Build connection config
    const connectConfig: ConnectConfig = {
      host: config.host,
      port: config.port,
      username: config.username,
      readyTimeout: 60000, // 60 seconds
      // Auto-accept host keys to avoid interactive prompts
      hostVerifier: (hash: Buffer) => {
        console.log(`   [SSH] Host key fingerprint: ${hash.toString('hex')}`);
        console.log(`   [SSH] Auto-accepting host key (no strict verification)`);
        return true; // Auto-accept all host keys
      },
      // Disable strict vendor checking
      strictVendor: false,
      // Try keyboard-interactive if password auth fails
      tryKeyboard: true,
    };

    // Handle keyboard-interactive authentication (for passphrase prompts)
    // @ts-ignore - keyboard-interactive event type
    client.on('keyboard-interactive', (name: string, instructions: string, instructionsLang: string, prompts: any[], finish: (responses: string[]) => void) => {
      console.log(`   [SSH] Keyboard-interactive prompt: ${name}`);
      if (instructions) {
        console.log(`   [SSH] Instructions: ${instructions}`);
      }

      // Auto-respond to prompts
      const responses: string[] = [];
      for (const prompt of prompts) {
        if (prompt.prompt.toLowerCase().includes('passphrase') || prompt.prompt.toLowerCase().includes('password')) {
          // Use passphrase if available, otherwise password
          const response = config.passphrase || config.password || '';
          responses.push(response);
          console.log(`   [SSH] Auto-responding to ${prompt.prompt} prompt`);
        } else {
          // For other prompts (like "yes/no"), respond with empty or default
          responses.push('');
        }
      }
      finish(responses);
    });

    if (config.privateKey) {
      connectConfig.privateKey = config.privateKey;
      if (config.passphrase) {
        connectConfig.passphrase = config.passphrase;
        console.log(`   [SSH] Using private key with passphrase`);
      } else {
        console.log(`   [SSH] Using private key without passphrase`);
      }
    } else if (config.password) {
      connectConfig.password = config.password;
      console.log(`   [SSH] Using password authentication`);
    }

    // Attempt connection
    console.log(`   [SSH] Attempting connection...`);
    client.connect(connectConfig);
  });
}

/**
 * Execute a PowerShell command on remote Windows server with comprehensive logging
 */
export async function executeRemoteCommand(
  command: string,
  options: { logOutput?: boolean; timeout?: number; sshClient?: Client } = {}
): Promise<RemoteCommandResult> {
  const { logOutput = true, timeout = 900000, sshClient } = options; // Default 15 minutes timeout
  const operationId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`📤 [SSH] Executing remote command [${operationId}]`);
  console.log(`   [SSH] Command: ${command.substring(0, 200)}${command.length > 200 ? '...' : ''}`);
  console.log(`   [SSH] Timeout: ${timeout}ms`);

  const client = sshClient || await connectSSH();

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        console.error(`⏱️  [SSH] Command timeout after ${timeout}ms [${operationId}]`);
        if (!sshClient) {
          client.end();
        }
        reject(new Error(`Command execution timeout after ${timeout}ms`));
      }
    }, timeout);

    client.exec(`powershell.exe -Command "${command.replace(/"/g, '\\"')}"`, (err: Error | undefined, stream: any) => {
      if (err) {
        clearTimeout(timeoutId);
        hasResolved = true;
        const duration = Date.now() - startTime;
        console.error(`❌ [SSH] Failed to execute command [${operationId}] after ${duration}ms`);
        console.error(`   [SSH] Error: ${err.message}`);
        console.error(`   [SSH] Error: ${err.message}`);
        if (!sshClient) {
          client.end();
        }
        reject(err);
        return;
      }

      stream.on('close', (code: number, signal?: string) => {
        clearTimeout(timeoutId);
        if (!hasResolved) {
          hasResolved = true;
          const duration = Date.now() - startTime;

          if (code === 0) {
            console.log(`✅ [SSH] Command completed successfully [${operationId}] in ${duration}ms`);
          } else {
            console.warn(`⚠️  [SSH] Command exited with code ${code} [${operationId}] in ${duration}ms`);
            if (signal) {
              console.warn(`   [SSH] Exit signal: ${signal}`);
            }
          }

          if (logOutput && stdout) {
            console.log(`   [SSH] STDOUT [${operationId}]:`);
            console.log(stdout.split('\n').map(line => `      ${line}`).join('\n'));
          }

          if (stderr) {
            console.error(`   [SSH] STDERR [${operationId}]:`);
            console.error(stderr.split('\n').map(line => `      ${line}`).join('\n'));
          }

          // Close connection gracefully after a short delay to ensure all data is flushed
          if (!sshClient) {
            setTimeout(() => {
              try {
                if (client && typeof client.end === 'function') {
                  client.end();
                  console.log(`🔌 [SSH] Connection closed gracefully [${operationId}]`);
                }
              } catch (closeError: any) {
                console.warn(`⚠️  [SSH] Error closing connection [${operationId}]: ${closeError.message}`);
              }
            }, 100);
          }

          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
            exitSignal: signal,
          });
        }
      });

      stream.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        if (logOutput) {
          process.stdout.write(`   [SSH] [${operationId}] ${output}`);
        }
      });

      stream.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.error(`   [SSH] STDERR [${operationId}]: ${output}`);
      });
    });
  });
}

/**
 * Execute a PowerShell script file on remote Windows server with real-time output streaming
 * @param scriptPath - Absolute path to the .ps1 script on the remote server
 * @param parameters - Script parameters as key-value pairs
 * @param onOutput - Callback for real-time output streaming (optional)
 * @param options - Execution options
 * @returns Command result with stdout, stderr, and exit code
 */
export async function executeRemotePowerShellScript(
  scriptPath: string,
  parameters: Record<string, string> = {},
  onOutput?: (output: string) => void,
  options: { timeout?: number; sshClient?: Client } = {}
): Promise<RemoteCommandResult> {
  const { timeout = 1800000, sshClient } = options; // Default 30 minutes timeout for scripts
  const operationId = `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // Build parameter string
  const paramString = Object.entries(parameters)
    .map(([key, value]) => `-${key} "${value}"`)
    .join(' ');

  console.log(`📜 [SSH] Executing PowerShell script [${operationId}]`);
  console.log(`   [SSH] Script: ${scriptPath}`);
  console.log(`   [SSH] Parameters: ${paramString || '(none)'}`);
  console.log(`   [SSH] Timeout: ${timeout}ms`);

  const client = sshClient || await connectSSH();

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        console.error(`⏱️  [SSH] Script timeout after ${timeout}ms [${operationId}]`);
        if (!sshClient) {
          client.end();
        }
        reject(new Error(`Script execution timeout after ${timeout}ms`));
      }
    }, timeout);

    // Get the script directory to set as working directory
    // This ensures relative paths in the script (like credentials.json) work correctly
    const scriptDir = scriptPath.replace(/\\[^\\]+$/, '').replace(/\//g, '\\');

    // Execute PowerShell script with parameters using PowerShell 7
    // Use -WorkingDirectory to ensure relative paths (like credentials.json) work correctly
    // This is the proper way in PowerShell 7 to set working directory before script execution
    const command = `"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -ExecutionPolicy Bypass -WorkingDirectory "${scriptDir}" -File "${scriptPath}" ${paramString}`;

    client.exec(command, (err: Error | undefined, stream: any) => {
      if (err) {
        clearTimeout(timeoutId);
        hasResolved = true;
        const duration = Date.now() - startTime;
        console.error(`❌ [SSH] Failed to execute script [${operationId}] after ${duration}ms`);
        console.error(`   [SSH] Error: ${err.message}`);
        console.error(`   [SSH] Error: ${err.message}`);
        if (!sshClient) {
          client.end();
        }
        reject(err);
        return;
      }

      stream.on('close', (code: number, signal?: string) => {
        clearTimeout(timeoutId);
        if (!hasResolved) {
          hasResolved = true;
          const duration = Date.now() - startTime;

          if (code === 0) {
            console.log(`✅ [SSH] Script completed successfully [${operationId}] in ${duration}ms`);
          } else {
            console.warn(`⚠️  [SSH] Script exited with code ${code} [${operationId}] in ${duration}ms`);
            if (signal) {
              console.warn(`   [SSH] Exit signal: ${signal}`);
            }
          }

          if (stdout) {
            console.log(`   [SSH] Script output captured: ${stdout.length} characters`);
          }

          if (stderr) {
            console.error(`   [SSH] Script errors: ${stderr.length} characters`);
          }

          // Close connection gracefully
          if (!sshClient) {
            setTimeout(() => {
              try {
                if (client && typeof client.end === 'function') {
                  client.end();
                  console.log(`🔌 [SSH] Connection closed gracefully [${operationId}]`);
                }
              } catch (closeError: any) {
                console.warn(`⚠️  [SSH] Error closing connection [${operationId}]: ${closeError.message}`);
              }
            }, 100);
          }

          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
            exitSignal: signal,
          });
        }
      });

      // Stream stdout with real-time callback
      stream.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;

        // Log to console
        process.stdout.write(`   [SSH] [${operationId}] ${output}`);

        // Call callback for real-time streaming to web app
        if (onOutput) {
          onOutput(output);
        }
      });

      // Stream stderr with real-time callback
      stream.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;

        // Log to console
        console.error(`   [SSH] STDERR [${operationId}]: ${output}`);

        // Call callback for real-time streaming to web app
        if (onOutput) {
          onOutput(`[ERROR] ${output}`);
        }
      });
    });
  });
}


/**
 * Upload file buffer to remote server via SFTP
 */
export async function uploadFileBufferToRemote(
  fileBuffer: Buffer,
  remotePath: string,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<void> {
  const operationId = `sftp-upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`📤 [SFTP] Starting file upload [${operationId}]`);
  console.log(`   [SFTP] Remote path: ${remotePath}`);
  console.log(`   [SFTP] File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const client = await connectSSH();

  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) {
        client.end();
        reject(err);
        return;
      }

      // Ensure directory exists
      const remoteDir = remotePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
      if (remoteDir) {
        sftp.mkdir(remoteDir, { recursive: true }, (mkdirErr) => {
          // Ignore errors - directory might already exist
          if (mkdirErr && !mkdirErr.message.includes('already exists')) {
            console.warn(`⚠️  [SFTP] Could not create directory: ${mkdirErr.message}`);
          }
        });
      }

      // Create write stream
      const writeStream = sftp.createWriteStream(remotePath);
      let bytesUploaded = 0;

      writeStream.on('error', (writeErr) => {
        client.end();
        console.error(`❌ [SFTP] Upload failed [${operationId}]: ${writeErr.message}`);
        reject(writeErr);
      });

      writeStream.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ [SFTP] File upload completed [${operationId}] in ${duration}ms`);
        client.end();
        resolve();
      });

      // Write file in chunks to track progress
      const chunkSize = 64 * 1024; // 64KB chunks
      let offset = 0;

      const writeChunk = () => {
        if (offset >= fileBuffer.length) {
          writeStream.end();
          return;
        }

        const chunk = fileBuffer.subarray(offset, Math.min(offset + chunkSize, fileBuffer.length));
        const canContinue = writeStream.write(chunk);

        bytesUploaded += chunk.length;
        if (onProgress) {
          onProgress(bytesUploaded, fileBuffer.length);
        }

        if (bytesUploaded % (1024 * 1024) === 0 || bytesUploaded === fileBuffer.length) {
          const progress = ((bytesUploaded / fileBuffer.length) * 100).toFixed(1);
          console.log(`   [SFTP] Progress: ${progress}% (${(bytesUploaded / 1024 / 1024).toFixed(2)} MB / ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
        }

        offset += chunk.length;

        if (!canContinue) {
          writeStream.once('drain', writeChunk);
        } else {
          setImmediate(writeChunk);
        }
      };

      writeChunk();
    });
  });
}

/**
 * Download file to remote Windows server with progress logging
 */
export async function downloadFileToRemote(
  sourceUrl: string,
  destinationPath: string
): Promise<void> {
  const operationId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`📥 [SSH] Starting file download [${operationId}]`);
  console.log(`   [SSH] Source: ${sourceUrl}`);
  console.log(`   [SSH] Destination: ${destinationPath}`);

  // Ensure destination directory exists
  const destinationDir = path.dirname(destinationPath);
  await executeRemoteCommand(
    `New-Item -ItemType Directory -Force -Path "${destinationDir.replace(/\\/g, '\\\\')}"`,
    { logOutput: false }
  );

  // Download using PowerShell Invoke-WebRequest
  const downloadCommand = `
    $ProgressPreference = 'SilentlyContinue';
    try {
      $webClient = New-Object System.Net.WebClient;
      $webClient.DownloadFile('${sourceUrl}', '${destinationPath.replace(/\\/g, '\\\\')}');
      Write-Host "Download completed: ${destinationPath}";
      $fileInfo = Get-Item '${destinationPath.replace(/\\/g, '\\\\')}';
      Write-Host "File size: $($fileInfo.Length) bytes";
    } catch {
      Write-Error "Download failed: $_";
      exit 1;
    }
  `;

  try {
    const result = await executeRemoteCommand(downloadCommand, { logOutput: true });
    const duration = Date.now() - startTime;

    if (result.exitCode === 0) {
      console.log(`✅ [SSH] File download completed [${operationId}] in ${duration}ms`);
      console.log(`   [SSH] File saved to: ${destinationPath}`);
    } else {
      throw new Error(`Download failed with exit code ${result.exitCode}: ${result.stderr}`);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [SSH] File download failed [${operationId}] after ${duration}ms`);
    console.error(`   [SSH] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get Windows backup path accessible by SQL Server
 */
export async function getRemoteBackupPath(fileName: string): Promise<string> {
  const backupDir = process.env.MSSQL_BACKUP_DIR ||
    'C:\\Program Files\\Microsoft SQL Server\\MSSQL15.MSSQLSERVER\\MSSQL\\Backup';

  // Sanitize filename for Windows
  const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
  const fullPath = path.join(backupDir, safeFileName).replace(/\//g, '\\');

  console.log(`📁 [SSH] Resolved backup path: ${fullPath}`);
  console.log(`   [SSH] Backup directory: ${backupDir}`);
  console.log(`   [SSH] File name: ${safeFileName}`);

  // Ensure backup directory exists on remote server
  try {
    await executeRemoteCommand(
      `New-Item -ItemType Directory -Force -Path "${backupDir.replace(/\\/g, '\\\\')}"`,
      { logOutput: false }
    );
    console.log(`✅ [SSH] Backup directory verified/created: ${backupDir}`);
  } catch (error: any) {
    console.warn(`⚠️  [SSH] Could not create backup directory: ${error.message}`);
    // Continue anyway, might already exist
  }

  return fullPath;
}

/**
 * Verify file exists on remote server
 */
export async function verifyRemoteFile(filePath: string): Promise<boolean> {
  const operationId = `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`🔍 [SSH] Verifying file exists [${operationId}]`);
  console.log(`   [SSH] Path: ${filePath}`);

  try {
    const result = await executeRemoteCommand(
      `Test-Path -Path "${filePath.replace(/\\/g, '\\\\')}" -PathType Leaf`,
      { logOutput: false }
    );

    const exists = result.stdout.trim().toLowerCase() === 'true';

    if (exists) {
      // Get file size
      const sizeResult = await executeRemoteCommand(
        `(Get-Item "${filePath.replace(/\\/g, '\\\\')}").Length`,
        { logOutput: false }
      );
      const fileSize = parseInt(sizeResult.stdout.trim(), 10);
      console.log(`✅ [SSH] File verified [${operationId}]: ${filePath} (${fileSize} bytes)`);
    } else {
      console.warn(`⚠️  [SSH] File not found [${operationId}]: ${filePath}`);
    }

    return exists;
  } catch (error: any) {
    console.error(`❌ [SSH] File verification failed [${operationId}]`);
    console.error(`   [SSH] Error: ${error.message}`);
    return false;
  }
}

