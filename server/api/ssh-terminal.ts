import express from 'express';
import { sshSessionStore } from '../ssh-session-store';
import { requireAuth, requireGlobalAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * List all active SSH sessions
 * GET /api/ssh-terminal/sessions
 */
router.get('/sessions', requireAuth, (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get sessions for current user
    const userSessions = sshSessionStore.getUserSessions(userId);

    const sessions = userSessions.map((session) => ({
      id: session.id,
      connectionId: session.connectionId,
      userId: session.userId,
      connectedClients: session.clients.size,
      uptime: Date.now() - session.createdAt.getTime(),
      lastActivity: Date.now() - session.lastActivity.getTime(),
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivity.toISOString(),
    }));

    res.json(sessions);
  } catch (err: any) {
    console.error('[SSH Terminal API] Error listing sessions:', err);
    res.status(500).json({ message: 'Failed to list sessions' });
  }
});

/**
 * Get all sessions (admin only)
 * GET /api/ssh-terminal/sessions/admin/all
 */
router.get('/sessions/admin/all', requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const allSessions = sshSessionStore.listActiveSessions();

    const sessions = allSessions.map((session) => ({
      id: session.id,
      connectionId: session.connectionId,
      userId: session.userId,
      connectedClients: session.clients.size,
      uptime: Date.now() - session.createdAt.getTime(),
      lastActivity: Date.now() - session.lastActivity.getTime(),
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivity.toISOString(),
    }));

    res.json(sessions);
  } catch (err: any) {
    console.error('[SSH Terminal API] Error listing all sessions:', err);
    res.status(500).json({ message: 'Failed to list sessions' });
  }
});

/**
 * Get session stats
 * GET /api/ssh-terminal/stats
 */
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = sshSessionStore.getStats();
    res.json(stats);
  } catch (err: any) {
    console.error('[SSH Terminal API] Error getting stats:', err);
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

/**
 * Disconnect a session
 * DELETE /api/ssh-terminal/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', requireAuth, (req, res) => {
  try {
    const userId = req.session?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const session = sshSessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check ownership
    if (session.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    sshSessionStore.deleteSession(sessionId);

    res.json({ message: 'Session closed' });
  } catch (err: any) {
    console.error('[SSH Terminal API] Error deleting session:', err);
    res.status(500).json({ message: 'Failed to delete session' });
  }
});

/**
 * Disconnect all sessions for current user
 * DELETE /api/ssh-terminal/sessions
 */
router.delete('/sessions', requireAuth, (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userSessions = sshSessionStore.getUserSessions(userId);
    userSessions.forEach((session) => {
      sshSessionStore.deleteSession(session.id);
    });

    res.json({ message: `Closed ${userSessions.length} session(s)` });
  } catch (err: any) {
    console.error('[SSH Terminal API] Error deleting sessions:', err);
    res.status(500).json({ message: 'Failed to delete sessions' });
  }
});

/**
 * Force close a session (admin only)
 * DELETE /api/ssh-terminal/sessions/admin/:sessionId
 */
router.delete('/sessions/admin/:sessionId', requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sshSessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    sshSessionStore.deleteSession(sessionId);

    res.json({ message: 'Session closed' });
  } catch (err: any) {
    console.error('[SSH Terminal API] Error force-closing session:', err);
    res.status(500).json({ message: 'Failed to close session' });
  }
});

export default router;

