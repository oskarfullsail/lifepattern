-- Migration: 006_fix_refresh_hash_issue.sql
-- Description: Fix refresh_hash column issue in sessions table
-- Date: 2025-08-18

-- First, let's ensure the sessions table exists with the correct structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cred_id UUID REFERENCES credentials(id) ON DELETE SET NULL,
    refresh_hash VARCHAR(255) NOT NULL, -- Hashed refresh token
    device_label VARCHAR(100),
    ip_fingerprint VARCHAR(64), -- Hashed IP address
    user_agent_hash VARCHAR(64), -- Hashed user agent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    
    UNIQUE(refresh_hash)
);

-- Add the refresh_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'refresh_hash'
    ) THEN
        ALTER TABLE sessions ADD COLUMN refresh_hash VARCHAR(255) NOT NULL DEFAULT '';
        -- Update existing rows to have a unique refresh_hash
        UPDATE sessions SET refresh_hash = gen_random_uuid()::text WHERE refresh_hash = '';
        -- Add unique constraint
        ALTER TABLE sessions ADD CONSTRAINT sessions_refresh_hash_unique UNIQUE (refresh_hash);
    END IF;
END $$;

-- Ensure the index exists
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Ensure the ai_reports table has the enhanced fields
DO $$
BEGIN
    -- Add enhanced_recommendations column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_reports' AND column_name = 'enhanced_recommendations'
    ) THEN
        ALTER TABLE ai_reports ADD COLUMN enhanced_recommendations JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add behavioral_contexts column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_reports' AND column_name = 'behavioral_contexts'
    ) THEN
        ALTER TABLE ai_reports ADD COLUMN behavioral_contexts TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for enhanced AI fields if they don't exist
CREATE INDEX IF NOT EXISTS idx_ai_reports_enhanced_recommendations ON ai_reports USING GIN (enhanced_recommendations);
CREATE INDEX IF NOT EXISTS idx_ai_reports_behavioral_contexts ON ai_reports USING GIN (behavioral_contexts);

-- Add comment
COMMENT ON TABLE sessions IS 'Stores user sessions and refresh tokens for authentication';
COMMENT ON COLUMN sessions.refresh_hash IS 'Hashed refresh token for session management'; 