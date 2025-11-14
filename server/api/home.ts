// Home Page API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_CLIENT_ID } from "../constants";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Home page KPIs
router.get('/kpis', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const clientId = DEFAULT_CLIENT_ID;
    const { range } = req.query as { range?: string };

    // Determine date range
    const dateFilter = range === 'lastYear'
      ? sql`AND je.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND je.date < DATE_TRUNC('year', CURRENT_DATE)`
      : sql``; // thisYear default handled below where needed

    const invoicesCountResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM accounting.invoices
      WHERE client_id = ${clientId}
    `);

    const billsCountResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM accounting.bills
      WHERE client_id = ${clientId}
    `);

    const cashflowResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE WHEN a.type = 'asset' AND (a.name ILIKE '%cash%' OR a.name ILIKE '%bank%')
             THEN (jel.debit_amount::numeric - jel.credit_amount::numeric)
             ELSE 0 END
      ), 0) AS net_cashflow
      FROM accounting.journal_entry_lines jel
      JOIN accounting.accounts a ON jel.account_id = a.id
      JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ${clientId}
        AND je.is_posted = true
        ${range === 'lastYear' ? sql`AND je.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND je.date < DATE_TRUNC('year', CURRENT_DATE)` : sql``}
    `);

    res.json({
      invoicesCount: (invoicesCountResult.rows[0] as any)?.cnt ?? 0,
      billsCount: (billsCountResult.rows[0] as any)?.cnt ?? 0,
      cashflowNet: parseFloat((cashflowResult.rows[0] as any)?.net_cashflow || '0'),
    });
  } catch (error) {
    console.error('HOME_KPIS_ERROR', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Top customers
router.get('/top-customers', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }
    const clientId = DEFAULT_CLIENT_ID;
    const { range } = req.query as { range?: string };

    const dateFilter = range === 'lastYear'
      ? "AND i.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND i.date < DATE_TRUNC('year', CURRENT_DATE)"
      : "AND i.date >= DATE_TRUNC('year', CURRENT_DATE)";

    const result = await db.execute(sql.raw(`
      SELECT c.name, COALESCE(SUM(i.total_amount::numeric), 0) AS amount
      FROM accounting.invoices i
      JOIN accounting.customers c ON i.customer_id = c.id
      WHERE i.client_id = ${clientId}
        ${dateFilter}
      GROUP BY c.name
      ORDER BY amount DESC
      LIMIT 5
    `));

    res.json(result.rows.map((r: any) => ({ name: r.name, value: parseFloat(r.amount || '0') })));
  } catch (error) {
    console.error('HOME_TOP_CUSTOMERS_ERROR', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Top vendors
router.get('/top-vendors', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }
    const clientId = DEFAULT_CLIENT_ID;
    const { range } = req.query as { range?: string };

    const dateFilter = range === 'lastYear'
      ? "AND b.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND b.date < DATE_TRUNC('year', CURRENT_DATE)"
      : "AND b.date >= DATE_TRUNC('year', CURRENT_DATE)";

    const result = await db.execute(sql.raw(`
      SELECT v.name, COALESCE(SUM(b.total_amount::numeric), 0) AS amount
      FROM accounting.bills b
      JOIN accounting.vendors v ON b.vendor_id = v.id
      WHERE b.client_id = ${clientId}
        ${dateFilter}
      GROUP BY v.name
      ORDER BY amount DESC
      LIMIT 5
    `));

    res.json(result.rows.map((r: any) => ({ name: r.name, value: parseFloat(r.amount || '0') })));
  } catch (error) {
    console.error('HOME_TOP_VENDORS_ERROR', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

