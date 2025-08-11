package auth

import (
	"strings"
	"testing"
	"time"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSessionService(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	assert.NotNil(t, service)
	assert.Equal(t, 7*24*time.Hour, service.refreshExpiry)
}

func TestCreateSession(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	deviceLabel := "Test Device"
	ipAddress := "192.168.1.1"
	userAgent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

	session, refreshToken, err := service.CreateSession(userID, credID, deviceLabel, ipAddress, userAgent)

	require.NoError(t, err)
	assert.NotNil(t, session)
	assert.NotEmpty(t, refreshToken)

	// Verify session fields
	assert.Equal(t, userID, session.UserID)
	assert.Equal(t, credID, *session.CredID)
	assert.Equal(t, deviceLabel, session.DeviceLabel)
	assert.Equal(t, HashIPAddress(ipAddress), session.IPFingerprint)
	assert.Equal(t, HashUserAgent(userAgent), session.UserAgentHash)
	assert.NotZero(t, session.CreatedAt)
	assert.NotZero(t, session.LastUsedAt)
	assert.NotZero(t, session.ExpiresAt)
	assert.True(t, session.ExpiresAt.After(time.Now()))
	assert.True(t, session.ExpiresAt.After(session.CreatedAt))

	// Verify refresh token hash
	expectedHash, err := HashRefreshTokenString(refreshToken)
	require.NoError(t, err)
	assert.Equal(t, expectedHash, session.RefreshHash)
}

func TestCreateSession_EmptyDeviceLabel(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	ipAddress := "192.168.1.1"
	userAgent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

	session, refreshToken, err := service.CreateSession(userID, credID, "", ipAddress, userAgent)

	require.NoError(t, err)
	assert.NotNil(t, session)
	assert.NotEmpty(t, refreshToken)
	assert.Empty(t, session.DeviceLabel)
}

func TestCreateSession_EmptyIPAndUserAgent(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()
	deviceLabel := "Test Device"

	session, refreshToken, err := service.CreateSession(userID, credID, deviceLabel, "", "")

	require.NoError(t, err)
	assert.NotNil(t, session)
	assert.NotEmpty(t, refreshToken)

	// Should still hash empty strings
	assert.NotEmpty(t, session.IPFingerprint)
	assert.NotEmpty(t, session.UserAgentHash)
}

func TestValidateRefreshToken(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()

	// Create a session
	session, refreshToken, err := service.CreateSession(userID, credID, "Test Device", "192.168.1.1", "Test User Agent")
	require.NoError(t, err)

	// Create a list of sessions for validation
	sessions := []database.Session{*session}

	tests := []struct {
		name           string
		refreshToken   string
		expectedResult *database.Session
		expectError    bool
	}{
		{
			name:           "Valid refresh token",
			refreshToken:   refreshToken,
			expectedResult: session,
			expectError:    false,
		},
		{
			name:           "Invalid refresh token",
			refreshToken:   "invalid-token",
			expectedResult: nil,
			expectError:    true,
		},
		{
			name:           "Empty refresh token",
			refreshToken:   "",
			expectedResult: nil,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ValidateRefreshToken(tt.refreshToken, sessions)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedResult.ID, result.ID)
				assert.Equal(t, tt.expectedResult.UserID, result.UserID)
			}
		})
	}
}

func TestRotateRefreshToken(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()

	// Create initial session
	originalSession, originalRefreshToken, err := service.CreateSession(userID, credID, "Test Device", "192.168.1.1", "Test User Agent")
	require.NoError(t, err)

	// Create list of sessions
	sessions := []database.Session{*originalSession}

	// Rotate refresh token
	newSession, newRefreshToken, err := service.RotateRefreshToken(originalRefreshToken, sessions)

	require.NoError(t, err)
	assert.NotNil(t, newSession)
	assert.NotEmpty(t, newRefreshToken)
	assert.NotEqual(t, originalRefreshToken, newRefreshToken)

	// Verify new session
	assert.Equal(t, userID, newSession.UserID)
	assert.Equal(t, credID, *newSession.CredID)
	assert.Equal(t, originalSession.DeviceLabel, newSession.DeviceLabel)
	assert.Equal(t, originalSession.IPFingerprint, newSession.IPFingerprint)
	assert.Equal(t, originalSession.UserAgentHash, newSession.UserAgentHash)
	assert.True(t, newSession.CreatedAt.After(originalSession.CreatedAt))
	assert.True(t, newSession.LastUsedAt.After(originalSession.LastUsedAt))
	assert.True(t, newSession.ExpiresAt.After(originalSession.ExpiresAt))

	// Verify refresh token hash
	expectedHash, err := HashRefreshTokenString(newRefreshToken)
	require.NoError(t, err)
	assert.Equal(t, expectedHash, newSession.RefreshHash)
}

func TestRotateRefreshToken_InvalidToken(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()

	// Create session
	session, _, err := service.CreateSession(userID, credID, "Test Device", "192.168.1.1", "Test User Agent")
	require.NoError(t, err)

	sessions := []database.Session{*session}

	// Try to rotate with invalid token
	newSession, newRefreshToken, err := service.RotateRefreshToken("invalid-token", sessions)

	assert.Error(t, err)
	assert.Nil(t, newSession)
	assert.Empty(t, newRefreshToken)
}

func TestRotateRefreshToken_ExpiredSession(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID := uuid.New()

	// Create expired session
	expiredSession := &database.Session{
		ID:          uuid.New(),
		UserID:      userID,
		CredID:      &credID,
		RefreshHash: "expired-hash",
		ExpiresAt:   time.Now().Add(-time.Hour), // Expired
	}

	sessions := []database.Session{*expiredSession}

	// Try to rotate expired session
	newSession, newRefreshToken, err := service.RotateRefreshToken("any-token", sessions)

	assert.Error(t, err)
	assert.Nil(t, newSession)
	assert.Empty(t, newRefreshToken)
}

func TestRotateRefreshToken_MultipleSessions(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	userID := uuid.New()
	credID1 := uuid.New()
	credID2 := uuid.New()

	// Create two sessions
	session1, refreshToken1, err := service.CreateSession(userID, credID1, "Device 1", "192.168.1.1", "User Agent 1")
	require.NoError(t, err)

	session2, refreshToken2, err := service.CreateSession(userID, credID2, "Device 2", "192.168.1.2", "User Agent 2")
	require.NoError(t, err)

	sessions := []database.Session{*session1, *session2}

	// Rotate first session
	newSession1, newRefreshToken1, err := service.RotateRefreshToken(refreshToken1, sessions)
	require.NoError(t, err)
	assert.NotNil(t, newSession1)
	assert.NotEmpty(t, newRefreshToken1)

	// Rotate second session
	newSession2, newRefreshToken2, err := service.RotateRefreshToken(refreshToken2, sessions)
	require.NoError(t, err)
	assert.NotNil(t, newSession2)
	assert.NotEmpty(t, newRefreshToken2)

	// Verify sessions are different
	assert.NotEqual(t, newSession1.ID, newSession2.ID)
	assert.NotEqual(t, newRefreshToken1, newRefreshToken2)
}

func TestSessionExpiry(t *testing.T) {
	service := NewSessionService(1 * time.Hour) // Short expiry for testing

	userID := uuid.New()
	credID := uuid.New()

	session, _, err := service.CreateSession(userID, credID, "Test Device", "192.168.1.1", "Test User Agent")
	require.NoError(t, err)

	// Session should expire in 1 hour
	expectedExpiry := time.Now().Add(1 * time.Hour)
	assert.True(t, session.ExpiresAt.After(expectedExpiry.Add(-time.Minute)))
	assert.True(t, session.ExpiresAt.Before(expectedExpiry.Add(time.Minute)))
}

func TestSessionService_ConcurrentAccess(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)
	userID := uuid.New()
	credID := uuid.New()

	// Test concurrent session creation
	const numGoroutines = 10
	results := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func() {
			_, _, err := service.CreateSession(userID, credID, "Concurrent Device", "192.168.1.1", "Concurrent User Agent")
			results <- err
		}()
	}

	// Collect results
	for i := 0; i < numGoroutines; i++ {
		err := <-results
		assert.NoError(t, err)
	}
}

func TestSessionService_EdgeCases(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)

	t.Run("Nil credential ID", func(t *testing.T) {
		userID := uuid.New()
		var credID uuid.UUID // Zero value

		session, _, err := service.CreateSession(userID, credID, "Test Device", "192.168.1.1", "Test User Agent")
		require.NoError(t, err)
		assert.NotNil(t, session)
		assert.Nil(t, session.CredID)
	})

	t.Run("Very long device label", func(t *testing.T) {
		userID := uuid.New()
		credID := uuid.New()
		longLabel := strings.Repeat("a", 1000)

		session, _, err := service.CreateSession(userID, credID, longLabel, "192.168.1.1", "Test User Agent")
		require.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, longLabel, session.DeviceLabel)
	})

	t.Run("Special characters in device label", func(t *testing.T) {
		userID := uuid.New()
		credID := uuid.New()
		specialLabel := "Test Device 🚀 with emoji & symbols!@#$%^&*()"

		session, _, err := service.CreateSession(userID, credID, specialLabel, "192.168.1.1", "Test User Agent")
		require.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, specialLabel, session.DeviceLabel)
	})
}

func TestSessionService_Integration(t *testing.T) {
	service := NewSessionService(7 * 24 * time.Hour)
	userID := uuid.New()
	credID := uuid.New()

	t.Run("Complete session lifecycle", func(t *testing.T) {
		// Step 1: Create session
		session, refreshToken, err := service.CreateSession(userID, credID, "Integration Device", "192.168.1.1", "Integration User Agent")
		require.NoError(t, err)
		assert.NotNil(t, session)
		assert.NotEmpty(t, refreshToken)

		// Step 2: Validate refresh token
		sessions := []database.Session{*session}
		validatedSession, err := service.ValidateRefreshToken(refreshToken, sessions)
		require.NoError(t, err)
		assert.Equal(t, session.ID, validatedSession.ID)

		// Step 3: Rotate refresh token
		newSession, newRefreshToken, err := service.RotateRefreshToken(refreshToken, sessions)
		require.NoError(t, err)
		assert.NotNil(t, newSession)
		assert.NotEmpty(t, newRefreshToken)
		assert.NotEqual(t, refreshToken, newRefreshToken)

		// Step 4: Validate new refresh token
		newSessions := []database.Session{*newSession}
		newValidatedSession, err := service.ValidateRefreshToken(newRefreshToken, newSessions)
		require.NoError(t, err)
		assert.Equal(t, newSession.ID, newValidatedSession.ID)

		// Step 5: Old token should be invalid
		_, err = service.ValidateRefreshToken(refreshToken, newSessions)
		assert.Error(t, err)
	})
}
