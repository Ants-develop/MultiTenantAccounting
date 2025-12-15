import { Router } from 'express';
import { db } from '../db';
import { profiles } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { supabaseAdmin } from '../supabase';

const router = Router();

// POST /api/users - Create a new user (Supabase Auth + Profile)
router.post('/', async (req, res) => {
  try {
    const { email, password, username, firstName, lastName, globalRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
        first_name: firstName,
        last_name: lastName,
        global_role: globalRole || 'user',
        must_change_password: true // Force password change on first login
      }
    });

    if (authError) {
      console.error('Supabase Auth Error:', authError);
      return res.status(400).json({ message: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ message: 'Failed to create user in Supabase' });
    }

    // 2. Create or update profile in database
    // Check if profile already exists (e.g. created by trigger)
    const [existingProfile] = await db.select().from(profiles).where(eq(profiles.id, authData.user.id));
    
    if (!existingProfile) {
        await db.insert(profiles).values({
            id: authData.user.id,
            email: email,
            username: username,
            firstName: firstName,
            lastName: lastName,
            globalRole: globalRole || 'user',
            isActive: true
        });
    } else {
        // Update the profile if it was created by a trigger but missing details
        await db.update(profiles).set({
            username: username,
            firstName: firstName,
            lastName: lastName,
            globalRole: globalRole || 'user'
        }).where(eq(profiles.id, authData.user.id));
    }

    res.status(201).json({ 
        user: authData.user,
        message: 'User created successfully' 
    });

  } catch (error: any) {
    console.error('Create User Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users - Get all active users (for user directory, messaging, etc.)
// This is a general endpoint that any authenticated user can access
router.get('/', async (req, res) => {
  try {
    const users = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        email: profiles.email,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        globalRole: profiles.globalRole,
        isActive: profiles.isActive,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(eq(profiles.isActive, true))
      .orderBy(desc(profiles.createdAt));

    res.json(users);
  } catch (error: any) {
    console.error('[Users API] Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - Get a specific user's profile
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const [user] = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        email: profiles.email,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        globalRole: profiles.globalRole,
        isActive: profiles.isActive,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('[Users API] Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Supabase Auth Delete Error:', authError);
      return res.status(400).json({ message: authError.message });
    }

    // 2. Mark profile as inactive in database
    // We don't hard delete to preserve history (e.g. createdBy fields)
    await db.update(profiles).set({ isActive: false }).where(eq(profiles.id, userId));
    
    res.json({ message: 'User deleted successfully' });

  } catch (error: any) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /change-password - Change own password and clear must_change_password flag
router.post('/change-password', async (req: any, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Update password and metadata in Supabase
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: password,
        user_metadata: {
          ...req.user.user_metadata,
          must_change_password: false
        }
      }
    );

    if (error) {
      console.error('Supabase Update Error:', error);
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
