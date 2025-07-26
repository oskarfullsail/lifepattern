-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for LifePattern application
-- Date: 2024-01-15

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routine logs table
CREATE TABLE IF NOT EXISTS routine_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sleep_hours DECIMAL(3,1) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    meal_times JSONB NOT NULL, -- Array of meal timestamps ["07:30", "12:00", "18:30"]
    screen_time DECIMAL(3,1) NOT NULL CHECK (screen_time >= 0 AND screen_time <= 24),
    exercise_duration DECIMAL(3,1) NOT NULL CHECK (exercise_duration >= 0 AND exercise_duration <= 24),
    wake_up_time VARCHAR(5) NOT NULL, -- Format: "07:00"
    bed_time VARCHAR(5) NOT NULL, -- Format: "23:00"
    water_intake DECIMAL(3,1) NOT NULL CHECK (water_intake >= 0),
    stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI analysis reports table
CREATE TABLE IF NOT EXISTS ai_reports (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER REFERENCES routine_logs(id) ON DELETE CASCADE,
    is_anomaly BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    anomaly_type VARCHAR(50) NOT NULL,
    recommendations JSONB NOT NULL, -- Array of recommendation strings
    ai_service_response JSONB NOT NULL, -- Full response from AI service
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON routine_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_routine_logs_date ON routine_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_ai_reports_routine_log ON ai_reports(routine_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_anomaly ON ai_reports(is_anomaly, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_routine_logs_updated_at 
    BEFORE UPDATE ON routine_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion (for testing)
INSERT INTO users (username, email) VALUES 
    ('testuser', 'test@example.com')
ON CONFLICT (username) DO NOTHING; 