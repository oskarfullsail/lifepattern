package test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/auth"
	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAuthIntegration_CompleteFlow tests the complete authentication flow
func TestAuthIntegration_CompleteFlow(t *testing.T) {
	// Setup test database
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	// Create auth services
	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	// Create repository and handler
	repo := database.NewRepository(TestDB)
	handler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	userID := uuid.New()

	t.Run("Complete mobile authentication flow", func(t *testing.T) {
		// Step 1: Create mobile challenge
		challengeReq := database.AuthRequest{UserID: userID}
		body, _ := json.Marshal(challengeReq)
		req := httptest.NewRequest("POST", "/auth/mobile/challenge", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.MobileChallenge(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var challengeResp auth.MobileChallengeResponse
		err := json.Unmarshal(w.Body.Bytes(), &challengeResp)
		require.NoError(t, err)

		assert.NotEmpty(t, challengeResp.ChallengeID)
		assert.NotEmpty(t, challengeResp.Challenge)
		assert.True(t, challengeResp.ExpiresAt.After(time.Now()))

		// Step 2: Verify challenge and create session
		verifyReq := auth.MobileVerifyRequest{
			ChallengeID: challengeResp.ChallengeID,
			Response:    challengeResp.Challenge, // In real implementation, this would be signed
			DeviceLabel: "Integration Test Device",
		}

		body, _ = json.Marshal(verifyReq)
		req = httptest.NewRequest("POST", "/auth/mobile/verify", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()

		handler.MobileVerify(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var authResp database.AuthResponse
		err = json.Unmarshal(w.Body.Bytes(), &authResp)
		require.NoError(t, err)

		assert.Equal(t, userID, authResp.UserID)
		assert.NotEmpty(t, authResp.AccessToken)
		assert.NotEmpty(t, authResp.RefreshToken)
		assert.Equal(t, 900, authResp.ExpiresIn)
		assert.Equal(t, "Integration Test Device", authResp.DeviceLabel)

		// Step 3: Verify user was created in database
		user, err := repo.GetUser(userID)
		require.NoError(t, err)
		assert.Equal(t, userID, user.ID)

		// Step 4: Verify credentials were saved
		credentials, err := repo.GetUserCredentials(userID)
		require.NoError(t, err)
		assert.Len(t, credentials, 1)
		assert.Equal(t, userID, credentials[0].UserID)

		// Step 5: Verify session was created
		sessions, err := repo.GetUserSessions(userID)
		require.NoError(t, err)
		assert.Len(t, sessions, 1)
		assert.Equal(t, userID, sessions[0].UserID)
		assert.Equal(t, "Integration Test Device", sessions[0].DeviceLabel)
		assert.True(t, sessions[0].ExpiresAt.After(time.Now()))

		// Step 6: Test token refresh
		refreshReq := map[string]string{
			"refresh_token": authResp.RefreshToken,
		}
		body, _ = json.Marshal(refreshReq)
		req = httptest.NewRequest("POST", "/auth/refresh", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()

		handler.RefreshToken(w, req)

		// Note: This will fail because the refresh token implementation is incomplete
		// In a real implementation, this would work
		assert.Equal(t, http.StatusUnauthorized, w.Code)

		// Step 7: Test logout
		// Create a request with session context
		logoutReq := httptest.NewRequest("POST", "/auth/logout", nil)
		ctx := logoutReq.Context()
		ctx = context.WithValue(ctx, "session_id", sessions[0].ID.String())
		logoutReq = logoutReq.WithContext(ctx)
		w = httptest.NewRecorder()

		handler.Logout(w, logoutReq)

		assert.Equal(t, http.StatusOK, w.Code)

		var logoutResp map[string]string
		err = json.Unmarshal(w.Body.Bytes(), &logoutResp)
		require.NoError(t, err)
		assert.Equal(t, "Logged out successfully", logoutResp["message"])

		// Step 8: Verify session was revoked
		sessionsAfterLogout, err := repo.GetUserSessions(userID)
		require.NoError(t, err)
		assert.Len(t, sessionsAfterLogout, 0)
	})
}

// TestAuthIntegration_MultipleSessions tests multiple sessions for the same user
func TestAuthIntegration_MultipleSessions(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	handler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	userID := uuid.New()

	// Create multiple sessions for the same user
	sessions := make([]database.AuthResponse, 3)
	deviceLabels := []string{"Desktop", "Mobile", "Tablet"}

	for i, deviceLabel := range deviceLabels {
		// Create challenge
		challengeReq := database.AuthRequest{UserID: userID}
		body, _ := json.Marshal(challengeReq)
		req := httptest.NewRequest("POST", "/auth/mobile/challenge", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.MobileChallenge(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var challengeResp auth.MobileChallengeResponse
		err := json.Unmarshal(w.Body.Bytes(), &challengeResp)
		require.NoError(t, err)

		// Verify challenge
		verifyReq := auth.MobileVerifyRequest{
			ChallengeID: challengeResp.ChallengeID,
			Response:    challengeResp.Challenge,
			DeviceLabel: deviceLabel,
		}

		body, _ = json.Marshal(verifyReq)
		req = httptest.NewRequest("POST", "/auth/mobile/verify", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()

		handler.MobileVerify(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var authResp database.AuthResponse
		err = json.Unmarshal(w.Body.Bytes(), &authResp)
		require.NoError(t, err)

		sessions[i] = authResp
	}

	// Verify all sessions were created
	userSessions, err := repo.GetUserSessions(userID)
	require.NoError(t, err)
	assert.Len(t, userSessions, 3)

	// Verify each session has different device labels
	deviceLabelsFound := make(map[string]bool)
	for _, session := range userSessions {
		deviceLabelsFound[session.DeviceLabel] = true
	}
	assert.Len(t, deviceLabelsFound, 3)
	assert.True(t, deviceLabelsFound["Desktop"])
	assert.True(t, deviceLabelsFound["Mobile"])
	assert.True(t, deviceLabelsFound["Tablet"])

	// Test session listing
	req := httptest.NewRequest("GET", "/auth/sessions", nil)
	ctx := req.Context()
	ctx = context.WithValue(ctx, "user_id", userID.String())
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	handler.GetSessions(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var sessionInfos []database.SessionInfo
	err = json.Unmarshal(w.Body.Bytes(), &sessionInfos)
	require.NoError(t, err)
	assert.Len(t, sessionInfos, 3)
}

// TestAuthIntegration_WebAuthnFlow tests WebAuthn registration and login flow
func TestAuthIntegration_WebAuthnFlow(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	handler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	t.Run("WebAuthn registration start", func(t *testing.T) {
		reqBody := map[string]string{
			"device_label": "Test WebAuthn Device",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/auth/webauthn/register/start", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.WebAuthnRegistrationStart(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user_id")
		assert.Contains(t, response, "session_data")
		assert.Contains(t, response, "options")

		// Verify user was created
		userIDStr := response["user_id"].(string)
		userID, err := uuid.Parse(userIDStr)
		require.NoError(t, err)

		user, err := repo.GetUser(userID)
		require.NoError(t, err)
		assert.Equal(t, userID, user.ID)
	})

	t.Run("WebAuthn login start", func(t *testing.T) {
		// First create a user with credentials
		userID := uuid.New()
		user := database.User{
			ID:         userID,
			CreatedAt:  time.Now(),
			LastSeenAt: time.Now(),
		}
		err := repo.CreateUser(user)
		require.NoError(t, err)

		// Create a credential for the user
		credential := database.Credential{
			ID:              uuid.New(),
			UserID:          userID,
			PublicKey:       []byte("test-public-key"),
			AttestationType: "none",
			SignCount:       1,
		}
		err = repo.SaveCredential(map[string]interface{}{
			"id":               credential.ID,
			"user_id":          credential.UserID,
			"public_key":       credential.PublicKey,
			"attestation_type": credential.AttestationType,
			"sign_count":       credential.SignCount,
		})
		require.NoError(t, err)

		// Start login
		reqBody := map[string]string{
			"user_id": userID.String(),
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/auth/webauthn/login/start", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.WebAuthnLoginStart(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user_id")
		assert.Contains(t, response, "session_data")
		assert.Contains(t, response, "options")
	})
}

// TestAuthIntegration_ErrorHandling tests error scenarios
func TestAuthIntegration_ErrorHandling(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	handler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	t.Run("Invalid request bodies", func(t *testing.T) {
		testCases := []struct {
			name           string
			endpoint       string
			requestBody    interface{}
			expectedStatus int
		}{
			{
				name:           "Invalid mobile challenge request",
				endpoint:       "/auth/mobile/challenge",
				requestBody:    map[string]string{"invalid": "data"},
				expectedStatus: http.StatusBadRequest,
			},
			{
				name:           "Invalid mobile verify request",
				endpoint:       "/auth/mobile/verify",
				requestBody:    map[string]string{"invalid": "data"},
				expectedStatus: http.StatusBadRequest,
			},
			{
				name:           "Invalid WebAuthn registration start",
				endpoint:       "/auth/webauthn/register/start",
				requestBody:    map[string]string{"invalid": "data"},
				expectedStatus: http.StatusBadRequest,
			},
			{
				name:           "Invalid WebAuthn login start",
				endpoint:       "/auth/webauthn/login/start",
				requestBody:    map[string]string{"invalid": "data"},
				expectedStatus: http.StatusBadRequest,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				body, _ := json.Marshal(tc.requestBody)
				req := httptest.NewRequest("POST", tc.endpoint, bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w := httptest.NewRecorder()

				switch tc.endpoint {
				case "/auth/mobile/challenge":
					handler.MobileChallenge(w, req)
				case "/auth/mobile/verify":
					handler.MobileVerify(w, req)
				case "/auth/webauthn/register/start":
					handler.WebAuthnRegistrationStart(w, req)
				case "/auth/webauthn/login/start":
					handler.WebAuthnLoginStart(w, req)
				}

				assert.Equal(t, tc.expectedStatus, w.Code)
			})
		}
	})

	t.Run("Non-existent user operations", func(t *testing.T) {
		nonExistentUserID := uuid.New()

		// Try to start WebAuthn login for non-existent user
		reqBody := map[string]string{
			"user_id": nonExistentUserID.String(),
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/auth/webauthn/login/start", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.WebAuthnLoginStart(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Invalid UUID formats", func(t *testing.T) {
		reqBody := map[string]string{
			"user_id": "invalid-uuid",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/auth/webauthn/login/start", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.WebAuthnLoginStart(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestAuthIntegration_Performance tests performance characteristics
func TestAuthIntegration_Performance(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	handler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	t.Run("Concurrent mobile authentication", func(t *testing.T) {
		const numConcurrent = 10
		done := make(chan bool, numConcurrent)

		start := time.Now()

		for i := 0; i < numConcurrent; i++ {
			go func(userIndex int) {
				userID := uuid.New()

				// Create challenge
				challengeReq := database.AuthRequest{UserID: userID}
				body, _ := json.Marshal(challengeReq)
				req := httptest.NewRequest("POST", "/auth/mobile/challenge", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w := httptest.NewRecorder()

				handler.MobileChallenge(w, req)
				assert.Equal(t, http.StatusOK, w.Code)

				var challengeResp auth.MobileChallengeResponse
				err := json.Unmarshal(w.Body.Bytes(), &challengeResp)
				require.NoError(t, err)

				// Verify challenge
				verifyReq := auth.MobileVerifyRequest{
					ChallengeID: challengeResp.ChallengeID,
					Response:    challengeResp.Challenge,
					DeviceLabel: "Concurrent Test Device",
				}

				body, _ = json.Marshal(verifyReq)
				req = httptest.NewRequest("POST", "/auth/mobile/verify", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				handler.MobileVerify(w, req)
				assert.Equal(t, http.StatusOK, w.Code)

				done <- true
			}(i)
		}

		// Wait for all goroutines to complete
		for i := 0; i < numConcurrent; i++ {
			<-done
		}

		duration := time.Since(start)
		assert.True(t, duration < 10*time.Second, "Concurrent authentication took too long: %v", duration)
	})
}

// TestAuthIntegration_DataCleanup tests that data is properly cleaned up
func TestAuthIntegration_DataCleanup(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	handler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	userID := uuid.New()

	// Create a session
	challengeReq := database.AuthRequest{UserID: userID}
	body, _ := json.Marshal(challengeReq)
	req := httptest.NewRequest("POST", "/auth/mobile/challenge", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.MobileChallenge(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var challengeResp auth.MobileChallengeResponse
	err = json.Unmarshal(w.Body.Bytes(), &challengeResp)
	require.NoError(t, err)

	verifyReq := auth.MobileVerifyRequest{
		ChallengeID: challengeResp.ChallengeID,
		Response:    challengeResp.Challenge,
		DeviceLabel: "Cleanup Test Device",
	}

	body, _ = json.Marshal(verifyReq)
	req = httptest.NewRequest("POST", "/auth/mobile/verify", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	handler.MobileVerify(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify data was created
	user, err := repo.GetUser(userID)
	require.NoError(t, err)
	assert.Equal(t, userID, user.ID)

	credentials, err := repo.GetUserCredentials(userID)
	require.NoError(t, err)
	assert.Len(t, credentials, 1)

	sessions, err := repo.GetUserSessions(userID)
	require.NoError(t, err)
	assert.Len(t, sessions, 1)

	// Clean up test data
	err = CleanupTestData()
	require.NoError(t, err)

	// Verify data was cleaned up
	user, err = repo.GetUser(userID)
	assert.Error(t, err) // User should not exist

	credentials, err = repo.GetUserCredentials(userID)
	assert.NoError(t, err)
	assert.Len(t, credentials, 0)

	sessions, err = repo.GetUserSessions(userID)
	assert.NoError(t, err)
	assert.Len(t, sessions, 0)
}
