package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"lifepattern-api/internal/api"
	"lifepattern-api/internal/config"
	"lifepattern-api/internal/container"
	"lifepattern-api/internal/database"

	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Setup logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("🚀 Starting LifePattern Backend")

	// Connect to database
	db, err := connectToDatabase(cfg.Database.URL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	// Apply database migrations
	migrator := database.NewMigrator(db)
	if err := migrator.RunMigrations(); err != nil {
		log.Fatalf("❌ Failed to apply migrations: %v", err)
	}

	// Create dependency injection container
	log.Println("🏗️ Creating dependency injection container...")
	container := container.NewContainer(cfg, db)
	defer container.Close()
	log.Println("✅ Container created successfully")

	// Create and start server
	log.Println("🌐 Creating HTTP server...")
	server := api.NewServer(container)
	log.Println("✅ HTTP server created successfully")

	// Start server in a goroutine
	go func() {
		log.Println("🌐 Server goroutine started")
		if err := server.Start(); err != nil {
			log.Fatalf("❌ Server failed to start: %v", err)
		}
	}()

	// Add a small delay to ensure server starts
	time.Sleep(2 * time.Second)
	log.Println("✅ Server startup completed")

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("❌ Server shutdown error: %v", err)
	}

	log.Println("✅ Server stopped gracefully")
}

// connectToDatabase establishes database connection with retry logic
func connectToDatabase(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	// Test database connection with retry logic
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		if err := db.Ping(); err != nil {
			log.Printf("⚠️ Database connection attempt %d/%d failed: %v", i+1, maxRetries, err)
			if i == maxRetries-1 {
				return nil, err
			}
			time.Sleep(2 * time.Second)
		} else {
			log.Println("✅ Connected to database")
			break
		}
	}

	return db, nil
}
