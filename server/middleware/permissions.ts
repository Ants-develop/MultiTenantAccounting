import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userClientModules, userClientFeatures, users, clients } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Helper function to check if user is global admin
function isGlobalAdmin(req: Request): boolean {
  return (req.session as any)?.globalRole === "global_administrator";
}

// Check if user is global admin from database
async function isUserGlobalAdmin(userId: number): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user?.globalRole === 'global_administrator';
}

// Get all clients for a user in a specific module (with read permission)
export async function getUserClientsByModule(userId: number, module: string) {
  // UPGRADED: Now uses new authorization system
  const { permissionService } = await import('../services/permissions');

  // Map legacy module names to permission resources
  const moduleResourceMap: Record<string, string> = {
    banking: 'bank',
    bank: 'bank',
    accounting: 'accounting',
    accounts: 'accounting',
    'journal-entries': 'accounting',
    journal: 'accounting',
    audit: 'audit',
    reporting: 'reports',
  };
  const resource = moduleResourceMap[module] || module;

  // Global admins have access to all clients
  if (await isUserGlobalAdmin(userId)) {
    const allClients = await db
      .select({ clientId: clients.id })
      .from(clients)
      .limit(1000);
    return allClients;
  }

  // Use new permission system - get clients user has access to
  const userClients = await permissionService.getUserClients(userId);

  // Filter by module permission
  const clientsWithModuleAccess = [];
  for (const client of userClients) {
    const hasAccess = await permissionService.checkPermission(userId, resource, 'view', client.clientId);
    if (hasAccess) {
      clientsWithModuleAccess.push({ clientId: client.clientId });
    }
  }

  return clientsWithModuleAccess;
}

// Check module-level permission
export async function checkModulePermission(
  userId: number,
  clientId: number,
  module: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  // UPGRADED: Now uses new authorization system
  const { permissionService } = await import('../services/permissions');

  const moduleResourceMap: Record<string, string> = {
    banking: 'bank',
    bank: 'bank',
    accounting: 'accounting',
    accounts: 'accounting',
    'journal-entries': 'accounting',
    journal: 'accounting',
    audit: 'audit',
    reporting: 'reports',
  };
  const resource = moduleResourceMap[module] || module;

  return await permissionService.checkPermission(userId, resource, action, clientId);
}

// Check feature-level permission
export async function checkFeaturePermission(
  userId: number,
  clientId: number,
  feature: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  // UPGRADED: Now uses new authorization system
  const { permissionService } = await import('../services/permissions');

  const moduleResourceMap: Record<string, string> = {
    banking: 'bank',
    bank: 'bank',
    accounting: 'accounting',
    accounts: 'accounting',
    'journal-entries': 'accounting',
    journal: 'accounting',
    audit: 'audit',
    reporting: 'reports',
  };
  const resource = moduleResourceMap[feature] || feature;

  return await permissionService.checkPermission(userId, resource, action, clientId);
}

// Check if user is global admin (helper) - already defined above

// Middleware: Require module access
export function requireModuleAccess(
  module: string,
  action: "view" | "create" | "edit" | "delete" = "view"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;
    const clientId = parseInt(req.query.clientId as string) ||
      (req as any).params?.clientId ||
      (req.body?.clientId);

    if (!userId || !clientId) {
      return res.status(400).json({ message: "User ID and Client ID required" });
    }

    // Global admins bypass all checks
    if (isGlobalAdmin(req)) {
      return next();
    }

    const hasAccess = await checkModulePermission(userId, clientId, module, action);
    if (!hasAccess) {
      return res.status(403).json({ message: `Access denied to ${module} module` });
    }

    next();
  };
}

// Middleware: Require feature access
export function requireFeatureAccess(
  feature: string,
  action: "view" | "create" | "edit" | "delete" = "view"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;
    const clientId = parseInt(req.query.clientId as string) ||
      (req as any).params?.clientId ||
      (req.body?.clientId);

    if (!userId || !clientId) {
      return res.status(400).json({ message: "User ID and Client ID required" });
    }

    // Global admins bypass all checks
    if (isGlobalAdmin(req)) {
      return next();
    }

    const hasAccess = await checkFeaturePermission(userId, clientId, feature, action);
    if (!hasAccess) {
      return res.status(403).json({ message: `Access denied to ${feature}` });
    }

    next();
  };
}

// Middleware: Main company access (always allowed for authenticated users)
export function requireMainCompanyAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // All authenticated users have access to main company
    next();
  };
}

// ============ NEW AUTHORIZATION SYSTEM (v2) ============
import { permissionService } from '../services/permissions';

/**
 * NEW: Middleware to check permission before route handler
 * Usage: router.get('/crm', requirePermission('crm', 'view'), handler)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const clientId = req.query.clientId as string | undefined;

    const hasPermission = await permissionService.checkPermission(
      userId,
      resource,
      action,
      clientId ? parseInt(clientId) : undefined
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: `Permission denied: ${action} on ${resource}`,
      });
    }

    next();
  };
}

/**
 * NEW: Middleware to check if user has access to a specific client
 */
export function requireClientAccess(clientIdParam: string = 'clientId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const clientId = parseInt(
      (req.params[clientIdParam] || req.query[clientIdParam]) as string
    );

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID required' });
    }

    const userClients = await permissionService.getUserClients(userId);
    const hasAccess = userClients.some((c) => c.clientId === clientId);

    // Check global admin
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!hasAccess && user?.globalRole !== 'global_administrator') {
      return res.status(403).json({
        message: 'Access denied to this client',
      });
    }

    // Attach client context to request
    (req as any).clientId = clientId;
    next();
  };
}
