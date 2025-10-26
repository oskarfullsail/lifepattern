#!/bin/bash

# Quick test script for log endpoint
# Tests directly against the database to verify schema correctness

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing Routine Log Schema${NC}"
echo "========================================"

# Step 1: Create a test user
echo -e "${BLUE}📝 Creating test user...${NC}"
TEST_USER_ID=$(docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -t -c "
INSERT INTO users (id, created_at, last_seen_at) 
VALUES (gen_random_uuid(), NOW(), NOW()) 
RETURNING id;
" | grep -E '^[[:space:]]*[0-9a-f-]{36}' | tr -d ' \n')

if [ -z "$TEST_USER_ID" ]; then
    echo -e "${RED}❌ Failed to create test user${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Test user created: ${TEST_USER_ID}${NC}"

# Step 2: Insert a routine log
echo -e "${BLUE}📝 Inserting routine log...${NC}"
LOG_ID=$(docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -t -c "
INSERT INTO routine_logs (
    user_id,
    sleep_hours,
    meal_times,
    screen_time,
    exercise_duration,
    wake_up_time,
    bed_time,
    water_intake,
    stress_level,
    log_date,
    created_at,
    updated_at
) VALUES (
    '$TEST_USER_ID'::uuid,
    7.5,
    '[\"08:00\", \"12:30\", \"19:00\"]'::jsonb,
    5.0,
    1.5,
    '07:00',
    '23:00',
    2.5,
    5,
    CURRENT_DATE,
    NOW(),
    NOW()
) RETURNING id;
" | grep -E '^[[:space:]]*[0-9]+' | awk '{print $1}')

if [ -z "$LOG_ID" ]; then
    echo -e "${RED}❌ Failed to insert routine log${NC}"
    echo "Checking error details..."
    docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -c "
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'routine_logs';
    "
    exit 1
fi

echo -e "${GREEN}✅ Routine log inserted with ID: ${LOG_ID}${NC}"

# Step 3: Verify the ID type
echo -e "${BLUE}🔍 Verifying ID type...${NC}"
ID_TYPE=$(docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -t -c "
SELECT data_type 
FROM information_schema.columns 
WHERE table_name = 'routine_logs' AND column_name = 'id';
" | tr -d ' \n')

echo -e "${BLUE}ID Type: ${ID_TYPE}${NC}"

if [ "$ID_TYPE" == "integer" ]; then
    echo -e "${GREEN}✅ ID type is INTEGER (correct for SERIAL)${NC}"
else
    echo -e "${RED}❌ ID type is ${ID_TYPE} (expected INTEGER)${NC}"
    exit 1
fi

# Step 4: Query the log back
echo -e "${BLUE}📖 Querying routine log back...${NC}"
docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -c "
SELECT 
    id,
    user_id,
    sleep_hours,
    meal_times,
    exercise_duration,
    log_date
FROM routine_logs
WHERE id = $LOG_ID;
"

# Step 5: Test meal_times array
echo -e "${BLUE}🍽️  Testing meal_times JSONB array...${NC}"
MEAL_COUNT=$(docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -t -c "
SELECT jsonb_array_length(meal_times)
FROM routine_logs
WHERE id = $LOG_ID;
" | tr -d ' \n')

echo -e "${BLUE}Meal times count: ${MEAL_COUNT}${NC}"

if [ "$MEAL_COUNT" == "3" ]; then
    echo -e "${GREEN}✅ JSONB array correctly stored and retrieved${NC}"
else
    echo -e "${RED}❌ Expected 3 meal times, got ${MEAL_COUNT}${NC}"
    exit 1
fi

# Step 6: Clean up
echo -e "${BLUE}🧹 Cleaning up test data...${NC}"
docker-compose -f test-docker-compose.yml exec -T test-postgres psql -U postgres -d lifepattern_test -c "
DELETE FROM routine_logs WHERE id = $LOG_ID;
DELETE FROM users WHERE id = '$TEST_USER_ID'::uuid;
"

echo ""
echo "========================================"
echo -e "${GREEN}✅ ALL SCHEMA TESTS PASSED!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  ✅ User creation works"
echo "  ✅ Routine log insertion works"
echo "  ✅ ID type is INTEGER (SERIAL)"
echo "  ✅ JSONB meal_times array works"
echo "  ✅ Schema is correct for Go code"
echo ""
echo -e "${GREEN}🎉 The database schema is ready for the backend!${NC}"

