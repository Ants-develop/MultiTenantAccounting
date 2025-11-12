// Customers, Vendors, Invoices, Bills API Routes
import express from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
// Note: In single-company mode, we use a default clientId of 1
const DEFAULT_CLIENT_ID = parseInt(process.env.DEFAULT_CLIENT_ID || '1');

// Customer routes
router.get('/customers', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const customers = await storage.getCustomersByCompany(DEFAULT_CLIENT_ID);
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const customerData = {
      ...req.body,
      clientId: DEFAULT_CLIENT_ID,
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
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const vendors = await storage.getVendorsByCompany(DEFAULT_CLIENT_ID);
    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const vendorData = {
      ...req.body,
      clientId: DEFAULT_CLIENT_ID,
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
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const invoices = await storage.getInvoicesByCompany(DEFAULT_CLIENT_ID);
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const invoiceData = {
      ...req.body,
      clientId: DEFAULT_CLIENT_ID,
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
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const bills = await storage.getBillsByCompany(DEFAULT_CLIENT_ID);
    res.json(bills);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/bills', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const billData = {
      ...req.body,
      clientId: DEFAULT_CLIENT_ID,
    };
    
    const bill = await storage.createBill(billData);
    res.json(bill);
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

