-- Add SSH and MSSQL connection configuration to main_company_settings
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS ssh_host TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS ssh_user TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS ssh_key_path TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS ssh_key_content TEXT;

ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_server TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_port INTEGER DEFAULT 1433;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_user TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_password TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_database TEXT;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_encrypt BOOLEAN DEFAULT true;
ALTER TABLE main_company_settings ADD COLUMN IF NOT EXISTS mssql_trust_server_cert BOOLEAN DEFAULT false;
