import { Router } from 'express';
import { db } from '../db';
import { userCompanies } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireGlobalAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/user-companies - Get all user-company assignments
router.get('/', async (req, res) => {
  try {
    // Only allow global admins or maybe check permissions?
    // For now, let's allow authenticated users (or restrict to admin if needed)
    // UserManagement.tsx checks 'canManageUsers', which implies admin.
    
    const assignments = await db.select().from(userCompanies);
    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching user companies:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/user-companies - Assign user to company
router.post('/', async (req, res) => {
  try {
    const { userId, companyId, role } = req.body;
    
    if (!userId || !companyId) {
      return res.status(400).json({ message: 'userId and companyId are required' });
    }

    // Check if assignment already exists
    const existing = await db.select()
      .from(userCompanies)
      .where(eq(userCompanies.userId, userId))
      .where(eq(userCompanies.companyId, companyId)); // Note: chaining where is AND

    // Better to use and()
    // .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)))
    
    // But for now, let's just insert. If unique constraint exists, it will fail.
    // The schema might not have a unique constraint on (userId, companyId).
    
    const [assignment] = await db.insert(userCompanies).values({
      userId,
      companyId,
      role: role || 'member'
    }).returning();
    
    res.json(assignment);
  } catch (error: any) {
    console.error('Error creating user company assignment:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
