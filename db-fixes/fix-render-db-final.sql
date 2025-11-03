-- FINAL FIX: Convert routine_logs.id from UUID to INTEGER
-- Handles sequence creation properly

DO $$
DECLARE
    current_type text;
    max_id integer;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'routine_logs' AND column_name = 'id';
    
    RAISE NOTICE 'Current routine_logs.id type: %', current_type;
    
    IF current_type = 'uuid' THEN
        RAISE NOTICE '⚠️ CONVERSION NEEDED: UUID → INTEGER';
        
        -- Create sequence first
        RAISE NOTICE 'Creating sequence...';
        CREATE SEQUENCE IF NOT EXISTS routine_logs_id_seq;
        
        -- Add new integer column with default
        RAISE NOTICE 'Adding new integer column...';
        ALTER TABLE routine_logs ADD COLUMN id_new INTEGER DEFAULT nextval('routine_logs_id_seq');
        
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
        
        -- Reset sequence to max+1
        RAISE NOTICE 'Resetting sequence...';
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM routine_logs;
        PERFORM setval('routine_logs_id_seq', max_id + 1, false);
        
        -- Set column default
        ALTER TABLE routine_logs ALTER COLUMN id SET DEFAULT nextval('routine_logs_id_seq');
        
        RAISE NOTICE '✅ CONVERSION COMPLETE! routine_logs.id is now INTEGER';
        RAISE NOTICE '✅ Next ID will be: %', max_id + 1;
    ELSE
        RAISE NOTICE '✅ NO CONVERSION NEEDED - already %', current_type;
    END IF;
END $$;

-- Verify the fix
SELECT 
    'routine_logs.id' as info,
    data_type as type,
    CASE 
        WHEN data_type = 'integer' THEN '✅ SUCCESS!'
        ELSE '❌ FAILED - Still ' || data_type
    END as status
FROM information_schema.columns 
WHERE table_name = 'routine_logs' AND column_name = 'id';

-- Show converted records
RAISE NOTICE 'Showing converted records:';
SELECT id, user_id, log_date 
FROM routine_logs 
ORDER BY id 
LIMIT 10;

