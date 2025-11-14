-- =====================================================
-- Client Management (CRM) Module Migration
-- Schema: crm
-- Description: Client documents, service packages, team assignments, onboarding
-- =====================================================

-- UP
-- Create CRM schema and tables

CREATE SCHEMA IF NOT EXISTS crm;

-- =====================================================
-- Client Documents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS crm.client_documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Tax', 'Payroll', 'Accounting', 'Legal', 'Other')),
    file_data BYTEA, -- PostgreSQL bytea for file storage (nullable until uploaded)
    file_type VARCHAR(100), -- MIME type (e.g., 'application/pdf', 'image/png')
    file_size INTEGER DEFAULT 0, -- Size in bytes (default 0 until file is uploaded)
    version INTEGER DEFAULT 1,
    expiration_date DATE,
    uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON crm.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_category ON crm.client_documents(category);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiration_date ON crm.client_documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON crm.client_documents(uploaded_by);

COMMENT ON TABLE crm.client_documents IS 'Secure document vault for client files';
COMMENT ON COLUMN crm.client_documents.file_data IS 'Binary file data stored as bytea';
COMMENT ON COLUMN crm.client_documents.category IS 'Document category: Tax, Payroll, Accounting, Legal, Other';

-- =====================================================
-- Client Service Packages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS crm.client_service_packages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    package_name VARCHAR(255) NOT NULL,
    services JSONB NOT NULL, -- Array of service names/descriptions
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_service_packages_client_id ON crm.client_service_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_service_packages_is_active ON crm.client_service_packages(is_active);

COMMENT ON TABLE crm.client_service_packages IS 'Service packages assigned to clients';
COMMENT ON COLUMN crm.client_service_packages.services IS 'JSON array of service names and descriptions';

-- =====================================================
-- Client Team Assignments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS crm.client_team_assignments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Client Owner', 'Accountant', 'Reviewer', 'Assistant')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE(client_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_client_team_assignments_client_id ON crm.client_team_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_user_id ON crm.client_team_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_role ON crm.client_team_assignments(role);

COMMENT ON TABLE crm.client_team_assignments IS 'Team member assignments per client with roles';
COMMENT ON COLUMN crm.client_team_assignments.role IS 'Role: Client Owner, Accountant, Reviewer, Assistant';

-- =====================================================
-- Client Onboarding Forms Table
-- =====================================================
CREATE TABLE IF NOT EXISTS crm.client_onboarding_forms (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    form_type VARCHAR(100) NOT NULL, -- e.g., 'intake', 'tax_questionnaire', 'payroll_setup'
    form_data JSONB NOT NULL, -- Form field values
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_client_id ON crm.client_onboarding_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_form_type ON crm.client_onboarding_forms(form_type);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_status ON crm.client_onboarding_forms(status);

COMMENT ON TABLE crm.client_onboarding_forms IS 'Onboarding forms for clients';
COMMENT ON COLUMN crm.client_onboarding_forms.form_data IS 'JSON object containing form field values';

-- =====================================================
-- Client Onboarding Steps Table
-- =====================================================
CREATE TABLE IF NOT EXISTS crm.client_onboarding_steps (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- e.g., 'document_upload', 'form_completion', 'meeting'
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    metadata JSONB, -- Additional step-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_client_id ON crm.client_onboarding_steps(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_step_type ON crm.client_onboarding_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_is_completed ON crm.client_onboarding_steps(is_completed);

COMMENT ON TABLE crm.client_onboarding_steps IS 'Onboarding workflow steps for clients';
COMMENT ON COLUMN crm.client_onboarding_steps.metadata IS 'JSON object for step-specific data';

-- =====================================================
-- Client Checklists Table
-- =====================================================
CREATE TABLE IF NOT EXISTS crm.client_checklists (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES tasks.checklist_templates(id) ON DELETE SET NULL,
    items JSONB NOT NULL, -- Checklist items with completion status
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_checklists_client_id ON crm.client_checklists(client_id);
CREATE INDEX IF NOT EXISTS idx_client_checklists_template_id ON crm.client_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_client_checklists_status ON crm.client_checklists(status);

COMMENT ON TABLE crm.client_checklists IS 'Client-specific checklists (can be from template or custom)';
COMMENT ON COLUMN crm.client_checklists.items IS 'JSON array: [{title, description, done: boolean, completedAt: timestamp}]';

-- =====================================================
-- Trigger Functions
-- =====================================================
CREATE OR REPLACE FUNCTION crm.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER client_documents_updated_at BEFORE UPDATE ON crm.client_documents
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

CREATE TRIGGER client_service_packages_updated_at BEFORE UPDATE ON crm.client_service_packages
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

CREATE TRIGGER client_onboarding_forms_updated_at BEFORE UPDATE ON crm.client_onboarding_forms
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

CREATE TRIGGER client_onboarding_steps_updated_at BEFORE UPDATE ON crm.client_onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

CREATE TRIGGER client_checklists_updated_at BEFORE UPDATE ON crm.client_checklists
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

-- DOWN
-- Drop CRM module schema and tables

DROP TRIGGER IF EXISTS client_checklists_updated_at ON crm.client_checklists;
DROP TRIGGER IF EXISTS client_onboarding_steps_updated_at ON crm.client_onboarding_steps;
DROP TRIGGER IF EXISTS client_onboarding_forms_updated_at ON crm.client_onboarding_forms;
DROP TRIGGER IF EXISTS client_service_packages_updated_at ON crm.client_service_packages;
DROP TRIGGER IF EXISTS client_documents_updated_at ON crm.client_documents;

DROP FUNCTION IF EXISTS crm.update_crm_updated_at();

DROP SCHEMA IF EXISTS crm CASCADE;

