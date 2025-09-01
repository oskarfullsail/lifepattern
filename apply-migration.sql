-- Apply the missing user_credentials table migration
-- This script should be run on the production database

-- Create user_credentials table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    hashed_passphrase VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(username)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credentials_username ON user_credentials(username);
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- Add comments for documentation
COMMENT ON TABLE user_credentials IS 'Stores username/passphrase credentials for traditional authentication';
COMMENT ON COLUMN user_credentials.username IS 'Unique username for authentication';
COMMENT ON COLUMN user_credentials.hashed_passphrase IS 'Salted and hashed passphrase';
COMMENT ON COLUMN user_credentials.salt IS 'Salt used for passphrase hashing';

-- Verify the table was created
SELECT 'user_credentials table created successfully' as status; 