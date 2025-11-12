import { db } from "../db";
import { activityLogs, users, companies } from "@shared/schema";
import { eq } from "drizzle-orm";

// Activity action types for consistent logging
export const ACTIVITY_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // User Management
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  
  // Company Management
  COMPANY_CREATE: 'COMPANY_CREATE',
  COMPANY_UPDATE: 'COMPANY_UPDATE',
  COMPANY_DELETE: 'COMPANY_DELETE',
  COMPANY_SWITCH: 'COMPANY_SWITCH',
  COMPANY_ACTIVATE: 'COMPANY_ACTIVATE',
  COMPANY_DEACTIVATE: 'COMPANY_DEACTIVATE',
  COMPANY_ARCHIVE: 'COMPANY_ARCHIVE',
  COMPANY_RESTORE: 'COMPANY_RESTORE',
  
  // User-Company Assignments
  USER_ASSIGN: 'USER_ASSIGN',
  USER_UNASSIGN: 'USER_UNASSIGN',
  ROLE_CHANGE: 'ROLE_CHANGE',
  
  // Account Management
  ACCOUNT_CREATE: 'ACCOUNT_CREATE',
  ACCOUNT_UPDATE: 'ACCOUNT_UPDATE',
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',
  
  // Journal Entries
  JOURNAL_CREATE: 'JOURNAL_CREATE',
  JOURNAL_UPDATE: 'JOURNAL_UPDATE',
  JOURNAL_DELETE: 'JOURNAL_DELETE',
  JOURNAL_POST: 'JOURNAL_POST',
  JOURNAL_UNPOST: 'JOURNAL_UNPOST',
  
  // Customers & Vendors
  CUSTOMER_CREATE: 'CUSTOMER_CREATE',
  CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  CUSTOMER_DELETE: 'CUSTOMER_DELETE',
  VENDOR_CREATE: 'VENDOR_CREATE',
  VENDOR_UPDATE: 'VENDOR_UPDATE',
  VENDOR_DELETE: 'VENDOR_DELETE',
  
  // Invoices & Bills
  INVOICE_CREATE: 'INVOICE_CREATE',
  INVOICE_UPDATE: 'INVOICE_UPDATE',
  INVOICE_DELETE: 'INVOICE_DELETE',
  INVOICE_SEND: 'INVOICE_SEND',
  INVOICE_PAY: 'INVOICE_PAY',
  BILL_CREATE: 'BILL_CREATE',
  BILL_UPDATE: 'BILL_UPDATE',
  BILL_DELETE: 'BILL_DELETE',
  BILL_APPROVE: 'BILL_APPROVE',
  BILL_PAY: 'BILL_PAY',
  
  // Settings
  SETTINGS_UPDATE_COMPANY: 'SETTINGS_UPDATE_COMPANY',
  SETTINGS_UPDATE_NOTIFICATIONS: 'SETTINGS_UPDATE_NOTIFICATIONS',
  SETTINGS_UPDATE_FINANCIAL: 'SETTINGS_UPDATE_FINANCIAL',
  SETTINGS_UPDATE_SECURITY: 'SETTINGS_UPDATE_SECURITY',
  
  // Data Operations
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  BACKUP_CREATE: 'BACKUP_CREATE',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  
  // System
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  API_ACCESS: 'API_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

// Resource types for consistent categorization
export const RESOURCE_TYPES = {
  USER: 'USER',
  COMPANY: 'COMPANY',
  USER_COMPANY: 'USER_COMPANY',
  ACCOUNT: 'ACCOUNT',
  JOURNAL_ENTRY: 'JOURNAL_ENTRY',
  JOURNAL_LINE: 'JOURNAL_LINE',
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
  INVOICE: 'INVOICE',
  BILL: 'BILL',
  SETTINGS: 'SETTINGS',
  SYSTEM: 'SYSTEM',
} as const;

// Activity context interface
interface ActivityContext {
  userId: number;
  companyId?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

// Activity details interface for structured logging
interface ActivityDetails {
  action: string;
  resource: string;
  resourceId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  error?: string;
  success?: boolean;
}

class ActivityLogger {
  
  /**
   * Log an activity with structured details
   */
  async logActivity(
    context: ActivityContext,
    details: ActivityDetails
  ): Promise<void> {
    try {
      // Get user and company information for better context
      const [user, company] = await Promise.all([
        this.getUserInfo(context.userId),
        context.companyId ? this.getCompanyInfo(context.companyId) : null
      ]);

      // Format the details with enhanced information
      const formattedDetails = this.formatActivityDetails(details, user, company, context);

      // Insert the activity log
      await db.insert(activityLogs).values({
        userId: context.userId,
        companyId: context.companyId || null,
        action: details.action,
        resource: details.resource,
        resourceId: details.resourceId || null,
        details: formattedDetails,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
      });

      // Also log to console for debugging
      this.logToConsole(context, details, formattedDetails);

    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: typeof ACTIVITY_ACTIONS.LOGIN | typeof ACTIVITY_ACTIONS.LOGOUT | typeof ACTIVITY_ACTIONS.REGISTER,
    context: ActivityContext,
    additionalInfo?: Record<string, any>
  ): Promise<void> {
    await this.logActivity(context, {
      action,
      resource: RESOURCE_TYPES.USER,
      resourceId: context.userId,
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        ...additionalInfo
      }
    });
  }

  /**
   * Log CRUD operations
   */
  async logCRUD(
    action: string,
    resource: string,
    context: ActivityContext,
    resourceId?: number,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.logActivity(context, {
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        companyId: context.companyId
      }
    });
  }

  /**
   * Log errors with full context
   */
  async logError(
    action: string,
    resource: string,
    context: ActivityContext,
    error: Error | string,
    resourceId?: number,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    await this.logActivity(context, {
      action: action || ACTIVITY_ACTIONS.SYSTEM_ERROR,
      resource,
      resourceId,
      error: errorMessage,
      success: false,
      metadata: {
        timestamp: new Date().toISOString(),
        errorStack,
        companyId: context.companyId,
        ...additionalData
      }
    });
  }

  /**
   * Log permission denied events
   */
  async logPermissionDenied(
    action: string,
    resource: string,
    context: ActivityContext,
    reason?: string
  ): Promise<void> {
    await this.logActivity(context, {
      action: ACTIVITY_ACTIONS.PERMISSION_DENIED,
      resource,
      success: false,
      metadata: {
        timestamp: new Date().toISOString(),
        attemptedAction: action,
        reason: reason || 'Insufficient permissions',
        companyId: context.companyId
      }
    });
  }

  /**
   * Get recent activity logs with enhanced formatting
   */
  async getRecentActivity(limit: number = 100, companyId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          resource: activityLogs.resource,
          resourceId: activityLogs.resourceId,
          details: activityLogs.details,
          timestamp: activityLogs.timestamp,
          ipAddress: activityLogs.ipAddress,
          userAgent: activityLogs.userAgent,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .orderBy(activityLogs.timestamp)
        .limit(limit);

      const logs = await query;

      // Format logs for display
      return logs.map(log => ({
        ...log,
        formattedTimestamp: new Date(log.timestamp).toLocaleString(),
        userDisplayName: `${log.firstName} ${log.lastName} (${log.username})`,
        parsedDetails: this.parseActivityDetails(log.details),
        actionDisplayName: this.getActionDisplayName(log.action),
        resourceDisplayName: this.getResourceDisplayName(log.resource),
      }));

    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async getUserInfo(userId: number) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return user;
    } catch (error) {
      console.error('Failed to get user info for activity log:', error);
      return null;
    }
  }

  private async getCompanyInfo(companyId: number) {
    try {
      const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      return company;
    } catch (error) {
      console.error('Failed to get company info for activity log:', error);
      return null;
    }
  }

  private formatActivityDetails(
    details: ActivityDetails,
    user: any,
    company: any,
    context: ActivityContext
  ): string {
    const formatted = {
      action: details.action,
      resource: details.resource,
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
        globalRole: user.globalRole
      } : null,
      company: company ? {
        id: company.id,
        name: company.name,
        code: company.code
      } : null,
      changes: {
        old: details.oldValues || null,
        new: details.newValues || null
      },
      success: details.success !== false,
      error: details.error || null,
      metadata: details.metadata || {},
      session: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId
      }
    };

    return JSON.stringify(formatted, null, 2);
  }

  private logToConsole(context: ActivityContext, details: ActivityDetails, formattedDetails: string): void {
    const timestamp = new Date().toISOString();
    const prefix = details.success !== false ? '✅' : '❌';
    
    console.log(`\n${prefix} [ACTIVITY LOG] ${timestamp}`);
    console.log(`📋 Action: ${details.action}`);
    console.log(`🎯 Resource: ${details.resource}${details.resourceId ? ` (ID: ${details.resourceId})` : ''}`);
    console.log(`👤 User ID: ${context.userId}`);
    console.log(`🏢 Company ID: ${context.companyId || 'N/A'}`);
    console.log(`🌐 IP: ${context.ipAddress || 'N/A'}`);
    
    if (details.error) {
      console.log(`❌ Error: ${details.error}`);
    }
    
    if (details.oldValues || details.newValues) {
      console.log(`📊 Changes:`);
      if (details.oldValues) console.log(`   Old:`, details.oldValues);
      if (details.newValues) console.log(`   New:`, details.newValues);
    }
    
    console.log(`📝 Full Details:`, formattedDetails);
    console.log('─'.repeat(80));
  }

  private parseActivityDetails(details: string | null): any {
    if (!details) return {};
    try {
      return JSON.parse(details);
    } catch (error) {
      return { raw: details };
    }
  }

  private getActionDisplayName(action: string): string {
    const actionMap: Record<string, string> = {
      [ACTIVITY_ACTIONS.LOGIN]: '🔐 User Login',
      [ACTIVITY_ACTIONS.LOGOUT]: '🚪 User Logout',
      [ACTIVITY_ACTIONS.COMPANY_CREATE]: '🏢 Company Created',
      [ACTIVITY_ACTIONS.COMPANY_UPDATE]: '✏️ Company Updated',
      [ACTIVITY_ACTIONS.USER_CREATE]: '👤 User Created',
      [ACTIVITY_ACTIONS.USER_UPDATE]: '✏️ User Updated',
      [ACTIVITY_ACTIONS.ACCOUNT_CREATE]: '📊 Account Created',
      [ACTIVITY_ACTIONS.JOURNAL_CREATE]: '📝 Journal Entry Created',
      [ACTIVITY_ACTIONS.SETTINGS_UPDATE_COMPANY]: '⚙️ Company Settings Updated',
      // Add more mappings as needed
    };
    return actionMap[action] || action;
  }

  private getResourceDisplayName(resource: string): string {
    const resourceMap: Record<string, string> = {
      [RESOURCE_TYPES.USER]: '👤 User',
      [RESOURCE_TYPES.COMPANY]: '🏢 Company',
      [RESOURCE_TYPES.ACCOUNT]: '📊 Account',
      [RESOURCE_TYPES.JOURNAL_ENTRY]: '📝 Journal Entry',
      [RESOURCE_TYPES.SETTINGS]: '⚙️ Settings',
      // Add more mappings as needed
    };
    return resourceMap[resource] || resource;
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();

// Export types for use in other files
export type { ActivityContext, ActivityDetails }; 