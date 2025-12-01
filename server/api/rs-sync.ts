import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { rsUsers, companies } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import {
  syncCompanyData,
  type SyncResult,
  type SyncProgress,
} from "../services/rs-sync-service";

const router = express.Router();

// Apply authentication middleware
router.use(requireAuth);

const syncRequestSchema = z.object({
  companyNames: z.array(z.string()).min(1, "At least one company is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  autoAssociate: z.boolean().default(true),
  parallelMode: z.boolean().default(false),
  maxParallel: z.number().int().min(1).max(10).default(3),
});

/**
 * GET /api/rs-sync/verified-companies
 * Get list of companies with verified RS credentials
 */
router.get("/verified-companies", async (req: Request, res: Response) => {
  try {
    const verifiedCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        code: companies.code,
        companyName: rsUsers.companyName,
        companyTin: rsUsers.companyTin,
        verificationStatus: companies.verificationStatus,
      })
      .from(companies)
      .innerJoin(rsUsers, eq(companies.id, rsUsers.clientId))
      .where(eq(companies.verificationStatus, "verified"));

    res.json({
      companies: verifiedCompanies.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        companyName: c.companyName,
        companyTin: c.companyTin,
        verificationStatus: c.verificationStatus,
      })),
    });
  } catch (error: any) {
    console.error("[RS Sync API] Error fetching verified companies:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch verified companies",
    });
  }
});

/**
 * POST /api/rs-sync/sync
 * Sync RS data for one or more companies
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const payload = syncRequestSchema.parse(req.body);
    const { companyNames, startDate, endDate, autoAssociate, parallelMode, maxParallel } = payload;

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({
        message: "Start date must be before or equal to end date",
      });
    }

    // Verify all companies have RS credentials (validation will happen in the loop)

    // For now, process companies sequentially
    // TODO: Implement parallel processing if parallelMode is true
    const allResults: SyncResult[] = [];
    const progressUpdates: SyncProgress[] = [];

    for (const companyName of companyNames) {
      // Get company info
      const [credential] = await db
        .select({
          companyName: rsUsers.companyName,
          companyTin: rsUsers.companyTin,
          clientId: rsUsers.clientId,
        })
        .from(rsUsers)
        .where(eq(rsUsers.companyName, companyName))
        .limit(1);

      if (!credential || !credential.clientId) {
        allResults.push({
          company: companyName,
          type: "sync_error",
          inserted: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          error: true,
          message: `No RS credentials found for company: ${companyName}`,
        });
        continue;
      }

      // Get company details
      const [company] = await db
        .select({
          id: companies.id,
          name: companies.name,
          code: companies.code,
          verificationStatus: companies.verificationStatus,
        })
        .from(companies)
        .where(eq(companies.id, credential.clientId))
        .limit(1);

      if (!company || company.verificationStatus !== "verified") {
        allResults.push({
          company: companyName,
          type: "sync_error",
          inserted: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          error: true,
          message: `Company ${companyName} is not verified`,
        });
        continue;
      }

      // Sync company data
      const results = await syncCompanyData(
        companyName,
        company.id,
        credential.companyTin || company.code,
        { startDate, endDate },
        autoAssociate,
        (progress) => {
          progressUpdates.push(progress);
        }
      );

      allResults.push(...results);
    }

    // Calculate summary
    const summary = {
      totalCompanies: companyNames.length,
      totalInserted: allResults.reduce((sum, r) => sum + r.inserted, 0),
      totalUpdated: allResults.reduce((sum, r) => sum + r.updated, 0),
      totalSkipped: allResults.reduce((sum, r) => sum + r.skipped, 0),
      totalRecords: allResults.reduce((sum, r) => sum + r.total, 0),
      errors: allResults.filter((r) => r.error).length,
    };

    res.json({
      success: true,
      summary,
      results: allResults,
      progress: progressUpdates,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("[RS Sync API] Error syncing data:", error);
    res.status(500).json({
      message: error.message || "Failed to sync RS data",
    });
  }
});

export default router;

