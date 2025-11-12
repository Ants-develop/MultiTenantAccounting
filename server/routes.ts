import express, { type Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { authenticateUser, hashPassword, getUserWithCompanies } from "./auth";
import { insertUserSchema, insertUserCompanySchema, users as usersTable, userCompanies as userCompaniesTable } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";
import { db } from "./db";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "./services/activity-logger";

// Import middleware
import { requireAuth, requireGlobalAdmin } from "./middleware/auth";

// Import modular API routers
import globalAdminRouter from "./api/global-admin";
import activityLogsRouter from "./api/activity-logs";
import auditRouter from "./api/audit";
import rsIntegrationRouter from "./api/rs-integration";
import accountsRouter from "./api/accounts";
import journalEntriesRouter from "./api/journal-entries";
import companyRouter from "./api/company";
import clientsRouter from "./api/clients";
import reportsRouter from "./api/reports";
import reportingRouter from "./api/reporting";
import bankRouter from "./api/bank";
import chatRouter from "./api/chat";
import tasksRouter from "./api/tasks";
import dashboardRouter from "./api/dashboard";
import homeRouter from "./api/home";
import customersVendorsRouter from "./api/customers-vendors";
import mssqlImportRouter from "./api/mssql-import";
import mssqlAuditImportRouter from "./api/mssql-audit-import";
import rsAdminRouter from "./api/rs-admin";
import permissionsRouter from "./api/permissions";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy if behind reverse proxy (nginx, etc.)
  app.set('trust proxy', 1);
  
  // Session middleware
  // Determine if we should use secure cookies (only if actually using HTTPS)
  const isSecure = process.env.SECURE_COOKIES === 'true' || 
                   (process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true');
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'accounting-app-secret',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Explicit session cookie name
    cookie: {
      secure: isSecure, // Only secure if explicitly using HTTPS
      httpOnly: true,
      sameSite: isSecure ? 'none' : 'lax', // 'none' requires secure: true, 'lax' works with HTTP
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/', // Ensure cookie is available for all paths
      // Don't set domain - let browser use default (current domain)
    },
    // Store configuration - use memory store by default (for production, consider using a database store)
    store: undefined // Uses default MemoryStore
  }));

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log('Login attempt:', { username, hasPassword: !!password });
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await authenticateUser(username, password);
      if (!user) {
        // Log failed login attempt
        await activityLogger.logError(
          ACTIVITY_ACTIONS.LOGIN,
          RESOURCE_TYPES.USER,
          {
            userId: 0, // Unknown user - system event placeholder
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          },
          'Invalid credentials',
          undefined,
          { attemptedUsername: username }
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      console.log('User authenticated:', { userId: user.id, username: user.username });

      req.session.userId = user.id;

      // Fetch user with companies data for response
      const userWithCompanies = await getUserWithCompanies(user.id);

      console.log('Session before save:', {
        userId: req.session.userId,
        sessionId: req.sessionID
      });

      // Explicitly save the session to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ message: 'Failed to create session' });
        }

        console.log('Session saved successfully:', {
          sessionId: req.sessionID,
          userId: req.session.userId,
          cookies: res.getHeader('Set-Cookie')
        });

        // Log successful login
        activityLogger.logAuth(
          ACTIVITY_ACTIONS.LOGIN,
          {
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          },
          { 
            username: user.username,
            mainCompanyConfigured: userWithCompanies?.mainCompany ? true : false
          }
        ).catch(err => console.error('Error logging auth:', err));

        res.json(userWithCompanies);
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // Log login system error
      await activityLogger.logError(
        ACTIVITY_ACTIONS.LOGIN,
        RESOURCE_TYPES.SYSTEM,
        {
          userId: 0,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        },
        error as Error,
        undefined,
        { attemptedUsername: req.body?.username }
      );
      
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username) || 
                          await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      req.session.userId = user.id;

      // Fetch user with companies data for response (will check main company setup)
      const userWithCompanies = await getUserWithCompanies(user.id);
      
      res.json(userWithCompanies);
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const userWithCompanies = await getUserWithCompanies(req.session.userId!);
      if (!userWithCompanies) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(userWithCompanies);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Profile management endpoints
  app.put('/api/auth/profile', requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      const userId = req.session.userId!;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Check if email is already taken by another user
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(and(
          eq(usersTable.email, email),
          sql`id != ${userId}`
        ))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Email is already in use' });
      }

      // Update user profile
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Log profile update activity
      await activityLogger.logActivity({
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      }, {
        action: ACTIVITY_ACTIONS.USER_UPDATE,
        resource: RESOURCE_TYPES.USER,
        resourceId: userId,
      });

      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      res.json({ 
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId!;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      // Validate new password length
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const { verifyPassword } = await import('./auth');
      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await storage.updateUser(userId, { password: hashedPassword });

      // Log password change activity
      await activityLogger.logActivity({
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      }, {
        action: ACTIVITY_ACTIONS.PASSWORD_CHANGE,
        resource: RESOURCE_TYPES.USER,
        resourceId: userId,
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Users management endpoints
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ message: 'Current user not found' });
      }

      let users;
      
      // If global administrator, show all users
      if (currentUser.globalRole === 'global_administrator') {
        // Get all users in the system
        users = await db.select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          globalRole: usersTable.globalRole,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
        }).from(usersTable);
      } else {
        // For non-global admins in single-company model, show all users
        users = await db
          .select({
            id: usersTable.id,
            username: usersTable.username,
            email: usersTable.email,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
            globalRole: usersTable.globalRole,
            isActive: usersTable.isActive,
            createdAt: usersTable.createdAt,
          })
          .from(usersTable);
      }

      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/users', requireAuth, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username) || 
                          await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
        isActive: user.isActive,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User-Company assignments endpoint
  app.get('/api/user-companies', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ message: 'Current user not found' });
      }

      let userCompanyAssignments;

      // If global administrator, show all user-company assignments
      if (currentUser.globalRole === 'global_administrator') {
        userCompanyAssignments = await db
          .select({
            id: userCompaniesTable.id,
            userId: userCompaniesTable.userId,
            companyId: userCompaniesTable.companyId,
            role: userCompaniesTable.role,
            isActive: userCompaniesTable.isActive,
            user: {
              id: usersTable.id,
              username: usersTable.username,
              email: usersTable.email,
              firstName: usersTable.firstName,
              lastName: usersTable.lastName,
            },
            company: {
              id: sql`companies.id`,
              name: sql`companies.name`,
              code: sql`companies.code`,
            }
          })
          .from(userCompaniesTable)
          .innerJoin(usersTable, eq(userCompaniesTable.userId, usersTable.id))
          .innerJoin(sql`companies`, sql`user_companies.company_id = companies.id`);
      } else {
        // For non-global admins in single-company model, show all assignments
        userCompanyAssignments = await db
          .select({
            id: userCompaniesTable.id,
            userId: userCompaniesTable.userId,
            companyId: userCompaniesTable.companyId,
            role: userCompaniesTable.role,
            isActive: userCompaniesTable.isActive,
            user: {
              id: usersTable.id,
              username: usersTable.username,
              email: usersTable.email,
              firstName: usersTable.firstName,
              lastName: usersTable.lastName,
            },
            company: {
              id: sql`companies.id`,
              name: sql`companies.name`,
              code: sql`companies.code`,
            }
          })
          .from(userCompaniesTable)
          .innerJoin(usersTable, eq(userCompaniesTable.userId, usersTable.id))
          .innerJoin(sql`companies`, sql`user_companies.company_id = companies.id`);
      }

      res.json(userCompanyAssignments);
    } catch (error) {
      console.error('Get user-companies error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/user-companies', requireAuth, async (req, res) => {
    try {
      const assignmentData = insertUserCompanySchema.parse(req.body);
      const assignment = await storage.createUserCompany(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error('Create user-company assignment error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete endpoints
  app.delete('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (userId === req.session.userId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const success = await storage.deleteUser(userId);
      if (success) {
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  // Mount modular API routers
  
  // Accounting Module
  app.use('/api/accounts', accountsRouter);
  app.use('/api/journal-entries', journalEntriesRouter);
  
  // Audit Module
  app.use('/api/audit', auditRouter);
  
  // RS Integration Module
  app.use('/api/rs-integration', rsIntegrationRouter);
  app.use('/api/rs-admin', requireAuth, requireGlobalAdmin, rsAdminRouter);
  
  // Reporting Module
  app.use('/api/reports', reportsRouter); // Keep for backward compatibility
  app.use('/api/reporting', reportingRouter);
  
  // Bank Module
  app.use('/api/bank', bankRouter);
  
  // Chat Module
  app.use('/api/chat', chatRouter);
  
  // Tasks Module
  app.use('/api/tasks', tasksRouter);
  
  // Other Modules
  // Main company endpoints
  app.use('/api/company', companyRouter);
  app.use('/api/companies', companyRouter); // Backward compatibility
  
  // Client companies management
  app.use('/api/clients', clientsRouter);
  
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/home', homeRouter);
  app.use('/api', customersVendorsRouter);
  app.use('/api/mssql', mssqlImportRouter);
  app.use('/api/mssql-audit', mssqlAuditImportRouter);
  app.use('/api/permissions', permissionsRouter);
  app.use('/api/global-admin', requireGlobalAdmin, globalAdminRouter);
  app.use('/api/activity-logs', requireAuth, activityLogsRouter);

  // Start server
  const server = createServer(app);
  return server;
}
