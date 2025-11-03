-- SIMPLE FIX: Convert routine_logs.id from UUID to INTEGER
-- No ai_reports table dependency

DO $$
DECLARE
    current_type text;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'routine_logs' AND column_name = 'id';
    
    RAISE NOTICE 'Current routine_logs.id type: %', current_type;
    
    IF current_type = 'uuid' THEN
        RAISE NOTICE '⚠️ CONVERSION NEEDED: UUID → INTEGER';
        
        -- Add new integer column
        RAISE NOTICE 'Adding new integer column...';
        ALTER TABLE routine_logs ADD COLUMN id_new SERIAL;
        
        -- Copy existing data with sequential IDs
        RAISE NOTICE 'Converting existing data...';
        WITH numbered_logs AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_id
            FROM routine_logs
        )
        UPDATE routine_logs 
        SET id_new = numbered_logs.new_id
        FROM numbered_logs
        WHERE routine_logs.id = numbered_logs.id;
        
        -- Drop old UUID column
        RAISE NOTICE 'Dropping old UUID column...';
        ALTER TABLE routine_logs DROP COLUMN id CASCADE;
        
        -- Rename new column to id
        RAISE NOTICE 'Renaming column...';
        ALTER TABLE routine_logs RENAME COLUMN id_new TO id;
        
        -- Set as primary key
        RAISE NOTICE 'Setting primary key...';
        ALTER TABLE routine_logs ADD PRIMARY KEY (id);
        
        -- Reset sequence
        RAISE NOTICE 'Resetting sequence...';
        SELECT setval('routine_logs_id_seq', COALESCE((SELECT MAX(id) FROM routine_logs), 0) + 1, false);
        
        RAISE NOTICE '✅ CONVERSION COMPLETE! routine_logs.id is now INTEGER';
    ELSE
        RAISE NOTICE '✅ NO CONVERSION NEEDED - already %', current_type;
    END IF;
END $$;

-- Verify the fix
SELECT 
    'routine_logs.id' as column_name,
    data_type,
    CASE 
        WHEN data_type = 'integer' THEN '✅ CORRECT'
        ELSE '❌ WRONG - Should be integer'
    END as status
FROM information_schema.columns 
WHERE table_name = 'routine_logs' AND column_name = 'id';

-- Show records to verify
SELECT id, user_id, log_date, created_at 
FROM routine_logs 
ORDER BY id DESC 
LIMIT 5;

