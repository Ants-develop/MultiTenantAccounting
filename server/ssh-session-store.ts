import { WebSocket } from 'ws';

export interface SSHSession {
  id: string;
  connectionId: number;
  userId: number;
  sshConnection: any; // ssh2.Client
  stream: any; // ClientChannel
  clients: Set<WebSocket>;
  createdAt: Date;
  lastActivity: Date;
  terminalCols?: number;
  terminalRows?: number;
}

class SSHSessionStore {
  private sessions: Map<string, SSHSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour

  /**
   * Create or retrieve a session
   */
  createSession(id: string, connectionId: number, userId: number, sshConnection: any, stream: any): SSHSession {
    const session: SSHSession = {
      id,
      connectionId,
      userId,
      sshConnection,
      stream,
      clients: new Set(),
      createdAt: new Date(),
      lastActivity: new Date(),
      terminalCols: 80,
      terminalRows: 24,
    };

    this.sessions.set(id, session);
    this.resetInactivityTimer(id);
    
    console.log(`[SSH Session] Created: ${id} for user ${userId}, connection ${connectionId}`);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(id: string): SSHSession | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = new Date();
      this.resetInactivityTimer(id);
    }
    return session;
  }

  /**
   * Delete session and cleanup
   */
  deleteSession(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    console.log(`[SSH Session] Deleting: ${id}`);

    // Close SSH connection
    if (session.sshConnection) {
      session.sshConnection.end();
    }

    // Close all WebSocket clients
    session.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Session closed');
      }
    });

    // Clear inactivity timer
    const timeout = this.sessionTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(id);
    }

    this.sessions.delete(id);
  }

  /**
   * List all active sessions
   */
  listActiveSessions(): SSHSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions by user ID
   */
  getUserSessions(userId: number): SSHSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  /**
   * Add a WebSocket client to a session
   */
  addClient(sessionId: string, client: WebSocket): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.clients.add(client);
    console.log(`[SSH Session] Client connected to ${sessionId}. Total clients: ${session.clients.size}`);
    return true;
  }

  /**
   * Remove a WebSocket client from a session
   */
  removeClient(sessionId: string, client: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.clients.delete(client);
    console.log(`[SSH Session] Client disconnected from ${sessionId}. Total clients: ${session.clients.size}`);

    // Delete session if no more clients
    if (session.clients.size === 0) {
      console.log(`[SSH Session] No more clients. Scheduling deletion of ${sessionId}`);
      // Delay deletion to allow reconnect
      setTimeout(() => {
        const stillExists = this.sessions.get(sessionId);
        if (stillExists && stillExists.clients.size === 0) {
          this.deleteSession(sessionId);
        }
      }, 5000); // 5 second grace period
    }
  }

  /**
   * Broadcast data to all clients in a session
   */
  broadcastToClients(sessionId: string, data: Buffer | string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = typeof data === 'string' ? data : data.toString('utf-8');
    session.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Update terminal dimensions
   */
  setTerminalSize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.terminalCols = cols;
    session.terminalRows = rows;

    if (session.stream && typeof session.stream.setWindow === 'function') {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  }

  /**
   * Reset inactivity timer for session
   */
  private resetInactivityTimer(sessionId: string): void {
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      console.log(`[SSH Session] Inactivity timeout for ${sessionId}`);
      this.deleteSession(sessionId);
    }, this.INACTIVITY_TIMEOUT);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Get session stats for debugging
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        connectionId: s.connectionId,
        userId: s.userId,
        connectedClients: s.clients.size,
        uptime: Date.now() - s.createdAt.getTime(),
        lastActivity: Date.now() - s.lastActivity.getTime(),
      })),
    };
  }
}

export const sshSessionStore = new SSHSessionStore();

