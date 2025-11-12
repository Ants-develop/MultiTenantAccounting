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
  // Global admins have access to all clients
  if (await isUserGlobalAdmin(userId)) {
    const allClients = await db
      .select({ clientId: clients.id })
      .from(clients)
      .limit(1000);
    return allClients;
  }

  // Regular users - return only clients with explicit permissions
  return await db
    .select({ clientId: userClientModules.clientId })
    .from(userClientModules)
    .where(
      and(
        eq(userClientModules.userId, userId),
        eq(userClientModules.module, module),
        eq(userClientModules.canView, true)
      )
    );
}

// Check module-level permission
export async function checkModulePermission(
  userId: number,
  clientId: number,
  module: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  // Global admins bypass all checks
  if (await isUserGlobalAdmin(userId)) {
    return true;
  }

  const permissions = await db
    .select()
    .from(userClientModules)
    .where(
      and(
        eq(userClientModules.userId, userId),
        eq(userClientModules.clientId, clientId),
        eq(userClientModules.module, module)
      )
    )
    .limit(1);

  if (permissions.length === 0) {
    return false;
  }

  const perm = permissions[0];
  switch (action) {
    case "view":
      return perm.canView;
    case "create":
      return perm.canCreate;
    case "edit":
      return perm.canEdit;
    case "delete":
      return perm.canDelete;
    default:
      return false;
  }
}

// Check feature-level permission
export async function checkFeaturePermission(
  userId: number,
  clientId: number,
  feature: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  // Global admins bypass all checks
  if (await isUserGlobalAdmin(userId)) {
    return true;
  }

  const permissions = await db
    .select()
    .from(userClientFeatures)
    .where(
      and(
        eq(userClientFeatures.userId, userId),
        eq(userClientFeatures.clientId, clientId),
        eq(userClientFeatures.feature, feature)
      )
    )
    .limit(1);

  if (permissions.length === 0) {
    return false;
  }

  const perm = permissions[0];
  switch (action) {
    case "view":
      return perm.canView;
    case "create":
      return perm.canCreate;
    case "edit":
      return perm.canEdit;
    case "delete":
      return perm.canDelete;
    default:
      return false;
  }
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

