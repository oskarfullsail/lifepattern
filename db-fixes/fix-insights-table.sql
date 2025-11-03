-- FIX INSIGHTS TABLE TO MATCH ROUTINE_LOGS
-- This fixes the type mismatch between insights.log_id and routine_logs.id

DO $$
DECLARE
    insights_log_id_type text;
    routine_logs_id_type text;
BEGIN
    -- Check current types
    SELECT data_type INTO insights_log_id_type
    FROM information_schema.columns
    WHERE table_name = 'insights' AND column_name = 'log_id';
    
    SELECT data_type INTO routine_logs_id_type
    FROM information_schema.columns
    WHERE table_name = 'routine_logs' AND column_name = 'id';
    
    RAISE NOTICE 'insights.log_id type: %', insights_log_id_type;
    RAISE NOTICE 'routine_logs.id type: %', routine_logs_id_type;
    
    -- If types don't match, fix insights table
    IF insights_log_id_type != routine_logs_id_type THEN
        RAISE NOTICE 'TYPE MISMATCH - Fixing insights.log_id...';
        
        -- Drop existing foreign key constraint
        ALTER TABLE insights DROP CONSTRAINT IF EXISTS insights_log_id_fkey CASCADE;
        
        -- Convert log_id to INTEGER
        ALTER TABLE insights ALTER COLUMN log_id TYPE INTEGER USING log_id::text::integer;
        
        -- Restore foreign key constraint
        ALTER TABLE insights 
        ADD CONSTRAINT insights_log_id_fkey 
        FOREIGN KEY (log_id) REFERENCES routine_logs(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ FIXED: insights.log_id is now INTEGER with proper foreign key';
    ELSE
        RAISE NOTICE '✅ NO FIX NEEDED: Types already match';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE 'Manual intervention may be required';
END $$;

-- Verify the fix
SELECT 
    'insights.log_id' as column_name,
    data_type,
    CASE 
        WHEN data_type = 'integer' THEN '✅ CORRECT'
        ELSE '❌ WRONG TYPE: ' || data_type
    END as status
FROM information_schema.columns 
WHERE table_name = 'insights' AND column_name = 'log_id';

-- Show insights records
SELECT log_id, user_id, created_at 
FROM insights 
ORDER BY log_id 
LIMIT 5;

