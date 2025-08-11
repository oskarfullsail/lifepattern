-- Migration: 002_update_user_schema.sql
-- Description: Update user schema to use string IDs and remove PII
-- Date: 2025-08-10

-- First, drop existing foreign key constraints
ALTER TABLE routine_logs DROP CONSTRAINT IF EXISTS routine_logs_user_id_fkey;

-- Update users table
-- Drop the existing users table and recreate it
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with new schema
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update routine_logs table to use string user_id
ALTER TABLE routine_logs ALTER COLUMN user_id TYPE VARCHAR(255);

-- Recreate foreign key constraint
ALTER TABLE routine_logs ADD CONSTRAINT routine_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Insert test user with new schema
INSERT INTO users (id, username, device_id) VALUES 
    ('test_user_123', 'testuser', 'device_123')
ON CONFLICT (username) DO NOTHING;

-- Update indexes
DROP INDEX IF EXISTS idx_routine_logs_user_date;
CREATE INDEX idx_routine_logs_user_date ON routine_logs(user_id, log_date);

-- Update triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 