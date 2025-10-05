package middleware

import (
	"net/http"
	"strings"
	"lifepattern-api/internal/config"
)

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the origin from the request
		origin := r.Header.Get("Origin")

		// Load configuration to get allowed origins
		cfg := config.Load()
		
		// Define allowed origins (combine config and defaults)
		allowedOrigins := []string{
			"http://localhost:19006",               // Expo development server
			"http://localhost:3000",                // React development server
			"http://localhost:8081",                // Alternative development port
			"https://lifepattern-ai-dc5fe.web.app", // Production
		}
		
		// Add origins from configuration
		allowedOrigins = append(allowedOrigins, cfg.Auth.CORSAllowedOrigins...)

		// Normalize origin by removing trailing slash for comparison
		normalizedOrigin := strings.TrimSuffix(origin, "/")

		// Check if the origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if normalizedOrigin == allowedOrigin {
				allowed = true
				break
			}
		}

		// Set CORS headers
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", normalizedOrigin)
		} else {
			// Fallback to wildcard for development
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400") // 24 hours

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}
