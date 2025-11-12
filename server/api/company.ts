// Main Company Management API Routes
// This handles the single main company that runs the accounting system
// The main company profile is configured via CompanyProfile.tsx and SetupWizard component
import express from "express";
import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import { 
  insertCompanySchema, 
  insertUserCompanySchema,
  companies as companiesTable,
  companySettings
} from "@shared/schema";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Company settings helper functions
async function getCompanySettings(companyId: number) {
  try {
    const [settings] = await db.select().from(companySettings).where(eq(companySettings.clientId, companyId));
    return settings || undefined;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return undefined;
  }
}

async function createCompanySettings(settings: any) {
  try {
    const [newSettings] = await db.insert(companySettings).values(settings).returning();
    return newSettings;
  } catch (error) {
    console.error('Error creating company settings:', error);
    throw error;
  }
}

async function updateCompanySettings(companyId: number, settingsUpdate: any) {
  try {
    const [updatedSettings] = await db.update(companySettings).set(settingsUpdate).where(eq(companySettings.clientId, companyId)).returning();
    return updatedSettings || undefined;
  } catch (error) {
    console.error('Error updating company settings:', error);
    return undefined;
  }
}

// Get all companies for current user
router.get('/', async (req, res) => {
  try {
    const companies = await storage.getCompaniesByUser(req.session.userId!);
    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new company
router.post('/', async (req, res) => {
  try {
    const companyData = insertCompanySchema.parse(req.body);
    const company = await storage.createCompany(companyData);
    
    // Assign user as manager of the new company
    await storage.createUserCompany({
      userId: req.session.userId!,
      companyId: company.id,
      role: 'manager',
    });

    res.json(company);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete company
router.delete('/:id', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);

    const success = await storage.deleteCompany(companyId);
    if (success) {
      res.json({ message: 'Company deleted successfully' });
    } else {
      res.status(404).json({ message: 'Company not found' });
    }
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Get company settings
router.get('/settings/:id', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Get company basic information
    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get company settings from database
    let settings = await getCompanySettings(companyId);
    
    // If no settings exist, create default ones
    if (!settings) {
      const defaultSettings = {
        companyId,
        emailNotifications: true,
        invoiceReminders: true,
        paymentAlerts: true,
        reportReminders: false,
        systemUpdates: true,
        autoNumbering: true,
        invoicePrefix: "INV",
        billPrefix: "BILL",
        journalPrefix: "JE",
        decimalPlaces: 2,
        negativeFormat: "minus",
        dateFormat: "MM/DD/YYYY",
        timeZone: "America/New_York",
        requirePasswordChange: false,
        passwordExpireDays: 90,
        sessionTimeout: 30,
        enableTwoFactor: false,
        allowMultipleSessions: true,
        bankConnection: false,
        paymentGateway: false,
        taxService: false,
        reportingTools: false,
        autoBackup: false,
        backupFrequency: "weekly",
        retentionDays: 30,
        backupLocation: "cloud",
      };
      
      try {
        settings = await createCompanySettings(defaultSettings);
      } catch (error) {
        console.error('Failed to create default settings:', error);
        settings = { ...defaultSettings, id: 0, createdAt: new Date(), updatedAt: new Date() };
      }
    }

    const companySettings = {
      ...company,
      settings: {
        notifications: {
          emailNotifications: settings.emailNotifications,
          invoiceReminders: settings.invoiceReminders,
          paymentAlerts: settings.paymentAlerts,
          reportReminders: settings.reportReminders,
          systemUpdates: settings.systemUpdates,
        },
        financial: {
          autoNumbering: settings.autoNumbering,
          invoicePrefix: settings.invoicePrefix,
          billPrefix: settings.billPrefix,
          journalPrefix: settings.journalPrefix,
          decimalPlaces: settings.decimalPlaces,
          negativeFormat: settings.negativeFormat,
          dateFormat: settings.dateFormat,
          timeZone: settings.timeZone,
        },
        security: {
          requirePasswordChange: settings.requirePasswordChange,
          passwordExpireDays: settings.passwordExpireDays,
          sessionTimeout: settings.sessionTimeout,
          enableTwoFactor: settings.enableTwoFactor,
          allowMultipleSessions: settings.allowMultipleSessions,
        },
        backup: {
          autoBackup: settings.autoBackup,
          backupFrequency: settings.backupFrequency,
          retentionDays: settings.retentionDays,
          backupLocation: settings.backupLocation,
        },
        integration: {
          bankConnection: settings.bankConnection,
          paymentGateway: settings.paymentGateway,
          taxService: settings.taxService,
          reportingTools: settings.reportingTools,
        },
      },
    };

    res.json(companySettings);
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update company info
router.put('/settings/:id/info', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company and permission to edit
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    const updateData = {
      name: req.body.name,
      code: req.body.code.toUpperCase(),
      address: req.body.address || null,
      phone: req.body.phone || null,
      email: req.body.email || null,
      taxId: req.body.taxId || null,
      fiscalYearStart: req.body.fiscalYearStart || 1,
      currency: req.body.currency || 'USD',
    };

    const updatedCompany = await storage.updateCompany(companyId, updateData);
    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(updatedCompany);
  } catch (error) {
    console.error('Update company info error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update notification settings
router.put('/settings/:id/notifications', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Update notification settings in database
    const updateData = {
      emailNotifications: req.body.emailNotifications,
      invoiceReminders: req.body.invoiceReminders,
      paymentAlerts: req.body.paymentAlerts,
      reportReminders: req.body.reportReminders,
      systemUpdates: req.body.systemUpdates,
    };

    const updatedSettings = await updateCompanySettings(companyId, updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Company settings not found' });
    }

    // Log notification settings update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_NOTIFICATIONS,
      RESOURCE_TYPES.SETTINGS,
      {
        userId: req.session.userId!,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      companyId,
      undefined,
      updateData
    );

    res.json({ message: 'Notification settings updated successfully', settings: updatedSettings });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update financial settings
router.put('/settings/:id/financial', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Update financial settings in database
    const updateData = {
      autoNumbering: req.body.autoNumbering,
      invoicePrefix: req.body.invoicePrefix,
      billPrefix: req.body.billPrefix,
      journalPrefix: req.body.journalPrefix,
      decimalPlaces: req.body.decimalPlaces,
      negativeFormat: req.body.negativeFormat,
      dateFormat: req.body.dateFormat,
      timeZone: req.body.timeZone,
    };

    const updatedSettings = await updateCompanySettings(companyId, updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Company settings not found' });
    }

    // Log financial settings update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_FINANCIAL,
      RESOURCE_TYPES.SETTINGS,
      {
        userId: req.session.userId!,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      companyId,
      undefined,
      updateData
    );

    res.json({ message: 'Financial settings updated successfully', settings: updatedSettings });
  } catch (error) {
    console.error('Update financial settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update security settings
router.put('/settings/:id/security', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Update security settings in database
    const updateData = {
      requirePasswordChange: req.body.requirePasswordChange,
      passwordExpireDays: req.body.passwordExpireDays,
      sessionTimeout: req.body.sessionTimeout,
      enableTwoFactor: req.body.enableTwoFactor,
      allowMultipleSessions: req.body.allowMultipleSessions,
    };

    const updatedSettings = await updateCompanySettings(companyId, updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Company settings not found' });
    }

    // Log security settings update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId: req.session.userId!,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      companyId,
      undefined,
      updateData
    );

    res.json({ message: 'Security settings updated successfully', settings: updatedSettings });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export company data
router.get('/:id/export', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Export all company data including accounts, transactions, etc.
    const [company, accounts, journalEntries, customers, vendors, invoices, bills] = await Promise.all([
      storage.getCompany(companyId),
      storage.getAccountsByCompany(companyId),
      storage.getJournalEntriesByCompany(companyId),
      storage.getCustomersByCompany(companyId),
      storage.getVendorsByCompany(companyId),
      storage.getInvoicesByCompany(companyId),
      storage.getBillsByCompany(companyId),
    ]);

    const exportData = {
      company,
      accounts,
      journalEntries,
      customers,
      vendors,
      invoices,
      bills,
      exportDate: new Date().toISOString(),
      totalRecords: accounts.length + journalEntries.length + customers.length + vendors.length + invoices.length + bills.length,
    };

    // Log data export
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.DATA_EXPORT,
      RESOURCE_TYPES.COMPANY,
      {
        userId: req.session.userId!,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      companyId,
      undefined,
      { exportType: 'full', recordCount: exportData.totalRecords }
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="company-${companyId}-export-${new Date().getTime()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export company data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Archive company
router.put('/:id/archive', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Archive company by setting isActive to false
    const updatedCompany = await storage.updateCompany(companyId, { isActive: false });
    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Log company archive
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.COMPANY_ARCHIVE,
      RESOURCE_TYPES.COMPANY,
      {
        userId: req.session.userId!,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      companyId,
      { isActive: true },
      { isActive: false }
    );

    res.json({ message: 'Company archived successfully' });
  } catch (error) {
    console.error('Archive company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Restore archived company
router.put('/:id/restore', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify user has access to this company
    const userCompany = await storage.getUserCompany(req.session.userId!, companyId);
    if (!userCompany) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // Restore company by setting isActive to true
    const updatedCompany = await storage.updateCompany(companyId, { isActive: true });
    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ message: 'Company restored successfully' });
  } catch (error) {
    console.error('Restore company error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete company setup (initial configuration on first login)
router.post('/company/setup', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { company, financial } = req.body;

    // Get user's first company (should exist from initial setup)
    const userCompanies = await storage.getCompaniesByUser(userId);
    if (!userCompanies || userCompanies.length === 0) {
      return res.status(400).json({ message: 'No company found for user' });
    }

    const companyId = userCompanies[0].id;

    // Update company with provided information
    const updatedCompany = await storage.updateCompany(companyId, {
      name: company.name,
      code: company.code,
      address: company.address,
      phone: company.phone,
      email: company.email,
      taxId: company.taxId,
    });

    // Update or create company settings
    let settings = await getCompanySettings(companyId);
    
    if (!settings) {
      await createCompanySettings({
        companyId,
        fiscalYearStart: financial.fiscalYearStart,
        currency: financial.currency,
        dateFormat: financial.dateFormat,
        decimalPlaces: financial.decimalPlaces,
        // Set reasonable defaults for other settings
        emailNotifications: true,
        invoiceReminders: true,
        paymentAlerts: true,
        reportReminders: false,
        systemUpdates: true,
        autoNumbering: true,
        invoicePrefix: "INV",
        billPrefix: "BILL",
        journalPrefix: "JE",
        negativeFormat: "minus",
        requirePasswordChange: false,
        passwordExpireDays: 90,
        sessionTimeout: 30,
        enableTwoFactor: false,
        allowMultipleSessions: true,
        bankConnection: false,
        paymentGateway: false,
        taxService: false,
        reportingTools: false,
        autoBackup: false,
        backupFrequency: "weekly",
        retentionDays: 30,
        backupLocation: "cloud",
      });
    } else {
      await updateCompanySettings(companyId, {
        fiscalYearStart: financial.fiscalYearStart,
        currency: financial.currency,
        dateFormat: financial.dateFormat,
        decimalPlaces: financial.decimalPlaces,
      });
    }

    // Log activity
    await activityLogger.logActivity({
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    }, {
      action: ACTIVITY_ACTIONS.COMPANY_CREATE,
      resource: RESOURCE_TYPES.COMPANY,
      resourceId: companyId,
    });

    res.json({ 
      message: 'Company setup completed successfully',
      company: updatedCompany 
    });
  } catch (error) {
    console.error('Company setup error:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export default router;

