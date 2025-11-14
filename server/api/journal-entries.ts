// Journal Entries API Routes
import express from "express";
import { db } from "../db";
import { sql, eq, desc, inArray, and, or, isNull } from "drizzle-orm";
import { z as zod } from "zod";
import { 
  insertJournalEntrySchema, 
  insertJournalEntryLineSchema,
  journalEntries, 
  journalEntryLines,
  clients as clientsTable 
} from "@shared/schema";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";
import { DEFAULT_CLIENT_ID } from "../constants";
import { getUserClientsByModule } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get all journal entries with pagination and tenant filtering
// Query params: ?clientIds=1,2,3 (optional, defaults to DEFAULT_CLIENT_ID)
router.get('/', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Parse clientIds from query parameter (comma-separated)
    const clientIdsParam = req.query.clientIds as string;
    let clientIds: number[] = [];
    
    if (clientIdsParam) {
      clientIds = clientIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // If no clientIds specified, use DEFAULT_CLIENT_ID
    if (clientIds.length === 0) {
      clientIds = [DEFAULT_CLIENT_ID];
    }

    // Validate user has permission for all requested clients
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);
    const invalidIds = clientIds.filter(id => !allowedClientIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(403).json({ message: 'Access denied to some clients' });
    }
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = (page - 1) * limit;

    // Get clients to access tenant codes
    const clients = await db
      .select()
      .from(clientsTable)
      .where(inArray(clientsTable.id, clientIds));
    
    if (clients.length === 0) {
      return res.status(404).json({ message: 'Clients not found' });
    }
    
    console.log(`[JournalEntries API] Fetching entries for clientIds: ${clientIds.join(',')}, page: ${page}, limit: ${limit}`);
    
    // Get tenant codes for all requested clients
    const tenantCodes = clients
      .filter(c => c.tenantCode)
      .map(c => c.tenantCode!);
    
    // Build query - filter by clientId AND tenantCode (if available)
    // This ensures we only get transactions that belong to the requested companies
    // We filter by clientId directly, and optionally by tenantCode for MSSQL-imported data
    const query = db
      .select({
        // Core fields
        id: journalEntries.id,
        clientId: journalEntries.clientId,
        entryNumber: journalEntries.entryNumber,
        date: journalEntries.date,
        description: journalEntries.description,
        reference: journalEntries.reference,
        totalAmount: journalEntries.totalAmount,
        userId: journalEntries.userId,
        isPosted: journalEntries.isPosted,
        createdAt: journalEntries.createdAt,
        // Tenant & Organization
        tenantCode: journalEntries.tenantCode,
        tenantName: journalEntries.tenantName,
        abonent: journalEntries.abonent,
        postingsPeriod: journalEntries.postingsPeriod,
        register: journalEntries.register,
        branch: journalEntries.branch,
        contentText: journalEntries.contentText,
        responsiblePerson: journalEntries.responsiblePerson,
        // Debit Account
        accountDr: journalEntries.accountDr,
        accountNameDr: journalEntries.accountNameDr,
        analyticDr: journalEntries.analyticDr,
        analyticRefDr: journalEntries.analyticRefDr,
        idDr: journalEntries.idDr,
        legalFormDr: journalEntries.legalFormDr,
        countryDr: journalEntries.countryDr,
        profitTaxDr: journalEntries.profitTaxDr,
        withholdingTaxDr: journalEntries.withholdingTaxDr,
        doubleTaxationDr: journalEntries.doubleTaxationDr,
        pensionSchemeParticipantDr: journalEntries.pensionSchemeParticipantDr,
        // Credit Account
        accountCr: journalEntries.accountCr,
        accountNameCr: journalEntries.accountNameCr,
        analyticCr: journalEntries.analyticCr,
        analyticRefCr: journalEntries.analyticRefCr,
        idCr: journalEntries.idCr,
        legalFormCr: journalEntries.legalFormCr,
        countryCr: journalEntries.countryCr,
        profitTaxCr: journalEntries.profitTaxCr,
        withholdingTaxCr: journalEntries.withholdingTaxCr,
        doubleTaxationCr: journalEntries.doubleTaxationCr,
        pensionSchemeParticipantCr: journalEntries.pensionSchemeParticipantCr,
        // Financial information
        currency: journalEntries.currency,
        amount: journalEntries.amount,
        amountCur: journalEntries.amountCur,
        quantityDr: journalEntries.quantityDr,
        quantityCr: journalEntries.quantityCr,
        rate: journalEntries.rate,
        documentRate: journalEntries.documentRate,
        // Tax Invoice
        taxInvoiceNumber: journalEntries.taxInvoiceNumber,
        taxInvoiceDate: journalEntries.taxInvoiceDate,
        taxInvoiceSeries: journalEntries.taxInvoiceSeries,
        waybillNumber: journalEntries.waybillNumber,
        attachedFiles: journalEntries.attachedFiles,
        // Document information
        docType: journalEntries.docType,
        docDate: journalEntries.docDate,
        docNumber: journalEntries.docNumber,
        documentCreationDate: journalEntries.documentCreationDate,
        documentModifyDate: journalEntries.documentModifyDate,
        documentComments: journalEntries.documentComments,
        // Posting
        postingNumber: journalEntries.postingNumber,
      })
      .from(journalEntries);
    
    // Apply filters: by clientId (primary) and optionally by tenantCode (for MSSQL data)
    // Build where conditions: must match clientId, and optionally match tenantCode if configured
    let whereConditions;
    if (tenantCodes.length > 0) {
      // Filter by clientId AND (tenantCode matches OR tenantCode is null)
      // This handles:
      // 1. Manually created entries: clientId matches, tenantCode is null
      // 2. MSSQL imported entries: clientId matches AND tenantCode matches
      whereConditions = and(
        inArray(journalEntries.clientId, clientIds),
        or(
          inArray(journalEntries.tenantCode, tenantCodes),
          isNull(journalEntries.tenantCode)
        )
      );
      console.log(`[JournalEntries API] Filtering by clientIds: ${clientIds.join(',')} and tenantCodes: ${tenantCodes.join(',')}`);
    } else {
      // No tenant codes configured - filter only by clientId
      whereConditions = inArray(journalEntries.clientId, clientIds);
      console.log(`[JournalEntries API] Filtering by clientIds: ${clientIds.join(',')} (no tenant codes configured)`);
    }
    
    const filteredQuery = query.where(whereConditions);
    
    // Order by date descending with pagination
    const entries = await filteredQuery
      .orderBy(desc(journalEntries.date))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    // Use a more efficient count query with timeout handling
    let totalCount = 0;
    try {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(journalEntries)
        .where(whereConditions);
      
      totalCount = countResult[0]?.count || 0;
    } catch (error: any) {
      // If count query times out, estimate based on current page results
      console.warn('[JournalEntries API] Count query failed, using fallback:', error.message);
      if (error.message?.includes('timeout') || error.message?.includes('canceling statement')) {
        // For timeout errors, estimate count based on current page
        // This is a fallback - ideally the count should complete
        totalCount = entries.length > 0 ? (page * limit) + entries.length : 0;
        console.warn(`[JournalEntries API] Using estimated count: ${totalCount} (page ${page}, limit ${limit}, entries: ${entries.length})`);
      } else {
        throw error; // Re-throw non-timeout errors
      }
    }
    
    const totalPages = Math.ceil(Number(totalCount) / limit);
    console.log(`[JournalEntries API] Found ${entries.length} entries (page ${page}/${totalPages}, total: ${totalCount})`);
    
    // Transform for Handsontable - convert dates to ISO strings
    const transformedEntries = entries.map(entry => ({
      ...entry,
      totalAmount: entry.totalAmount || '0.00',
      date: entry.date ? entry.date.toISOString() : new Date().toISOString(),
      createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
      docDate: entry.docDate ? entry.docDate.toISOString() : null,
      postingsPeriod: entry.postingsPeriod ? entry.postingsPeriod.toISOString() : null,
      taxInvoiceDate: entry.taxInvoiceDate ? entry.taxInvoiceDate.toISOString() : null,
      documentCreationDate: entry.documentCreationDate ? entry.documentCreationDate.toISOString() : null,
      documentModifyDate: entry.documentModifyDate ? entry.documentModifyDate.toISOString() : null,
    }));
    
    res.json({
      data: transformedEntries,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Get journal entries error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get journal entry lines for a specific entry
router.get('/:id/lines', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ message: 'Invalid entry ID' });
    }
    
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get the entry to check permissions
    const entry = await storage.getJournalEntry(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }
    
    // Check user has permission for this entry's client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);
    if (!allowedClientIds.includes(entry.clientId)) {
      return res.status(403).json({ message: 'Access denied to this journal entry' });
    }
    
    const lines = await storage.getJournalEntryLinesByEntry(entryId);
    res.json(lines);
  } catch (error) {
    console.error('Get journal entry lines error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new journal entry
router.post('/', async (req, res) => {
  const raw = req.body || {} as any;
  const userId = (req.session as any)?.userId;
  
  try {
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Coerce date from string/number to Date to satisfy schema and DB timestamp column
    const lines = raw.lines || [];
    
    // Get clientId from request body or use DEFAULT_CLIENT_ID
    const requestedClientId = raw.clientId ? parseInt(raw.clientId) : DEFAULT_CLIENT_ID;
    if (!requestedClientId || isNaN(requestedClientId)) {
      return res.status(400).json({ message: 'Invalid or missing client ID' });
    }
    
    // Validate user has permission for this client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);
    if (!allowedClientIds.includes(requestedClientId)) {
      return res.status(403).json({ message: 'Access denied to this client' });
    }
    
    // Use a coercing schema to accept strings like "YYYY-MM-DD"
    const coerceEntrySchema = insertJournalEntrySchema.extend({
      date: zod.coerce.date(),
    });

    const { lines: _lines, ...rawWithoutLines } = raw;
    const entryData = coerceEntrySchema.parse({
      ...rawWithoutLines,
      clientId: requestedClientId,
      userId: userId,
    });
    
    // Create the entry and insert lines
    const entry = await storage.createJournalEntry(entryData);
    
    // Insert lines if provided
    if (lines && lines.length > 0) {
      const insertLineSchema = insertJournalEntryLineSchema;
      for (const line of lines) {
        const lineData = insertLineSchema.parse({
          ...line,
          journalEntryId: entry.id,
        });
        await storage.createJournalEntryLine(lineData);
      }
    }
    
    // Fetch the complete entry with lines
    const completeEntry = await storage.getJournalEntry(entry.id);
    const lines_data = await db.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
    
    res.json({
      ...completeEntry,
      lines: lines_data || []
    });
  } catch (error) {
    console.error('Create journal entry error:', error);
    
    // Log journal entry creation error
    if (userId) {
      await activityLogger.logError(
        ACTIVITY_ACTIONS.JOURNAL_CREATE,
        RESOURCE_TYPES.JOURNAL_ENTRY,
        {
          userId: userId,
          companyId: raw.clientId || DEFAULT_CLIENT_ID,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        },
        error as Error,
        undefined,
        { entryData: req.body }
      );
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update journal entry
router.put('/:id', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ message: 'Invalid entry ID' });
    }
    
    // Get the entry to check permissions
    const existingEntry = await storage.getJournalEntry(entryId);
    if (!existingEntry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }
    
    // Check user has permission for this entry's client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);
    if (!allowedClientIds.includes(existingEntry.clientId)) {
      return res.status(403).json({ message: 'Access denied to this journal entry' });
    }
    
    // Prevent changing clientId via update
    const updateData = req.body;
    const lines = updateData.lines || [];
    const { lines: _lines, clientId: _clientId, ...updateDataWithoutLines } = updateData;

    const updatedEntry = await storage.updateJournalEntry(entryId, updateDataWithoutLines);
    if (!updatedEntry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    // Update lines if provided
    if (lines && lines.length > 0) {
      // Delete existing lines
      await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entryId));
      
      // Insert new lines
      const insertLineSchema = insertJournalEntryLineSchema;
      for (const line of lines) {
        const lineData = insertLineSchema.parse({
          ...line,
          journalEntryId: entryId,
        });
        await storage.createJournalEntryLine(lineData);
      }
    }

    // Fetch the complete entry with lines
    const completeEntry = await storage.getJournalEntry(entryId);
    const lines_data = await db.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entryId));
    
    res.json({
      ...completeEntry,
      lines: lines_data || []
    });
  } catch (error) {
    console.error('Update journal entry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete journal entry
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ message: 'Invalid journal entry ID' });
    }

    // Check if entry is posted - posted entries shouldn't be deleted
    const entry = await storage.getJournalEntry(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }
    
    // Check user has permission for this entry's client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);
    if (!allowedClientIds.includes(entry.clientId)) {
      return res.status(403).json({ message: 'Access denied to this journal entry' });
    }

    if (entry.isPosted) {
      return res.status(400).json({ 
        message: 'Cannot delete posted journal entries. Please reverse the entry instead.' 
      });
    }

    // Force-remove children then parent in one transaction using raw SQL
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM accounting.journal_entry_lines WHERE journal_entry_id = ${entryId}`);
      await tx.execute(sql`DELETE FROM accounting.journal_entries WHERE id = ${entryId}`);
    });

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Delete journal entry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

