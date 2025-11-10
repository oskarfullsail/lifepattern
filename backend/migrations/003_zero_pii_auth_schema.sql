-- Migration: 003_zero_pii_auth_schema.sql
-- Description: Implement zero-PII authentication with WebAuthn support
-- Date: 2025-08-10
-- FIXED: Made idempotent and safe for existing databases

-- Check if migration is already applied by checking if credentials table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credentials') THEN
        RAISE NOTICE 'Migration 003 already applied - credentials table exists';
        RETURN;
    END IF;

    RAISE NOTICE 'Migration 003: This migration was designed to drop all tables';
    RAISE NOTICE 'Skipping for production database safety';
    RAISE NOTICE 'Tables already exist with correct schema from later migrations';
END $$;

-- Ensure all tables exist with correct schema (CREATE IF NOT EXISTS is safe)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key BYTEA NOT NULL,
    attestation_type VARCHAR(50) NOT NULL,
    attestation_source VARCHAR(50) NOT NULL,
    aaguid UUID,
    sign_count BIGINT DEFAULT 0,
    clone_warning BOOLEAN DEFAULT FALSE,
    backup_eligible BOOLEAN DEFAULT FALSE,
    backup_state BOOLEAN DEFAULT FALSE,
    device_type VARCHAR(50),
    device_label VARCHAR(100),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,

    UNIQUE(user_id, public_key)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cred_id UUID REFERENCES credentials(id) ON DELETE SET NULL,
    refresh_hash VARCHAR(255) NOT NULL,
    device_label VARCHAR(100),
    ip_fingerprint VARCHAR(64),
    user_agent_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,

    UNIQUE(refresh_hash)
);

-- Link tokens table
CREATE TABLE IF NOT EXISTS link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    device_label VARCHAR(100)
);

-- Routine logs table
CREATE TABLE IF NOT EXISTS routine_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sleep_hours DECIMAL(3,1) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    meal_times JSONB NOT NULL,
    screen_time DECIMAL(4,1) NOT NULL CHECK (screen_time >= 0 AND screen_time <= 24),
    exercise_duration DECIMAL(3,1) NOT NULL CHECK (exercise_duration >= 0 AND exercise_duration <= 24),
    wake_up_time VARCHAR(5) NOT NULL,
    bed_time VARCHAR(5) NOT NULL,
    water_intake DECIMAL(3,1) NOT NULL CHECK (water_intake >= 0 AND water_intake <= 20),
    stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
    log_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI reports table
CREATE TABLE IF NOT EXISTS ai_reports (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER NOT NULL REFERENCES routine_logs(id) ON DELETE CASCADE,
    is_anomaly BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    anomaly_type VARCHAR(50) NOT NULL,
    recommendations JSONB NOT NULL,
    ai_service_response JSONB NOT NULL,
    drift_analysis JSONB,
    baseline_comparison JSONB,
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes (IF NOT EXISTS supported in PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_public_key ON credentials(public_key);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_link_tokens_token_hash ON link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_link_tokens_user_id ON link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_link_tokens_expires_at ON link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_id ON routine_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON routine_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_ai_reports_routine_log_id ON ai_reports(routine_log_id);

-- Create functions
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (DROP IF EXISTS first to avoid errors)
DROP TRIGGER IF EXISTS update_user_last_seen_trigger ON users;
CREATE TRIGGER update_user_last_seen_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

DROP TRIGGER IF EXISTS update_routine_logs_updated_at ON routine_logs;
CREATE TRIGGER update_routine_logs_updated_at
    BEFORE UPDATE ON routine_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
