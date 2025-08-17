package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"lifepattern-api/internal/config"

	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	db, err := sql.Open("postgres", cfg.Database.URL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("✅ Connected to database")

	// Create migrations table if it doesn't exist
	createMigrationsTable := `
	CREATE TABLE IF NOT EXISTS migrations (
		id SERIAL PRIMARY KEY,
		filename VARCHAR(255) NOT NULL UNIQUE,
		applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);`

	if _, err := db.Exec(createMigrationsTable); err != nil {
		log.Fatalf("Failed to create migrations table: %v", err)
	}

	// Get list of migration files
	migrationsDir := "migrations"
	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("Failed to read migrations directory: %v", err)
	}

	// Sort files by name
	var migrationFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			migrationFiles = append(migrationFiles, file.Name())
		}
	}
	sort.Strings(migrationFiles)

	// Get applied migrations
	rows, err := db.Query("SELECT filename FROM migrations ORDER BY id")
	if err != nil {
		log.Fatalf("Failed to query applied migrations: %v", err)
	}
	defer rows.Close()

	appliedMigrations := make(map[string]bool)
	for rows.Next() {
		var filename string
		if err := rows.Scan(&filename); err != nil {
			log.Fatalf("Failed to scan migration filename: %v", err)
		}
		appliedMigrations[filename] = true
	}

	// Apply pending migrations
	for _, filename := range migrationFiles {
		if appliedMigrations[filename] {
			log.Printf("⏭️  Migration %s already applied", filename)
			continue
		}

		log.Printf("🔄 Applying migration: %s", filename)

		// Read migration file
		content, err := os.ReadFile(filepath.Join(migrationsDir, filename))
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", filename, err)
		}

		// Execute migration
		if _, err := db.Exec(string(content)); err != nil {
			log.Fatalf("Failed to execute migration %s: %v", filename, err)
		}

		// Record migration as applied
		if _, err := db.Exec("INSERT INTO migrations (filename) VALUES ($1)", filename); err != nil {
			log.Fatalf("Failed to record migration %s: %v", filename, err)
		}

		log.Printf("✅ Applied migration: %s", filename)
	}

	log.Println("🎉 All migrations completed successfully!")
}
