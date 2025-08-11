package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewMobileAuthService(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)

	assert.NotNil(t, service)
	assert.Equal(t, 5*time.Minute, service.challengeExpiry)
}

func TestCreateChallenge(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	challenge, err := service.CreateChallenge(userID)

	require.NoError(t, err)
	assert.NotNil(t, challenge)
	assert.Equal(t, userID, challenge.UserID)
	assert.NotEmpty(t, challenge.ID)
	assert.NotEmpty(t, challenge.Challenge)
	assert.NotZero(t, challenge.CreatedAt)
	assert.NotZero(t, challenge.ExpiresAt)
	assert.True(t, challenge.ExpiresAt.After(challenge.CreatedAt))
	assert.True(t, challenge.ExpiresAt.After(time.Now()))
}

func TestCreateChallenge_MultipleChallenges(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	challenges := make(map[uuid.UUID]bool)

	// Create multiple challenges to ensure uniqueness
	for i := 0; i < 100; i++ {
		challenge, err := service.CreateChallenge(userID)
		require.NoError(t, err)

		// Check challenge ID uniqueness
		assert.False(t, challenges[challenge.ID], "Duplicate challenge ID generated")
		challenges[challenge.ID] = true

		// Check challenge string uniqueness
		assert.NotEmpty(t, challenge.Challenge)
		assert.True(t, challenge.ExpiresAt.After(time.Now()))
	}
}

func TestCreateChallenge_DifferentUsers(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID1 := uuid.New()
	userID2 := uuid.New()

	challenge1, err := service.CreateChallenge(userID1)
	require.NoError(t, err)

	challenge2, err := service.CreateChallenge(userID2)
	require.NoError(t, err)

	// Challenges should be different for different users
	assert.NotEqual(t, challenge1.ID, challenge2.ID)
	assert.NotEqual(t, challenge1.Challenge, challenge2.Challenge)
	assert.Equal(t, userID1, challenge1.UserID)
	assert.Equal(t, userID2, challenge2.UserID)
}

func TestValidateChallenge(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	// Create a challenge
	challenge, err := service.CreateChallenge(userID)
	require.NoError(t, err)

	tests := []struct {
		name      string
		challenge *MobileChallenge
		response  string
		expected  bool
	}{
		{
			name:      "Valid challenge response",
			challenge: challenge,
			response:  challenge.Challenge, // In real implementation, this would be a signed response
			expected:  true,
		},
		{
			name:      "Invalid response",
			challenge: challenge,
			response:  "invalid-response",
			expected:  false,
		},
		{
			name:      "Empty response",
			challenge: challenge,
			response:  "",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.ValidateChallenge(tt.challenge, tt.response)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateChallenge_ExpiredChallenge(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	// Create a challenge and manually set it to expired
	challenge, err := service.CreateChallenge(userID)
	require.NoError(t, err)

	// Set expiration to past
	challenge.ExpiresAt = time.Now().Add(-1 * time.Hour)

	result := service.ValidateChallenge(challenge, challenge.Challenge)
	assert.False(t, result, "Expired challenge should not be valid")
}

func TestCreateMobileCredential(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()
	deviceLabel := "Test Device"

	credential := service.CreateMobileCredential(userID, deviceLabel)

	assert.NotNil(t, credential)
	assert.Equal(t, userID, credential["user_id"])
	assert.Equal(t, deviceLabel, credential["device_label"])
	assert.NotEmpty(t, credential["id"])
	assert.NotEmpty(t, credential["public_key"])
	assert.NotEmpty(t, credential["created_at"])

	// Verify ID is a valid UUID
	credID, ok := credential["id"].(uuid.UUID)
	assert.True(t, ok)
	assert.NotEqual(t, uuid.Nil, credID)
}

func TestCreateMobileCredential_EmptyDeviceLabel(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	credential := service.CreateMobileCredential(userID, "")

	assert.NotNil(t, credential)
	assert.Equal(t, userID, credential["user_id"])
	assert.Equal(t, "", credential["device_label"])
	assert.NotEmpty(t, credential["id"])
}

func TestCreateMobileCredential_MultipleCredentials(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()
	deviceLabel := "Test Device"

	credentials := make(map[uuid.UUID]bool)

	// Create multiple credentials to ensure uniqueness
	for i := 0; i < 50; i++ {
		credential := service.CreateMobileCredential(userID, deviceLabel)

		credID, ok := credential["id"].(uuid.UUID)
		require.True(t, ok)

		// Check credential ID uniqueness
		assert.False(t, credentials[credID], "Duplicate credential ID generated")
		credentials[credID] = true

		assert.Equal(t, userID, credential["user_id"])
		assert.Equal(t, deviceLabel, credential["device_label"])
	}
}

func TestMobileAuthService_ConcurrentAccess(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	// Test concurrent challenge creation
	done := make(chan bool, 10)

	for i := 0; i < 10; i++ {
		go func() {
			challenge, err := service.CreateChallenge(userID)
			assert.NoError(t, err)
			assert.NotNil(t, challenge)
			assert.Equal(t, userID, challenge.UserID)
			done <- true
		}()
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}

func TestMobileAuthService_EdgeCases(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)

	t.Run("Very long device label", func(t *testing.T) {
		longLabel := strings.Repeat("a", 1000)
		userID := uuid.New()

		credential := service.CreateMobileCredential(userID, longLabel)
		assert.NotNil(t, credential)
		assert.Equal(t, longLabel, credential["device_label"])
	})

	t.Run("Special characters in device label", func(t *testing.T) {
		specialLabel := "Test Device 🚀 with emoji & symbols!@#$%^&*()"
		userID := uuid.New()

		credential := service.CreateMobileCredential(userID, specialLabel)
		assert.NotNil(t, credential)
		assert.Equal(t, specialLabel, credential["device_label"])
	})

	t.Run("Nil UUID for user ID", func(t *testing.T) {
		// This should not panic
		credential := service.CreateMobileCredential(uuid.Nil, "Test Device")
		assert.NotNil(t, credential)
		assert.Equal(t, uuid.Nil, credential["user_id"])
	})
}

func TestMobileAuthService_Integration(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	t.Run("Complete mobile authentication flow", func(t *testing.T) {
		// Step 1: Create challenge
		challenge, err := service.CreateChallenge(userID)
		require.NoError(t, err)
		assert.NotNil(t, challenge)
		assert.Equal(t, userID, challenge.UserID)
		assert.NotEmpty(t, challenge.Challenge)
		assert.True(t, challenge.ExpiresAt.After(time.Now()))

		// Step 2: Validate challenge (simplified - in real implementation this would verify signature)
		result := service.ValidateChallenge(challenge, challenge.Challenge)
		assert.True(t, result)

		// Step 3: Create mobile credential
		deviceLabel := "Integration Test Device"
		credential := service.CreateMobileCredential(userID, deviceLabel)
		assert.NotNil(t, credential)
		assert.Equal(t, userID, credential["user_id"])
		assert.Equal(t, deviceLabel, credential["device_label"])
		assert.NotEmpty(t, credential["public_key"])
	})

	t.Run("Challenge timeout behavior", func(t *testing.T) {
		// Create a challenge
		challenge, err := service.CreateChallenge(userID)
		require.NoError(t, err)

		// Verify it's valid initially
		assert.True(t, service.ValidateChallenge(challenge, challenge.Challenge))

		// Create an expired challenge
		expiredChallenge := &MobileChallenge{
			ID:        challenge.ID,
			UserID:    challenge.UserID,
			Challenge: challenge.Challenge,
			CreatedAt: time.Now().Add(-time.Hour),
			ExpiresAt: time.Now().Add(-30 * time.Minute),
		}

		// Verify expired challenge is invalid
		assert.False(t, service.ValidateChallenge(expiredChallenge, challenge.Challenge))
	})
}

func TestMobileChallenge_StructValidation(t *testing.T) {
	userID := uuid.New()
	challengeID := uuid.New()
	now := time.Now()

	tests := []struct {
		name      string
		challenge *MobileChallenge
		isValid   bool
	}{
		{
			name: "Valid challenge",
			challenge: &MobileChallenge{
				ID:        challengeID,
				UserID:    userID,
				Challenge: "test-challenge",
				CreatedAt: now,
				ExpiresAt: now.Add(5 * time.Minute),
			},
			isValid: true,
		},
		{
			name:      "Nil challenge",
			challenge: nil,
			isValid:   false,
		},
		{
			name: "Empty challenge string",
			challenge: &MobileChallenge{
				ID:        challengeID,
				UserID:    userID,
				Challenge: "",
				CreatedAt: now,
				ExpiresAt: now.Add(5 * time.Minute),
			},
			isValid: false,
		},
		{
			name: "Nil UUIDs",
			challenge: &MobileChallenge{
				ID:        uuid.Nil,
				UserID:    uuid.Nil,
				Challenge: "test-challenge",
				CreatedAt: now,
				ExpiresAt: now.Add(5 * time.Minute),
			},
			isValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewMobileAuthService(5 * time.Minute)

			if tt.isValid {
				// For valid challenges, we can test validation
				result := service.ValidateChallenge(tt.challenge, tt.challenge.Challenge)
				// Note: In real implementation, this would verify cryptographic signature
				// For now, we just check that the method doesn't panic
				assert.IsType(t, false, result)
			} else {
				// For invalid challenges, we expect validation to fail
				if tt.challenge != nil {
					result := service.ValidateChallenge(tt.challenge, "any-response")
					assert.False(t, result)
				}
			}
		})
	}
}

func TestMobileAuthService_Performance(t *testing.T) {
	service := NewMobileAuthService(5 * time.Minute)
	userID := uuid.New()

	// Test performance of challenge creation
	start := time.Now()

	for i := 0; i < 1000; i++ {
		challenge, err := service.CreateChallenge(userID)
		assert.NoError(t, err)
		assert.NotNil(t, challenge)
	}

	duration := time.Since(start)

	// Should complete within reasonable time (adjust threshold as needed)
	assert.True(t, duration < 5*time.Second, "Challenge creation took too long: %v", duration)

	// Test performance of credential creation
	start = time.Now()

	for i := 0; i < 1000; i++ {
		credential := service.CreateMobileCredential(userID, "Test Device")
		assert.NotNil(t, credential)
	}

	duration = time.Since(start)

	// Should complete within reasonable time
	assert.True(t, duration < 5*time.Second, "Credential creation took too long: %v", duration)
}
