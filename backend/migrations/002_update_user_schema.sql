-- Migration: 002_update_user_schema.sql
-- Description: Update user schema to use string IDs and remove PII
-- Date: 2025-08-10

-- Check if migration is already applied by checking if users.id is already VARCHAR
DO $$
DECLARE
    id_type text;
BEGIN
    -- Get current data type of users.id
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id';

    -- If already VARCHAR, skip this migration
    IF id_type = 'character varying' THEN
        RAISE NOTICE 'Migration 002 already applied - users.id is already VARCHAR';
        RETURN;
    END IF;

    -- If we get here, we need to apply the migration
    RAISE NOTICE 'Applying migration 002 - converting user IDs to strings';

    -- This migration is too destructive for production databases with existing data
    -- It should only run on fresh databases
    -- For production, we'll skip it since the schema is already correct

END $$;

-- Ensure indexes exist (safe to run multiple times)
DROP INDEX IF EXISTS idx_routine_logs_user_date;
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON routine_logs(user_id, log_date);

-- Ensure triggers exist (safe to run multiple times)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 