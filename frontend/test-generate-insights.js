/**
 * Test AI Insight Generation for alexdavis101
 *
 * The user has 10 routine logs but 0 AI insights.
 * This script will try to fetch insights for specific log IDs.
 */

const axios = require('axios');

const USERNAME = 'alexdavis101';
const PASSWORD = 'TestPass123!';
const BACKEND_URL = 'https://lifepattern-backend.onrender.com';

// Log IDs from the test
const LOG_IDS = [157, 156, 155, 154, 153, 152, 151, 150, 149, 148];

let accessToken = null;
let userId = null;

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(
      `${BACKEND_URL}/auth/login`,
      { username: USERNAME, passphrase: PASSWORD, device_label: 'Test' },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
    accessToken = response.data.access_token;
    userId = response.data.user_id;
    console.log(`✅ Logged in as ${userId}\n`);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getInsightForLog(logId) {
  console.log(`\n📊 Checking insight for Log ID: ${logId}`);
  console.log('─'.repeat(50));

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/insights`,
      {
        params: { log_id: logId },
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log(`✅ Insight found for log ${logId}!`);
    console.log(`   Is Anomaly: ${response.data.ai_report?.is_anomaly ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${response.data.ai_report?.confidence_score}`);
    console.log(`   Type: ${response.data.ai_report?.anomaly_type}`);

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`⚠️  No insight found for log ${logId}`);
      console.log(`   This log has not been analyzed by AI yet`);
    } else {
      console.error(`❌ Error fetching insight for log ${logId}`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Error: ${JSON.stringify(error.response?.data)}`);
    }
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 AI INSIGHT GENERATION TEST');
  console.log(`User: ${USERNAME}`);
  console.log('='.repeat(70) + '\n');

  if (!await login()) {
    process.exit(1);
  }

  let foundCount = 0;
  let notFoundCount = 0;

  console.log('\n🔍 Checking insights for all logs...\n');

  for (const logId of LOG_IDS) {
    const insight = await getInsightForLog(logId);
    if (insight) {
      foundCount++;
    } else {
      notFoundCount++;
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  console.log(`Total logs checked: ${LOG_IDS.length}`);
  console.log(`Insights found: ${foundCount}`);
  console.log(`Insights missing: ${notFoundCount}`);

  if (notFoundCount > 0) {
    console.log('\n🔍 DIAGNOSIS:');
    console.log('   ⚠️  AI insights have not been generated for these logs');
    console.log('   💡 Possible reasons:');
    console.log('      1. Logs were created without triggering AI analysis');
    console.log('      2. AI service was unavailable when logs were submitted');
    console.log('      3. AI insight generation requires explicit trigger');
    console.log('\n   🔧 SOLUTION:');
    console.log('      - Check if createRoutineLog endpoint triggers AI analysis');
    console.log('      - Verify AI service is available (health check showed "unhealthy")');
    console.log('      - May need to manually trigger insight generation');
  }

  console.log('='.repeat(70) + '\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
