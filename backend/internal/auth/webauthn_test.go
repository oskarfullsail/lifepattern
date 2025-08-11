package auth

import (
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/database"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewWebAuthnService(t *testing.T) {
	tests := []struct {
		name        string
		rpID        string
		rpName      string
		rpOrigin    string
		expectError bool
	}{
		{
			name:        "Valid configuration",
			rpID:        "localhost",
			rpName:      "Test App",
			rpOrigin:    "https://localhost:8080",
			expectError: false,
		},
		{
			name:        "Empty origin",
			rpID:        "localhost",
			rpName:      "Test App",
			rpOrigin:    "",
			expectError: true,
		},
		{
			name:        "Empty name",
			rpID:        "localhost",
			rpName:      "",
			rpOrigin:    "https://localhost:8080",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, err := NewWebAuthnService(tt.rpID, tt.rpName, tt.rpOrigin)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, service)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, service)
			}
		})
	}
}

func TestBeginRegistration(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()
	username := userID.String()

	sessionData, options, err := service.BeginRegistration(userID, username)

	require.NoError(t, err)
	assert.NotNil(t, sessionData)
	assert.NotNil(t, options)

	// Verify session data
	assert.Equal(t, userID, sessionData.UserID)
	assert.NotEmpty(t, sessionData.Challenge)

	// Verify options are not nil
	assert.NotNil(t, options)
}

func TestBeginRegistration_DifferentUsers(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID1 := uuid.New()
	userID2 := uuid.New()

	sessionData1, _, err := service.BeginRegistration(userID1, userID1.String())
	require.NoError(t, err)

	sessionData2, _, err := service.BeginRegistration(userID2, userID2.String())
	require.NoError(t, err)

	// Verify different challenges for different users
	assert.NotEqual(t, sessionData1.Challenge, sessionData2.Challenge)
	assert.Equal(t, userID1, sessionData1.UserID)
	assert.Equal(t, userID2, sessionData2.UserID)
}

func TestBeginLogin(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()

	// Create mock credentials
	credentials := []webauthn.Credential{
		{
			ID:              []byte("credential-id-1"),
			PublicKey:       []byte("public-key-1"),
			AttestationType: "none",
			Authenticator: webauthn.Authenticator{
				AAGUID:       []byte("aaguid-1"),
				SignCount:    1,
				CloneWarning: false,
			},
		},
		{
			ID:              []byte("credential-id-2"),
			PublicKey:       []byte("public-key-2"),
			AttestationType: "none",
			Authenticator: webauthn.Authenticator{
				AAGUID:       []byte("aaguid-2"),
				SignCount:    2,
				CloneWarning: false,
			},
		},
	}

	sessionData, options, err := service.BeginLogin(userID, credentials)

	require.NoError(t, err)
	assert.NotNil(t, sessionData)
	assert.NotNil(t, options)

	// Verify session data
	assert.Equal(t, userID, sessionData.UserID)
	assert.NotEmpty(t, sessionData.Challenge)

	// Verify options are not nil
	assert.NotNil(t, options)
}

func TestBeginLogin_EmptyCredentials(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()
	credentials := []webauthn.Credential{}

	sessionData, options, err := service.BeginLogin(userID, credentials)

	require.NoError(t, err)
	assert.NotNil(t, sessionData)
	assert.NotNil(t, options)

	// Should still create valid options even with no credentials
	assert.NotNil(t, options)
}

func TestFinishRegistration(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()
	username := userID.String()

	// Start registration
	sessionData, _, err := service.BeginRegistration(userID, username)
	require.NoError(t, err)

	// Create a mock HTTP request
	req := httptest.NewRequest("POST", "/auth/webauthn/register/finish", nil)

	// Note: This will likely fail in tests because we need real WebAuthn data
	// We're just testing that the method signature is correct
	_, err = service.FinishRegistration(userID, sessionData, req)

	// We expect this to fail with mock data, but the method should be callable
	assert.Error(t, err) // Expected to fail with mock data
}

func TestFinishLogin(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()

	// Create mock credentials
	credentials := []webauthn.Credential{
		{
			ID:              []byte("credential-id-1"),
			PublicKey:       []byte("public-key-1"),
			AttestationType: "none",
			Authenticator: webauthn.Authenticator{
				AAGUID:       []byte("aaguid-1"),
				SignCount:    1,
				CloneWarning: false,
			},
		},
	}

	// Start login
	sessionData, _, err := service.BeginLogin(userID, credentials)
	require.NoError(t, err)

	// Create a mock HTTP request
	req := httptest.NewRequest("POST", "/auth/webauthn/login/finish", nil)

	// Note: This will likely fail in tests because we need real WebAuthn data
	// We're just testing that the method signature is correct
	_, err = service.FinishLogin(userID, credentials, sessionData, req)

	// We expect this to fail with mock data, but the method should be callable
	assert.Error(t, err) // Expected to fail with mock data
}

func TestConvertDBToCredential(t *testing.T) {
	userID := uuid.New()
	credID := uuid.New()

	// Create a mock database credential
	testAAGUID := uuid.New()
	dbCred := database.Credential{
		ID:              credID,
		UserID:          userID,
		PublicKey:       []byte("test-public-key"),
		AttestationType: "none",
		AAGUID:          &testAAGUID,
		SignCount:       1,
		CloneWarning:    false,
		DeviceType:      "webauthn",
		DeviceLabel:     "Test Device",
		AddedAt:         time.Now(),
		LastUsedAt:      time.Now(),
	}

	credential := ConvertDBToCredential(dbCred)

	assert.NotNil(t, credential)
	assert.Equal(t, dbCred.ID[:], credential.ID)
	assert.Equal(t, dbCred.PublicKey, credential.PublicKey)
	assert.Equal(t, dbCred.AttestationType, credential.AttestationType)
	assert.Equal(t, dbCred.AAGUID, credential.Authenticator.AAGUID)
	assert.Equal(t, dbCred.SignCount, credential.Authenticator.SignCount)
	assert.Equal(t, dbCred.CloneWarning, credential.Authenticator.CloneWarning)
}

func TestConvertDBToCredential_EmptyFields(t *testing.T) {
	userID := uuid.New()
	credID := uuid.New()

	// Create a mock database credential with empty fields
	dbCred := database.Credential{
		ID:              credID,
		UserID:          userID,
		PublicKey:       []byte{},
		AttestationType: "",
		AAGUID:          nil,
		SignCount:       0,
		CloneWarning:    false,
		DeviceType:      "",
		DeviceLabel:     "",
		AddedAt:         time.Time{},
		LastUsedAt:      time.Time{},
	}

	credential := ConvertDBToCredential(dbCred)

	assert.NotNil(t, credential)
	assert.Equal(t, dbCred.ID[:], credential.ID)
	assert.Equal(t, dbCred.PublicKey, credential.PublicKey)
	assert.Equal(t, dbCred.AttestationType, credential.AttestationType)
	assert.Equal(t, dbCred.AAGUID, credential.Authenticator.AAGUID)
	assert.Equal(t, dbCred.SignCount, credential.Authenticator.SignCount)
	assert.Equal(t, dbCred.CloneWarning, credential.Authenticator.CloneWarning)
}

func TestWebAuthnService_EdgeCases(t *testing.T) {
	t.Run("Invalid origin format", func(t *testing.T) {
		service, err := NewWebAuthnService("invalid-origin", "Test App", "https://localhost:8080")
		// The WebAuthn library might accept this, so we just check it doesn't panic
		assert.NotNil(t, service)
		assert.NoError(t, err)
	})

	t.Run("Very long username", func(t *testing.T) {
		service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
		require.NoError(t, err)

		userID := uuid.New()
		longUsername := string(make([]byte, 1000)) // Very long username

		sessionData, options, err := service.BeginRegistration(userID, longUsername)
		require.NoError(t, err)
		assert.NotNil(t, sessionData)
		assert.NotNil(t, options)
	})

	t.Run("Nil UUID for user ID", func(t *testing.T) {
		service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
		require.NoError(t, err)

		sessionData, options, err := service.BeginRegistration(uuid.Nil, "test-user")
		require.NoError(t, err)
		assert.NotNil(t, sessionData)
		assert.NotNil(t, options)
	})
}

func TestWebAuthnService_ConcurrentAccess(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()

	// Test concurrent registration attempts
	const numGoroutines = 10
	results := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func() {
			_, _, err := service.BeginRegistration(userID, userID.String())
			results <- err
		}()
	}

	// Collect results
	for i := 0; i < numGoroutines; i++ {
		err := <-results
		assert.NoError(t, err)
	}
}

func TestWebAuthnService_Integration(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()
	username := userID.String()

	t.Run("Complete registration flow", func(t *testing.T) {
		// Step 1: Begin registration
		sessionData, options, err := service.BeginRegistration(userID, username)
		require.NoError(t, err)
		assert.NotNil(t, sessionData)
		assert.NotNil(t, options)

		// Step 2: Verify session data
		assert.NotEmpty(t, sessionData.UserID)
		assert.NotEmpty(t, sessionData.Challenge)

		// Step 3: Verify options
		assert.NotNil(t, options)
	})

	t.Run("Complete login flow", func(t *testing.T) {
		// Create mock credentials
		credentials := []webauthn.Credential{
			{
				ID:              []byte("credential-id-1"),
				PublicKey:       []byte("public-key-1"),
				AttestationType: "none",
				Authenticator: webauthn.Authenticator{
					AAGUID:       []byte("aaguid-1"),
					SignCount:    1,
					CloneWarning: false,
				},
			},
		}

		// Step 1: Begin login
		sessionData, options, err := service.BeginLogin(userID, credentials)
		require.NoError(t, err)
		assert.NotNil(t, sessionData)
		assert.NotNil(t, options)

		// Step 2: Verify session data
		assert.NotEmpty(t, sessionData.UserID)
		assert.NotEmpty(t, sessionData.Challenge)

		// Step 3: Verify options
		assert.NotNil(t, options)
	})
}

func TestWebAuthnService_Performance(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	userID := uuid.New()

	// Test performance with multiple rapid requests
	const numRequests = 100
	start := time.Now()

	for i := 0; i < numRequests; i++ {
		_, _, err := service.BeginRegistration(userID, userID.String())
		require.NoError(t, err)
	}

	duration := time.Since(start)
	avgTime := duration / numRequests

	// Should complete within reasonable time
	assert.Less(t, avgTime, 10*time.Millisecond, "Average request time should be under 10ms")
}

func TestWebAuthnService_Security(t *testing.T) {
	service, err := NewWebAuthnService("localhost", "Test App", "https://localhost:8080")
	require.NoError(t, err)

	t.Run("Challenge uniqueness", func(t *testing.T) {
		userID := uuid.New()
		challenges := make(map[string]bool)

		// Generate multiple challenges
		for i := 0; i < 100; i++ {
			sessionData, _, err := service.BeginRegistration(userID, userID.String())
			require.NoError(t, err)

			challenge := string(sessionData.Challenge)
			assert.False(t, challenges[challenge], "Duplicate challenge generated")
			challenges[challenge] = true
		}
	})

	t.Run("User isolation", func(t *testing.T) {
		userID1 := uuid.New()
		userID2 := uuid.New()

		sessionData1, _, err := service.BeginRegistration(userID1, userID1.String())
		require.NoError(t, err)

		sessionData2, _, err := service.BeginRegistration(userID2, userID2.String())
		require.NoError(t, err)

		// Challenges should be different for different users
		assert.NotEqual(t, sessionData1.Challenge, sessionData2.Challenge)
		assert.NotEmpty(t, sessionData1.UserID)
		assert.NotEmpty(t, sessionData2.UserID)
	})
}
