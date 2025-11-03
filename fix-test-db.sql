-- Fix routine_logs.id and insights.log_id types for local test database

DO $$
BEGIN
    -- Step 1: Fix insights.log_id type if insights table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
        -- Drop the log_id column and recreate it as INTEGER
        ALTER TABLE insights DROP COLUMN log_id CASCADE;
        ALTER TABLE insights ADD COLUMN log_id INTEGER;
        RAISE NOTICE 'Converted insights.log_id to INTEGER';
    END IF;
    
    -- Step 2: Fix routine_logs.id type
    ALTER TABLE routine_logs DROP COLUMN id CASCADE;
    ALTER TABLE routine_logs ADD COLUMN id SERIAL PRIMARY KEY;
    
    -- Update the sequence to start from a safe number
    PERFORM setval('routine_logs_id_seq', 1, false);
    
    RAISE NOTICE 'Successfully converted routine_logs.id to SERIAL';
END $$;

-- Step 3: Restore foreign key for insights table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
        ALTER TABLE insights 
        ADD CONSTRAINT insights_log_id_fkey 
        FOREIGN KEY (log_id) REFERENCES routine_logs(id) ON DELETE CASCADE;
        RAISE NOTICE 'Restored insights foreign key';
    END IF;
END $$;

COMMENT ON COLUMN routine_logs.id IS 'Auto-incrementing integer primary key';
