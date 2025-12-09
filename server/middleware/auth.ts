// Authentication and authorization middleware
import { storage } from "../storage";

// Auth middleware - requires user to be logged in
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    // Only log auth failures, not every request
    console.log('Auth failed:', req.path);
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Set req.user for compatibility with APIs that expect it
  req.user = { id: req.session.userId };

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

