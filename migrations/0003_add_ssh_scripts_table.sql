-- UP
CREATE TABLE IF NOT EXISTS "ssh_scripts" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "command" text NOT NULL,
  "category" text DEFAULT 'custom',
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ssh_scripts_category" ON "ssh_scripts" ("category");
CREATE INDEX IF NOT EXISTS "idx_ssh_scripts_created_by" ON "ssh_scripts" ("created_by");

-- DOWN
DROP TABLE IF EXISTS "ssh_scripts";

