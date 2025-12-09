-- UP
ALTER TABLE IF EXISTS "connections" 
  ADD COLUMN IF NOT EXISTS "private_key" text;

CREATE INDEX IF NOT EXISTS "idx_connections_type" ON "connections" ("type");

CREATE INDEX IF NOT EXISTS "idx_connections_id_type" ON "connections" ("id", "type");

-- DOWN
DROP INDEX IF EXISTS "idx_connections_id_type";
DROP INDEX IF EXISTS "idx_connections_type";


