-- Migration: 003_zero_pii_auth_schema.sql
-- Description: Implement zero-PII authentication with WebAuthn support
-- Date: 2025-08-10

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS ai_reports CASCADE;
DROP TABLE IF EXISTS routine_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create new users table with zero-PII design
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create credentials table for WebAuthn and device keys
CREATE TABLE credentials (
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
    device_type VARCHAR(50), -- 'webauthn', 'mobile', 'cross_device'
    device_label VARCHAR(100), -- User-provided device name
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    
    UNIQUE(user_id, public_key)
);

-- Create sessions table for refresh tokens
CREATE TABLE sessions (
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

-- Create link tokens table for cross-device linking
CREATE TABLE link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed one-time token
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    device_label VARCHAR(100) -- Label for the new device being linked
);

-- Create routine_logs table (updated for new auth system)
CREATE TABLE routine_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sleep_hours DECIMAL(3,1) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    meal_times JSONB NOT NULL, -- Array of meal time strings
    screen_time DECIMAL(4,1) NOT NULL CHECK (screen_time >= 0 AND screen_time <= 24),
    exercise_duration DECIMAL(3,1) NOT NULL CHECK (exercise_duration >= 0 AND exercise_duration <= 24),
    wake_up_time VARCHAR(5) NOT NULL, -- Format: HH:MM
    bed_time VARCHAR(5) NOT NULL, -- Format: HH:MM
    water_intake DECIMAL(3,1) NOT NULL CHECK (water_intake >= 0 AND water_intake <= 20),
    stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
    log_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_reports table (updated for new auth system)
CREATE TABLE ai_reports (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER NOT NULL REFERENCES routine_logs(id) ON DELETE CASCADE,
    is_anomaly BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    anomaly_type VARCHAR(50) NOT NULL,
    recommendations JSONB NOT NULL, -- Array of recommendation strings
    ai_service_response JSONB NOT NULL, -- Full response from AI service
    drift_analysis JSONB, -- Enhanced drift detection results
    baseline_comparison JSONB, -- User baseline comparison data
    model_version VARCHAR(50), -- AI model version for auditability
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_public_key ON credentials(public_key);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_hash ON sessions(refresh_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_link_tokens_token_hash ON link_tokens(token_hash);
CREATE INDEX idx_link_tokens_user_id ON link_tokens(user_id);
CREATE INDEX idx_link_tokens_expires_at ON link_tokens(expires_at);
CREATE INDEX idx_routine_logs_user_id ON routine_logs(user_id);
CREATE INDEX idx_routine_logs_user_date ON routine_logs(user_id, log_date);
CREATE INDEX idx_ai_reports_routine_log_id ON ai_reports(routine_log_id);

-- Create function to update last_seen_at
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last_seen_at
CREATE TRIGGER update_user_last_seen_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for routine_logs updated_at
CREATE TRIGGER update_routine_logs_updated_at
    BEFORE UPDATE ON routine_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert test user for development
INSERT INTO users (id) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000') -- Test user UUID
ON CONFLICT (id) DO NOTHING; 