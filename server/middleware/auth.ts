// Authentication and authorization middleware
import { storage } from "../storage";

// Auth middleware - requires user to be logged in
export const requireAuth = (req: any, res: any, next: any) => {
  // Debug session info (enabled for production debugging)
  console.log('Session check:', {
    path: req.path,
    hasSession: !!req.session,
    userId: req.session?.userId,
    sessionId: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (!req.session.userId) {
    console.log('Authentication failed - no userId in session');
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};


// Global Administrator middleware - requires global admin role
export const requireGlobalAdmin = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user is global administrator
  storage.getUser(req.session.userId).then(user => {
    if (!user || user.globalRole !== 'global_administrator') {
      return res.status(403).json({ message: 'Global administrator access required' });
    }
    next();
  }).catch(error => {
    console.error('Global admin check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  });
};

