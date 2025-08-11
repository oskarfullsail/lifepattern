package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewJWTService(t *testing.T) {
	tests := []struct {
		name          string
		secretKey     string
		issuer        string
		audience      string
		accessExpiry  time.Duration
		refreshExpiry time.Duration
		expectPanic   bool
	}{
		{
			name:          "Valid configuration",
			secretKey:     "test-secret-key",
			issuer:        "test-issuer",
			audience:      "test-audience",
			accessExpiry:  15 * time.Minute,
			refreshExpiry: 7 * 24 * time.Hour,
			expectPanic:   false,
		},
		{
			name:          "Empty secret key - should generate one",
			secretKey:     "",
			issuer:        "test-issuer",
			audience:      "test-audience",
			accessExpiry:  15 * time.Minute,
			refreshExpiry: 7 * 24 * time.Hour,
			expectPanic:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectPanic {
				assert.Panics(t, func() {
					NewJWTService(tt.secretKey, tt.issuer, tt.audience, tt.accessExpiry, tt.refreshExpiry)
				})
			} else {
				service := NewJWTService(tt.secretKey, tt.issuer, tt.audience, tt.accessExpiry, tt.refreshExpiry)
				assert.NotNil(t, service)

				if tt.secretKey == "" {
					assert.NotEmpty(t, service.secretKey)
				} else {
					assert.Equal(t, []byte(tt.secretKey), service.secretKey)
				}

				assert.Equal(t, tt.issuer, service.issuer)
				assert.Equal(t, tt.audience, service.audience)
				assert.Equal(t, tt.accessExpiry, service.accessExpiry)
				assert.Equal(t, tt.refreshExpiry, service.refreshExpiry)
			}
		})
	}
}

func TestGenerateAccessToken(t *testing.T) {
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	sessionID := uuid.New()
	deviceLabel := "Test Device"

	token, err := service.GenerateAccessToken(userID, credID, sessionID, deviceLabel)

	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate the token
	claims, err := service.ValidateAccessToken(token)
	require.NoError(t, err)

	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, credID, claims.CredID)
	assert.Equal(t, sessionID, claims.SessionID)
	assert.Equal(t, deviceLabel, claims.DeviceLabel)
	assert.Equal(t, "test-issuer", claims.Issuer)
	assert.Equal(t, []string{"test-audience"}, claims.Audience)
}

func TestGenerateAccessToken_EmptyDeviceLabel(t *testing.T) {
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	sessionID := uuid.New()

	token, err := service.GenerateAccessToken(userID, credID, sessionID, "")

	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate the token
	claims, err := service.ValidateAccessToken(token)
	require.NoError(t, err)

	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, credID, claims.CredID)
	assert.Equal(t, sessionID, claims.SessionID)
	assert.Empty(t, claims.DeviceLabel)
}

func TestValidateAccessToken(t *testing.T) {
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	sessionID := uuid.New()

	tests := []struct {
		name        string
		token       string
		expectError bool
	}{
		{
			name:        "Valid token",
			token:       func() string { t, _ := service.GenerateAccessToken(userID, credID, sessionID, "Test Device"); return t }(),
			expectError: false,
		},
		{
			name:        "Invalid token format",
			token:       "invalid.token.format",
			expectError: true,
		},
		{
			name:        "Empty token",
			token:       "",
			expectError: true,
		},
		{
			name:        "Token with wrong signature",
			token:       "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := service.ValidateAccessToken(tt.token)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, claims)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, claims)
				assert.Equal(t, userID, claims.UserID)
				assert.Equal(t, credID, claims.CredID)
				assert.Equal(t, sessionID, claims.SessionID)
			}
		})
	}
}

func TestValidateAccessToken_Expired(t *testing.T) {
	// Create service with very short expiry
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 1*time.Millisecond, 7*24*time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	sessionID := uuid.New()

	token, err := service.GenerateAccessToken(userID, credID, sessionID, "Test Device")
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	claims, err := service.ValidateAccessToken(token)
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestGenerateRefreshToken(t *testing.T) {
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	refreshToken, hash, err := service.GenerateRefreshToken()

	require.NoError(t, err)
	assert.NotEmpty(t, refreshToken)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, refreshToken, hash)

	// Verify hash matches
	expectedHash, err := HashRefreshTokenString(refreshToken)
	require.NoError(t, err)
	assert.Equal(t, expectedHash, hash)
}

func TestGenerateRefreshToken_MultipleTokens(t *testing.T) {
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	tokens := make(map[string]bool)
	hashes := make(map[string]bool)

	// Generate multiple tokens to ensure uniqueness
	for i := 0; i < 100; i++ {
		refreshToken, hash, err := service.GenerateRefreshToken()
		require.NoError(t, err)

		// Check token uniqueness
		assert.False(t, tokens[refreshToken], "Duplicate refresh token generated")
		tokens[refreshToken] = true

		// Check hash uniqueness
		assert.False(t, hashes[hash], "Duplicate hash generated")
		hashes[hash] = true

		// Verify hash matches
		expectedHash, err := HashRefreshTokenString(refreshToken)
		require.NoError(t, err)
		assert.Equal(t, expectedHash, hash)
	}
}

func TestHashRefreshTokenString(t *testing.T) {
	tests := []struct {
		name        string
		token       string
		expectError bool
	}{
		{
			name:        "Valid base64 token",
			token:       "dGVzdC10b2tlbi1kYXRhLWZvci1oYXNoaW5n",
			expectError: false,
		},
		{
			name:        "Invalid base64 token",
			token:       "invalid-base64!@#",
			expectError: true,
		},
		{
			name:        "Empty token",
			token:       "",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashRefreshTokenString(tt.token)

			if tt.expectError {
				assert.Error(t, err)
				assert.Empty(t, hash)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, hash)
			}
		})
	}
}

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		expectError bool
	}{
		{
			name:        "Valid password",
			password:    "mySecurePassword123!",
			expectError: false,
		},
		{
			name:        "Empty password",
			password:    "",
			expectError: false,
		},
		{
			name:        "Very long password",
			password:    strings.Repeat("a", 1000),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)

			if tt.expectError {
				assert.Error(t, err)
				assert.Empty(t, hash)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, hash)
				assert.NotEqual(t, tt.password, hash)
			}
		})
	}
}

func TestCheckPasswordHash(t *testing.T) {
	password := "mySecurePassword123!"
	hash, err := HashPassword(password)
	require.NoError(t, err)

	tests := []struct {
		name     string
		password string
		hash     string
		expected bool
	}{
		{
			name:     "Correct password and hash",
			password: password,
			hash:     hash,
			expected: true,
		},
		{
			name:     "Wrong password",
			password: "wrongPassword",
			hash:     hash,
			expected: false,
		},
		{
			name:     "Empty password",
			password: "",
			hash:     hash,
			expected: false,
		},
		{
			name:     "Empty hash",
			password: password,
			hash:     "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CheckPasswordHash(tt.password, tt.hash)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestHashIPAddress(t *testing.T) {
	tests := []struct {
		name     string
		ip       string
		expected string
	}{
		{
			name:     "IPv4 address",
			ip:       "192.168.1.1",
			expected: "7f4e3b2a1c8d9e6f5a4b3c2d1e8f9a6b5c4d3e2f1a8b9c6d5e4f3a2b1c8d9e6f",
		},
		{
			name:     "IPv6 address",
			ip:       "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
			expected: "7f4e3b2a1c8d9e6f5a4b3c2d1e8f9a6b5c4d3e2f1a8b9c6d5e4f3a2b1c8d9e6f",
		},
		{
			name:     "Empty IP",
			ip:       "",
			expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := HashIPAddress(tt.ip)
			assert.NotEmpty(t, result)
			assert.Len(t, result, 64) // SHA-256 hash length
		})
	}
}

func TestHashUserAgent(t *testing.T) {
	tests := []struct {
		name      string
		userAgent string
	}{
		{
			name:      "Chrome user agent",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		},
		{
			name:      "Firefox user agent",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
		},
		{
			name:      "Mobile user agent",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
		},
		{
			name:      "Empty user agent",
			userAgent: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := HashUserAgent(tt.userAgent)
			assert.NotEmpty(t, result)
			assert.Len(t, result, 64) // SHA-256 hash length
		})
	}
}

func TestJWTClaims_Validation(t *testing.T) {
	service := NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	sessionID := uuid.New()

	// Test token with all required claims
	token, err := service.GenerateAccessToken(userID, credID, sessionID, "Test Device")
	require.NoError(t, err)

	claims, err := service.ValidateAccessToken(token)
	require.NoError(t, err)

	// Verify all claims are present and correct
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, credID, claims.CredID)
	assert.Equal(t, sessionID, claims.SessionID)
	assert.Equal(t, "Test Device", claims.DeviceLabel)
	assert.Equal(t, "test-issuer", claims.Issuer)
	assert.Equal(t, []string{"test-audience"}, claims.Audience)
	assert.NotZero(t, claims.IssuedAt)
	assert.NotZero(t, claims.ExpiresAt)
	assert.NotZero(t, claims.NotBefore)
}

func TestJWTService_DifferentKeys(t *testing.T) {
	// Test that tokens signed with different keys are invalid
	service1 := NewJWTService("key1", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	service2 := NewJWTService("key2", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	sessionID := uuid.New()

	token, err := service1.GenerateAccessToken(userID, credID, sessionID, "Test Device")
	require.NoError(t, err)

	// Token should be valid with service1
	claims, err := service1.ValidateAccessToken(token)
	assert.NoError(t, err)
	assert.NotNil(t, claims)

	// Token should be invalid with service2
	claims, err = service2.ValidateAccessToken(token)
	assert.Error(t, err)
	assert.Nil(t, claims)
}
