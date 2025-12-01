/**
 * Test script for screening questionnaire endpoint
 * Tests both local and live backend
 *
 * Usage: node test-screening-endpoint.js
 */

const axios = require('axios');

// Test data matching the ScreeningRequest type
const testScreeningData = {
  age: 25,
  gender: 'Male',
  occupation: 'Software Engineer',
  smartphone_usage: 'daily',
  device_type: 'iphone',
  sleep_hours: '7-8',
  habit_tracking: 'sometimes',
  routine_structure: 'somewhat_structured',
  productivity_fluctuation: 'occasionally',
  tech_comfort: 'very_comfortable',
  wellness_apps_used: true,
  ai_feedback_openness: 'very_open',
  interest_reason: 'I want to improve my daily routines and get better insights into my habits.',
};

// Backend URLs
const BACKENDS = {
  local: 'http://localhost:8080',
  live: 'https://lifepattern-backend.onrender.com',
};

// Test function
async function testScreeningSubmission(backendUrl, backendName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${backendName} Backend: ${backendUrl}`);
  console.log('='.repeat(60));

  try {
    // Step 1: Test health endpoint
    console.log('\n📡 Step 1: Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${backendUrl}/health`, {
        timeout: 10000,
      });
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (healthError) {
      console.log('⚠️  Health endpoint failed:', healthError.message);
      console.log('   This might be okay if endpoint does not exist');
    }

    // Step 2: Register a test user
    console.log('\n📝 Step 2: Registering test user...');
    const timestamp = Date.now();
    const testUsername = `test_user_${timestamp}`;
    const testPassword = 'test-password-123';

    let accessToken;
    try {
      const registerResponse = await axios.post(
        `${backendUrl}/auth/register`,
        {
          username: testUsername,
          passphrase: testPassword,
          device_label: 'Test Device',
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ User registered successfully');
      console.log('   User ID:', registerResponse.data.user_id);
      console.log('   Access Token:', registerResponse.data.access_token ? '✅ Received' : '❌ Missing');

      accessToken = registerResponse.data.access_token;
    } catch (registerError) {
      console.error('❌ Registration failed:', registerError.response?.data || registerError.message);
      return false;
    }

    // Step 3: Submit screening questionnaire
    console.log('\n📋 Step 3: Submitting screening questionnaire...');
    console.log('   Payload:', JSON.stringify(testScreeningData, null, 2));

    try {
      const screeningResponse = await axios.post(
        `${backendUrl}/api/screening`,
        testScreeningData,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      console.log('✅ Screening questionnaire submitted successfully!');
      console.log('   Response:', JSON.stringify(screeningResponse.data, null, 2));
      console.log('\n📊 Screening Results:');
      console.log('   Qualified Tester:', screeningResponse.data.is_qualified_tester ? '✅ Yes' : '❌ No');
      console.log('   Qualification Score:', `${screeningResponse.data.qualification_score}/12`);
      console.log('   Screening ID:', screeningResponse.data.id);

      return true;
    } catch (screeningError) {
      console.error('❌ Screening submission failed');
      if (screeningError.response) {
        console.error('   Status:', screeningError.response.status);
        console.error('   Error:', screeningError.response.data);
      } else {
        console.error('   Error:', screeningError.message);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('\n🧪 SCREENING QUESTIONNAIRE ENDPOINT TEST\n');

  const results = {
    local: false,
    live: false,
  };

  // Test live backend first (most important)
  console.log('\n🌐 Testing LIVE backend first...');
  results.live = await testScreeningSubmission(BACKENDS.live, 'LIVE');

  // Test local backend
  console.log('\n\n💻 Testing LOCAL backend...');
  results.local = await testScreeningSubmission(BACKENDS.local, 'LOCAL');

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Live Backend (${BACKENDS.live}):`, results.live ? '✅ PASSED' : '❌ FAILED');
  console.log(`Local Backend (${BACKENDS.local}):`, results.local ? '✅ PASSED' : '❌ FAILED');
  console.log('='.repeat(60) + '\n');

  if (results.live) {
    console.log('🎉 SUCCESS! Live backend is ready for questionnaire submissions!');
  } else {
    console.log('⚠️  WARNING: Live backend test failed. Check the backend logs.');
  }

  process.exit(results.live ? 0 : 1);
}

// Execute tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
