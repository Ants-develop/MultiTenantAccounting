// Customers, Vendors, Invoices, Bills API Routes
import express from "express";
import { storage } from "../storage";
import { db } from "../db";
import { inArray, desc } from "drizzle-orm";
import { customers, vendors, invoices, bills } from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { getUserClientsByModule } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Helper to get target client IDs
async function getTargetClientIds(req: any, res: any): Promise<number[] | null> {
  const userId = req.user?.id;
  const clientIdParam = req.query.clientId as string;
  
  const userClients = await getUserClientsByModule(userId, 'accounting'); // Assuming accounting module
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

// Customer routes
router.get('/customers', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return;
    
    if (targetIds.length === 0) {
      return res.json([]);
    }
    
    const result = await db
      .select()
      .from(customers)
      .where(inArray(customers.clientId, targetIds))
      .orderBy(desc(customers.createdAt));
      
    res.json(result);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const clientId = req.body.clientId;
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const customerData = {
      ...req.body,
      clientId: clientId,
    };
    
    const customer = await storage.createCustomer(customerData);
    res.json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Vendor routes
router.get('/vendors', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return;
    
    if (targetIds.length === 0) {
      return res.json([]);
    }
    
    const result = await db
      .select()
      .from(vendors)
      .where(inArray(vendors.clientId, targetIds))
      .orderBy(desc(vendors.createdAt));
      
    res.json(result);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    const clientId = req.body.clientId;
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const vendorData = {
      ...req.body,
      clientId: clientId,
    };
    
    const vendor = await storage.createVendor(vendorData);
    res.json(vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Invoice routes
router.get('/invoices', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return;
    
    if (targetIds.length === 0) {
      return res.json([]);
    }
    
    const result = await db
      .select()
      .from(invoices)
      .where(inArray(invoices.clientId, targetIds))
      .orderBy(desc(invoices.createdAt));
      
    res.json(result);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const clientId = req.body.clientId;
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const invoiceData = {
      ...req.body,
      clientId: clientId,
    };
    
    const invoice = await storage.createInvoice(invoiceData);
    res.json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bills routes
router.get('/bills', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return;
    
    if (targetIds.length === 0) {
      return res.json([]);
    }
    
    const result = await db
      .select()
      .from(bills)
      .where(inArray(bills.clientId, targetIds))
      .orderBy(desc(bills.createdAt));
      
    res.json(result);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/bills', async (req, res) => {
  try {
    const clientId = req.body.clientId;
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const billData = {
      ...req.body,
      clientId: clientId,
    };
    
    const bill = await storage.createBill(billData);
    res.json(bill);
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

