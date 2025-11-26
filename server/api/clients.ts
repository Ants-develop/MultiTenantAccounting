// Client Companies Management API Routes
// In this single-company/multi-client system:
// - "Main company" (ID 1) = the single company running the accounting system
// - "Client companies" or "clients" = customer companies being managed for accounting
// All users belong to the main company and manage client data

import express from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  insertClientSchema,
  clients as clientsTable,
  companySettings
} from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";
import { createDefaultAccountsForClient } from "../services/default-accounts";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// ============================================================================
// Helper Functions
// ============================================================================

async function getClientSettings(clientId: number) {
  try {
    const [settings] = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.clientId, clientId));
    return settings || null;
  } catch (error) {
    console.error('Error fetching client settings:', error);
    return null;
  }
}

async function createDefaultClientSettings(clientId: number) {
  const defaultSettings = {
    clientId,
    // Notifications
    emailNotifications: true,
    invoiceReminders: true,
    paymentAlerts: true,
    reportReminders: false,
    systemUpdates: true,
    // Financial
    autoNumbering: true,
    invoicePrefix: "INV",
    billPrefix: "BILL",
    journalPrefix: "JE",
    decimalPlaces: 2,
    negativeFormat: "minus",
    dateFormat: "MM/DD/YYYY",
    timeZone: "America/New_York",
    // Security
    requirePasswordChange: false,
    passwordExpireDays: 90,
    sessionTimeout: 30,
    enableTwoFactor: false,
    allowMultipleSessions: true,
    // Integrations
    bankConnection: false,
    paymentGateway: false,
    taxService: false,
    reportingTools: false,
    // Backup
    autoBackup: false,
    backupFrequency: "weekly",
    retentionDays: 30,
    backupLocation: "cloud",
  };

  try {
    const [newSettings] = await db
      .insert(companySettings)
      .values(defaultSettings)
      .returning();
    return newSettings;
  } catch (error) {
    console.error('Error creating default settings:', error);
    throw error;
  }
}

async function updateClientSettings(clientId: number, settingsUpdate: any) {
  try {
    const [updatedSettings] = await db
      .update(companySettings)
      .set(settingsUpdate)
      .where(eq(companySettings.clientId, clientId))
      .returning();
    return updatedSettings || null;
  } catch (error) {
    console.error('Error updating client settings:', error);
    throw error;
  }
}

function formatClientSettings(client: any, settings: any) {
  return {
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
}

// ============================================================================
// Client CRUD Routes
// ============================================================================

// Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await db
      .select()
      .from(clientsTable)
      .orderBy(clientsTable.name);

    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

// Get single client by ID
router.get('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId));

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
});

// Create new client
router.post('/', async (req, res) => {
  try {
    const clientData = insertClientSchema.parse(req.body);

    const [client] = await db
      .insert(clientsTable)
      .values(clientData)
      .returning();

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
    const message = error instanceof Error ? error.message : 'Failed to create client';
    res.status(400).json({ message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    const updateData = {
      name: req.body.name,
      code: req.body.code?.toUpperCase(),
      address: req.body.address || null,
      phone: req.body.phone || null,
      email: req.body.email || null,
      taxId: req.body.taxId || null,
      fiscalYearStart: req.body.fiscalYearStart || 1,
      currency: req.body.currency || 'USD',
    };

    const [updatedClient] = await db
      .update(clientsTable)
      .set(updateData)
      .where(eq(clientsTable.id, clientId))
      .returning();

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
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    const [deletedClient] = await db
      .delete(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .returning();

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
    const message = error instanceof Error ? error.message : 'Failed to delete client';
    res.status(500).json({ message });
  }
});

// Archive client
router.put('/:id/archive', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    const [updatedClient] = await db
      .update(clientsTable)
      .set({ isActive: false })
      .where(eq(clientsTable.id, clientId))
      .returning();

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Log activity
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
    res.status(500).json({ message: 'Failed to archive client' });
  }
});

// Restore archived client
router.put('/:id/restore', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    const [updatedClient] = await db
      .update(clientsTable)
      .set({ isActive: true })
      .where(eq(clientsTable.id, clientId))
      .returning();

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client restored successfully' });
  } catch (error) {
    console.error('Restore client error:', error);
    res.status(500).json({ message: 'Failed to restore client' });
  }
});

// ============================================================================
// Client Settings Routes
// ============================================================================

// Get client settings
router.get('/settings/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    // Get client
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId));

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get or create settings
    let settings = await getClientSettings(clientId);

    if (!settings) {
      settings = await createDefaultClientSettings(clientId);
    }

    const clientSettings = formatClientSettings(client, settings);
    res.json(clientSettings);
  } catch (error) {
    console.error('Get client settings error:', error);
    res.status(500).json({ message: 'Failed to fetch client settings' });
  }
});

// Update notification settings
router.put('/settings/:id/notifications', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

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

    // Log activity
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
    res.status(500).json({ message: 'Failed to update notification settings' });
  }
});

// Update financial settings
router.put('/settings/:id/financial', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

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

    // Log activity
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
    res.status(500).json({ message: 'Failed to update financial settings' });
  }
});

// Update security settings
router.put('/settings/:id/security', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }

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

    // Log activity
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
    res.status(500).json({ message: 'Failed to update security settings' });
  }
});

// ============================================================================
// Batch Import Route
// ============================================================================

// Batch import clients from CSV
router.post('/import', async (req, res) => {
  try {
    const { clients } = req.body;

    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ message: 'Invalid request: clients array is required' });
    }

    const results = {
      imported: 0,
      duplicates: 0,
      errors: [] as Array<{ row: number; code: string; error: Record<string, string> }>,
      details: [] as Array<{ row: number; name: string; code: string; accountsCreated: number; status: string }>
    };

    // Get existing client codes for duplicate detection
    const existingClients = await db.select({ code: clientsTable.code }).from(clientsTable);
    const existingCodes = new Set(existingClients.map(c => c.code.toUpperCase()));

    // Process each client
    for (let i = 0; i < clients.length; i++) {
      const clientData = clients[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        const errors: Record<string, string> = {};

        if (!clientData.name || clientData.name.trim() === '') {
          errors.name = 'Name is required';
        }

        if (!clientData.code || clientData.code.trim() === '') {
          errors.code = 'Code is required';
        }

        // Validate email format if provided
        if (clientData.email && clientData.email.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(clientData.email)) {
            errors.email = 'Invalid email format';
          }
        }

        // Validate fiscalYearStart if provided
        if (clientData.fiscalYearStart !== undefined && clientData.fiscalYearStart !== null && clientData.fiscalYearStart !== '') {
          const fiscalYear = parseInt(clientData.fiscalYearStart);
          if (isNaN(fiscalYear) || fiscalYear < 1 || fiscalYear > 12) {
            errors.fiscalYearStart = 'Fiscal year start must be between 1 and 12';
          }
        }

        // If there are validation errors, add to errors array
        if (Object.keys(errors).length > 0) {
          results.errors.push({
            row: rowNumber,
            code: clientData.code || `Row ${rowNumber}`,
            error: errors
          });
          continue;
        }

        // Check for duplicate code
        const codeUpper = clientData.code.toUpperCase();
        if (existingCodes.has(codeUpper)) {
          results.duplicates++;
          continue;
        }

        // Prepare client data for insertion
        const insertData = {
          name: clientData.name.trim(),
          code: codeUpper,
          tenantCode: clientData.tenantCode?.trim() || null,
          address: clientData.address?.trim() || null,
          phone: clientData.phone?.trim() || null,
          email: clientData.email?.trim() || null,
          taxId: clientData.taxId?.trim() || null,
          fiscalYearStart: clientData.fiscalYearStart ? parseInt(clientData.fiscalYearStart) : 1,
          currency: clientData.currency?.trim() || 'GEL',
          manager: clientData.manager?.trim() || null,
          accountingSoftware: clientData.accountingSoftware?.trim() || null,
          idCode: clientData.idCode?.trim() || null,
          verificationStatus: clientData.verificationStatus?.trim() || 'not_registered',
          isActive: true
        };

        // Insert client
        const [newClient] = await db
          .insert(clientsTable)
          .values(insertData)
          .returning();

        // Add to existing codes to prevent duplicates within the same batch
        existingCodes.add(codeUpper);
        results.imported++;

        // Log activity for each imported client
        await activityLogger.logCRUD(
          ACTIVITY_ACTIONS.COMPANY_CREATE,
          RESOURCE_TYPES.COMPANY,
          {
            userId: req.session.userId!,
            clientId: newClient.id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          },
          newClient.id,
          undefined,
          { name: newClient.name, code: newClient.code, source: 'batch_import' }
        );

        // Create default chart of accounts for the imported client
        let accountsCreated = 0;
        try {
          accountsCreated = await createDefaultAccountsForClient(newClient.id);
          console.log(`✅ Created ${accountsCreated} default accounts for imported client ${newClient.code} (ID: ${newClient.id})`);
        } catch (accountError) {
          console.error(`⚠️  Failed to create default accounts for client ${newClient.code}:`, accountError);
          // Don't fail the import if account creation fails
        }

        // Track progress details
        results.details.push({
          row: rowNumber,
          name: newClient.name,
          code: newClient.code,
          accountsCreated,
          status: 'success'
        });

        console.log(`[Import Progress] ${results.imported}/${clients.length} - Created ${newClient.name} with ${accountsCreated} accounts`);

      } catch (error) {
        console.error(`Error importing client at row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          code: clientData.code || `Row ${rowNumber}`,
          error: { general: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }

    // Return results
    res.json(results);

  } catch (error) {
    console.error('Batch import error:', error);
    res.status(500).json({ message: 'Failed to import clients' });
  }
});

export default router;

