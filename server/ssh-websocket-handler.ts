import { WebSocket, WebSocketServer } from 'ws';
import { Client as SSHClient } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';
import { sshSessionStore, SSHSession } from './ssh-session-store';
import { db } from './db';
import { connections } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface SSHConnectionDetails {
  id: number;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

interface WebSocketMessage {
  type: 'init' | 'input' | 'resize' | 'disconnect';
  sessionId?: string;
  connectionId?: number;
  data?: string;
  cols?: number;
  rows?: number;
}

/**
 * Handle SSH WebSocket connections
 * Manages persistent SSH sessions accessible from multiple browser tabs
 */
export async function handleSSHWebSocket(ws: WebSocket, req: any, userId?: number) {
  let sessionId: string | null = null;

  // Extract session ID from query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const querySessionId = url.searchParams.get('session');
  const connectionId = url.searchParams.get('connectionId');

  try {
    // Validate user session - use passed userId or get from request
    const authenticatedUserId = userId || req.session?.userId;
    
    console.log(`[SSH WS] Connection attempt - userId: ${authenticatedUserId}, sessionId: ${querySessionId}, connectionId: ${connectionId}`);
    
    if (!authenticatedUserId) {
      console.log('[SSH WS] Connection rejected: No authenticated user');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated',
      }));
      ws.close(1008, 'Unauthorized');
      return;
    }

    // Try to reconnect to existing session
    if (querySessionId) {
      const existingSession = sshSessionStore.getSession(querySessionId);
      if (existingSession && existingSession.userId === authenticatedUserId) {
        sessionId = querySessionId;
        sshSessionStore.addClient(sessionId, ws);
        ws.send(JSON.stringify({
          type: 'session',
          id: sessionId,
          message: 'Reconnected to existing session',
        }));
        console.log(`[SSH WS] User ${authenticatedUserId} reconnected to session ${sessionId}`);
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Session not found or expired',
        }));
        ws.close(1008, 'Session invalid');
        return;
      }
    } else if (connectionId) {
      // Create new session
      sessionId = uuidv4();
      await createNewSSHSession(ws, sessionId, authenticatedUserId, parseInt(connectionId));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing connectionId or sessionId',
      }));
      ws.close(1008, 'Invalid request');
      return;
    }

    // Handle incoming messages
    ws.on('message', async (rawMessage: Buffer) => {
      try {
        if (!sessionId) return;

        // Check if it's JSON or raw data
        let message: WebSocketMessage;
        try {
          message = JSON.parse(rawMessage.toString());
        } catch {
          // Treat as raw terminal input
          const session = sshSessionStore.getSession(sessionId);
          if (session?.stream) {
            session.stream.write(rawMessage);
          }
          return;
        }

        const session = sshSessionStore.getSession(sessionId);
        if (!session) return;

        switch (message.type) {
          case 'input':
            if (message.data && session.stream) {
              session.stream.write(message.data);
            }
            break;

          case 'resize':
            if (message.cols && message.rows) {
              sshSessionStore.setTerminalSize(sessionId, message.cols, message.rows);
            }
            break;

          case 'disconnect':
            sshSessionStore.removeClient(sessionId, ws);
            ws.close(1000, 'Disconnected by user');
            break;
        }
      } catch (err) {
        console.error('[SSH WS] Error handling message:', err);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      if (sessionId) {
        sshSessionStore.removeClient(sessionId, ws);
        console.log(`[SSH WS] Client disconnected from session ${sessionId}`);
      }
    });

    ws.on('error', (err) => {
      console.error('[SSH WS] WebSocket error:', err);
    });

  } catch (err) {
    console.error('[SSH WS] Error in WebSocket handler:', err);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Server error',
    }));
    ws.close(1011, 'Server error');
  }
}

/**
 * Create a new SSH session
 */
async function createNewSSHSession(
  ws: WebSocket,
  sessionId: string,
  userId: number,
  connectionId: number
): Promise<void> {
  try {
    // Fetch connection details from database using Drizzle
    const conn = await db
      .select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (!conn || conn.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'SSH connection not found',
      }));
      ws.close(1008, 'Invalid connection');
      return;
    }

    const connDetails: SSHConnectionDetails = {
      id: conn[0].id,
      host: conn[0].server,
      port: conn[0].port || 22,
      username: conn[0].username,
      password: conn[0].password || undefined,
      privateKey: conn[0].privateKey || undefined,
    };

    // Create SSH connection
    const sshConn = new SSHClient();
    let connected = false;

    sshConn.on('ready', () => {
      console.log(`[SSH] Connected to ${connDetails.host}:${connDetails.port}`);

      sshConn.shell((err: any, stream: any) => {
        if (err) {
          console.error('[SSH] Shell error:', err);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to open shell: ' + err.message,
          }));
          ws.close(1011, 'Shell error');
          sshConn.end();
          return;
        }

        // Create session in store
        const session = sshSessionStore.createSession(
          sessionId,
          connectionId,
          userId,
          sshConn,
          stream
        );

        // Add initial client
        sshSessionStore.addClient(sessionId, ws);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'session',
          id: sessionId,
          message: `Connected to ${connDetails.host}`,
        }));

        // Broadcast SSH output to all connected clients
        stream.on('data', (data: Buffer) => {
          sshSessionStore.broadcastToClients(sessionId, data);
        });

        stream.on('close', () => {
          console.log(`[SSH] Stream closed for session ${sessionId}`);
          sshSessionStore.deleteSession(sessionId);
        });

        stream.on('error', (err: any) => {
          console.error(`[SSH] Stream error for session ${sessionId}:`, err);
          sshSessionStore.broadcastToClients(sessionId, `\r\nStream error: ${err.message}\r\n`);
        });

        connected = true;
      });
    });

    sshConn.on('close', () => {
      console.log(`[SSH] Connection closed for session ${sessionId}`);
      if (!connected) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'SSH connection closed unexpectedly',
        }));
        ws.close(1006, 'Connection closed');
      }
    });

    sshConn.on('error', (err: Error) => {
      console.error(`[SSH] Connection error for session ${sessionId}:`, err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'SSH connection error: ' + err.message,
      }));
      ws.close(1011, 'SSH error');
    });

    // Connect with appropriate auth method
    const connectConfig: any = {
      host: connDetails.host,
      port: connDetails.port,
      username: connDetails.username,
      algorithms: {
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com'],
        serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256'],
      },
      readyTimeout: 30000,
    };

    if (connDetails.privateKey) {
      connectConfig.privateKey = connDetails.privateKey;
    } else if (connDetails.password) {
      connectConfig.password = connDetails.password;
    } else {
      throw new Error('No authentication method available');
    }

    sshConn.connect(connectConfig);

  } catch (err: any) {
    console.error('[SSH] Failed to create session:', err);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to create SSH session: ' + err.message,
    }));
    ws.close(1011, 'Session creation failed');
  }
}

