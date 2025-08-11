package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"log"
	"time"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
)

// SessionService handles session management
type SessionService struct {
	refreshExpiry time.Duration
}

// NewSessionService creates a new session service
func NewSessionService(refreshExpiry time.Duration) *SessionService {
	return &SessionService{
		refreshExpiry: refreshExpiry,
	}
}

// CreateSession creates a new user session
func (s *SessionService) CreateSession(userID, credID uuid.UUID, deviceLabel, ipAddress, userAgent string) (*database.Session, string, error) {
	// Generate refresh token
	refreshToken, refreshHash, err := s.generateRefreshToken()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Create session
	session := &database.Session{
		ID:            uuid.New(),
		UserID:        userID,
		RefreshHash:   refreshHash,
		DeviceLabel:   deviceLabel,
		IPFingerprint: HashIPAddress(ipAddress),
		UserAgentHash: HashUserAgent(userAgent),
		CreatedAt:     time.Now(),
		LastUsedAt:    time.Now(),
		ExpiresAt:     time.Now().Add(s.refreshExpiry),
	}

	// Only set CredID if it's not nil
	if credID != uuid.Nil {
		session.CredID = &credID
	}

	log.Printf("🔑 Created session %s for user %s", session.ID, userID)
	return session, refreshToken, nil
}

// generateRefreshToken generates a new refresh token
func (s *SessionService) generateRefreshToken() (string, string, error) {
	// Generate a random refresh token
	refreshToken := make([]byte, 32)
	_, err := rand.Read(refreshToken)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Hash the refresh token for storage
	refreshHash := HashRefreshToken(refreshToken)

	return base64.StdEncoding.EncodeToString(refreshToken), refreshHash, nil
}

// HashRefreshToken hashes a refresh token for secure storage
func HashRefreshToken(token []byte) string {
	hash := sha256.Sum256(token)
	return base64.StdEncoding.EncodeToString(hash[:])
}

// ValidateRefreshToken validates a refresh token and returns session info
func (s *SessionService) ValidateRefreshToken(refreshToken string, sessions []database.Session) (*database.Session, error) {
	// Hash the provided refresh token
	refreshHash, err := HashRefreshTokenString(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token format: %w", err)
	}

	// Find the session with matching hash
	for _, session := range sessions {
		if session.RefreshHash == refreshHash {
			// Check if session is expired or revoked
			if time.Now().After(session.ExpiresAt) {
				return nil, fmt.Errorf("session expired")
			}
			if session.RevokedAt != nil {
				return nil, fmt.Errorf("session revoked")
			}
			return &session, nil
		}
	}

	return nil, fmt.Errorf("invalid refresh token")
}

// RotateRefreshToken creates a new refresh token and invalidates the old one
func (s *SessionService) RotateRefreshToken(oldRefreshToken string, sessions []database.Session) (*database.Session, string, error) {
	// Validate the old refresh token
	oldSession, err := s.ValidateRefreshToken(oldRefreshToken, sessions)
	if err != nil {
		return nil, "", fmt.Errorf("invalid old refresh token: %w", err)
	}

	// Generate new refresh token
	newRefreshToken, newRefreshHash, err := s.generateRefreshToken()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate new refresh token: %w", err)
	}

	// Create new session with same user info but new token
	newSession := &database.Session{
		ID:            uuid.New(),
		UserID:        oldSession.UserID,
		CredID:        oldSession.CredID,
		RefreshHash:   newRefreshHash,
		DeviceLabel:   oldSession.DeviceLabel,
		IPFingerprint: oldSession.IPFingerprint,
		UserAgentHash: oldSession.UserAgentHash,
		CreatedAt:     time.Now(),
		LastUsedAt:    time.Now(),
		ExpiresAt:     time.Now().Add(s.refreshExpiry),
	}

	// Mark old session as revoked
	now := time.Now()
	oldSession.RevokedAt = &now

	log.Printf("🔄 Rotated refresh token for user %s", oldSession.UserID)
	return newSession, newRefreshToken, nil
}

// RevokeSession marks a session as revoked
func (s *SessionService) RevokeSession(sessionID uuid.UUID, sessions []database.Session) error {
	for i, session := range sessions {
		if session.ID == sessionID {
			now := time.Now()
			sessions[i].RevokedAt = &now
			log.Printf("🚫 Revoked session %s for user %s", sessionID, session.UserID)
			return nil
		}
	}
	return fmt.Errorf("session not found")
}

// RevokeAllSessions revokes all sessions for a user
func (s *SessionService) RevokeAllSessions(userID uuid.UUID, sessions []database.Session) error {
	now := time.Now()
	count := 0
	for i, session := range sessions {
		if session.UserID == userID && session.RevokedAt == nil {
			sessions[i].RevokedAt = &now
			count++
		}
	}
	log.Printf("🚫 Revoked %d sessions for user %s", count, userID)
	return nil
}

// CleanupExpiredSessions removes expired sessions
func (s *SessionService) CleanupExpiredSessions(sessions []database.Session) []database.Session {
	var activeSessions []database.Session
	now := time.Now()

	for _, session := range sessions {
		if now.Before(session.ExpiresAt) && session.RevokedAt == nil {
			activeSessions = append(activeSessions, session)
		}
	}

	return activeSessions
}

// GenerateLinkToken generates a token for cross-device linking
func (s *SessionService) GenerateLinkToken(userID uuid.UUID, deviceLabel string, expiry time.Duration) (*database.LinkToken, string, error) {
	// Generate a random token
	tokenBytes := make([]byte, 16)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate link token: %w", err)
	}

	token := base64.StdEncoding.EncodeToString(tokenBytes)
	tokenHash := HashIPAddress(token) // Reusing hash function for simplicity

	linkToken := &database.LinkToken{
		ID:          uuid.New(),
		TokenHash:   tokenHash,
		UserID:      userID,
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(expiry),
		DeviceLabel: deviceLabel,
	}

	log.Printf("🔗 Generated link token for user %s", userID)
	return linkToken, token, nil
}

// ValidateLinkToken validates a link token
func (s *SessionService) ValidateLinkToken(token string, linkTokens []database.LinkToken) (*database.LinkToken, error) {
	tokenHash := HashIPAddress(token)

	for _, linkToken := range linkTokens {
		if linkToken.TokenHash == tokenHash {
			// Check if token is expired or used
			if time.Now().After(linkToken.ExpiresAt) {
				return nil, fmt.Errorf("link token expired")
			}
			if linkToken.UsedAt != nil {
				return nil, fmt.Errorf("link token already used")
			}
			return &linkToken, nil
		}
	}

	return nil, fmt.Errorf("invalid link token")
}

// MarkLinkTokenUsed marks a link token as used
func (s *SessionService) MarkLinkTokenUsed(tokenID uuid.UUID, linkTokens []database.LinkToken) error {
	now := time.Now()
	for i, linkToken := range linkTokens {
		if linkToken.ID == tokenID {
			linkTokens[i].UsedAt = &now
			log.Printf("✅ Marked link token %s as used", tokenID)
			return nil
		}
	}
	return fmt.Errorf("link token not found")
}
