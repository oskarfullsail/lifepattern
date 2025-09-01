package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"lifepattern-api/internal/auth"
)

// AuthMiddleware provides authentication for protected endpoints
type AuthMiddleware struct {
	jwtService *auth.JWTService
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(jwtService *auth.JWTService) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService: jwtService,
	}
}

// RequireAuth middleware that requires valid JWT token
func (am *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🔐 Auth middleware processing request: %s %s", r.Method, r.URL.Path)
		log.Printf("🔐 Auth middleware - Headers: %v", r.Header)

		// Extract token from Authorization header
		token, err := extractTokenFromHeader(r)
		if err != nil {
			log.Printf("❌ Failed to extract token: %v", err)
			http.Error(w, "Unauthorized: Invalid token format", http.StatusUnauthorized)
			return
		}
		log.Printf("🔐 Auth middleware - Token extracted successfully")

		// Validate the token
		claims, err := am.jwtService.ValidateAccessToken(token)
		if err != nil {
			log.Printf("❌ Failed to validate token: %v", err)
			http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
			return
		}

		log.Printf("✅ Token validated successfully for user: %s", claims.UserID)

		// Add claims to request context
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID.String())
		ctx = context.WithValue(ctx, "cred_id", claims.CredID.String())
		ctx = context.WithValue(ctx, "session_id", claims.SessionID.String())
		ctx = context.WithValue(ctx, "device_label", claims.DeviceLabel)

		log.Printf("🔐 Auth middleware - Context updated, calling next handler")
		// Call the next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth middleware that optionally validates JWT token
func (am *AuthMiddleware) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to extract and validate token
		token, err := extractTokenFromHeader(r)
		if err == nil {
			claims, err := am.jwtService.ValidateAccessToken(token)
			if err == nil {
				// Add claims to request context if valid
				ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
				ctx = context.WithValue(ctx, "cred_id", claims.CredID)
				ctx = context.WithValue(ctx, "session_id", claims.SessionID)
				ctx = context.WithValue(ctx, "device_label", claims.DeviceLabel)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		// Continue without authentication
		next.ServeHTTP(w, r)
	})
}

// extractTokenFromHeader extracts the JWT token from the Authorization header
func extractTokenFromHeader(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("missing authorization header")
	}

	// Check if it's a Bearer token
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	return parts[1], nil
}

// GetUserIDFromContext extracts user ID from request context
func GetUserIDFromContext(ctx context.Context) (string, error) {
	userID, ok := ctx.Value("user_id").(string)
	if !ok {
		return "", fmt.Errorf("user_id not found in context")
	}
	return userID, nil
}

// GetCredIDFromContext extracts credential ID from request context
func GetCredIDFromContext(ctx context.Context) (string, error) {
	credID, ok := ctx.Value("cred_id").(string)
	if !ok {
		return "", fmt.Errorf("cred_id not found in context")
	}
	return credID, nil
}

// GetSessionIDFromContext extracts session ID from request context
func GetSessionIDFromContext(ctx context.Context) (string, error) {
	sessionID, ok := ctx.Value("session_id").(string)
	if !ok {
		return "", fmt.Errorf("session_id not found in context")
	}
	return sessionID, nil
}

// GetDeviceLabelFromContext extracts device label from request context
func GetDeviceLabelFromContext(ctx context.Context) (string, error) {
	deviceLabel, ok := ctx.Value("device_label").(string)
	if !ok {
		return "", fmt.Errorf("device_label not found in context")
	}
	return deviceLabel, nil
}
