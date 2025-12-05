-- =====================================================
-- Fix Schema Alignment - IDEMPOTENT
-- Migration: 0022_fix_schema_alignment.sql
-- Description: Ensure tables from public schema are in correct schemas (idempotent)
-- =====================================================

-- Ensure tasks schema exists
CREATE SCHEMA IF NOT EXISTS tasks;

-- Check schema alignment and move tables if needed (idempotent)
DO $$
BEGIN
    -- Check if jobs exists in public but not in tasks, then move it
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'jobs'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'jobs'
    ) THEN
        ALTER TABLE public.jobs SET SCHEMA tasks;
        RAISE NOTICE 'Moved jobs table from public to tasks schema';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'jobs'
    ) THEN
        RAISE NOTICE 'jobs table already in tasks schema';
    END IF;
    
    -- Check if pipelines exists in public but not in tasks, then move it
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'pipelines'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'pipelines'
    ) THEN
        ALTER TABLE public.pipelines SET SCHEMA tasks;
        RAISE NOTICE 'Moved pipelines table from public to tasks schema';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'pipelines'
    ) THEN
        RAISE NOTICE 'pipelines table already in tasks schema';
    END IF;
    
    -- Check if tasks exists in public but not in tasks schema, then move it
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks SET SCHEMA tasks;
        RAISE NOTICE 'Moved tasks table from public to tasks schema';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'tasks'
    ) THEN
        RAISE NOTICE 'tasks table already in tasks schema';
    END IF;
    
    -- Check if workspaces exists in public but not in tasks, then move it
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'workspaces'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'workspaces'
    ) THEN
        ALTER TABLE public.workspaces SET SCHEMA tasks;
        RAISE NOTICE 'Moved workspaces table from public to tasks schema';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'workspaces'
    ) THEN
        RAISE NOTICE 'workspaces table already in tasks schema';
    END IF;
END $$;

-- DOWN section - uses raw SQL (not a DO block, since migrations use split on --)
-- This is a no-op since we don''t want to move tables back in a rollback
-- The schema alignment is considered permanent

