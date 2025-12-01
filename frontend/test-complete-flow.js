/**
 * Complete Flow Test: Screening Questionnaire → Registration → Submission
 *
 * This test simulates the actual user flow:
 * 1. User completes screening questionnaire (data saved locally - simulated here)
 * 2. User registers an account
 * 3. App automatically submits screening data to backend
 *
 * Usage: node test-complete-flow.js
 */

const axios = require('axios');

// Test screening data
const screeningData = {
  age: 28,
  gender: 'Female',
  occupation: 'Student',
  smartphone_usage: 'daily',
  device_type: 'android',
  sleep_hours: '5-6',
  habit_tracking: 'often',
  routine_structure: 'very_structured',
  productivity_fluctuation: 'frequently',
  tech_comfort: 'comfortable',
  wellness_apps_used: true,
  ai_feedback_openness: 'open',
  interest_reason: 'I want to track my habits and improve my productivity as a student.',
};

// Calculate qualification score (matching frontend logic)
function calculateQualificationScore(data) {
  let score = 0;

  // Age: 18-45 is ideal (+1)
  if (data.age >= 18 && data.age <= 45) score += 1;

  // Daily smartphone usage (+1)
  if (data.smartphone_usage === 'daily') score += 1;

  // iPhone or Android (+1)
  if (data.device_type === 'iphone' || data.device_type === 'android') score += 1;

  // Sleep hours: 7-8 or 5-6 (+1)
  if (data.sleep_hours === '7-8' || data.sleep_hours === '5-6') score += 1;

  // Habit tracking: sometimes, often, or always (+1)
  if (['sometimes', 'often', 'always'].includes(data.habit_tracking)) score += 1;

  // Routine structure: very or somewhat structured (+1)
  if (['very_structured', 'somewhat_structured'].includes(data.routine_structure)) score += 1;

  // Productivity fluctuation: occasionally or frequently (+1)
  if (['occasionally', 'frequently'].includes(data.productivity_fluctuation)) score += 1;

  // Tech comfort: comfortable or very comfortable (+1)
  if (['comfortable', 'very_comfortable'].includes(data.tech_comfort)) score += 1;

  // Wellness apps used: yes (+1)
  if (data.wellness_apps_used === true) score += 1;

  // AI feedback openness: open or very open (+1)
  if (['open', 'very_open'].includes(data.ai_feedback_openness)) score += 1;

  // Interest reason: has text (+1)
  if (data.interest_reason && data.interest_reason.trim().length > 0) score += 1;

  // Occupation: student or tech-related (+1)
  const occupation = data.occupation.toLowerCase();
  if (occupation.includes('student') || occupation.includes('engineer') ||
      occupation.includes('developer') || occupation.includes('tech')) {
    score += 1;
  }

  const isQualified = score >= 7;
  return { score, isQualified };
}

async function testCompleteFlow(backendUrl) {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 COMPLETE USER FLOW TEST');
  console.log('Backend:', backendUrl);
  console.log('='.repeat(70));

  try {
    // Step 1: Simulate screening questionnaire completion
    console.log('\n📋 STEP 1: User completes screening questionnaire');
    console.log('─'.repeat(70));

    const { score, isQualified } = calculateQualificationScore(screeningData);
    console.log('✅ Questionnaire completed (saved locally in real app)');
    console.log(`   Client-side Qualification Score: ${score}/12`);
    console.log(`   Client-side Qualified: ${isQualified ? 'Yes ✅' : 'No ❌'}`);
    console.log('   Next: User will be prompted to register');

    // Step 2: User registration
    console.log('\n👤 STEP 2: User registers an account');
    console.log('─'.repeat(70));

    const timestamp = Date.now();
    const username = `flow_test_${timestamp}`;
    const password = 'secure-password-123';

    console.log(`   Registering username: ${username}`);

    const registerResponse = await axios.post(
      `${backendUrl}/auth/register`,
      {
        username,
        passphrase: password,
        device_label: 'Test Flow Device',
      },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('✅ Registration successful!');
    console.log(`   User ID: ${registerResponse.data.user_id}`);
    console.log(`   Access Token: ${registerResponse.data.access_token ? 'Received ✅' : 'Missing ❌'}`);

    const accessToken = registerResponse.data.access_token;

    // Step 3: Automatically submit screening data
    console.log('\n📤 STEP 3: App automatically submits saved screening data');
    console.log('─'.repeat(70));
    console.log('   (This happens automatically in register.tsx after successful registration)');

    const screeningResponse = await axios.post(
      `${backendUrl}/api/screening`,
      screeningData,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Screening data submitted to backend!');
    console.log('\n📊 BACKEND RESPONSE:');
    console.log('─'.repeat(70));
    console.log(`   Screening ID: ${screeningResponse.data.id}`);
    console.log(`   Backend Qualification Score: ${screeningResponse.data.qualification_score}/12`);
    console.log(`   Backend Qualified Tester: ${screeningResponse.data.is_qualified_tester ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   Created At: ${screeningResponse.data.created_at}`);

    // Step 4: Verify scores match
    console.log('\n✅ STEP 4: Verification');
    console.log('─'.repeat(70));

    const scoresMatch = score === screeningResponse.data.qualification_score;
    const qualificationMatch = isQualified === screeningResponse.data.is_qualified_tester;

    console.log(`   Client Score vs Backend Score: ${score} vs ${screeningResponse.data.qualification_score} ${scoresMatch ? '✅' : '❌'}`);
    console.log(`   Client Qualified vs Backend Qualified: ${isQualified} vs ${screeningResponse.data.is_qualified_tester} ${qualificationMatch ? '✅' : '❌'}`);

    if (scoresMatch && qualificationMatch) {
      console.log('\n🎉 SUCCESS! Complete flow works perfectly!');
      console.log('   ✅ Screening questionnaire completion (client-side)');
      console.log('   ✅ User registration');
      console.log('   ✅ Automatic screening submission to backend');
      console.log('   ✅ Scores and qualification match between client and backend');
      return true;
    } else {
      console.log('\n⚠️  WARNING: Score mismatch between client and backend');
      return false;
    }

  } catch (error) {
    console.error('\n❌ FLOW TEST FAILED');
    console.error('─'.repeat(70));
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('\n🚀 Testing Complete User Flow\n');

  // Test live backend
  const liveBackend = 'https://lifepattern-backend.onrender.com';
  const success = await testCompleteFlow(liveBackend);

  console.log('\n' + '='.repeat(70));
  console.log('📋 FINAL RESULT');
  console.log('='.repeat(70));
  console.log(success ? '✅ PASSED - Ready for production!' : '❌ FAILED - Check logs above');
  console.log('='.repeat(70) + '\n');

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
