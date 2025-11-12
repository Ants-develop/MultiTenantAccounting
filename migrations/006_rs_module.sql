-- RS Integration Module Tables
-- Migration: 006_rs_module.sql
-- Description: Create tables for Georgian Revenue Service (RS.ge) integration data

-- UP
-- Create RS schema and tables for RS.ge integration data

-- Create RS schema for RS.ge data
CREATE SCHEMA IF NOT EXISTS rs;

-- =====================================================
-- RS Users Table (Credentials) - In rs schema
-- =====================================================
CREATE TABLE IF NOT EXISTS rs.users (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  s_user VARCHAR(100) NOT NULL,
  s_password VARCHAR(255) NOT NULL,
  s_password_hash VARCHAR(255) NOT NULL,
  main_user VARCHAR(100),
  main_password VARCHAR(255),
  main_password_hash VARCHAR(255),
  user_id VARCHAR(50),
  un_id VARCHAR(50),
  client_id INTEGER,
  company_tin VARCHAR(20),
  created_by_user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE rs.users
  ADD CONSTRAINT rs_users_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE rs.users
  ADD CONSTRAINT rs_users_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rs_users_company_name ON rs.users(company_name);
CREATE INDEX IF NOT EXISTS idx_rs_users_client_id ON rs.users(client_id);
CREATE INDEX IF NOT EXISTS idx_rs_users_company_tin ON rs.users(company_tin);

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION rs.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER rs_users_set_updated_at
BEFORE UPDATE ON rs.users
FOR EACH ROW
EXECUTE FUNCTION rs.set_updated_at();

-- =====================================================
-- RS Schema Tables
-- =====================================================

-- 1. Seller Invoices (Outgoing invoices)
CREATE TABLE IF NOT EXISTS rs.seller_invoices (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL UNIQUE,
  "F_TYPE" VARCHAR(50),
  "F_DATE" VARCHAR(50),
  "F_SERIES" VARCHAR(50),
  "F_NUMBER" VARCHAR(50),
  "BUYER_TIN" VARCHAR(20),
  "BUYER_NAME" VARCHAR(255),
  "SELLER_TIN" VARCHAR(20),
  "SELLER_NAME" VARCHAR(255),
  "AMOUNT" NUMERIC(18,2),
  "AQCIZI_AMOUNT" NUMERIC(18,2),
  "DRG_AMOUNT" NUMERIC(18,2),
  "FULL_AMOUNT" NUMERIC(18,2),
  "STATUS" VARCHAR(50),
  "SUP_TYPE" VARCHAR(50),
  "CREATE_TIME" VARCHAR(50),
  "WAYBILL_NUMBER" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_seller_invoices_invoice_id ON rs.seller_invoices("INVOICE_ID");
CREATE INDEX idx_seller_invoices_company_tin ON rs.seller_invoices("COMPANY_TIN");
CREATE INDEX idx_seller_invoices_updated_at ON rs.seller_invoices("UPDATED_AT");

-- 2. Buyer Invoices (Incoming invoices)
CREATE TABLE IF NOT EXISTS rs.buyer_invoices (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL UNIQUE,
  "F_TYPE" VARCHAR(50),
  "F_DATE" VARCHAR(50),
  "F_SERIES" VARCHAR(50),
  "F_NUMBER" VARCHAR(50),
  "BUYER_TIN" VARCHAR(20),
  "BUYER_NAME" VARCHAR(255),
  "SELLER_TIN" VARCHAR(20),
  "SELLER_NAME" VARCHAR(255),
  "AMOUNT" NUMERIC(18,2),
  "AQCIZI_AMOUNT" NUMERIC(18,2),
  "DRG_AMOUNT" NUMERIC(18,2),
  "FULL_AMOUNT" NUMERIC(18,2),
  "STATUS" VARCHAR(50),
  "SUP_TYPE" VARCHAR(50),
  "CREATE_TIME" VARCHAR(50),
  "WAYBILL_NUMBER" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_buyer_invoices_invoice_id ON rs.buyer_invoices("INVOICE_ID");
CREATE INDEX idx_buyer_invoices_company_tin ON rs.buyer_invoices("COMPANY_TIN");
CREATE INDEX idx_buyer_invoices_updated_at ON rs.buyer_invoices("UPDATED_AT");

-- 3. Special Seller Invoices (NSAF API)
CREATE TABLE IF NOT EXISTS rs.spec_seller_invoices (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL UNIQUE,
  "F_TYPE" VARCHAR(50),
  "F_DATE" VARCHAR(50),
  "F_SERIES" VARCHAR(50),
  "F_NUMBER" VARCHAR(50),
  "BUYER_TIN" VARCHAR(20),
  "BUYER_NAME" VARCHAR(255),
  "SELLER_TIN" VARCHAR(20),
  "SELLER_NAME" VARCHAR(255),
  "FULL_AMOUNT" NUMERIC(18,2),
  "STATUS" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_spec_seller_invoices_invoice_id ON rs.spec_seller_invoices("INVOICE_ID");
CREATE INDEX idx_spec_seller_invoices_company_tin ON rs.spec_seller_invoices("COMPANY_TIN");

-- 4. Special Buyer Invoices (NSAF API)
CREATE TABLE IF NOT EXISTS rs.spec_buyer_invoices (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL UNIQUE,
  "F_TYPE" VARCHAR(50),
  "F_DATE" VARCHAR(50),
  "F_SERIES" VARCHAR(50),
  "F_NUMBER" VARCHAR(50),
  "BUYER_TIN" VARCHAR(20),
  "BUYER_NAME" VARCHAR(255),
  "SELLER_TIN" VARCHAR(20),
  "SELLER_NAME" VARCHAR(255),
  "FULL_AMOUNT" NUMERIC(18,2),
  "STATUS" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_spec_buyer_invoices_invoice_id ON rs.spec_buyer_invoices("INVOICE_ID");
CREATE INDEX idx_spec_buyer_invoices_company_tin ON rs.spec_buyer_invoices("COMPANY_TIN");

-- 5. Sellers Waybills (Outgoing shipments)
CREATE TABLE IF NOT EXISTS rs.sellers_waybills (
  "ID" SERIAL PRIMARY KEY,
  "EXTERNAL_ID" VARCHAR(50) NOT NULL UNIQUE,
  "TYPE" VARCHAR(50),
  "CREATE_DATE" VARCHAR(50),
  "SELLER_TIN" VARCHAR(20),
  "SELLER_NAME" VARCHAR(255),
  "BUYER_TIN" VARCHAR(20),
  "BUYER_NAME" VARCHAR(255),
  "START_ADDRESS" VARCHAR(255),
  "END_ADDRESS" VARCHAR(255),
  "DRIVER_TIN" VARCHAR(20),
  "DRIVER_NAME" VARCHAR(255),
  "TRANSPORT_COAST" NUMERIC(18,2),
  "DELIVERY_DATE" VARCHAR(50),
  "STATUS" VARCHAR(50),
  "ACTIVATE_DATE" VARCHAR(50),
  "FULL_AMOUNT" NUMERIC(18,2),
  "CAR_NUMBER" VARCHAR(50),
  "WAYBILL_NUMBER" VARCHAR(50),
  "CLOSE_DATE" VARCHAR(50),
  "BEGIN_DATE" VARCHAR(50),
  "COMMENT" TEXT,
  "IS_CONFIRMED" VARCHAR(50),
  "IS_CORRECTED" VARCHAR(50),
  "IS_VAT_PAYER" VARCHAR(50),
  "PREVIOUS_IS_CORRECTED" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_sellers_waybills_external_id ON rs.sellers_waybills("EXTERNAL_ID");
CREATE INDEX idx_sellers_waybills_company_tin ON rs.sellers_waybills("COMPANY_TIN");
CREATE INDEX idx_sellers_waybills_updated_at ON rs.sellers_waybills("UPDATED_AT");

-- 6. Buyers Waybills (Incoming shipments)
CREATE TABLE IF NOT EXISTS rs.buyers_waybills (
  "ID" SERIAL PRIMARY KEY,
  "EXTERNAL_ID" VARCHAR(50) NOT NULL UNIQUE,
  "TYPE" VARCHAR(50),
  "CREATE_DATE" VARCHAR(50),
  "SELLER_TIN" VARCHAR(20),
  "SELLER_NAME" VARCHAR(255),
  "BUYER_TIN" VARCHAR(20),
  "BUYER_NAME" VARCHAR(255),
  "START_ADDRESS" VARCHAR(255),
  "END_ADDRESS" VARCHAR(255),
  "DRIVER_TIN" VARCHAR(20),
  "DRIVER_NAME" VARCHAR(255),
  "TRANSPORT_COAST" NUMERIC(18,2),
  "DELIVERY_DATE" VARCHAR(50),
  "STATUS" VARCHAR(50),
  "ACTIVATE_DATE" VARCHAR(50),
  "FULL_AMOUNT" NUMERIC(18,2),
  "CAR_NUMBER" VARCHAR(50),
  "WAYBILL_NUMBER" VARCHAR(50),
  "CLOSE_DATE" VARCHAR(50),
  "BEGIN_DATE" VARCHAR(50),
  "COMMENT" TEXT,
  "IS_CONFIRMED" VARCHAR(50),
  "IS_CORRECTED" VARCHAR(50),
  "IS_VAT_PAYER" VARCHAR(50),
  "PREVIOUS_IS_CORRECTED" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_buyers_waybills_external_id ON rs.buyers_waybills("EXTERNAL_ID");
CREATE INDEX idx_buyers_waybills_company_tin ON rs.buyers_waybills("COMPANY_TIN");
CREATE INDEX idx_buyers_waybills_updated_at ON rs.buyers_waybills("UPDATED_AT");

-- 7. Sellers Waybill Goods (Line items)
CREATE TABLE IF NOT EXISTS rs.sellers_waybill_goods (
  "ID" SERIAL PRIMARY KEY,
  "WAYBILL_ID" VARCHAR(100) NOT NULL,
  "W_NAME" VARCHAR(500),
  "UNIT_ID" VARCHAR(100),
  "UNIT_TXT" VARCHAR(100),
  "QUANTITY" NUMERIC(18,4),
  "PRICE" NUMERIC(18,2),
  "AMOUNT" NUMERIC(18,2),
  "BAR_CODE" VARCHAR(100),
  "A_ID" VARCHAR(100),
  "VAT_TYPE" VARCHAR(100),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP,
  UNIQUE ("WAYBILL_ID", "A_ID", "BAR_CODE")
);

CREATE INDEX idx_sellers_waybill_goods_waybill_id ON rs.sellers_waybill_goods("WAYBILL_ID");
CREATE INDEX idx_sellers_waybill_goods_company_tin ON rs.sellers_waybill_goods("COMPANY_TIN");

-- 8. Buyers Waybill Goods (Line items)
CREATE TABLE IF NOT EXISTS rs.buyers_waybill_goods (
  "ID" SERIAL PRIMARY KEY,
  "WAYBILL_ID" VARCHAR(100) NOT NULL,
  "W_NAME" VARCHAR(500),
  "UNIT_ID" VARCHAR(100),
  "UNIT_TXT" VARCHAR(100),
  "QUANTITY" NUMERIC(18,4),
  "PRICE" NUMERIC(18,2),
  "AMOUNT" NUMERIC(18,2),
  "BAR_CODE" VARCHAR(100),
  "A_ID" VARCHAR(100),
  "VAT_TYPE" VARCHAR(100),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "UPDATED_AT" TIMESTAMP,
  UNIQUE ("WAYBILL_ID", "A_ID", "BAR_CODE")
);

CREATE INDEX idx_buyers_waybill_goods_waybill_id ON rs.buyers_waybill_goods("WAYBILL_ID");
CREATE INDEX idx_buyers_waybill_goods_company_tin ON rs.buyers_waybill_goods("COMPANY_TIN");

-- 9. Sellers Invoice Goods (Line items)
CREATE TABLE IF NOT EXISTS rs.sellers_invoice_goods (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL,
  "AKCIS_ID" VARCHAR(50),
  "AQCIZI_AMOUNT" NUMERIC(18,4),
  "DRG_AMOUNT" NUMERIC(18,4),
  "FULL_AMOUNT" NUMERIC(18,4),
  "GOODS" TEXT,
  "G_NUMBER" NUMERIC(18,4),
  "G_UNIT" VARCHAR(50),
  "ID_GOODS" VARCHAR(50),
  "INV_ID" VARCHAR(50),
  "SDRG_AMOUNT" NUMERIC(18,4),
  "VAT_TYPE" VARCHAR(50),
  "WAYBILL_ID" VARCHAR(50),
  "F_SERIES" VARCHAR(50),
  "F_NUMBER" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_NAME" VARCHAR(255),
  "COMPANY_TIN" VARCHAR(20),
  "UPDATED_AT" TIMESTAMP,
  UNIQUE ("INVOICE_ID", "ID_GOODS")
);

CREATE INDEX idx_sellers_invoice_goods_invoice_id ON rs.sellers_invoice_goods("INVOICE_ID");
CREATE INDEX idx_sellers_invoice_goods_company_tin ON rs.sellers_invoice_goods("COMPANY_TIN");

-- 10. Buyers Invoice Goods (Line items)
CREATE TABLE IF NOT EXISTS rs.buyers_invoice_goods (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL,
  "AKCIS_ID" VARCHAR(50),
  "AQCIZI_AMOUNT" NUMERIC(18,4),
  "DRG_AMOUNT" NUMERIC(18,4),
  "FULL_AMOUNT" NUMERIC(18,4),
  "GOODS" TEXT,
  "G_NUMBER" NUMERIC(18,4),
  "G_UNIT" VARCHAR(50),
  "ID_GOODS" VARCHAR(50),
  "INV_ID" VARCHAR(50),
  "SDRG_AMOUNT" NUMERIC(18,4),
  "VAT_TYPE" VARCHAR(50),
  "WAYBILL_ID" VARCHAR(50),
  "F_SERIES" VARCHAR(50),
  "F_NUMBER" VARCHAR(50),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_NAME" VARCHAR(255),
  "COMPANY_TIN" VARCHAR(20),
  "UPDATED_AT" TIMESTAMP,
  UNIQUE ("INVOICE_ID", "ID_GOODS")
);

CREATE INDEX idx_buyers_invoice_goods_invoice_id ON rs.buyers_invoice_goods("INVOICE_ID");
CREATE INDEX idx_buyers_invoice_goods_company_tin ON rs.buyers_invoice_goods("COMPANY_TIN");

-- 11. Special Invoice Goods (NSAF API)
CREATE TABLE IF NOT EXISTS rs.spec_invoice_goods (
  "ID" SERIAL PRIMARY KEY,
  "INVOICE_ID" VARCHAR(50) NOT NULL,
  "GOODS_NAME" TEXT,
  "QUANTITY" NUMERIC(18,4),
  "UNIT" VARCHAR(50),
  "PRICE" NUMERIC(18,2),
  "AMOUNT" NUMERIC(18,2),
  "VAT_AMOUNT" NUMERIC(18,2),
  "EXCISE_AMOUNT" NUMERIC(18,2),
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "UPDATED_AT" TIMESTAMP
);

CREATE INDEX idx_spec_invoice_goods_invoice_id ON rs.spec_invoice_goods("INVOICE_ID");
CREATE INDEX idx_spec_invoice_goods_company_tin ON rs.spec_invoice_goods("COMPANY_TIN");

-- 12. Waybill-Invoice Associations
CREATE TABLE IF NOT EXISTS rs.waybill_invoices (
  "ID" SERIAL PRIMARY KEY,
  "WAYBILL_EXTERNAL_ID" VARCHAR(50) NOT NULL,
  "INVOICE_ID" VARCHAR(50) NOT NULL,
  "COMPANY_ID" VARCHAR(50),
  "COMPANY_TIN" VARCHAR(20),
  "COMPANY_NAME" VARCHAR(255),
  "WAYBILL_TYPE" VARCHAR(50),
  "INVOICE_TYPE" VARCHAR(50),
  "CREATED_AT" TIMESTAMP,
  UNIQUE ("WAYBILL_EXTERNAL_ID", "INVOICE_ID")
);

CREATE INDEX idx_waybill_invoices_waybill_id ON rs.waybill_invoices("WAYBILL_EXTERNAL_ID");
CREATE INDEX idx_waybill_invoices_invoice_id ON rs.waybill_invoices("INVOICE_ID");
CREATE INDEX idx_waybill_invoices_company_tin ON rs.waybill_invoices("COMPANY_TIN");

-- Comments
COMMENT ON SCHEMA rs IS 'Georgian Revenue Service (RS.ge) integration data';
COMMENT ON TABLE rs.users IS 'RS.ge API credentials per company';
COMMENT ON TABLE rs.seller_invoices IS 'Sales invoices issued by clients';
COMMENT ON TABLE rs.buyer_invoices IS 'Purchase invoices received by clients';
COMMENT ON TABLE rs.spec_seller_invoices IS 'Special seller invoices (NSAF API)';
COMMENT ON TABLE rs.spec_buyer_invoices IS 'Special buyer invoices (NSAF API)';
COMMENT ON TABLE rs.sellers_waybills IS 'Outgoing waybills';
COMMENT ON TABLE rs.buyers_waybills IS 'Incoming waybills';
COMMENT ON TABLE rs.sellers_waybill_goods IS 'Seller waybill line items';
COMMENT ON TABLE rs.buyers_waybill_goods IS 'Buyer waybill line items';
COMMENT ON TABLE rs.sellers_invoice_goods IS 'Seller invoice line items';
COMMENT ON TABLE rs.buyers_invoice_goods IS 'Buyer invoice line items';
COMMENT ON TABLE rs.spec_invoice_goods IS 'Special invoice goods (NSAF)';
COMMENT ON TABLE rs.waybill_invoices IS 'Waybill-invoice associations';

-- DOWN
-- Drop RS schema and tables (rollback)
DROP SCHEMA IF EXISTS rs CASCADE;

