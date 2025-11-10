-- Migration: Add Screening Questionnaire and Usability Survey tables
-- Created: 2025-01-09
-- Description: Tables for candidate screening and usability testing feedback

-- Screening Questionnaire Responses
CREATE TABLE IF NOT EXISTS screening_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Information
    age INTEGER,
    gender VARCHAR(50),
    occupation VARCHAR(255),
    smartphone_usage VARCHAR(50), -- rarely, occasionally, daily
    device_type VARCHAR(50), -- android, iphone, other

    -- Routine & Lifestyle Patterns
    sleep_hours VARCHAR(50), -- <5, 5-6, 7-8, >8
    habit_tracking VARCHAR(50), -- never, sometimes, often, always
    routine_structure VARCHAR(50), -- very_structured, somewhat_structured, unstructured
    productivity_fluctuation VARCHAR(50), -- never, occasionally, frequently, always

    -- Tech Comfort & Interest
    tech_comfort VARCHAR(50), -- not_comfortable, somewhat_comfortable, comfortable, very_comfortable
    wellness_apps_used BOOLEAN,
    ai_feedback_openness VARCHAR(50), -- not_open, slightly_open, open, very_open
    interest_reason TEXT,

    -- Qualification Status
    is_qualified_tester BOOLEAN DEFAULT FALSE,
    qualification_score INTEGER DEFAULT 0, -- Score based on criteria

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one screening response per user
    UNIQUE(user_id)
);

-- Index for querying qualified testers
CREATE INDEX idx_screening_qualified ON screening_responses(is_qualified_tester);
CREATE INDEX idx_screening_created_at ON screening_responses(created_at);

-- Usability Survey Responses
CREATE TABLE IF NOT EXISTS usability_survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Section 1: App Experience (1-5 Likert scale)
    -- 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree
    easy_to_use INTEGER CHECK (easy_to_use >= 1 AND easy_to_use <= 5),
    felt_confident INTEGER CHECK (felt_confident >= 1 AND felt_confident <= 5),
    clear_design INTEGER CHECK (clear_design >= 1 AND clear_design <= 5),
    responsive_smooth INTEGER CHECK (responsive_smooth >= 1 AND responsive_smooth <= 5),
    feedback_understandable INTEGER CHECK (feedback_understandable >= 1 AND feedback_understandable <= 5),
    easy_to_find INTEGER CHECK (easy_to_find >= 1 AND easy_to_find <= 5),
    helped_reflect INTEGER CHECK (helped_reflect >= 1 AND helped_reflect <= 5),
    would_use_regularly INTEGER CHECK (would_use_regularly >= 1 AND would_use_regularly <= 5),
    would_recommend INTEGER CHECK (would_recommend >= 1 AND would_recommend <= 5),
    overall_satisfied INTEGER CHECK (overall_satisfied >= 1 AND overall_satisfied <= 5),

    -- Section 2: Open Feedback
    liked_most TEXT,
    would_improve TEXT,
    encountered_issues TEXT,

    -- Calculated Metrics
    sus_score DECIMAL(5,2), -- System Usability Scale score (0-100)
    average_rating DECIMAL(3,2), -- Average of all Likert responses

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allow multiple surveys per user (to track improvement over time)
CREATE INDEX idx_usability_user_id ON usability_survey_responses(user_id);
CREATE INDEX idx_usability_created_at ON usability_survey_responses(created_at);
CREATE INDEX idx_usability_sus_score ON usability_survey_responses(sus_score);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_screening_responses_updated_at
    BEFORE UPDATE ON screening_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usability_survey_responses_updated_at
    BEFORE UPDATE ON usability_survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE screening_responses IS 'Candidate screening questionnaire responses to determine suitability for testing';
COMMENT ON TABLE usability_survey_responses IS 'SUS-based usability testing survey responses';
COMMENT ON COLUMN screening_responses.is_qualified_tester IS 'Auto-calculated based on criteria: unstructured routine, comfortable with apps, open to AI feedback';
COMMENT ON COLUMN usability_survey_responses.sus_score IS 'System Usability Scale score calculated from responses';
