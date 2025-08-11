package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"lifepattern-api/internal/auth"
	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	repo            services.RepositoryInterface
	jwtService      *auth.JWTService
	webAuthnService *auth.WebAuthnService
	sessionService  *auth.SessionService
	mobileService   *auth.MobileAuthService
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(repo services.RepositoryInterface, jwtService *auth.JWTService, webAuthnService *auth.WebAuthnService, sessionService *auth.SessionService, mobileService *auth.MobileAuthService) *AuthHandler {
	return &AuthHandler{
		repo:            repo,
		jwtService:      jwtService,
		webAuthnService: webAuthnService,
		sessionService:  sessionService,
		mobileService:   mobileService,
	}
}

// WebAuthnRegistrationStart handles WebAuthn registration start
func (h *AuthHandler) WebAuthnRegistrationStart(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create new user
	userID := uuid.New()
	user := database.User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}

	if err := h.repo.CreateUser(user); err != nil {
		log.Printf("❌ Failed to create user: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Start WebAuthn registration
	sessionData, options, err := h.webAuthnService.BeginRegistration(userID, userID.String())
	if err != nil {
		log.Printf("❌ Failed to begin WebAuthn registration: %v", err)
		http.Error(w, "Failed to start registration", http.StatusInternalServerError)
		return
	}

	// Store session data (in production, use Redis or similar)
	// For now, we'll return it in the response
	response := map[string]interface{}{
		"user_id":      userID.String(),
		"session_data": sessionData,
		"options":      options,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// WebAuthnRegistrationFinish handles WebAuthn registration finish
func (h *AuthHandler) WebAuthnRegistrationFinish(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID      string `json:"user_id"`
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Finish WebAuthn registration
	credential, err := h.webAuthnService.FinishRegistration(userID, nil, r)
	if err != nil {
		log.Printf("❌ Failed to finish WebAuthn registration: %v", err)
		http.Error(w, "Failed to complete registration", http.StatusInternalServerError)
		return
	}

	// Save credential to database
	credData := auth.ConvertCredentialToDB(userID, credential, "webauthn", req.DeviceLabel)
	if err := h.repo.SaveCredential(credData); err != nil {
		log.Printf("❌ Failed to save credential: %v", err)
		http.Error(w, "Failed to save credential", http.StatusInternalServerError)
		return
	}

	// Create session
	credID := credData["id"].(uuid.UUID)
	session, refreshToken, err := h.sessionService.CreateSession(userID, credID, req.DeviceLabel, r.RemoteAddr, r.UserAgent())
	if err != nil {
		log.Printf("❌ Failed to create session: %v", err)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Save session to database
	if err := h.repo.SaveSession(*session); err != nil {
		log.Printf("❌ Failed to save session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(userID, credID, session.ID, req.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       userID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// WebAuthnLoginStart handles WebAuthn login start
func (h *AuthHandler) WebAuthnLoginStart(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get user credentials
	credentials, err := h.repo.GetUserCredentials(userID)
	if err != nil {
		log.Printf("❌ Failed to get user credentials: %v", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Convert to WebAuthn credentials
	var webauthnCreds []webauthn.Credential
	for _, cred := range credentials {
		webauthnCred := auth.ConvertDBToCredential(cred)
		webauthnCreds = append(webauthnCreds, webauthnCred)
	}

	// Start WebAuthn login
	sessionData, options, err := h.webAuthnService.BeginLogin(userID, webauthnCreds)
	if err != nil {
		log.Printf("❌ Failed to begin WebAuthn login: %v", err)
		http.Error(w, "Failed to start login", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"user_id":      userID.String(),
		"session_data": sessionData,
		"options":      options,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// WebAuthnLoginFinish handles WebAuthn login finish
func (h *AuthHandler) WebAuthnLoginFinish(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID      string `json:"user_id"`
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get user credentials
	credentials, err := h.repo.GetUserCredentials(userID)
	if err != nil {
		log.Printf("❌ Failed to get user credentials: %v", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Convert to WebAuthn credentials
	var webauthnCreds []webauthn.Credential
	for _, cred := range credentials {
		webauthnCred := auth.ConvertDBToCredential(cred)
		webauthnCreds = append(webauthnCreds, webauthnCred)
	}

	// Finish WebAuthn login
	credential, err := h.webAuthnService.FinishLogin(userID, webauthnCreds, nil, r)
	if err != nil {
		log.Printf("❌ Failed to finish WebAuthn login: %v", err)
		http.Error(w, "Failed to complete login", http.StatusInternalServerError)
		return
	}

	// Find the credential ID
	var credID uuid.UUID
	for _, cred := range credentials {
		// Compare public keys by converting to string for comparison
		if string(cred.PublicKey) == string(credential.PublicKey) {
			credID = cred.ID
			break
		}
	}

	// Create session
	session, refreshToken, err := h.sessionService.CreateSession(userID, credID, req.DeviceLabel, r.RemoteAddr, r.UserAgent())
	if err != nil {
		log.Printf("❌ Failed to create session: %v", err)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Save session to database
	if err := h.repo.SaveSession(*session); err != nil {
		log.Printf("❌ Failed to save session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(userID, credID, session.ID, req.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       userID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MobileChallenge handles mobile authentication challenge
func (h *AuthHandler) MobileChallenge(w http.ResponseWriter, r *http.Request) {
	var req database.AuthRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create challenge
	challenge, err := h.mobileService.CreateChallenge(req.UserID)
	if err != nil {
		log.Printf("❌ Failed to create mobile challenge: %v", err)
		http.Error(w, "Failed to create challenge", http.StatusInternalServerError)
		return
	}

	// Save challenge to database (in production, use Redis with TTL)
	dbChallenge := database.MobileChallenge{
		ID:        challenge.ID,
		UserID:    challenge.UserID,
		Challenge: challenge.Challenge,
		CreatedAt: challenge.CreatedAt,
		ExpiresAt: challenge.ExpiresAt,
	}
	if err := h.repo.SaveMobileChallenge(dbChallenge); err != nil {
		log.Printf("❌ Failed to save mobile challenge: %v", err)
		http.Error(w, "Failed to save challenge", http.StatusInternalServerError)
		return
	}

	response := auth.MobileChallengeResponse{
		ChallengeID: challenge.ID,
		Challenge:   challenge.Challenge,
		ExpiresAt:   challenge.ExpiresAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MobileVerify handles mobile authentication verification
func (h *AuthHandler) MobileVerify(w http.ResponseWriter, r *http.Request) {
	var req auth.MobileVerifyRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get challenge from database
	challenge, err := h.repo.GetMobileChallenge(req.ChallengeID)
	if err != nil {
		log.Printf("❌ Failed to get mobile challenge: %v", err)
		http.Error(w, "Challenge not found", http.StatusNotFound)
		return
	}

	// Validate challenge response
	authChallenge := &auth.MobileChallenge{
		ID:        challenge.ID,
		UserID:    challenge.UserID,
		Challenge: challenge.Challenge,
		CreatedAt: challenge.CreatedAt,
		ExpiresAt: challenge.ExpiresAt,
	}
	if !h.mobileService.ValidateChallenge(authChallenge, req.Response) {
		http.Error(w, "Invalid challenge response", http.StatusUnauthorized)
		return
	}

	// Create mobile credential
	credData := h.mobileService.CreateMobileCredential(challenge.UserID, req.DeviceLabel)
	if err := h.repo.SaveCredential(credData); err != nil {
		log.Printf("❌ Failed to save mobile credential: %v", err)
		http.Error(w, "Failed to save credential", http.StatusInternalServerError)
		return
	}

	// Create session
	credID := credData["id"].(uuid.UUID)
	session, refreshToken, err := h.sessionService.CreateSession(challenge.UserID, credID, req.DeviceLabel, r.RemoteAddr, r.UserAgent())
	if err != nil {
		log.Printf("❌ Failed to create session: %v", err)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Save session to database
	if err := h.repo.SaveSession(*session); err != nil {
		log.Printf("❌ Failed to save session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(challenge.UserID, credID, session.ID, req.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       challenge.UserID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Login handles traditional username/passphrase authentication
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		Passphrase  string `json:"passphrase"`
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Passphrase == "" {
		http.Error(w, "Username and passphrase are required", http.StatusBadRequest)
		return
	}

		// Validate credentials against stored user credentials
	userCred, err := h.repo.GetUserCredentialByUsername(req.Username)
	if err != nil {
		log.Printf("❌ User not found: %v", err)
		http.Error(w, "Invalid username or passphrase", http.StatusUnauthorized)
		return
	}
	
	// Verify the passphrase
	valid, err := auth.VerifyPassphrase(req.Passphrase, userCred.HashedPassphrase, userCred.Salt)
	if err != nil {
		log.Printf("❌ Error verifying passphrase: %v", err)
		http.Error(w, "Authentication error", http.StatusInternalServerError)
		return
	}
	
	if !valid {
		log.Printf("❌ Invalid passphrase for user %s", req.Username)
		http.Error(w, "Invalid username or passphrase", http.StatusUnauthorized)
		return
	}
	
	// Update last used timestamp
	if err := h.repo.UpdateUserCredentialLastUsed(userCred.ID); err != nil {
		log.Printf("⚠️ Failed to update last used timestamp: %v", err)
	}
	
	userID := userCred.UserID

	// Create session without credential (for traditional login)
	session, refreshToken, err := h.sessionService.CreateSession(userID, uuid.Nil, req.DeviceLabel, r.RemoteAddr, r.UserAgent())
	if err != nil {
		log.Printf("❌ Failed to create session: %v", err)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Save session to database
	if err := h.repo.SaveSession(*session); err != nil {
		log.Printf("❌ Failed to save session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(userID, uuid.Nil, session.ID, req.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       userID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Register handles user registration with username/passphrase
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		Passphrase  string `json:"passphrase"`
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Passphrase == "" {
		http.Error(w, "Username and passphrase are required", http.StatusBadRequest)
		return
	}

	// Check if username already exists
	existingCred, err := h.repo.GetUserCredentialByUsername(req.Username)
	if err == nil && existingCred != nil {
		log.Printf("❌ Username already exists: %s", req.Username)
		http.Error(w, "Username already exists", http.StatusConflict)
		return
	}

	// Create new user
	userID := uuid.New()
	user := database.User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}

	if err := h.repo.CreateUser(user); err != nil {
		log.Printf("❌ Failed to create user: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Generate salt and hash passphrase
	salt, err := auth.GenerateSalt()
	if err != nil {
		log.Printf("❌ Failed to generate salt: %v", err)
		http.Error(w, "Failed to create credentials", http.StatusInternalServerError)
		return
	}

	hashedPassphrase, err := auth.HashPassphrase(req.Passphrase, salt)
	if err != nil {
		log.Printf("❌ Failed to hash passphrase: %v", err)
		http.Error(w, "Failed to create credentials", http.StatusInternalServerError)
		return
	}

	// Save user credentials
	userCred := database.UserCredential{
		ID:               uuid.New(),
		UserID:           userID,
		Username:         req.Username,
		HashedPassphrase: hashedPassphrase,
		Salt:             salt,
		CreatedAt:        time.Now(),
		LastUsedAt:       time.Now(),
	}

	if err := h.repo.SaveUserCredential(userCred); err != nil {
		log.Printf("❌ Failed to save user credentials: %v", err)
		http.Error(w, "Failed to create credentials", http.StatusInternalServerError)
		return
	}

	// Create session
	session, refreshToken, err := h.sessionService.CreateSession(userID, uuid.Nil, req.DeviceLabel, r.RemoteAddr, r.UserAgent())
	if err != nil {
		log.Printf("❌ Failed to create session: %v", err)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Save session to database
	if err := h.repo.SaveSession(*session); err != nil {
		log.Printf("❌ Failed to save session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(userID, uuid.Nil, session.ID, req.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       userID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user sessions
	userID, err := h.getUserIDFromRefreshToken(req.RefreshToken)
	if err != nil {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	sessions, err := h.repo.GetUserSessions(userID)
	if err != nil {
		log.Printf("❌ Failed to get user sessions: %v", err)
		http.Error(w, "Failed to get sessions", http.StatusInternalServerError)
		return
	}

	// Validate and rotate refresh token
	newSession, newRefreshToken, err := h.sessionService.RotateRefreshToken(req.RefreshToken, sessions)
	if err != nil {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	// Save new session and update old session
	if err := h.repo.SaveSession(*newSession); err != nil {
		log.Printf("❌ Failed to save new session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate new access token
	accessToken, err := h.jwtService.GenerateAccessToken(newSession.UserID, *newSession.CredID, newSession.ID, newSession.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       newSession.UserID,
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  newSession.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Logout handles user logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Get session ID from context
	sessionID, err := h.getSessionIDFromContext(r.Context())
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Revoke session
	if err := h.repo.RevokeSession(sessionID); err != nil {
		log.Printf("❌ Failed to revoke session: %v", err)
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Logged out successfully"}`))
}

// GetSessions handles listing user sessions
func (h *AuthHandler) GetSessions(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := h.getUserIDFromContext(r.Context())
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user sessions
	sessions, err := h.repo.GetUserSessions(userID)
	if err != nil {
		log.Printf("❌ Failed to get user sessions: %v", err)
		http.Error(w, "Failed to get sessions", http.StatusInternalServerError)
		return
	}

	// Convert to session info
	var sessionInfos []database.SessionInfo
	for _, session := range sessions {
		sessionInfo := database.SessionInfo{
			ID:          session.ID,
			DeviceLabel: session.DeviceLabel,
			CreatedAt:   session.CreatedAt,
			LastUsedAt:  session.LastUsedAt,
			ExpiresAt:   session.ExpiresAt,
			IsCurrent:   false, // Would need to compare with current session
		}
		sessionInfos = append(sessionInfos, sessionInfo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessionInfos)
}

// GenerateLinkToken handles generating a link token for cross-device authentication
func (h *AuthHandler) GenerateLinkToken(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (user must be authenticated)
	userID, err := h.getUserIDFromContext(r.Context())
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DeviceLabel == "" {
		req.DeviceLabel = "Unknown Device"
	}

	// Generate link token
	linkToken, token, err := h.sessionService.GenerateLinkToken(userID, req.DeviceLabel, 10*time.Minute)
	if err != nil {
		log.Printf("❌ Failed to generate link token: %v", err)
		http.Error(w, "Failed to generate link token", http.StatusInternalServerError)
		return
	}

	// Save link token to database
	if err := h.repo.SaveLinkToken(*linkToken); err != nil {
		log.Printf("❌ Failed to save link token: %v", err)
		http.Error(w, "Failed to save link token", http.StatusInternalServerError)
		return
	}

	// Generate QR code
	qrCode := h.mobileService.GenerateQRCode(token, req.DeviceLabel)

	response := database.LinkTokenResponse{
		Token:       token,
		QRCode:      qrCode,
		ExpiresAt:   linkToken.ExpiresAt,
		DeviceLabel: req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// VerifyLinkToken handles verifying a link token for cross-device authentication
func (h *AuthHandler) VerifyLinkToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LinkToken   string `json:"link_token"`
		DeviceLabel string `json:"device_label"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.LinkToken == "" {
		http.Error(w, "Link token is required", http.StatusBadRequest)
		return
	}

	if req.DeviceLabel == "" {
		req.DeviceLabel = "Unknown Device"
	}

	// Get all link tokens from database
	linkTokens, err := h.repo.GetLinkTokens()
	if err != nil {
		log.Printf("❌ Failed to get link tokens: %v", err)
		http.Error(w, "Failed to verify link token", http.StatusInternalServerError)
		return
	}

	// Validate link token
	validToken, err := h.sessionService.ValidateLinkToken(req.LinkToken, linkTokens)
	if err != nil {
		log.Printf("❌ Invalid link token: %v", err)
		http.Error(w, "Invalid or expired link token", http.StatusUnauthorized)
		return
	}

	// Mark token as used
	if err := h.sessionService.MarkLinkTokenUsed(validToken.ID, linkTokens); err != nil {
		log.Printf("❌ Failed to mark link token as used: %v", err)
		http.Error(w, "Failed to process link token", http.StatusInternalServerError)
		return
	}

	// Update link token in database
	if err := h.repo.UpdateLinkToken(*validToken); err != nil {
		log.Printf("❌ Failed to update link token: %v", err)
		http.Error(w, "Failed to process link token", http.StatusInternalServerError)
		return
	}

	// Create mobile credential for the linked user
	credData := h.mobileService.CreateMobileCredential(validToken.UserID, req.DeviceLabel)
	if err := h.repo.SaveCredential(credData); err != nil {
		log.Printf("❌ Failed to save mobile credential: %v", err)
		http.Error(w, "Failed to create device credential", http.StatusInternalServerError)
		return
	}

	// Create session for the linked user
	credID := credData["id"].(uuid.UUID)
	session, refreshToken, err := h.sessionService.CreateSession(validToken.UserID, credID, req.DeviceLabel, r.RemoteAddr, r.UserAgent())
	if err != nil {
		log.Printf("❌ Failed to create session: %v", err)
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Save session to database
	if err := h.repo.SaveSession(*session); err != nil {
		log.Printf("❌ Failed to save session: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// Generate access token
	accessToken, err := h.jwtService.GenerateAccessToken(validToken.UserID, credID, session.ID, req.DeviceLabel)
	if err != nil {
		log.Printf("❌ Failed to generate access token: %v", err)
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	response := database.AuthResponse{
		UserID:       validToken.UserID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		DeviceLabel:  req.DeviceLabel,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetLinkStatus handles checking the status of link tokens
func (h *AuthHandler) GetLinkStatus(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (user must be authenticated)
	userID, err := h.getUserIDFromContext(r.Context())
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user's link tokens
	linkTokens, err := h.repo.GetUserLinkTokens(userID)
	if err != nil {
		log.Printf("❌ Failed to get user link tokens: %v", err)
		http.Error(w, "Failed to get link status", http.StatusInternalServerError)
		return
	}

	// Filter active tokens
	var activeTokens []database.LinkToken
	for _, token := range linkTokens {
		if time.Now().Before(token.ExpiresAt) && token.UsedAt == nil {
			activeTokens = append(activeTokens, token)
		}
	}

	response := struct {
		ActiveTokens int       `json:"active_tokens"`
		ExpiresAt    time.Time `json:"expires_at,omitempty"`
	}{
		ActiveTokens: len(activeTokens),
	}

	if len(activeTokens) > 0 {
		response.ExpiresAt = activeTokens[0].ExpiresAt
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper methods
func (h *AuthHandler) getUserIDFromRefreshToken(refreshToken string) (uuid.UUID, error) {
	// In production, this would decode the refresh token to get user ID
	// For now, we'll need to search through sessions
	// This is a simplified implementation
	return uuid.Nil, fmt.Errorf("not implemented")
}

func (h *AuthHandler) getUserIDFromContext(ctx context.Context) (uuid.UUID, error) {
	userIDStr, ok := ctx.Value("user_id").(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("user_id not found in context")
	}
	return uuid.Parse(userIDStr)
}

func (h *AuthHandler) getSessionIDFromContext(ctx context.Context) (uuid.UUID, error) {
	sessionIDStr, ok := ctx.Value("session_id").(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("session_id not found in context")
	}
	return uuid.Parse(sessionIDStr)
}
