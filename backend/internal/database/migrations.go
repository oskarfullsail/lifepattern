package database

import (
	"database/sql"
	"log"
)

// Migration represents a database migration
type Migration struct {
	ID        int
	Filename  string
	AppliedAt sql.NullTime
}

// Migrator handles database migrations
type Migrator struct {
	db *sql.DB
}

// NewMigrator creates a new migrator instance
func NewMigrator(db *sql.DB) *Migrator {
	return &Migrator{db: db}
}

// RunMigrations applies all database migrations
func (m *Migrator) RunMigrations() error {
	log.Println("🔄 Applying database migrations...")

	// Create migrations table if it doesn't exist
	if err := m.createMigrationsTable(); err != nil {
		return err
	}

	// Apply schema migrations
	if err := m.applySchemaMigrations(); err != nil {
		return err
	}

	log.Println("✅ Database migrations completed")
	return nil
}

// createMigrationsTable creates the migrations tracking table
func (m *Migrator) createMigrationsTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS migrations (
		id SERIAL PRIMARY KEY,
		filename VARCHAR(255) NOT NULL UNIQUE,
		applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);`

	_, err := m.db.Exec(query)
	return err
}

// applySchemaMigrations applies the main database schema
func (m *Migrator) applySchemaMigrations() error {
	schema := `
	-- Enable UUID extension
	CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
	
	-- Create users table
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	
	-- Create user_credentials table
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
	
	-- Create webauthn_credentials table
	CREATE TABLE IF NOT EXISTS webauthn_credentials (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		credential_id BYTEA NOT NULL,
		public_key BYTEA NOT NULL,
		attestation_type VARCHAR(255),
		transport TEXT[],
		flags INTEGER NOT NULL,
		authenticator VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(credential_id)
	);
	
	-- Create sessions table
	CREATE TABLE IF NOT EXISTS sessions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		cred_id UUID REFERENCES webauthn_credentials(id) ON DELETE SET NULL,
		refresh_hash VARCHAR(255) NOT NULL,
		device_label VARCHAR(255),
		ip_fingerprint VARCHAR(255),
		user_agent_hash VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		revoked_at TIMESTAMP WITH TIME ZONE,
		UNIQUE(refresh_hash)
	);
	
	-- Create link_tokens table
	CREATE TABLE IF NOT EXISTS link_tokens (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		token_hash VARCHAR(255) NOT NULL,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		used_at TIMESTAMP WITH TIME ZONE,
		device_label VARCHAR(255)
	);
	
	-- Create routine_logs table
	CREATE TABLE IF NOT EXISTS routine_logs (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		sleep_hours DECIMAL(3,1),
		meal_times JSONB,
		screen_time DECIMAL(4,1),
		exercise_duration DECIMAL(4,1),
		wake_up_time TIME,
		bed_time TIME,
		water_intake DECIMAL(3,1),
		stress_level INTEGER,
		heart_rate DECIMAL(5,1),
		sugar_intake DECIMAL(5,1),
		log_date DATE NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	
	-- Add columns if they don't exist (for existing databases)
	DO $$
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_logs' AND column_name = 'heart_rate') THEN
			ALTER TABLE routine_logs ADD COLUMN heart_rate DECIMAL(5,1);
		END IF;
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_logs' AND column_name = 'sugar_intake') THEN
			ALTER TABLE routine_logs ADD COLUMN sugar_intake DECIMAL(5,1);
		END IF;
		-- Fix water_intake type if it's INTEGER
		IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_logs' AND column_name = 'water_intake' AND data_type = 'integer') THEN
			ALTER TABLE routine_logs ALTER COLUMN water_intake TYPE DECIMAL(3,1);
		END IF;
		-- Fix screen_time type if it's INTEGER
		IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_logs' AND column_name = 'screen_time' AND data_type = 'integer') THEN
			ALTER TABLE routine_logs ALTER COLUMN screen_time TYPE DECIMAL(4,1);
		END IF;
		-- Fix exercise_duration type if it's INTEGER
		IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_logs' AND column_name = 'exercise_duration' AND data_type = 'integer') THEN
			ALTER TABLE routine_logs ALTER COLUMN exercise_duration TYPE DECIMAL(4,1);
		END IF;
	END $$;
	
	-- Create insights table
	CREATE TABLE IF NOT EXISTS insights (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		log_id UUID,
		insight_type VARCHAR(50) NOT NULL,
		insight_data JSONB NOT NULL,
		confidence_score DECIMAL(3,2),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	
	-- Add foreign key constraint if it doesn't exist
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.table_constraints 
			WHERE constraint_name = 'insights_log_id_fkey' 
			AND table_name = 'insights'
		) THEN
			ALTER TABLE insights ADD CONSTRAINT insights_log_id_fkey 
			FOREIGN KEY (log_id) REFERENCES routine_logs(id) ON DELETE CASCADE;
		END IF;
	END $$;`

	_, err := m.db.Exec(schema)
	return err
}
