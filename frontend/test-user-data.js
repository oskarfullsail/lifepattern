/**
 * Test User Data Retrieval for alexdavis101
 *
 * This script tests:
 * 1. Login with provided credentials
 * 2. Fetch user insights
 * 3. Fetch routine logs
 * 4. Check device info
 * 5. Check link status
 *
 * Usage: node test-user-data.js
 */

const axios = require('axios');

// User credentials
const USERNAME = 'alexdavis101';
const PASSWORD = 'TestPass123!';

// Backend URL
const BACKEND_URL = 'https://lifepattern-backend.onrender.com';

let accessToken = null;
let userId = null;

async function login() {
  console.log('\n🔐 STEP 1: Login');
  console.log('─'.repeat(70));
  console.log(`   Username: ${USERNAME}`);
  console.log(`   Backend: ${BACKEND_URL}`);

  try {
    const response = await axios.post(
      `${BACKEND_URL}/auth/login`,
      {
        username: USERNAME,
        passphrase: PASSWORD,
        device_label: 'Test Device',
      },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    accessToken = response.data.access_token;
    userId = response.data.user_id;

    console.log('✅ Login successful!');
    console.log(`   User ID: ${userId}`);
    console.log(`   Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING'}`);
    return true;
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function fetchUserInsights() {
  console.log('\n📊 STEP 2: Fetch User Insights');
  console.log('─'.repeat(70));

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/user-insights`,
      {
        params: { user_id: userId, limit: 10 },
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Insights retrieved successfully!');
    console.log(`   Total insights: ${response.data.count || 0}`);

    if (response.data.insights && response.data.insights.length > 0) {
      console.log('\n   📋 Insights:');
      response.data.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. Log ID: ${insight.routine_log?.id || insight.routine_log?.log_id}`);
        console.log(`      Is Anomaly: ${insight.ai_report?.is_anomaly ? 'Yes' : 'No'}`);
        console.log(`      Confidence: ${insight.ai_report?.confidence_score || 'N/A'}`);
        console.log(`      Type: ${insight.ai_report?.anomaly_type || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  No insights found for this user');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch insights!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function fetchRoutineLogs() {
  console.log('\n📝 STEP 3: Fetch Routine Logs');
  console.log('─'.repeat(70));

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/logs`,
      {
        params: { user_id: userId, limit: 10 },
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Routine logs retrieved successfully!');
    console.log(`   Total logs: ${response.data.logs?.length || 0}`);

    if (response.data.logs && response.data.logs.length > 0) {
      console.log('\n   📋 Recent Logs:');
      response.data.logs.forEach((log, index) => {
        console.log(`   ${index + 1}. Log ID: ${log.id || log.log_id}`);
        console.log(`      Date: ${log.log_date}`);
        console.log(`      Sleep: ${log.sleep_hours}h`);
        console.log(`      Exercise: ${log.exercise_duration}min`);
      });
    } else {
      console.log('   ⚠️  No routine logs found for this user');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch routine logs!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function checkDeviceInfo() {
  console.log('\n📱 STEP 4: Check Device Info');
  console.log('─'.repeat(70));

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/device/info`,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Device info retrieved successfully!');
    console.log(`   Platform: ${response.data.platform}`);
    console.log(`   Device ID: ${response.data.device_id}`);
    console.log(`   Device Name: ${response.data.device_name}`);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch device info!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function checkLinkStatus() {
  console.log('\n🔗 STEP 5: Check Link Status');
  console.log('─'.repeat(70));

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/auth/link/status`,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Link status retrieved successfully!');
    console.log(`   Active tokens: ${response.data.active_tokens?.length || 0}`);

    if (response.data.active_tokens && response.data.active_tokens.length > 0) {
      response.data.active_tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. Token: ${token.link_token}`);
        console.log(`      Device: ${token.device_label}`);
        console.log(`      Expires: ${token.expires_at}`);
      });
    }

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch link status!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function checkScreeningData() {
  console.log('\n📋 STEP 6: Check Screening Data');
  console.log('─'.repeat(70));

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/screening`,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Screening data retrieved successfully!');
    console.log(`   Age: ${response.data.age}`);
    console.log(`   Occupation: ${response.data.occupation}`);
    console.log(`   Qualified: ${response.data.is_qualified_tester ? 'Yes' : 'No'}`);
    console.log(`   Score: ${response.data.qualification_score}/12`);

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ℹ️  No screening data found for this user (not submitted yet)');
    } else {
      console.error('❌ Failed to fetch screening data!');
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Error: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
    }
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 USER DATA RETRIEVAL TEST');
  console.log(`Testing user: ${USERNAME}`);
  console.log('='.repeat(70));

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without successful login');
    process.exit(1);
  }

  // Step 2-6: Fetch all data
  const insights = await fetchUserInsights();
  const logs = await fetchRoutineLogs();
  const deviceInfo = await checkDeviceInfo();
  const linkStatus = await checkLinkStatus();
  const screeningData = await checkScreeningData();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Login: SUCCESS`);
  console.log(`${insights ? '✅' : '❌'} User Insights: ${insights ? `${insights.count || 0} found` : 'FAILED'}`);
  console.log(`${logs ? '✅' : '❌'} Routine Logs: ${logs ? `${logs.logs?.length || 0} found` : 'FAILED'}`);
  console.log(`${deviceInfo ? '✅' : '❌'} Device Info: ${deviceInfo ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${linkStatus ? '✅' : '❌'} Link Status: ${linkStatus ? 'SUCCESS' : 'FAILED'}`);
  console.log(`${screeningData ? '✅' : '❌'} Screening Data: ${screeningData ? 'SUCCESS' : 'NOT FOUND'}`);

  console.log('\n🔍 DIAGNOSIS:');
  if (!insights || insights.count === 0) {
    console.log('   ⚠️  NO INSIGHTS: User has no AI insights data');
    console.log('   💡 Solution: User needs to submit routine logs to generate insights');
  }
  if (!logs || logs.logs?.length === 0) {
    console.log('   ⚠️  NO LOGS: User has no routine logs');
    console.log('   💡 Solution: User needs to log daily activities (sleep, exercise, meals, etc.)');
  }
  if (insights && insights.count > 0 && logs && logs.logs?.length > 0) {
    console.log('   ✅ User has data! Dashboard should display information.');
    console.log('   💡 Check frontend display logic if data is not showing.');
  }

  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
