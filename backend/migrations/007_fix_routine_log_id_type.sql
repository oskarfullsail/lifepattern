-- Fix routine_logs id type mismatch AND insights table compatibility
-- The production database has UUID for id, but our code expects SERIAL
-- This migration detects and fixes the discrepancy

-- STEP 1: Fix insights.log_id type to match routine_logs.id
DO $$
DECLARE
    insights_log_id_type text;
    routine_logs_id_type text;
BEGIN
    -- Check if insights table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
        -- Get current types
        SELECT data_type INTO insights_log_id_type
        FROM information_schema.columns
        WHERE table_name = 'insights' AND column_name = 'log_id';
        
        SELECT data_type INTO routine_logs_id_type
        FROM information_schema.columns
        WHERE table_name = 'routine_logs' AND column_name = 'id';
        
        RAISE NOTICE 'insights.log_id type: %, routine_logs.id type: %', insights_log_id_type, routine_logs_id_type;
        
        -- If insights.log_id is UUID but routine_logs.id is INTEGER, convert insights first
        IF insights_log_id_type = 'uuid' AND routine_logs_id_type = 'integer' THEN
            RAISE NOTICE 'Converting insights.log_id from UUID to INTEGER...';
            ALTER TABLE insights DROP CONSTRAINT IF EXISTS insights_log_id_fkey CASCADE;
            ALTER TABLE insights ALTER COLUMN log_id TYPE INTEGER USING log_id::text::integer;
            RAISE NOTICE 'Converted insights.log_id to INTEGER';
        END IF;
    END IF;
END $$;

-- STEP 2: Check if routine_logs.id is UUID type and convert to SERIAL if needed
DO $$
DECLARE
    current_type text;
BEGIN
    -- Check current data type of id column
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'routine_logs' AND column_name = 'id';
    
    RAISE NOTICE 'Current routine_logs.id type: %', current_type;
    
    IF current_type = 'uuid' THEN
        RAISE NOTICE 'Converting routine_logs.id from UUID to INTEGER...';
        
        -- Drop foreign key constraints from ALL tables that reference routine_logs
        -- Handle both insights and ai_reports tables
        ALTER TABLE insights DROP CONSTRAINT IF EXISTS insights_log_id_fkey CASCADE;
        ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_routine_log_id_fkey CASCADE;
        
        -- Convert id column to integer
        -- First, drop the default UUID generation
        ALTER TABLE routine_logs ALTER COLUMN id DROP DEFAULT;
        
        -- Create a new integer column
        ALTER TABLE routine_logs ADD COLUMN id_new SERIAL;
        
        -- Copy data if table has records (using row_number for sequential IDs)
        UPDATE routine_logs SET id_new = (
            SELECT ROW_NUMBER() OVER (ORDER BY created_at)::integer
            FROM routine_logs r2
            WHERE r2.id = routine_logs.id
        );
        
        -- Drop old id column
        ALTER TABLE routine_logs DROP COLUMN id CASCADE;
        
        -- Rename new column to id
        ALTER TABLE routine_logs RENAME COLUMN id_new TO id;
        
        -- Set as primary key
        ALTER TABLE routine_logs ADD PRIMARY KEY (id);
        
        -- Restore foreign key constraints (if tables exist)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_reports') THEN
            ALTER TABLE ai_reports 
            ADD CONSTRAINT ai_reports_routine_log_id_fkey 
            FOREIGN KEY (routine_log_id) REFERENCES routine_logs(id) ON DELETE CASCADE;
            RAISE NOTICE 'Restored ai_reports foreign key constraint';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
            -- Check if insights.log_id column exists and is integer
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'insights' AND column_name = 'log_id' AND data_type = 'integer'
            ) THEN
                ALTER TABLE insights 
                ADD CONSTRAINT insights_log_id_fkey 
                FOREIGN KEY (log_id) REFERENCES routine_logs(id) ON DELETE CASCADE;
                RAISE NOTICE 'Restored insights foreign key constraint';
            ELSE
                RAISE NOTICE 'Skipping insights foreign key - column type mismatch or does not exist';
            END IF;
        END IF;
        
        RAISE NOTICE 'Successfully converted routine_logs.id to INTEGER';
    ELSIF current_type = 'integer' THEN
        RAISE NOTICE 'routine_logs.id is already INTEGER type, no conversion needed';
    ELSE
        RAISE NOTICE 'routine_logs.id has unexpected type: %, skipping conversion', current_type;
    END IF;
END $$;

-- Ensure the id column is auto-incrementing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.sequences
        WHERE sequence_name = 'routine_logs_id_seq'
    ) THEN
        CREATE SEQUENCE routine_logs_id_seq;
        ALTER TABLE routine_logs ALTER COLUMN id SET DEFAULT nextval('routine_logs_id_seq');
        SELECT setval('routine_logs_id_seq', COALESCE((SELECT MAX(id) FROM routine_logs), 0) + 1, false);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN routine_logs.id IS 'Auto-incrementing integer primary key';

