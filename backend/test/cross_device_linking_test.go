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

// TestCrossDeviceLinking_WebToMobile tests the complete flow of linking web user to mobile
func TestCrossDeviceLinking_WebToMobile(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	// Create services
	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	authHandler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	// Step 1: Create a web user (simulate WebAuthn registration)
	webUserID := uuid.New()
	webUser := database.User{
		ID:         webUserID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err = repo.CreateUser(webUser)
	require.NoError(t, err)

	// Step 2: Create a web session (simulate WebAuthn login)
	webCredID := uuid.New()
	webSession, _, err := sessionService.CreateSession(webUserID, webCredID, "Web Browser", "192.168.1.1", "Mozilla/5.0")
	require.NoError(t, err)
	err = repo.SaveSession(*webSession)
	require.NoError(t, err)

	webAccessToken, err := jwtService.GenerateAccessToken(webUserID, webCredID, webSession.ID, "Web Browser")
	require.NoError(t, err)

	// Step 3: Generate link token from web
	generateReq := struct {
		DeviceLabel string `json:"device_label"`
	}{
		DeviceLabel: "iPhone 15 Pro",
	}
	generateBody, _ := json.Marshal(generateReq)

	req := httptest.NewRequest("POST", "/auth/link/generate", bytes.NewBuffer(generateBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+webAccessToken)

	// Add user context to request
	ctx := req.Context()
	ctx = context.WithValue(ctx, "user_id", webUserID.String())
	ctx = context.WithValue(ctx, "session_id", webSession.ID.String())
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	authHandler.GenerateLinkToken(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var generateResp database.LinkTokenResponse
	err = json.Unmarshal(w.Body.Bytes(), &generateResp)
	require.NoError(t, err)

	assert.NotEmpty(t, generateResp.Token)
	assert.NotEmpty(t, generateResp.QRCode)
	assert.Equal(t, "iPhone 15 Pro", generateResp.DeviceLabel)

	// Step 4: Verify link token from mobile (simulate mobile app)
	verifyReq := struct {
		LinkToken   string `json:"link_token"`
		DeviceLabel string `json:"device_label"`
	}{
		LinkToken:   generateResp.Token,
		DeviceLabel: "iPhone 15 Pro",
	}
	verifyBody, _ := json.Marshal(verifyReq)

	req = httptest.NewRequest("POST", "/auth/link/verify", bytes.NewBuffer(verifyBody))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	authHandler.VerifyLinkToken(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var verifyResp database.AuthResponse
	err = json.Unmarshal(w.Body.Bytes(), &verifyResp)
	require.NoError(t, err)

	// Verify that mobile user gets the same user ID as web user
	assert.Equal(t, webUserID, verifyResp.UserID)
	assert.NotEmpty(t, verifyResp.AccessToken)
	assert.NotEmpty(t, verifyResp.RefreshToken)
	assert.Equal(t, "iPhone 15 Pro", verifyResp.DeviceLabel)

	// Step 5: Verify both devices can access the same user data
	// Test web access
	webReq := httptest.NewRequest("GET", "/auth/link/status", nil)
	webReq.Header.Set("Authorization", "Bearer "+webAccessToken)
	webCtx := webReq.Context()
	webCtx = context.WithValue(webCtx, "user_id", webUserID.String())
	webCtx = context.WithValue(webCtx, "session_id", webSession.ID.String())
	webReq = webReq.WithContext(webCtx)

	webW := httptest.NewRecorder()
	authHandler.GetLinkStatus(webW, webReq)

	assert.Equal(t, http.StatusOK, webW.Code)

	// Test mobile access
	mobileReq := httptest.NewRequest("GET", "/auth/link/status", nil)
	mobileReq.Header.Set("Authorization", "Bearer "+verifyResp.AccessToken)
	mobileCtx := mobileReq.Context()
	mobileCtx = context.WithValue(mobileCtx, "user_id", verifyResp.UserID.String())
	mobileCtx = context.WithValue(mobileCtx, "session_id", webSession.ID.String()) // Same session
	mobileReq = mobileReq.WithContext(mobileCtx)

	mobileW := httptest.NewRecorder()
	authHandler.GetLinkStatus(mobileW, mobileReq)

	assert.Equal(t, http.StatusOK, mobileW.Code)
}

// TestCrossDeviceLinking_MobileToWeb tests the complete flow of linking mobile user to web
func TestCrossDeviceLinking_MobileToWeb(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	// Create services
	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	authHandler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	// Step 1: Create a mobile user (simulate mobile registration)
	mobileUserID := uuid.New()
	mobileUser := database.User{
		ID:         mobileUserID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err = repo.CreateUser(mobileUser)
	require.NoError(t, err)

	// Step 2: Create a mobile session (simulate mobile login)
	mobileCredID := uuid.New()
	mobileSession, _, err := sessionService.CreateSession(mobileUserID, mobileCredID, "iPhone 15 Pro", "192.168.1.2", "Mobile App")
	require.NoError(t, err)
	err = repo.SaveSession(*mobileSession)
	require.NoError(t, err)

	mobileAccessToken, err := jwtService.GenerateAccessToken(mobileUserID, mobileCredID, mobileSession.ID, "iPhone 15 Pro")
	require.NoError(t, err)

	// Step 3: Generate link token from mobile
	generateReq := struct {
		DeviceLabel string `json:"device_label"`
	}{
		DeviceLabel: "Web Browser",
	}
	generateBody, _ := json.Marshal(generateReq)

	req := httptest.NewRequest("POST", "/auth/link/generate", bytes.NewBuffer(generateBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+mobileAccessToken)

	// Add user context to request
	ctx := req.Context()
	ctx = context.WithValue(ctx, "user_id", mobileUserID.String())
	ctx = context.WithValue(ctx, "session_id", mobileSession.ID.String())
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	authHandler.GenerateLinkToken(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var generateResp database.LinkTokenResponse
	err = json.Unmarshal(w.Body.Bytes(), &generateResp)
	require.NoError(t, err)

	assert.NotEmpty(t, generateResp.Token)
	assert.NotEmpty(t, generateResp.QRCode)
	assert.Equal(t, "Web Browser", generateResp.DeviceLabel)

	// Step 4: Verify link token from web (simulate web browser)
	verifyReq := struct {
		LinkToken   string `json:"link_token"`
		DeviceLabel string `json:"device_label"`
	}{
		LinkToken:   generateResp.Token,
		DeviceLabel: "Web Browser",
	}
	verifyBody, _ := json.Marshal(verifyReq)

	req = httptest.NewRequest("POST", "/auth/link/verify", bytes.NewBuffer(verifyBody))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	authHandler.VerifyLinkToken(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var verifyResp database.AuthResponse
	err = json.Unmarshal(w.Body.Bytes(), &verifyResp)
	require.NoError(t, err)

	// Verify that web user gets the same user ID as mobile user
	assert.Equal(t, mobileUserID, verifyResp.UserID)
	assert.NotEmpty(t, verifyResp.AccessToken)
	assert.NotEmpty(t, verifyResp.RefreshToken)
	assert.Equal(t, "Web Browser", verifyResp.DeviceLabel)

	// Step 5: Verify both devices can access the same user data
	// Test mobile access
	mobileReq := httptest.NewRequest("GET", "/auth/link/status", nil)
	mobileReq.Header.Set("Authorization", "Bearer "+mobileAccessToken)
	mobileCtx := mobileReq.Context()
	mobileCtx = context.WithValue(mobileCtx, "user_id", mobileUserID.String())
	mobileCtx = context.WithValue(mobileCtx, "session_id", mobileSession.ID.String())
	mobileReq = mobileReq.WithContext(mobileCtx)

	mobileW := httptest.NewRecorder()
	authHandler.GetLinkStatus(mobileW, mobileReq)

	assert.Equal(t, http.StatusOK, mobileW.Code)

	// Test web access
	webReq := httptest.NewRequest("GET", "/auth/link/status", nil)
	webReq.Header.Set("Authorization", "Bearer "+verifyResp.AccessToken)
	webCtx := webReq.Context()
	webCtx = context.WithValue(webCtx, "user_id", verifyResp.UserID.String())
	webCtx = context.WithValue(webCtx, "session_id", mobileSession.ID.String()) // Same session
	webReq = webReq.WithContext(webCtx)

	webW := httptest.NewRecorder()
	authHandler.GetLinkStatus(webW, webReq)

	assert.Equal(t, http.StatusOK, webW.Code)
}

// TestCrossDeviceLinking_ErrorCases tests error scenarios
func TestCrossDeviceLinking_ErrorCases(t *testing.T) {
	err := SetupTestDB()
	require.NoError(t, err)
	defer CleanupTestDB()

	// Create services
	jwtService := auth.NewJWTService("test-secret-key", "test-issuer", "test-audience", 15*time.Minute, 7*24*time.Hour)
	webAuthnService, err := auth.NewWebAuthnService("localhost", "Test App", "http://localhost:8080")
	require.NoError(t, err)
	sessionService := auth.NewSessionService(7 * 24 * time.Hour)
	mobileService := auth.NewMobileAuthService(5 * time.Minute)

	repo := database.NewRepository(TestDB)
	authHandler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)

	t.Run("Generate link token without authentication", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/auth/link/generate", bytes.NewBuffer([]byte(`{"device_label": "Test Device"}`)))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		authHandler.GenerateLinkToken(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Verify invalid link token", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/auth/link/verify", bytes.NewBuffer([]byte(`{"link_token": "invalid-token", "device_label": "Test Device"}`)))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		authHandler.VerifyLinkToken(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Verify expired link token", func(t *testing.T) {
		// Create an expired link token
		expiredToken := database.LinkToken{
			ID:          uuid.New(),
			TokenHash:   "expired-hash",
			UserID:      uuid.New(),
			CreatedAt:   time.Now().Add(-15 * time.Minute),
			ExpiresAt:   time.Now().Add(-5 * time.Minute), // Expired
			DeviceLabel: "Test Device",
		}
		err := repo.SaveLinkToken(expiredToken)
		require.NoError(t, err)

		req := httptest.NewRequest("POST", "/auth/link/verify", bytes.NewBuffer([]byte(`{"link_token": "expired-token", "device_label": "Test Device"}`)))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		authHandler.VerifyLinkToken(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
