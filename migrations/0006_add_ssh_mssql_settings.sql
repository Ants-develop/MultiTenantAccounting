-- Add SSH and MSSQL connection configuration to main_company_settings
ALTER TABLE main_company_settings ADD COLUMN ssh_host TEXT;
ALTER TABLE main_company_settings ADD COLUMN ssh_port INTEGER DEFAULT 22;
ALTER TABLE main_company_settings ADD COLUMN ssh_user TEXT;
ALTER TABLE main_company_settings ADD COLUMN ssh_key_path TEXT;
ALTER TABLE main_company_settings ADD COLUMN ssh_key_content TEXT;

ALTER TABLE main_company_settings ADD COLUMN mssql_server TEXT;
ALTER TABLE main_company_settings ADD COLUMN mssql_port INTEGER DEFAULT 1433;
ALTER TABLE main_company_settings ADD COLUMN mssql_user TEXT;
ALTER TABLE main_company_settings ADD COLUMN mssql_password TEXT;
ALTER TABLE main_company_settings ADD COLUMN mssql_database TEXT;
ALTER TABLE main_company_settings ADD COLUMN mssql_encrypt BOOLEAN DEFAULT true;
ALTER TABLE main_company_settings ADD COLUMN mssql_trust_server_cert BOOLEAN DEFAULT false;
