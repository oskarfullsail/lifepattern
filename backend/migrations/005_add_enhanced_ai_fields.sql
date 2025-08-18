-- Migration: Add enhanced AI fields to ai_reports table
-- This migration adds support for enhanced recommendations and behavioral contexts

-- Add new columns to ai_reports table
ALTER TABLE ai_reports 
ADD COLUMN enhanced_recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN behavioral_contexts TEXT[] DEFAULT '{}';

-- Add indexes for better query performance
CREATE INDEX idx_ai_reports_enhanced_recommendations ON ai_reports USING GIN (enhanced_recommendations);
CREATE INDEX idx_ai_reports_behavioral_contexts ON ai_reports USING GIN (behavioral_contexts);

-- Add comments for documentation
COMMENT ON COLUMN ai_reports.enhanced_recommendations IS 'Enhanced recommendations with rich content, context, and metadata';
COMMENT ON COLUMN ai_reports.behavioral_contexts IS 'Behavioral contexts identified by AI analysis (e.g., low_exercise, high_stress)'; 