package middleware

import (
	"net/http"
	"strings"
)

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the origin from the request
		origin := r.Header.Get("Origin")

		// Define allowed origins for development (without trailing slashes)
		allowedOrigins := []string{
			"http://localhost:19006",               // Expo development server
			"http://localhost:3000",                // React development server
			"http://localhost:8081",                // Alternative development port
			"https://lifepattern-ai-dc5fe.web.app", // Production
		}

		// Normalize origin by removing trailing slash for comparison
		normalizedOrigin := origin
		if strings.HasSuffix(normalizedOrigin, "/") {
			normalizedOrigin = strings.TrimSuffix(normalizedOrigin, "/")
		}

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
