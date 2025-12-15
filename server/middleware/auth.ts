// Authentication and authorization middleware
import { supabaseAdmin } from "../supabase";
import { db } from "../db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

// Auth middleware - requires user to be logged in via Supabase Auth
export const requireAuth = async (req: any, res: any, next: any) => {
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Support token in query param for EventSource/SSE connections
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('Supabase auth error:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = user;
    
    // Also attach the profile for convenience (and legacy compatibility if we map fields)
    // We can fetch the profile from the database
    try {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
      if (profile) {
        req.profile = profile;
        // For legacy compatibility, some routes might expect req.user.id to be the profile id
        // Since both are UUIDs now, it's fine.
      }
    } catch (dbError) {
      console.error('Error fetching profile:', dbError);
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Global Administrator middleware - requires global admin role
export const requireGlobalAdmin = async (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Check profile for global role
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, req.user.id)).limit(1);
    
    if (!profile || profile.globalRole !== 'global_administrator') {
      return res.status(403).json({ message: 'Global administrator access required' });
    }
    next();
  } catch (error) {
    console.error('Global admin check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

