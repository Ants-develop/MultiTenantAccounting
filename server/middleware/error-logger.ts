import { Request, Response, NextFunction } from 'express';
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from '../services/activity-logger';

interface AuthenticatedRequest extends Request {
  session: any; // Using any to avoid complex session type issues
}

// Error logging middleware
export const errorLogger = (err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Extract route information
  const route = req.route?.path || req.path;
  const method = req.method;
  const resourceType = getResourceTypeFromRoute(route);
  const action = getActionFromMethodAndRoute(method, route);

  // Log the error to activity logs
  activityLogger.logError(
    action,
    resourceType,
    {
      userId: req.session?.userId || null,
      clientId: req.session?.currentCompanyId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    err,
    undefined,
    {
      route,
      method,
      body: req.body,
      params: req.params,
      query: req.query,
      statusCode: res.statusCode
    }
  ).catch(logError => {
    console.error('Failed to log error to activity logs:', logError);
  });

  // Continue with default error handling
  next(err);
};

// Extract resource type from route
function getResourceTypeFromRoute(route: string): string {
  if (route.includes('/accounts')) return RESOURCE_TYPES.ACCOUNT;
  if (route.includes('/journal-entries')) return RESOURCE_TYPES.JOURNAL_ENTRY;
  if (route.includes('/companies')) return RESOURCE_TYPES.COMPANY;
  if (route.includes('/users')) return RESOURCE_TYPES.USER;
  if (route.includes('/customers')) return RESOURCE_TYPES.CUSTOMER;
  if (route.includes('/vendors')) return RESOURCE_TYPES.VENDOR;
  if (route.includes('/invoices')) return RESOURCE_TYPES.INVOICE;
  if (route.includes('/bills')) return RESOURCE_TYPES.BILL;
  if (route.includes('/settings')) return RESOURCE_TYPES.SETTINGS;
  if (route.includes('/auth')) return RESOURCE_TYPES.USER;
  return RESOURCE_TYPES.SYSTEM;
}

// Extract action from HTTP method and route
function getActionFromMethodAndRoute(method: string, route: string): string {
  const resourceType = getResourceTypeFromRoute(route);
  
  switch (method.toUpperCase()) {
    case 'POST':
      if (route.includes('/auth/login')) return ACTIVITY_ACTIONS.LOGIN;
      if (route.includes('/auth/register')) return ACTIVITY_ACTIONS.REGISTER;
      if (resourceType === RESOURCE_TYPES.ACCOUNT) return ACTIVITY_ACTIONS.ACCOUNT_CREATE;
      if (resourceType === RESOURCE_TYPES.JOURNAL_ENTRY) return ACTIVITY_ACTIONS.JOURNAL_CREATE;
      if (resourceType === RESOURCE_TYPES.COMPANY) return ACTIVITY_ACTIONS.COMPANY_CREATE;
      if (resourceType === RESOURCE_TYPES.USER) return ACTIVITY_ACTIONS.USER_CREATE;
      break;
    case 'PUT':
    case 'PATCH':
      if (resourceType === RESOURCE_TYPES.ACCOUNT) return ACTIVITY_ACTIONS.ACCOUNT_UPDATE;
      if (resourceType === RESOURCE_TYPES.JOURNAL_ENTRY) return ACTIVITY_ACTIONS.JOURNAL_UPDATE;
      if (resourceType === RESOURCE_TYPES.COMPANY) return ACTIVITY_ACTIONS.COMPANY_UPDATE;
      if (resourceType === RESOURCE_TYPES.USER) return ACTIVITY_ACTIONS.USER_UPDATE;
      break;
    case 'DELETE':
      if (resourceType === RESOURCE_TYPES.ACCOUNT) return ACTIVITY_ACTIONS.ACCOUNT_DELETE;
      if (resourceType === RESOURCE_TYPES.JOURNAL_ENTRY) return ACTIVITY_ACTIONS.JOURNAL_DELETE;
      if (resourceType === RESOURCE_TYPES.COMPANY) return ACTIVITY_ACTIONS.COMPANY_DELETE;
      if (resourceType === RESOURCE_TYPES.USER) return ACTIVITY_ACTIONS.USER_DELETE;
      break;
  }
  
  return ACTIVITY_ACTIONS.SYSTEM_ERROR;
}

// Async error wrapper - wraps async route handlers to catch errors
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Log successful operations
export const logSuccess = async (
  req: AuthenticatedRequest, 
  action: string, 
  resourceType: string, 
  resourceId?: number,
  additionalData?: Record<string, any>
) => {
  try {
    await activityLogger.logCRUD(
      action,
      resourceType,
      {
        userId: req.session?.userId || null,
        clientId: req.session?.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      resourceId,
      undefined, // old values
      undefined, // new values (could be passed in additionalData)
    );
  } catch (error) {
    console.error('Failed to log success operation:', error);
  }
};

// Log validation errors
export const logValidationError = async (
  req: AuthenticatedRequest,
  action: string,
  resourceType: string,
  validationErrors: any,
  resourceId?: number
) => {
  try {
    await activityLogger.logError(
      action,
      resourceType,
      {
        userId: req.session?.userId || null,
        clientId: req.session?.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Validation failed: ${JSON.stringify(validationErrors)}`,
      resourceId,
      { validationErrors, requestData: req.body }
    );
  } catch (error) {
    console.error('Failed to log validation error:', error);
  }
}; 