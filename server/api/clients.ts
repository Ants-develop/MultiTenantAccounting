// Client Management API Routes  
// This replaces the old companies API in single-company mode
// In this system, "clients" represent customer companies (formerly called clients in accounting)
import express from "express";
import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import { 
  insertClientSchema,
  clients as clientsTable,
  companySettings
} from "@shared/schema";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
// Note: In single-company mode, all users belong to the main company
// Clients represent customer/client companies

// Client settings helper functions
async function getClientSettings(clientId: number) {
  try {
    const [settings] = await db.select().from(companySettings).where(eq(companySettings.clientId, clientId));
    return settings || undefined;
  } catch (error) {
    console.error('Error fetching client settings:', error);
    return undefined;
  }
}

async function createClientSettings(settings: any) {
  try {
    const [newSettings] = await db.insert(companySettings).values(settings).returning();
    return newSettings;
  } catch (error) {
    console.error('Error creating client settings:', error);
    throw error;
  }
}

async function updateClientSettings(clientId: number, settingsUpdate: any) {
  try {
    const [updatedSettings] = await db.update(companySettings).set(settingsUpdate).where(eq(companySettings.clientId, clientId)).returning();
    return updatedSettings || undefined;
  } catch (error) {
    console.error('Error updating client settings:', error);
    return undefined;
  }
}

// Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single client by ID
router.get('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new client
router.post('/', async (req, res) => {
  try {
    const clientData = insertClientSchema.parse(req.body);
    const [client] = await db.insert(clientsTable).values(clientData).returning();
    
    // Log activity
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.CREATE,
      RESOURCE_TYPES.COMPANY,
      {
        userId: req.session.userId!,
        clientId: client.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      client.id,
      undefined,
      { name: client.name, code: client.code }
    );
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Update client info
router.put('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
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

    const [updatedClient] = await db.update(clientsTable).set(updateData).where(eq(clientsTable.id, clientId)).returning();
    
    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Log activity
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.UPDATE,
      RESOURCE_TYPES.COMPANY,
      {
        userId: req.session.userId!,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      clientId,
      undefined,
      updateData
    );

    res.json(updatedClient);
  } catch (error) {
    console.error('Update client info error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    const [deletedClient] = await db.delete(clientsTable).where(eq(clientsTable.id, clientId)).returning();
    
    if (!deletedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Log activity
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.DELETE,
      RESOURCE_TYPES.COMPANY,
      {
        userId: req.session.userId!,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      clientId,
      { name: deletedClient.name, code: deletedClient.code },
      undefined
    );

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Get client settings
router.get('/settings/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    // Get client basic information
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get client settings from database
    let settings = await getClientSettings(clientId);
    
    // If no settings exist, create default ones
    if (!settings) {
      const defaultSettings = {
        clientId,
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
        settings = await createClientSettings(defaultSettings);
      } catch (error) {
        console.error('Failed to create default settings:', error);
        settings = { ...defaultSettings, id: 0, createdAt: new Date(), updatedAt: new Date() };
      }
    }

    const clientSettings = {
      ...client,
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

    res.json(clientSettings);
  } catch (error) {
    console.error('Get client settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update notification settings
router.put('/settings/:id/notifications', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    // Update notification settings in database
    const updateData = {
      emailNotifications: req.body.emailNotifications,
      invoiceReminders: req.body.invoiceReminders,
      paymentAlerts: req.body.paymentAlerts,
      reportReminders: req.body.reportReminders,
      systemUpdates: req.body.systemUpdates,
    };

    const updatedSettings = await updateClientSettings(clientId, updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Client settings not found' });
    }

    // Log notification settings update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_NOTIFICATIONS,
      RESOURCE_TYPES.SETTINGS,
      {
        userId: req.session.userId!,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      clientId,
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
    const clientId = parseInt(req.params.id);
    
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

    const updatedSettings = await updateClientSettings(clientId, updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Client settings not found' });
    }

    // Log financial settings update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_FINANCIAL,
      RESOURCE_TYPES.SETTINGS,
      {
        userId: req.session.userId!,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      clientId,
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
    const clientId = parseInt(req.params.id);
    
    // Update security settings in database
    const updateData = {
      requirePasswordChange: req.body.requirePasswordChange,
      passwordExpireDays: req.body.passwordExpireDays,
      sessionTimeout: req.body.sessionTimeout,
      enableTwoFactor: req.body.enableTwoFactor,
      allowMultipleSessions: req.body.allowMultipleSessions,
    };

    const updatedSettings = await updateClientSettings(clientId, updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Client settings not found' });
    }

    // Log security settings update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId: req.session.userId!,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      clientId,
      undefined,
      updateData
    );

    res.json({ message: 'Security settings updated successfully', settings: updatedSettings });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Archive client
router.put('/:id/archive', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    // Archive client by setting isActive to false
    const [updatedClient] = await db.update(clientsTable).set({ isActive: false }).where(eq(clientsTable.id, clientId)).returning();
    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Log client archive
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.COMPANY_ARCHIVE,
      RESOURCE_TYPES.COMPANY,
      {
        userId: req.session.userId!,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      clientId,
      { isActive: true },
      { isActive: false }
    );

    res.json({ message: 'Client archived successfully' });
  } catch (error) {
    console.error('Archive client error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Restore archived client
router.put('/:id/restore', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    // Restore client by setting isActive to true
    const [updatedClient] = await db.update(clientsTable).set({ isActive: true }).where(eq(clientsTable.id, clientId)).returning();
    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client restored successfully' });
  } catch (error) {
    console.error('Restore client error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

