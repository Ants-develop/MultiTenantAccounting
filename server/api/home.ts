// Home Page API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getUserClientsByModule } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Helper to get target client IDs
async function getTargetClientIds(req: any, res: any): Promise<number[] | null> {
  const userId = req.user?.id;
  const clientIdParam = req.query.clientId as string;
  
  const userClients = await getUserClientsByModule(userId, 'dashboard');
  const allowedClientIds = userClients.map(c => c.clientId);
  
  if (clientIdParam) {
    const requestedId = parseInt(clientIdParam);
    if (isNaN(requestedId)) {
      res.status(400).json({ message: 'Invalid Client ID' });
      return null;
    }
    if (!allowedClientIds.includes(requestedId)) {
      res.status(403).json({ message: 'Access denied to this client' });
      return null;
    }
    return [requestedId];
  }
  
  return allowedClientIds;
}

// Home page KPIs
router.get('/kpis', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return; // Response already sent
    
    if (targetIds.length === 0) {
      return res.json({ invoicesCount: 0, billsCount: 0, cashflowNet: 0 });
    }

    const { range } = req.query as { range?: string };

    const invoicesCountRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM accounting.invoices
      WHERE client_id = ANY(${targetIds})
    `);

    const billsCountRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM accounting.bills
      WHERE client_id = ANY(${targetIds})
    `);

    const cashflowRows = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE WHEN a.type = 'asset' AND (a.name ILIKE '%cash%' OR a.name ILIKE '%bank%')
             THEN (jel.debit_amount::numeric - jel.credit_amount::numeric)
             ELSE 0 END
      ), 0) AS net_cashflow
      FROM accounting.journal_entry_lines jel
      JOIN accounting.accounts a ON jel.account_id = a.id
      JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ANY(${targetIds})
        AND je.is_posted = true
        ${range === 'lastYear' ? sql`AND je.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND je.date < DATE_TRUNC('year', CURRENT_DATE)` : sql``}
    `);

    const invoicesCount = Number((invoicesCountRows as any)?.[0]?.cnt ?? 0);
    const billsCount = Number((billsCountRows as any)?.[0]?.cnt ?? 0);
    const cashflowNet = Number((cashflowRows as any)?.[0]?.net_cashflow ?? 0);

    res.json({
      invoicesCount,
      billsCount,
      cashflowNet,
    });
  } catch (error) {
    console.error('HOME_KPIS_ERROR', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Top customers
router.get('/top-customers', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return; // Response already sent
    
    if (targetIds.length === 0) {
      return res.json([]);
    }

    const { range } = req.query as { range?: string };

    const dateFilter = range === 'lastYear'
      ? sql`AND i.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND i.date < DATE_TRUNC('year', CURRENT_DATE)`
      : sql`AND i.date >= DATE_TRUNC('year', CURRENT_DATE)`;

    const rows = await db.execute(sql`
      SELECT c.name, COALESCE(SUM(i.total_amount::numeric), 0) AS amount
      FROM accounting.invoices i
      JOIN accounting.customers c ON i.customer_id = c.id
      WHERE i.client_id = ANY(${targetIds})
        ${dateFilter}
      GROUP BY c.name
      ORDER BY amount DESC
      LIMIT 5
    `);

    res.json((rows as any[]).map((r: any) => ({ name: r.name, value: parseFloat(r.amount || '0') })));
  } catch (error) {
    console.error('HOME_TOP_CUSTOMERS_ERROR', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Top vendors
router.get('/top-vendors', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return; // Response already sent
    
    if (targetIds.length === 0) {
      return res.json([]);
    }

    const { range } = req.query as { range?: string };

    const dateFilter = range === 'lastYear'
      ? sql`AND b.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND b.date < DATE_TRUNC('year', CURRENT_DATE)`
      : sql`AND b.date >= DATE_TRUNC('year', CURRENT_DATE)`;

    const rows = await db.execute(sql`
      SELECT v.name, COALESCE(SUM(b.total_amount::numeric), 0) AS amount
      FROM accounting.bills b
      JOIN accounting.vendors v ON b.vendor_id = v.id
      WHERE b.client_id = ANY(${targetIds})
        ${dateFilter}
      GROUP BY v.name
      ORDER BY amount DESC
      LIMIT 5
    `);

    res.json((rows as any[]).map((r: any) => ({ name: r.name, value: parseFloat(r.amount || '0') })));
  } catch (error) {
    console.error('HOME_TOP_VENDORS_ERROR', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

