package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// JWTService handles JWT token operations
type JWTService struct {
	secretKey     []byte
	issuer        string
	audience      string
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

// JWTClaims represents the claims in our JWT tokens
type JWTClaims struct {
	UserID      uuid.UUID `json:"sub"`
	CredID      uuid.UUID `json:"cid"`
	SessionID   uuid.UUID `json:"sid"`
	DeviceLabel string    `json:"dvl,omitempty"`
	jwt.RegisteredClaims
}

// NewJWTService creates a new JWT service with secure key generation
func NewJWTService(secretKey string, issuer, audience string, accessExpiry, refreshExpiry time.Duration) *JWTService {
	if secretKey == "" {
		// Generate a secure random key if none provided
		secretKey = generateSecureKey()
	}

	return &JWTService{
		secretKey:     []byte(secretKey),
		issuer:        issuer,
		audience:      audience,
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

// generateSecureKey generates a secure random key for JWT signing
func generateSecureKey() string {
	key := make([]byte, 64) // 512 bits
	_, err := rand.Read(key)
	if err != nil {
		panic(fmt.Sprintf("failed to generate secure key: %v", err))
	}
	return base64.StdEncoding.EncodeToString(key)
}

// GenerateAccessToken creates a new access token
func (j *JWTService) GenerateAccessToken(userID, credID, sessionID uuid.UUID, deviceLabel string) (string, error) {
	now := time.Now()
	claims := JWTClaims{
		UserID:      userID,
		CredID:      credID,
		SessionID:   sessionID,
		DeviceLabel: deviceLabel,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    j.issuer,
			Audience:  []string{j.audience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.accessExpiry)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// GenerateRefreshToken creates a new refresh token
func (j *JWTService) GenerateRefreshToken() (string, string, error) {
	// Generate a random refresh token
	refreshToken := make([]byte, 32)
	_, err := rand.Read(refreshToken)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Hash the refresh token for storage
	refreshHash := hashRefreshToken(refreshToken)

	return base64.StdEncoding.EncodeToString(refreshToken), refreshHash, nil
}

// ValidateAccessToken validates and parses an access token
func (j *JWTService) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// HashRefreshToken hashes a refresh token for secure storage
func hashRefreshToken(token []byte) string {
	hash := sha256.Sum256(token)
	return base64.StdEncoding.EncodeToString(hash[:])
}

// HashRefreshTokenString hashes a refresh token string
func HashRefreshTokenString(tokenString string) (string, error) {
	token, err := base64.StdEncoding.DecodeString(tokenString)
	if err != nil {
		return "", fmt.Errorf("invalid refresh token format: %w", err)
	}
	return hashRefreshToken(token), nil
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// CheckPasswordHash verifies a password against its hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// HashIPAddress hashes an IP address for privacy
func HashIPAddress(ip string) string {
	hash := sha256.Sum256([]byte(ip))
	return base64.StdEncoding.EncodeToString(hash[:])
}

// HashUserAgent hashes a user agent string for privacy
func HashUserAgent(userAgent string) string {
	hash := sha256.Sum256([]byte(userAgent))
	return base64.StdEncoding.EncodeToString(hash[:])
}
