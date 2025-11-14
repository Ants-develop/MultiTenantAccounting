-- =====================================================
-- Migration 010: Client Management (CRM) Module
-- =====================================================
-- This migration creates tables for client management features:
-- - Client documents vault
-- - Service packages
-- - Team assignments
-- - Onboarding forms and steps

-- UP
-- =====================================================
-- Table 1: client_documents
-- Secure document vault per client
-- =====================================================
CREATE TABLE IF NOT EXISTS client_documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Tax', 'Payroll', 'Accounting', 'Legal', 'Other')),
    file_data BYTEA, -- PostgreSQL bytea for file storage (nullable until uploaded)
    file_type VARCHAR(100), -- MIME type (e.g., 'application/pdf', 'image/png')
    file_size INTEGER DEFAULT 0, -- Size in bytes (default 0 until file is uploaded)
    version INTEGER DEFAULT 1,
    expiration_date DATE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_category ON client_documents(category);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiration_date ON client_documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON client_documents(uploaded_by);

COMMENT ON TABLE client_documents IS 'Secure document vault for client files';
COMMENT ON COLUMN client_documents.file_data IS 'Binary file data stored as bytea';
COMMENT ON COLUMN client_documents.category IS 'Document category: Tax, Payroll, Accounting, Legal, Other';

-- =====================================================
-- Table 2: client_service_packages
-- Service packages assigned to clients
-- =====================================================
CREATE TABLE IF NOT EXISTS client_service_packages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_name VARCHAR(255) NOT NULL,
    services JSONB NOT NULL, -- Array of service names/descriptions
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_service_packages_client_id ON client_service_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_service_packages_is_active ON client_service_packages(is_active);

COMMENT ON TABLE client_service_packages IS 'Service packages assigned to clients';
COMMENT ON COLUMN client_service_packages.services IS 'JSON array of service names and descriptions';

-- =====================================================
-- Table 3: client_team_assignments
-- Team member assignments per client
-- =====================================================
CREATE TABLE IF NOT EXISTS client_team_assignments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Client Owner', 'Accountant', 'Reviewer', 'Assistant')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(client_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_client_team_assignments_client_id ON client_team_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_user_id ON client_team_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_role ON client_team_assignments(role);

COMMENT ON TABLE client_team_assignments IS 'Team member assignments per client with roles';
COMMENT ON COLUMN client_team_assignments.role IS 'Role: Client Owner, Accountant, Reviewer, Assistant';

-- =====================================================
-- Table 4: client_onboarding_forms
-- Onboarding forms for clients
-- =====================================================
CREATE TABLE IF NOT EXISTS client_onboarding_forms (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    form_type VARCHAR(100) NOT NULL, -- e.g., 'intake', 'tax_questionnaire', 'payroll_setup'
    form_data JSONB NOT NULL, -- Form field values
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_client_id ON client_onboarding_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_form_type ON client_onboarding_forms(form_type);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_status ON client_onboarding_forms(status);

COMMENT ON TABLE client_onboarding_forms IS 'Onboarding forms for clients';
COMMENT ON COLUMN client_onboarding_forms.form_data IS 'JSON object containing form field values';

-- =====================================================
-- Table 5: client_onboarding_steps
-- Onboarding workflow steps
-- =====================================================
CREATE TABLE IF NOT EXISTS client_onboarding_steps (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- e.g., 'document_upload', 'form_completion', 'meeting'
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    metadata JSONB, -- Additional step-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_client_id ON client_onboarding_steps(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_step_type ON client_onboarding_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_is_completed ON client_onboarding_steps(is_completed);

COMMENT ON TABLE client_onboarding_steps IS 'Onboarding workflow steps for clients';
COMMENT ON COLUMN client_onboarding_steps.metadata IS 'JSON object for step-specific data';

-- =====================================================
-- Create trigger function for auto-updating updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_client_management_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER client_documents_updated_at BEFORE UPDATE ON client_documents
    FOR EACH ROW EXECUTE FUNCTION update_client_management_updated_at();

CREATE TRIGGER client_service_packages_updated_at BEFORE UPDATE ON client_service_packages
    FOR EACH ROW EXECUTE FUNCTION update_client_management_updated_at();

CREATE TRIGGER client_onboarding_forms_updated_at BEFORE UPDATE ON client_onboarding_forms
    FOR EACH ROW EXECUTE FUNCTION update_client_management_updated_at();

CREATE TRIGGER client_onboarding_steps_updated_at BEFORE UPDATE ON client_onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION update_client_management_updated_at();

-- DOWN
-- =====================================================
-- Drop triggers first
-- =====================================================
DROP TRIGGER IF EXISTS client_onboarding_steps_updated_at ON client_onboarding_steps;
DROP TRIGGER IF EXISTS client_onboarding_forms_updated_at ON client_onboarding_forms;
DROP TRIGGER IF EXISTS client_service_packages_updated_at ON client_service_packages;
DROP TRIGGER IF EXISTS client_documents_updated_at ON client_documents;

DROP FUNCTION IF EXISTS update_client_management_updated_at();

-- =====================================================
-- Drop tables in reverse order
-- =====================================================
DROP TABLE IF EXISTS client_onboarding_steps;
DROP TABLE IF EXISTS client_onboarding_forms;
DROP TABLE IF EXISTS client_team_assignments;
DROP TABLE IF EXISTS client_service_packages;
DROP TABLE IF EXISTS client_documents;

