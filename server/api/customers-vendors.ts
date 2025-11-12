// Customers, Vendors, Invoices, Bills API Routes
import express from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Customer routes
router.get('/customers', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const customers = await storage.getCustomersByCompany(req.session.currentCompanyId);
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const customerData = {
      ...req.body,
      companyId: req.session.currentCompanyId,
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
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const vendors = await storage.getVendorsByCompany(req.session.currentCompanyId);
    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const vendorData = {
      ...req.body,
      companyId: req.session.currentCompanyId,
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
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const invoices = await storage.getInvoicesByCompany(req.session.currentCompanyId);
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const invoiceData = {
      ...req.body,
      companyId: req.session.currentCompanyId,
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
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }
    
    const bills = await storage.getBillsByCompany(req.session.currentCompanyId);
    res.json(bills);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/bills', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const billData = {
      ...req.body,
      companyId: req.session.currentCompanyId,
    };
    
    const bill = await storage.createBill(billData);
    res.json(bill);
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

