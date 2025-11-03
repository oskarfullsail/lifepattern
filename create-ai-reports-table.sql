-- Create ai_reports table for local test database

CREATE TABLE IF NOT EXISTS ai_reports (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER REFERENCES routine_logs(id) ON DELETE CASCADE,
    is_anomaly BOOLEAN NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    anomaly_type VARCHAR(50) NOT NULL,
    recommendations JSONB NOT NULL, -- Array of recommendation strings
    ai_service_response JSONB NOT NULL, -- Full response from AI service
    drift_analysis JSONB, -- Enhanced drift detection results
    baseline_comparison JSONB, -- User baseline comparison data
    model_version VARCHAR(50), -- AI model version for auditability
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enhanced_recommendations JSONB DEFAULT '[]'::jsonb,
    behavioral_contexts TEXT[] DEFAULT '{}'
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_reports_routine_log ON ai_reports(routine_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_anomaly ON ai_reports(is_anomaly, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_reports_enhanced_recommendations ON ai_reports USING GIN (enhanced_recommendations);
CREATE INDEX IF NOT EXISTS idx_ai_reports_behavioral_contexts ON ai_reports USING GIN (behavioral_contexts);

-- Add comments for documentation
COMMENT ON TABLE ai_reports IS 'AI analysis reports for routine logs';
COMMENT ON COLUMN ai_reports.enhanced_recommendations IS 'Enhanced recommendations with rich content, context, and metadata';
COMMENT ON COLUMN ai_reports.behavioral_contexts IS 'Behavioral contexts identified by AI analysis (e.g., low_exercise, high_stress)';

