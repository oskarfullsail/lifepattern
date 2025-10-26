-- Fix routine_logs id type mismatch
-- The production database has UUID for id, but our code expects SERIAL
-- This migration detects and fixes the discrepancy

-- Check if id is UUID type and convert to SERIAL if needed
DO $$
BEGIN
    -- Check current data type of id column
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'routine_logs'
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        RAISE NOTICE 'Converting routine_logs.id from UUID to INTEGER...';
        
        -- Drop foreign key constraints first
        ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_routine_log_id_fkey;
        
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
        
        -- Restore foreign key constraint
        ALTER TABLE ai_reports 
        ADD CONSTRAINT ai_reports_routine_log_id_fkey 
        FOREIGN KEY (routine_log_id) REFERENCES routine_logs(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Successfully converted routine_logs.id to INTEGER';
    ELSE
        RAISE NOTICE 'routine_logs.id is already INTEGER type, no conversion needed';
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

