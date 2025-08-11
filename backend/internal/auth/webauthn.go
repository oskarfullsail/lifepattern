package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"time"

	"lifepattern-api/internal/database"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// WebAuthnService handles WebAuthn operations
type WebAuthnService struct {
	webAuthn *webauthn.WebAuthn
}

// WebAuthnUser implements the webauthn.User interface
type WebAuthnUser struct {
	ID          uuid.UUID
	Credentials []webauthn.Credential
}

// NewWebAuthnService creates a new WebAuthn service
func NewWebAuthnService(rpID, rpName, rpOrigin string) (*WebAuthnService, error) {
	config := &webauthn.Config{
		RPDisplayName: rpName,
		RPID:          rpID,
		RPOrigins:     []string{rpOrigin},
	}

	w, err := webauthn.New(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create WebAuthn instance: %w", err)
	}

	return &WebAuthnService{
		webAuthn: w,
	}, nil
}

// BeginRegistration starts the WebAuthn registration process
func (w *WebAuthnService) BeginRegistration(userID uuid.UUID, username string) (*webauthn.SessionData, *protocol.CredentialCreation, error) {
	user := &WebAuthnUser{
		ID:          userID,
		Credentials: []webauthn.Credential{}, // Empty for new registration
	}

	options, sessionData, err := w.webAuthn.BeginRegistration(user)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin registration: %w", err)
	}

	log.Printf("🔐 WebAuthn registration started for user %s", userID)
	return sessionData, options, nil
}

// FinishRegistration completes the WebAuthn registration process
func (w *WebAuthnService) FinishRegistration(userID uuid.UUID, sessionData *webauthn.SessionData, request *http.Request) (*webauthn.Credential, error) {
	user := &WebAuthnUser{
		ID:          userID,
		Credentials: []webauthn.Credential{}, // Empty for new registration
	}

	credential, err := w.webAuthn.FinishRegistration(user, *sessionData, request)
	if err != nil {
		return nil, fmt.Errorf("failed to create credential: %w", err)
	}

	log.Printf("✅ WebAuthn registration completed for user %s", userID)
	return credential, nil
}

// BeginLogin starts the WebAuthn login process
func (w *WebAuthnService) BeginLogin(userID uuid.UUID, credentials []webauthn.Credential) (*webauthn.SessionData, *protocol.CredentialAssertion, error) {
	user := &WebAuthnUser{
		ID:          userID,
		Credentials: credentials,
	}

	options, sessionData, err := w.webAuthn.BeginLogin(user)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin login: %w", err)
	}

	log.Printf("🔐 WebAuthn login started for user %s", userID)
	return sessionData, options, nil
}

// FinishLogin completes the WebAuthn login process
func (w *WebAuthnService) FinishLogin(userID uuid.UUID, credentials []webauthn.Credential, sessionData *webauthn.SessionData, request *http.Request) (*webauthn.Credential, error) {
	user := &WebAuthnUser{
		ID:          userID,
		Credentials: credentials,
	}

	credential, err := w.webAuthn.FinishLogin(user, *sessionData, request)
	if err != nil {
		return nil, fmt.Errorf("failed to validate login: %w", err)
	}

	log.Printf("✅ WebAuthn login completed for user %s", userID)
	return credential, nil
}

// GenerateChallenge generates a random challenge for mobile authentication
func GenerateChallenge() (string, error) {
	challenge := make([]byte, 32)
	_, err := rand.Read(challenge)
	if err != nil {
		return "", fmt.Errorf("failed to generate challenge: %w", err)
	}
	return base64.StdEncoding.EncodeToString(challenge), nil
}

// ValidateChallenge validates a challenge response
func ValidateChallenge(challenge, response string) bool {
	// For now, we'll use a simple validation
	// In production, this would validate against the device's secure enclave
	return challenge == response
}

// WebAuthnUser interface implementation
func (u *WebAuthnUser) WebAuthnID() []byte {
	return u.ID[:]
}

func (u *WebAuthnUser) WebAuthnName() string {
	return u.ID.String()
}

func (u *WebAuthnUser) WebAuthnDisplayName() string {
	return u.ID.String()
}

func (u *WebAuthnUser) WebAuthnIcon() string {
	return ""
}

func (u *WebAuthnUser) WebAuthnCredentials() []webauthn.Credential {
	return u.Credentials
}

func (u *WebAuthnUser) WebAuthnNewCredential() {
	// This method is called when a new credential is added
	log.Printf("🆕 New WebAuthn credential added for user %s", u.ID)
}

// ConvertCredentialToDB converts a WebAuthn credential to our database model
func ConvertCredentialToDB(userID uuid.UUID, credential *webauthn.Credential, deviceType, deviceLabel string) map[string]interface{} {
	return map[string]interface{}{
		"id":                 uuid.New(),
		"user_id":            userID,
		"public_key":         credential.PublicKey,
		"attestation_type":   credential.AttestationType,
		"attestation_source": "webauthn",
		"aaguid":             credential.Authenticator.AAGUID,
		"sign_count":         credential.Authenticator.SignCount,
		"clone_warning":      credential.Authenticator.CloneWarning,
		"device_type":        deviceType,
		"device_label":       deviceLabel,
		"added_at":           time.Now(),
		"last_used_at":       time.Now(),
	}
}

// ConvertDBToCredential converts our database model to a WebAuthn credential
func ConvertDBToCredential(cred database.Credential) webauthn.Credential {
	var aaguid []byte
	if cred.AAGUID != nil {
		aaguid = cred.AAGUID[:]
	}

	return webauthn.Credential{
		ID:        cred.ID[:], // Convert UUID to []byte
		PublicKey: cred.PublicKey,
		Authenticator: webauthn.Authenticator{
			AAGUID:       aaguid,
			SignCount:    uint32(cred.SignCount),
			CloneWarning: cred.CloneWarning,
		},
		AttestationType: cred.AttestationType,
	}
}
