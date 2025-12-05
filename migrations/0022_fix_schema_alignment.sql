-- =====================================================
-- Fix Schema Alignment
-- Migration: 0022_fix_schema_alignment.sql
-- Description: Move tables from public schema to correct schemas
-- =====================================================

-- Ensure tasks schema exists
CREATE SCHEMA IF NOT EXISTS tasks;

-- Move tables from public schema to tasks schema
DO $$
BEGIN
    -- Move jobs table if it exists in public schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'jobs'
    ) THEN
        ALTER TABLE public.jobs SET SCHEMA tasks;
        RAISE NOTICE 'Moved jobs table from public to tasks schema';
    END IF;
    
    -- Move pipelines table if it exists in public schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'pipelines'
    ) THEN
        ALTER TABLE public.pipelines SET SCHEMA tasks;
        RAISE NOTICE 'Moved pipelines table from public to tasks schema';
    END IF;
    
    -- Move tasks table if it exists in public schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks SET SCHEMA tasks;
        RAISE NOTICE 'Moved tasks table from public to tasks schema';
    END IF;
    
    -- Move workspaces table if it exists in public schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'workspaces'
    ) THEN
        ALTER TABLE public.workspaces SET SCHEMA tasks;
        RAISE NOTICE 'Moved workspaces table from public to tasks schema';
    END IF;
END $$;

-- DOWN: Move tables back to public schema
DO $$
BEGIN
    -- Move jobs table back if it exists in tasks schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'jobs'
    ) THEN
        ALTER TABLE tasks.jobs SET SCHEMA public;
        RAISE NOTICE 'Moved jobs table back to public schema';
    END IF;
    
    -- Move pipelines table back if it exists in tasks schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'pipelines'
    ) THEN
        ALTER TABLE tasks.pipelines SET SCHEMA public;
        RAISE NOTICE 'Moved pipelines table back to public schema';
    END IF;
    
    -- Move tasks table back if it exists in tasks schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks.tasks SET SCHEMA public;
        RAISE NOTICE 'Moved tasks table back to public schema';
    END IF;
    
    -- Move workspaces table back if it exists in tasks schema
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'tasks' AND table_name = 'workspaces'
    ) THEN
        ALTER TABLE tasks.workspaces SET SCHEMA public;
        RAISE NOTICE 'Moved workspaces table back to public schema';
    END IF;
END $$;

