-- Migration: Add heart_rate and sugar_intake columns to routine_logs
-- Date: 2025-12-26
-- Purpose: Support new health features for enhanced anomaly detection

-- Add heart_rate column (optional, in BPM - beats per minute)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='routine_logs' AND column_name='heart_rate'
    ) THEN
        ALTER TABLE routine_logs ADD COLUMN heart_rate DECIMAL(5,1) CHECK (heart_rate >= 30 AND heart_rate <= 220);
        RAISE NOTICE 'Added heart_rate column to routine_logs';
    ELSE
        RAISE NOTICE 'heart_rate column already exists';
    END IF;
END $$;

-- Add sugar_intake column (optional, in grams)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='routine_logs' AND column_name='sugar_intake'
    ) THEN
        ALTER TABLE routine_logs ADD COLUMN sugar_intake DECIMAL(5,1) CHECK (sugar_intake >= 0 AND sugar_intake <= 500);
        RAISE NOTICE 'Added sugar_intake column to routine_logs';
    ELSE
        RAISE NOTICE 'sugar_intake column already exists';
    END IF;
END $$;

-- Add index for health metrics analysis (optional, for future queries)
CREATE INDEX IF NOT EXISTS idx_routine_logs_health_metrics 
    ON routine_logs(heart_rate, sugar_intake) 
    WHERE heart_rate IS NOT NULL OR sugar_intake IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN routine_logs.heart_rate IS 'Resting heart rate in BPM (30-220). Optional.';
COMMENT ON COLUMN routine_logs.sugar_intake IS 'Daily sugar intake in grams (0-500). Optional. WHO recommends <50g/day.';

