-- Create RS (Revenue Service) Schema and Tables
-- This schema contains tables for Georgia's RS.ge tax data sync

CREATE SCHEMA IF NOT EXISTS rs;

-- RS Credentials table (for authentication)
CREATE TABLE IF NOT EXISTS rs.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    api_key TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Seller Invoices
CREATE TABLE IF NOT EXISTS rs.seller_invoices (
    "ID" TEXT PRIMARY KEY,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "INVOICE_NUMBER" VARCHAR(50),
    "INVOICE_DATE" DATE,
    "DUE_DATE" DATE,
    "INVOICE_AMOUNT" NUMERIC(18, 2),
    "VAT_AMOUNT" NUMERIC(18, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "BUYER_TIN" VARCHAR(50),
    "BUYER_NAME" VARCHAR(255),
    "STATUS" VARCHAR(50),
    "CURRENCY" VARCHAR(3) DEFAULT 'GEL',
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE,
    "NOTES" TEXT
);

-- Buyer Invoices
CREATE TABLE IF NOT EXISTS rs.buyer_invoices (
    "ID" TEXT PRIMARY KEY,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "INVOICE_NUMBER" VARCHAR(50),
    "INVOICE_DATE" DATE,
    "DUE_DATE" DATE,
    "INVOICE_AMOUNT" NUMERIC(18, 2),
    "VAT_AMOUNT" NUMERIC(18, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "SELLER_TIN" VARCHAR(50),
    "SELLER_NAME" VARCHAR(255),
    "STATUS" VARCHAR(50),
    "CURRENCY" VARCHAR(3) DEFAULT 'GEL',
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE,
    "NOTES" TEXT
);

-- Spec Seller Invoices (Special Regime)
CREATE TABLE IF NOT EXISTS rs.spec_seller_invoices (
    "ID" TEXT PRIMARY KEY,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "INVOICE_NUMBER" VARCHAR(50),
    "INVOICE_DATE" DATE,
    "INVOICE_AMOUNT" NUMERIC(18, 2),
    "BUYER_TIN" VARCHAR(50),
    "BUYER_NAME" VARCHAR(255),
    "STATUS" VARCHAR(50),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Spec Buyer Invoices (Special Regime)
CREATE TABLE IF NOT EXISTS rs.spec_buyer_invoices (
    "ID" TEXT PRIMARY KEY,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "INVOICE_NUMBER" VARCHAR(50),
    "INVOICE_DATE" DATE,
    "INVOICE_AMOUNT" NUMERIC(18, 2),
    "SELLER_TIN" VARCHAR(50),
    "SELLER_NAME" VARCHAR(255),
    "STATUS" VARCHAR(50),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Sellers Waybills
CREATE TABLE IF NOT EXISTS rs.sellers_waybills (
    "ID" TEXT PRIMARY KEY,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "WAYBILL_NUMBER" VARCHAR(50),
    "WAYBILL_DATE" DATE,
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "BUYER_TIN" VARCHAR(50),
    "BUYER_NAME" VARCHAR(255),
    "STATUS" VARCHAR(50),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Buyers Waybills
CREATE TABLE IF NOT EXISTS rs.buyers_waybills (
    "ID" TEXT PRIMARY KEY,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "WAYBILL_NUMBER" VARCHAR(50),
    "WAYBILL_DATE" DATE,
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "SELLER_TIN" VARCHAR(50),
    "SELLER_NAME" VARCHAR(255),
    "STATUS" VARCHAR(50),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Sellers Waybill Goods (Line Items)
CREATE TABLE IF NOT EXISTS rs.sellers_waybill_goods (
    "ID" TEXT PRIMARY KEY,
    "WAYBILL_ID" TEXT NOT NULL,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "GOODS_DESCRIPTION" VARCHAR(500),
    "QUANTITY" NUMERIC(18, 2),
    "UNIT_PRICE" NUMERIC(18, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Buyers Waybill Goods (Line Items)
CREATE TABLE IF NOT EXISTS rs.buyers_waybill_goods (
    "ID" TEXT PRIMARY KEY,
    "WAYBILL_ID" TEXT NOT NULL,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "GOODS_DESCRIPTION" VARCHAR(500),
    "QUANTITY" NUMERIC(18, 2),
    "UNIT_PRICE" NUMERIC(18, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Sellers Invoice Goods (Line Items)
CREATE TABLE IF NOT EXISTS rs.sellers_invoice_goods (
    "ID" TEXT PRIMARY KEY,
    "INVOICE_ID" TEXT NOT NULL,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "GOODS_DESCRIPTION" VARCHAR(500),
    "QUANTITY" NUMERIC(18, 2),
    "UNIT_PRICE" NUMERIC(18, 2),
    "VAT_RATE" NUMERIC(5, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Buyers Invoice Goods (Line Items)
CREATE TABLE IF NOT EXISTS rs.buyers_invoice_goods (
    "ID" TEXT PRIMARY KEY,
    "INVOICE_ID" TEXT NOT NULL,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "GOODS_DESCRIPTION" VARCHAR(500),
    "QUANTITY" NUMERIC(18, 2),
    "UNIT_PRICE" NUMERIC(18, 2),
    "VAT_RATE" NUMERIC(5, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Spec Invoice Goods (Line Items for Special Regime)
CREATE TABLE IF NOT EXISTS rs.spec_invoice_goods (
    "ID" TEXT PRIMARY KEY,
    "INVOICE_ID" TEXT NOT NULL,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "GOODS_DESCRIPTION" VARCHAR(500),
    "QUANTITY" NUMERIC(18, 2),
    "UNIT_PRICE" NUMERIC(18, 2),
    "TOTAL_AMOUNT" NUMERIC(18, 2),
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Waybill Invoices (Linking Table)
CREATE TABLE IF NOT EXISTS rs.waybill_invoices (
    "ID" TEXT PRIMARY KEY,
    "WAYBILL_ID" TEXT NOT NULL,
    "INVOICE_ID" TEXT NOT NULL,
    "COMPANY_TIN" VARCHAR(50) NOT NULL,
    "CREATED_AT" TIMESTAMP WITH TIME ZONE,
    "UPDATED_AT" TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on RS tables
ALTER TABLE rs.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.seller_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.buyer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.spec_seller_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.spec_buyer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.sellers_waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.buyers_waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.sellers_waybill_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.buyers_waybill_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.sellers_invoice_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.buyers_invoice_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.spec_invoice_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.waybill_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credentials table (user-specific access)
CREATE POLICY "Users can view their own RS credentials" ON rs.credentials
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own RS credentials" ON rs.credentials
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own RS credentials" ON rs.credentials
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for RS data tables (COMPANY_TIN based filtering)
-- Policy: Users can view RS data for companies they have access to
CREATE POLICY "Users can view RS seller invoices for their companies" ON rs.seller_invoices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.clients
            WHERE clients.code = rs.seller_invoices."COMPANY_TIN"
                AND EXISTS (
                    SELECT 1 FROM public.user_companies uc
                    WHERE uc.client_id = clients.id
                        AND uc.user_id = auth.uid()
                        AND uc.is_active = true
                )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.global_role = 'admin'
        )
    );

CREATE POLICY "Users can view RS buyer invoices for their companies" ON rs.buyer_invoices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.clients
            WHERE clients.code = rs.buyer_invoices."COMPANY_TIN"
                AND EXISTS (
                    SELECT 1 FROM public.user_companies uc
                    WHERE uc.client_id = clients.id
                        AND uc.user_id = auth.uid()
                        AND uc.is_active = true
                )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.global_role = 'admin'
        )
    );

-- Create indexes for performance
CREATE INDEX idx_rs_seller_invoices_company_tin ON rs.seller_invoices("COMPANY_TIN");
CREATE INDEX idx_rs_buyer_invoices_company_tin ON rs.buyer_invoices("COMPANY_TIN");
CREATE INDEX idx_rs_spec_seller_invoices_company_tin ON rs.spec_seller_invoices("COMPANY_TIN");
CREATE INDEX idx_rs_spec_buyer_invoices_company_tin ON rs.spec_buyer_invoices("COMPANY_TIN");
CREATE INDEX idx_rs_sellers_waybills_company_tin ON rs.sellers_waybills("COMPANY_TIN");
CREATE INDEX idx_rs_buyers_waybills_company_tin ON rs.buyers_waybills("COMPANY_TIN");
CREATE INDEX idx_rs_sellers_waybill_goods_company_tin ON rs.sellers_waybill_goods("COMPANY_TIN");
CREATE INDEX idx_rs_buyers_waybill_goods_company_tin ON rs.buyers_waybill_goods("COMPANY_TIN");
CREATE INDEX idx_rs_sellers_invoice_goods_company_tin ON rs.sellers_invoice_goods("COMPANY_TIN");
CREATE INDEX idx_rs_buyers_invoice_goods_company_tin ON rs.buyers_invoice_goods("COMPANY_TIN");
CREATE INDEX idx_rs_spec_invoice_goods_company_tin ON rs.spec_invoice_goods("COMPANY_TIN");
CREATE INDEX idx_rs_waybill_invoices_company_tin ON rs.waybill_invoices("COMPANY_TIN");
CREATE INDEX idx_rs_credentials_user_id ON rs.credentials(user_id);
CREATE INDEX idx_rs_credentials_client_id ON rs.credentials(client_id);
