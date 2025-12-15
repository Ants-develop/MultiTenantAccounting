import { Router } from "express";
import { db } from "../db";
import { activityLogs, profiles } from "@shared/schema";
import { eq, desc, and, gte, lte, like, or, count, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get activity logs with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const sessionUserId = (req as any).user?.id as string | undefined;
    const {
      page = "1",
      limit = "50",
      action,
      resource,
      userId: filterUserId,
      startDate,
      endDate,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 records per page
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [];

    // TODO: If not global admin, only show logs for companies user has access to
    // For now, we'll show all logs but this should be restricted based on user permissions

    if (action) {
      conditions.push(eq(activityLogs.action, action as string));
    }

    if (resource) {
      conditions.push(eq(activityLogs.resource, resource as string));
    }

    if (filterUserId) {
      conditions.push(eq(activityLogs.userId, filterUserId as string));
    }

    if (startDate) {
      conditions.push(gte(activityLogs.timestamp, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(activityLogs.timestamp, new Date(endDate as string)));
    }

    if (search) {
      conditions.push(
        or(
          like(activityLogs.details, `%${search}%`),
          like(activityLogs.action, `%${search}%`),
          like(activityLogs.resource, `%${search}%`)
        )
      );
    }

    // Build the query
    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    let countQuery = db
      .select({ count: count(activityLogs.id) })
      .from(activityLogs);
    
    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }

    const [{ count: totalCount }] = await countQuery;

    // Get the actual logs
    const logsQuery = db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        resource: activityLogs.resource,
        resourceId: activityLogs.resourceId,
        details: activityLogs.details,
        timestamp: activityLogs.timestamp,
        ipAddress: activityLogs.ipAddress,
        userAgent: activityLogs.userAgent,
        username: profiles.username,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        userGlobalRole: profiles.globalRole,
      })
      .from(activityLogs)
      .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limitNum)
      .offset(offset);

    if (whereClause) {
      logsQuery.where(whereClause);
    }

    const logs = await logsQuery;

    // Format the logs for display
    const formattedLogs = logs.map(log => {
      let parsedDetails = {};
      try {
        parsedDetails = JSON.parse(log.details || '{}');
      } catch (error) {
        parsedDetails = { raw: log.details };
      }

      return {
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        timestamp: log.timestamp,
        formattedTimestamp: new Date(log.timestamp).toLocaleString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        user: {
          username: log.username,
          name: `${log.firstName} ${log.lastName}`,
          globalRole: log.userGlobalRole
        },
        details: parsedDetails,
        actionDisplayName: getActionDisplayName(log.action),
        resourceDisplayName: getResourceDisplayName(log.resource),
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity logs"
    });
  }
});

// Get activity summary/stats
router.get("/summary", async (req, res) => {
  try {
    const sessionUserId = (req as any).user?.id as string | undefined;
    const { days = "7" } = req.query;
    
    const daysNum = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get activity counts by action
    const actionCounts = await db
      .select({
        action: activityLogs.action,
        count: count(activityLogs.id)
      })
      .from(activityLogs)
      .where(gte(activityLogs.timestamp, startDate))
      .groupBy(activityLogs.action);

    // Get activity counts by resource
    const resourceCounts = await db
      .select({
        resource: activityLogs.resource,
        count: count(activityLogs.id)
      })
      .from(activityLogs)
      .where(gte(activityLogs.timestamp, startDate))
      .groupBy(activityLogs.resource);

    // Get daily activity counts - use a different approach
    const dailyActivityRaw = await db
      .select({
        date: sql`DATE(${activityLogs.timestamp})`.as('date'),
        count: count(activityLogs.id)
      })
      .from(activityLogs)
      .where(gte(activityLogs.timestamp, startDate))
      .groupBy(sql`DATE(${activityLogs.timestamp})`)
      .orderBy(sql`DATE(${activityLogs.timestamp}) DESC`);

    // Format daily counts
    const dailyCounts = dailyActivityRaw.map(item => ({
      date: item.date,
      count: parseInt(item.count.toString())
    }));

    res.json({
      success: true,
      data: {
        period: `${daysNum} days`,
        actionCounts: actionCounts.map(item => ({
          action: item.action,
          count: parseInt(item.count.toString())
        })),
        resourceCounts: resourceCounts.map(item => ({
          resource: item.resource,
          count: parseInt(item.count.toString())
        })),
        dailyCounts
      }
    });

  } catch (error) {
    console.error("Error fetching activity summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity summary"
    });
  }
});

// Get available filter options
router.get("/filters", async (req, res) => {
  try {
    // Get unique actions
    const actions = await db
      .selectDistinct({ action: activityLogs.action })
      .from(activityLogs)
      .orderBy(activityLogs.action);

    // Get unique resources
    const resources = await db
      .selectDistinct({ resource: activityLogs.resource })
      .from(activityLogs)
      .orderBy(activityLogs.resource);

    // Get users who have activity
    const activeUsers = await db
      .selectDistinct({
        userId: activityLogs.userId,
        username: profiles.username,
        firstName: profiles.firstName,
        lastName: profiles.lastName
      })
      .from(activityLogs)
      .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
      .orderBy(profiles.firstName, profiles.lastName);

    res.json({
      success: true,
      data: {
        actions: actions.map(a => ({
          value: a.action,
          label: getActionDisplayName(a.action)
        })),
        resources: resources.map(r => ({
          value: r.resource,
          label: getResourceDisplayName(r.resource)
        })),
        users: activeUsers.map(u => ({
          value: u.userId,
          label: `${u.firstName} ${u.lastName} (${u.username})`
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch filter options"
    });
  }
});

// Helper functions for display names
function getActionDisplayName(action: string): string {
  const actionMap: Record<string, string> = {
    'LOGIN': '🔐 User Login',
    'LOGOUT': '🚪 User Logout',
    'COMPANY_CREATE': '🏢 Company Created',
    'COMPANY_UPDATE': '✏️ Company Updated',
    'COMPANY_DELETE': '🗑️ Company Deleted',
    'USER_CREATE': '👤 User Created',
    'USER_UPDATE': '✏️ User Updated',
    'USER_DELETE': '🗑️ User Deleted',
    'ACCOUNT_CREATE': '📊 Account Created',
    'ACCOUNT_UPDATE': '✏️ Account Updated',
    'ACCOUNT_DELETE': '🗑️ Account Deleted',
    'JOURNAL_CREATE': '📝 Journal Entry Created',
    'JOURNAL_UPDATE': '✏️ Journal Entry Updated',
    'JOURNAL_DELETE': '🗑️ Journal Entry Deleted',
    'SETTINGS_UPDATE_COMPANY': '⚙️ Company Settings Updated',
    'SETTINGS_UPDATE_NOTIFICATIONS': '🔔 Notification Settings Updated',
    'SETTINGS_UPDATE_FINANCIAL': '💰 Financial Settings Updated',
    'SETTINGS_UPDATE_SECURITY': '🔒 Security Settings Updated',
    'DATA_EXPORT': '📤 Data Export',
    'COMPANY_ARCHIVE': '📦 Company Archived',
    'SYSTEM_ERROR': '❌ System Error',
    'PERMISSION_DENIED': '🚫 Permission Denied',
  };
  return actionMap[action] || action;
}

function getResourceDisplayName(resource: string): string {
  const resourceMap: Record<string, string> = {
    'USER': '👤 User',
    'COMPANY': '🏢 Company',
    'ACCOUNT': '📊 Account',
    'JOURNAL_ENTRY': '📝 Journal Entry',
    'CUSTOMER': '👥 Customer',
    'VENDOR': '🏪 Vendor',
    'INVOICE': '📄 Invoice',
    'BILL': '🧾 Bill',
    'SETTINGS': '⚙️ Settings',
    'SYSTEM': '🖥️ System',
  };
  return resourceMap[resource] || resource;
}

export default router; 