-- Change resource_id to TEXT to support both integer IDs and UUIDs
ALTER TABLE "activity_logs" ALTER COLUMN "resource_id" TYPE text;
