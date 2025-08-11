package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// GenerateSalt generates a random salt for password hashing
func GenerateSalt() (string, error) {
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}
	return base64.StdEncoding.EncodeToString(salt), nil
}

// HashPassphrase hashes a passphrase with a salt
func HashPassphrase(passphrase, salt string) (string, error) {
	// Combine passphrase and salt
	combined := passphrase + salt

	// Hash the combined string
	hash := sha256.Sum256([]byte(combined))

	// Return base64 encoded hash
	return base64.StdEncoding.EncodeToString(hash[:]), nil
}

// VerifyPassphrase verifies a passphrase against a stored hash and salt
func VerifyPassphrase(passphrase, storedHash, salt string) (bool, error) {
	// Hash the provided passphrase with the stored salt
	hash, err := HashPassphrase(passphrase, salt)
	if err != nil {
		return false, fmt.Errorf("failed to hash passphrase: %w", err)
	}

	// Compare the hashes
	return hash == storedHash, nil
}
