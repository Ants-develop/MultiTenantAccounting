import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProfileSchema, profiles, userCompanies as userCompaniesTable, clients as clientsTable, mainCompanySettings } from "@shared/schema";
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
import dashboardRouter from "./api/dashboard";
import homeRouter from "./api/home";
import customersVendorsRouter from "./api/customers-vendors";
import mssqlImportRouter from "./api/mssql-import";
import rsAdminRouter from "./api/rs-admin";
import rsSyncRouter from "./api/rs-sync";
import permissionsRouter from "./api/permissions";
import notificationsRouter from "./routes/notifications";
import backupRestoreRouter from "./api/backup-restore";
import storageRouter from "./api/storage";
import connectionsRouter from "./api/connections";
import mssqlRestoreSshRouter from "./routes/mssql-restore-ssh";
import feedRouter from "./routes/feed";
import documentsRouter from "./api/documents";
import settingsRouter from "./api/settings";
// messagesRouter and usersRouter removed - now handled via Supabase RLS
// import messagesRouter from "./api/messages";
import usersRouter from "./api/users";
import userCompaniesRouter from "./api/user-companies";

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy if behind reverse proxy (nginx, etc.)
  app.set('trust proxy', 1);

  // =====================================================
  // ARCHITECTURE: Hybrid Backend + Supabase RLS Approach
  // =====================================================
  // - Authentication: Supabase Auth (JWT tokens validated in requireAuth middleware)
  // - Direct Supabase queries: profiles, clients, deals, tasks, workflows, calendar, messages
  //   (protected by RLS policies in Supabase)
  // - Backend APIs: accounting, reports, imports, integrations (business logic + aggregations)
  // =====================================================

  // Auth routes - Legacy routes removed, now handled by Supabase on client side
  // We keep /api/auth/me for compatibility but it just returns the user from the token
  
  app.get('/api/auth/me', requireAuth, async (req: any, res) => {
    // req.user is set by requireAuth middleware from Supabase token
    // req.profile is also set if available
    const [mainCompany] = await db.select().from(mainCompanySettings).limit(1);
    const isMainCompanyConfigured = !!(mainCompany && typeof mainCompany.name === 'string' && mainCompany.name.trim().length > 0);

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.profile?.username || req.user.user_metadata?.username,
        firstName: req.profile?.firstName || req.user.user_metadata?.first_name,
        lastName: req.profile?.lastName || req.user.user_metadata?.last_name,
        globalRole: req.profile?.globalRole || 'user',
        mustChangePassword: req.user.user_metadata?.must_change_password || false,
      },
      mainCompany: mainCompany || null,
      needsSetup: !isMainCompanyConfigured
    });
  });

  // API Routes
  app.use("/api/global-admin", requireAuth, requireGlobalAdmin, globalAdminRouter);
  app.use("/api/activity-logs", requireAuth, activityLogsRouter);
  app.use("/api/audit", requireAuth, auditRouter);
  app.use("/api/rs-integration", requireAuth, rsIntegrationRouter);
  app.use("/api/rs-admin", requireAuth, rsAdminRouter);
  app.use("/api/rs-sync", requireAuth, rsSyncRouter);
  app.use("/api/permissions", requireAuth, permissionsRouter);
  app.use("/api/accounts", requireAuth, accountsRouter);
  app.use("/api/journal-entries", requireAuth, journalEntriesRouter);
  app.use("/api/companies", requireAuth, companyRouter); // Note: legacy + admin screens
  app.use("/api/company", requireAuth, companyRouter); // Main company setup/profile endpoints used by SetupWizard/CompanyProfile
  app.use("/api/clients", requireAuth, clientsRouter);
  app.use("/api/reports", requireAuth, reportsRouter);
  app.use("/api/reporting", requireAuth, reportingRouter);
  app.use("/api/bank", requireAuth, bankRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/home", requireAuth, homeRouter);
  app.use("/api/customers-vendors", requireAuth, customersVendorsRouter);
  app.use("/api/mssql-import", requireAuth, mssqlImportRouter); // Uses service role key for backend operations
  
  // Mount restore-ssh router first so it handles /restore-ssh paths
  app.use("/api/mssql", requireAuth, mssqlRestoreSshRouter);
  app.use("/api/mssql", requireAuth, mssqlImportRouter); // Alias for legacy client calls
  
  app.use("/api/documents", requireAuth, documentsRouter);
  app.use("/api/users", requireAuth, usersRouter);
  app.use("/api/user-companies", requireAuth, userCompaniesRouter);
  
  // Routes removed - now handled via direct Supabase queries with RLS:
  // - /api/messages -> client queries 'messages' table directly
  // - /api/users -> client queries 'profiles' table directly
  // - /api/deals, /api/tasks, /api/workflows, /api/calendar -> all via Supabase RLS
  app.use("/api/notifications", requireAuth, notificationsRouter);
  app.use("/api/backup-restore", requireAuth, backupRestoreRouter);
  app.use("/api/storage", requireAuth, storageRouter);
  app.use("/api/connections", requireAuth, connectionsRouter);
  // app.use("/api/mssql-restore-ssh", requireAuth, mssqlRestoreSshRouter); // Moved to /api/mssql
  app.use("/api/feed", requireAuth, feedRouter);
  app.use("/api/settings", requireAuth, settingsRouter);
  
  // Removed routes (now via Supabase RLS):
  // app.use("/api/messages", requireAuth, messagesRouter);
  // app.use("/api/users", requireAuth, usersRouter);

  const httpServer = createServer(app);
  return httpServer;
}
