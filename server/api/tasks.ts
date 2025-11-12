// Tasks Module API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth, requireCompany } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireCompany);

// GET /api/tasks - Get all tasks for the current company
router.get('/', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { status, priority, assignedTo } = req.query;
    
    let filters = [`t.company_id = ${companyId}`];
    
    if (status) {
      filters.push(`t.status = '${status}'`);
    }
    if (priority) {
      filters.push(`t.priority = '${priority}'`);
    }
    if (assignedTo) {
      filters.push(`t.assigned_to = ${assignedTo}`);
    }
    
    const whereClause = filters.join(' AND ');
    
    const result = await db.execute(sql.raw(`
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        assignee.username as assignee_name,
        assignee.email as assignee_email,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE ${whereClause}
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `));

    res.json(result.rows);
  } catch (error) {
    console.error('[Tasks] Get tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/tasks/assigned-to-me - Get tasks assigned to current user
router.get('/assigned-to-me', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const userId = req.session.userId!;
    
    const result = await db.execute(sql.raw(`
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.company_id = ${companyId}
        AND t.assigned_to = ${userId}
        AND t.status != 'completed'
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        t.due_date ASC NULLS LAST
    `));

    res.json(result.rows);
  } catch (error) {
    console.error('[Tasks] Get assigned tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/tasks/created-by-me - Get tasks created by current user
router.get('/created-by-me', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const userId = req.session.userId!;
    
    const result = await db.execute(sql.raw(`
      SELECT 
        t.*,
        assignee.username as assignee_name,
        assignee.email as assignee_email,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.company_id = ${companyId}
        AND t.created_by = ${userId}
      ORDER BY t.created_at DESC
    `));

    res.json(result.rows);
  } catch (error) {
    console.error('[Tasks] Get created tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/tasks/:id - Get a specific task
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    
    const result = await db.execute(sql.raw(`
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        assignee.username as assignee_name,
        assignee.email as assignee_email
      FROM tasks t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.id = ${id} AND t.company_id = ${companyId}
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Get comments
    const commentsResult = await db.execute(sql.raw(`
      SELECT 
        tc.*,
        u.username,
        u.email
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ${id}
      ORDER BY tc.created_at ASC
    `));
    
    // Get attachments
    const attachmentsResult = await db.execute(sql.raw(`
      SELECT 
        ta.*,
        u.username as uploader_name
      FROM task_attachments ta
      JOIN users u ON ta.uploaded_by = u.id
      WHERE ta.task_id = ${id}
      ORDER BY ta.uploaded_at DESC
    `));

    const task = {
      ...result.rows[0],
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows
    };

    res.json(task);
  } catch (error) {
    console.error('[Tasks] Get task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const userId = req.session.userId!;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }
    
    // Escape single quotes
    const escapedTitle = title.replace(/'/g, "''");
    const escapedDescription = description ? description.replace(/'/g, "''") : '';
    
    const result = await db.execute(sql.raw(`
      INSERT INTO tasks (
        company_id, title, description, status, priority, due_date, created_by, assigned_to
      )
      VALUES (
        ${companyId}, 
        '${escapedTitle}', 
        '${escapedDescription}',
        '${status || 'pending'}',
        '${priority || 'medium'}',
        ${dueDate ? `'${dueDate}'` : 'NULL'},
        ${userId},
        ${assignedTo || 'NULL'}
      )
      RETURNING *
    `));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Tasks] Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/tasks/:id - Update a task
router.put('/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;
    
    const updates = ['updated_at = NOW()'];
    
    if (title !== undefined) {
      const escapedTitle = title.replace(/'/g, "''");
      updates.push(`title = '${escapedTitle}'`);
    }
    if (description !== undefined) {
      const escapedDescription = description.replace(/'/g, "''");
      updates.push(`description = '${escapedDescription}'`);
    }
    if (status !== undefined) {
      updates.push(`status = '${status}'`);
      if (status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }
    if (priority !== undefined) {
      updates.push(`priority = '${priority}'`);
    }
    if (dueDate !== undefined) {
      updates.push(dueDate ? `due_date = '${dueDate}'` : `due_date = NULL`);
    }
    if (assignedTo !== undefined) {
      updates.push(assignedTo ? `assigned_to = ${assignedTo}` : `assigned_to = NULL`);
    }
    
    const result = await db.execute(sql.raw(`
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Tasks] Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/assign - Assign a task to a user
router.put('/:id/assign', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const result = await db.execute(sql.raw(`
      UPDATE tasks
      SET assigned_to = ${userId}, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Tasks] Assign task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/tasks/:id/status - Update task status
router.put('/:id/status', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const updates = [`status = '${status}'`, 'updated_at = NOW()'];
    if (status === 'completed') {
      updates.push('completed_at = NOW()');
    }
    
    const result = await db.execute(sql.raw(`
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Tasks] Update task status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    
    // Delete comments and attachments first
    await db.execute(sql.raw(`DELETE FROM task_comments WHERE task_id = ${id}`));
    await db.execute(sql.raw(`DELETE FROM task_attachments WHERE task_id = ${id}`));
    
    const result = await db.execute(sql.raw(`
      DELETE FROM tasks
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('[Tasks] Delete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/tasks/:id/comments - Add a comment to a task
router.post('/:id/comments', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const userId = req.session.userId!;
    const { id } = req.params;
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({ message: 'Comment is required' });
    }
    
    // Verify task exists and belongs to company
    const taskCheck = await db.execute(sql.raw(`
      SELECT id FROM tasks WHERE id = ${id} AND company_id = ${companyId}
    `));
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const escapedComment = comment.replace(/'/g, "''");
    
    const result = await db.execute(sql.raw(`
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES (${id}, ${userId}, '${escapedComment}')
      RETURNING *
    `));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Tasks] Add comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

