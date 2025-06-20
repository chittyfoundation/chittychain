#!/bin/bash

# ChittyChain Authentication Endpoints Test Script
# This script tests all authentication endpoints systematically

echo "=== ChittyChain Authentication Endpoints Test ==="
echo "Testing authentication endpoints on localhost:5000"
echo ""

BASE_URL="http://localhost:5000/api/v1/auth"

# Test 1: Register a new user
echo "1. Testing User Registration (POST /api/v1/auth/register)"
echo "Request: Registering new user with valid data..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com",
    "password": "SecurePass123",
    "registrationNumber": "REG12345678",
    "barNumber": "BAR123456",
    "firstName": "Test",
    "lastName": "User",
    "role": "PARTY_PETITIONER"
  }')

echo "Response: $REGISTER_RESPONSE"
echo ""

# Test 2: Login attempt
echo "2. Testing User Login (POST /api/v1/auth/login)"
echo "Request: Attempting login with registered user..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com",
    "password": "SecurePass123",
    "twoFactorToken": "123456"
  }')

echo "Response: $LOGIN_RESPONSE"
echo ""

# Test 3: 2FA Verification
echo "3. Testing 2FA Verification (POST /api/v1/auth/verify-2fa)"
echo "Request: Verifying 2FA token..."
VERIFY_2FA_RESPONSE=$(curl -s -X POST "$BASE_URL/verify-2fa" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "token": "123456"
  }')

echo "Response: $VERIFY_2FA_RESPONSE"
echo ""

# Test 4: Verify Party (requires auth token)
echo "4. Testing Party Verification (POST /api/v1/auth/verify-party)"
echo "Request: Attempting to verify party without auth token..."
VERIFY_PARTY_RESPONSE=$(curl -s -X POST "$BASE_URL/verify-party" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "CASE-2024-D-007847",
    "partyRegistrationNumber": "REG12345678"
  }')

echo "Response: $VERIFY_PARTY_RESPONSE"
echo ""

# Test 5: Get Permissions (requires auth token)
echo "5. Testing Permissions Check (GET /api/v1/auth/permissions/user_id/case_id)"
echo "Request: Attempting to get permissions without auth token..."
PERMISSIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/permissions/test-user-id/test-case-id")

echo "Response: $PERMISSIONS_RESPONSE"
echo ""

# Test 6: Create Audit Trail (requires auth token)
echo "6. Testing Audit Trail Creation (POST /api/v1/auth/audit-trail)"
echo "Request: Attempting to create audit trail without auth token..."
AUDIT_RESPONSE=$(curl -s -X POST "$BASE_URL/audit-trail" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TEST_ACTION",
    "resourceType": "case",
    "resourceId": "test-case-123",
    "details": "Test audit entry"
  }')

echo "Response: $AUDIT_RESPONSE"
echo ""

echo "=== Test Complete ==="
echo "Note: Database connectivity issues may cause registration and login failures."
echo "Rate limiting is set to 5 attempts per 15 minutes for auth endpoints."