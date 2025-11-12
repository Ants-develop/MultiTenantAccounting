// Chat Module API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_CLIENT_ID } from "../constants";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/chat/channels - Get all channels for the main company
router.get('/channels', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    
    const result = await db.execute(sql.raw(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.is_private,
        c.created_by,
        c.created_at,
        u.username as creator_name,
        COALESCE(cm.user_id, 0) as is_member
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ${userId}
      WHERE c.company_id = ${clientId}
        AND (c.is_private = false OR cm.user_id IS NOT NULL)
      ORDER BY c.created_at DESC
    `));

    res.json(result.rows);
  } catch (error) {
    console.error('[Chat] Get channels error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/chat/channels - Create a new channel
router.post('/channels', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { name, description, isPrivate, memberIds } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Channel name is required' });
    }
    
    // Create channel
    const channelResult = await db.execute(sql.raw(`
      INSERT INTO chat_channels (company_id, name, description, is_private, created_by)
      VALUES (${clientId}, '${name}', '${description || ''}', ${isPrivate || false}, ${userId})
      RETURNING *
    `));
    
    const channel = channelResult.rows[0];
    
    // Add creator as member
    await db.execute(sql.raw(`
      INSERT INTO chat_channel_members (channel_id, user_id)
      VALUES (${channel.id}, ${userId})
    `));
    
    // Add additional members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const memberValues = memberIds.map(memberId => `(${channel.id}, ${memberId})`).join(', ');
      await db.execute(sql.raw(`
        INSERT INTO chat_channel_members (channel_id, user_id)
        VALUES ${memberValues}
        ON CONFLICT DO NOTHING
      `));
    }

    res.status(201).json(channel);
  } catch (error) {
    console.error('[Chat] Create channel error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/chat/channels/:id/messages - Get messages for a specific channel
router.get('/channels/:id/messages', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Verify user has access to channel
    const accessCheck = await db.execute(sql.raw(`
      SELECT c.id
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id
      WHERE c.id = ${id} 
        AND c.company_id = ${clientId}
        AND (c.is_private = false OR cm.user_id = ${userId})
    `));
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this channel' });
    }
    
    // Get messages
    const result = await db.execute(sql.raw(`
      SELECT 
        m.id,
        m.channel_id,
        m.user_id,
        m.message,
        m.is_edited,
        m.is_deleted,
        m.created_at,
        m.updated_at,
        u.username,
        u.email
      FROM chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ${id}
        AND m.is_deleted = false
      ORDER BY m.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `));
    
    // Update last_read_at for user
    await db.execute(sql.raw(`
      UPDATE chat_channel_members
      SET last_read_at = NOW()
      WHERE channel_id = ${id} AND user_id = ${userId}
    `));

    res.json(result.rows.reverse()); // Return in chronological order
  } catch (error) {
    console.error('[Chat] Get messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/chat/channels/:id/messages - Send a message to a channel
router.post('/channels/:id/messages', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Verify user has access to channel
    const accessCheck = await db.execute(sql.raw(`
      SELECT c.id
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id
      WHERE c.id = ${id} 
        AND c.company_id = ${clientId}
        AND (c.is_private = false OR cm.user_id = ${userId})
    `));
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this channel' });
    }
    
    // Escape single quotes in message
    const escapedMessage = message.replace(/'/g, "''");
    
    const result = await db.execute(sql.raw(`
      INSERT INTO chat_messages (channel_id, user_id, message)
      VALUES (${id}, ${userId}, '${escapedMessage}')
      RETURNING *
    `));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Chat] Send message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/chat/messages/:id - Update a message
router.put('/messages/:id', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Escape single quotes in message
    const escapedMessage = message.replace(/'/g, "''");
    
    const result = await db.execute(sql.raw(`
      UPDATE chat_messages
      SET message = '${escapedMessage}', is_edited = true, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or you do not have permission to edit it' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Chat] Update message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/chat/messages/:id - Delete a message
router.delete('/messages/:id', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { id } = req.params;
    
    const result = await db.execute(sql.raw(`
      UPDATE chat_messages
      SET is_deleted = true, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or you do not have permission to delete it' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('[Chat] Delete message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/chat/unread-count - Get unread message count for user
router.get('/unread-count', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    
    const result = await db.execute(sql.raw(`
      SELECT 
        cm.channel_id,
        c.name as channel_name,
        COUNT(m.id) as unread_count
      FROM chat_channel_members cm
      JOIN chat_channels c ON cm.channel_id = c.id
      LEFT JOIN chat_messages m ON c.id = m.channel_id 
        AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
        AND m.user_id != ${userId}
        AND m.is_deleted = false
      WHERE cm.user_id = ${userId}
        AND c.company_id = ${clientId}
      GROUP BY cm.channel_id, c.name
      HAVING COUNT(m.id) > 0
      ORDER BY c.name
    `));

    const totalUnread = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.unread_count), 0);

    res.json({
      channels: result.rows,
      total: totalUnread
    });
  } catch (error) {
    console.error('[Chat] Get unread count error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

