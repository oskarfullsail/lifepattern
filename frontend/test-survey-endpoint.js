#!/usr/bin/env node
/**
 * Test script to verify survey endpoint is working
 *
 * Usage:
 * 1. First login to get an access token
 * 2. Then run this script with the token:
 *    node test-survey-endpoint.js YOUR_ACCESS_TOKEN
 */

const https = require('https');

const BACKEND_URL = 'lifepattern-backend.onrender.com';
const ACCESS_TOKEN = process.argv[2] || '';

console.log('🧪 Testing Survey Endpoint');
console.log('=' .repeat(50));
console.log('Backend:', BACKEND_URL);
console.log('Token provided:', ACCESS_TOKEN ? 'Yes (length: ' + ACCESS_TOKEN.length + ')' : 'No');
console.log('=' .repeat(50));
console.log('');

function testEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    console.log(`📝 Testing: ${description}`);
    console.log(`   Endpoint: GET ${path}`);

    const options = {
      hostname: BACKEND_URL,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(ACCESS_TOKEN && { 'Authorization': `Bearer ${ACCESS_TOKEN}` })
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);

        try {
          const jsonData = JSON.parse(data);
          console.log(`   Response type: ${Array.isArray(jsonData) ? 'Array' : 'Object'}`);
          console.log(`   Response length: ${Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length}`);
          console.log(`   Response data:`, JSON.stringify(jsonData, null, 2).substring(0, 500));

          resolve({
            success: res.statusCode === 200,
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          console.log(`   Response (raw):`, data.substring(0, 500));
          resolve({
            success: res.statusCode === 200,
            status: res.statusCode,
            data: data
          });
        }
        console.log('');
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Error:`, error.message);
      console.log('');
      reject(error);
    });

    req.on('timeout', () => {
      console.error(`   ❌ Request timed out`);
      console.log('');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Health check
    await testEndpoint('/health', 'Backend Health Check');

    // Test 2: Admin stats
    await testEndpoint('/api/admin/questionnaire-stats', 'Admin Questionnaire Stats');

    // Test 3: Admin screenings
    await testEndpoint('/api/admin/screenings', 'Admin Screenings');

    // Test 4: Admin surveys (the problematic one)
    const result = await testEndpoint('/api/admin/usability-surveys', 'Admin Usability Surveys');

    console.log('=' .repeat(50));
    console.log('✅ All tests completed!');
    console.log('=' .repeat(50));

    if (!ACCESS_TOKEN) {
      console.log('');
      console.log('⚠️  NOTE: No access token provided');
      console.log('   To test authenticated endpoints, run:');
      console.log('   node test-survey-endpoint.js YOUR_ACCESS_TOKEN');
      console.log('');
      console.log('   To get an access token:');
      console.log('   1. Login to the app');
      console.log('   2. Check AsyncStorage for "accessToken"');
      console.log('   3. Or use browser console: localStorage.getItem("accessToken")');
    }

  } catch (error) {
    console.error('');
    console.error('=' .repeat(50));
    console.error('❌ Test failed:', error.message);
    console.error('=' .repeat(50));
    process.exit(1);
  }
}

runTests();
