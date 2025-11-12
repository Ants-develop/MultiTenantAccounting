// Journal Entries API Routes
import express from "express";
import { db } from "../db";
import { sql, eq, desc } from "drizzle-orm";
import { z as zod } from "zod";
import { 
  insertJournalEntrySchema, 
  insertJournalEntryLineSchema,
  journalEntries, 
  journalEntryLines,
  companies as companiesTable 
} from "@shared/schema";
import { storage } from "../storage";
import { requireAuth, requireCompany } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
// Note: In single-company mode, we use a default clientId of 1
const DEFAULT_CLIENT_ID = parseInt(process.env.DEFAULT_CLIENT_ID || '1');

// Get all journal entries with pagination and tenant filtering
router.get('/', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = (page - 1) * limit;

    // Get company to access tenant code
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, clientId));
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    console.log(`[JournalEntries API] Fetching entries for clientId: ${clientId}, tenantCode: ${company.tenantCode || 'none'}, page: ${page}, limit: ${limit}`);
    
    // CRITICAL: Require tenant code for data isolation
    if (!company.tenantCode) {
      console.error(`[JournalEntries API] Company ${clientId} (${company.name}) has no tenant_code configured`);
      return res.status(400).json({ 
        message: 'Company has no tenant code configured. Please set a tenant code for this company to access journal entries.',
        companyName: company.name,
        clientId: clientId
      });
    }
    
    // Build query - filter by tenantCode ONLY
    // This ensures we only get transactions that belong to the company's tenant
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
    
    // Apply tenant code filter - only get entries with matching tenant code
    const filteredQuery = query.where(eq(journalEntries.tenantCode, company.tenantCode));
    console.log(`[JournalEntries API] Filtering by tenantCode: ${company.tenantCode}`);
    
    // Get total count for pagination
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(eq(journalEntries.tenantCode, company.tenantCode));
    
    // Order by date descending with pagination
    const entries = await filteredQuery
      .orderBy(desc(journalEntries.date))
      .limit(limit)
      .offset(offset);
    
    const totalPages = Math.ceil(Number(totalCount) / limit);
    console.log(`[JournalEntries API] Found ${entries.length} entries (page ${page}/${totalPages}, total: ${totalCount})`);
    
    // Transform for Handsontable - convert dates to ISO strings
    const transformedEntries = entries.map(entry => ({
      ...entry,
      totalAmount: entry.totalAmount || '0.00',
      date: entry.date.toISOString(),
      createdAt: entry.createdAt?.toISOString() || null,
      docDate: entry.docDate?.toISOString() || null,
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get journal entry lines for a specific entry
router.get('/:id/lines', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const lines = await storage.getJournalEntryLinesByEntry(entryId);
    res.json(lines);
  } catch (error) {
    console.error('Get journal entry lines error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new journal entry
router.post('/', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    // Coerce date from string/number to Date to satisfy schema and DB timestamp column
    const raw = req.body || {} as any;
    const lines = raw.lines || [];
    
    // Use a coercing schema to accept strings like "YYYY-MM-DD"
    const coerceEntrySchema = insertJournalEntrySchema.extend({
      date: zod.coerce.date(),
    });

    const { lines: _, ...rawWithoutLines } = raw;
    const entryData = coerceEntrySchema.parse({
      ...rawWithoutLines,
      clientId: DEFAULT_CLIENT_ID,
      userId: req.session.userId,
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
    await activityLogger.logError(
      ACTIVITY_ACTIONS.JOURNAL_CREATE,
      RESOURCE_TYPES.JOURNAL_ENTRY,
      {
        userId: req.session.userId!,
        clientId: DEFAULT_CLIENT_ID,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      error as Error,
      undefined,
      { entryData: req.body }
    );
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update journal entry
router.put('/:id', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const entryId = parseInt(req.params.id);
    const updateData = req.body;
    const lines = updateData.lines || [];
    const { lines: _, ...updateDataWithoutLines } = updateData;

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
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const entryIdRaw = req.params.id;
    const entryId = Number(entryIdRaw);
    if (!Number.isInteger(entryId)) {
      return res.status(400).json({ message: 'Invalid journal entry id' });
    }

    // Check if entry is posted - posted entries shouldn't be deleted
    const entry = await storage.getJournalEntry(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    if (entry.isPosted) {
      return res.status(400).json({ 
        message: 'Cannot delete posted journal entries. Please reverse the entry instead.' 
      });
    }

    // Force-remove children then parent in one transaction using raw SQL
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM journal_entry_lines WHERE journal_entry_id = ${entryId}`);
      await tx.execute(sql`DELETE FROM journal_entries WHERE id = ${entryId}`);
    });

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Delete journal entry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

