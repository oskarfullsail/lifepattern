#!/bin/bash

echo "🔐 LifePattern Password Recovery System"
echo "========================================"

USERNAME="High-Maker-627"
echo "Recovering password for user: $USERNAME"
echo ""

# Generate new secure passphrase (12 bytes = 16 characters)
NEW_PASSPHRASE=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
echo "✅ Generated new secure passphrase: $NEW_PASSPHRASE"

# Generate new salt (32 bytes)
NEW_SALT=$(openssl rand -base64 32)
echo "✅ Generated new salt: $NEW_SALT"

# Generate hash (passphrase + salt, then SHA-256)
HASH=$(echo -n "${NEW_PASSPHRASE}${NEW_SALT}" | openssl dgst -sha256 -binary | base64)
echo "✅ Generated new hash: $HASH"

echo ""
echo "📋 Database Update SQL:"
echo "========================================"
echo "UPDATE user_credentials SET hashed_passphrase = '$HASH', salt = '$NEW_SALT' WHERE username = '$USERNAME';"
echo ""

echo "🔑 New Login Credentials:"
echo "========================================"
echo "Username: $USERNAME"
echo "New Passphrase: $NEW_PASSPHRASE"
echo ""

echo "⚠️  IMPORTANT:"
echo "- Save this passphrase securely"
echo "- Change it on first login"
echo "- This passphrase cannot be recovered if lost"
echo ""

echo "🚀 To apply the recovery:"
echo "1. Run the SQL command above in the database"
echo "2. Use the new credentials to login"
echo "3. Change the passphrase immediately after login"
