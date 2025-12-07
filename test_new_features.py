#!/usr/bin/env python3
"""
Comprehensive test script for new LifePattern AI features:
1. Weekly Pattern Coach (weekly summary with trends, insights, micro-goals)
2. Heartbeat + Greeting Flow
3. Daily Analysis (with bug fixes)
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "https://lifepattern-backend.onrender.com"
AI_SERVICE_URL = "https://lifepattern-ai-service.onrender.com"
USERNAME = "oskartest"
PASSWORD = "Yathzee"

def print_header(title):
    """Print a formatted header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def print_subheader(title):
    """Print a formatted subheader"""
    print(f"\n{'─'*70}")
    print(f"  {title}")
    print(f"{'─'*70}\n")

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def print_json(data, title="Response"):
    """Pretty print JSON data"""
    print(f"📋 {title}:")
    print(json.dumps(data, indent=2))
    print()

def login():
    """Login and get JWT token"""
    print_header("Authentication")
    
    url = f"{BACKEND_URL}/auth/login"
    payload = {"username": USERNAME, "passphrase": PASSWORD}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        access_token = (
            data.get("access_token") or 
            data.get("accessToken") or 
            data.get("token") or
            data.get("jwt")
        )
        
        if not access_token:
            print_error("No access token found in response")
            print_json(data, "Login Response")
            return None
        
        print_success(f"Login successful! Token: {access_token[:50]}...")
        return access_token
        
    except Exception as e:
        print_error(f"Login failed: {e}")
        return None

def test_heartbeat_features(token):
    """Test heartbeat and greeting features"""
    print_header("Feature 1: Heartbeat + Greeting Flow")
    
    # Test 1: Direct AI Service Heartbeat
    print_subheader("Test 1.1: Direct AI Service Heartbeat")
    try:
        response = requests.get(f"{AI_SERVICE_URL}/status/heartbeat", timeout=5)
        response.raise_for_status()
        data = response.json()
        print_success("AI Service heartbeat successful")
        print(f"   Status: {data.get('status')}")
        print(f"   Greeting: {data.get('greeting')}")
        print(f"   Timestamp: {data.get('timestamp')}")
    except Exception as e:
        print_error(f"AI Service heartbeat failed: {e}")
    
    # Test 2: Backend Heartbeat (with auth)
    print_subheader("Test 1.2: Backend Heartbeat Endpoint")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BACKEND_URL}/api/v1/ai/heartbeat", headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        print_success("Backend heartbeat successful")
        print(f"   Status: {data.get('status')}")
        print(f"   Greeting: {data.get('greeting')}")
        print(f"   Timestamp: {data.get('timestamp')}")
    except Exception as e:
        print_error(f"Backend heartbeat failed: {e}")
    
    # Test 3: Multiple heartbeat calls (test greeting variety)
    print_subheader("Test 1.3: Multiple Heartbeat Calls (Testing Greeting Variety)")
    greetings_received = []
    for i in range(3):
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BACKEND_URL}/api/v1/ai/heartbeat", headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            greeting = data.get('greeting', '')
            greetings_received.append(greeting)
            print(f"   Call {i+1}: {greeting}")
        except Exception as e:
            print_error(f"Heartbeat call {i+1} failed: {e}")
    
    unique_greetings = len(set(greetings_received))
    if unique_greetings > 1:
        print_success(f"Received {unique_greetings} different greetings (variety working!)")
    else:
        print_info("All greetings were the same (may be cached or random seed issue)")

def test_weekly_summary_features(token):
    """Test weekly pattern coach features"""
    print_header("Feature 2: Weekly Pattern Coach")
    
    # Test 1: Current week summary
    print_subheader("Test 2.1: Current Week Summary")
    end_date = datetime.now().strftime("%Y-%m-%d")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{BACKEND_URL}/api/v1/routines/week-summary?endDate={end_date}"
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        print_success("Weekly summary retrieved successfully")
        print(f"   Week: {data.get('weekStart')} to {data.get('weekEnd')}")
        print(f"   Trends detected: {len(data.get('trends', []))}")
        print(f"   Insights generated: {len(data.get('insights', []))}")
        print(f"   Micro-goals proposed: {len(data.get('microGoals', []))}")
        
        # Show summary stats
        summary = data.get('summary', {})
        print(f"\n   📊 Summary Statistics:")
        print(f"      Average Sleep: {summary.get('averageSleepHours', 0):.1f} hours")
        print(f"      Average Steps: {summary.get('averageSteps', 0):.0f}")
        print(f"      Average Screen Time: {summary.get('averageScreenTimeMinutes', 0):.0f} minutes")
        print(f"      Average Mood: {summary.get('averageMood', 0):.1f}/5")
        print(f"      Average Stress: {summary.get('averageStress', 0):.1f}/10")
        
        # Show trends
        trends = data.get('trends', [])
        if trends:
            print(f"\n   📈 Trends Detected:")
            for trend in trends[:3]:  # Show first 3
                direction_emoji = {
                    "improving": "📈",
                    "declining": "📉",
                    "stable": "➡️"
                }.get(trend.get('direction', ''), "❓")
                print(f"      {direction_emoji} {trend.get('metric', 'unknown')}: {trend.get('direction', 'unknown')}")
                print(f"         {trend.get('comment', '')}")
        
        # Show insights
        insights = data.get('insights', [])
        if insights:
            print(f"\n   💡 Key Insights:")
            for i, insight in enumerate(insights, 1):
                print(f"      {i}. {insight}")
        
        # Show micro-goals
        goals = data.get('microGoals', [])
        if goals:
            print(f"\n   🎯 Micro-Goals for Next Week:")
            for i, goal in enumerate(goals, 1):
                print(f"      {i}. {goal.get('title', 'Unknown')}")
                print(f"         Reason: {goal.get('reason', '')}")
                print(f"         Action: {goal.get('suggestedAction', '')}")
        
    except Exception as e:
        print_error(f"Weekly summary failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Response: {e.response.text[:200]}")
    
    # Test 2: Different week (one week ago)
    print_subheader("Test 2.2: Different Week (One Week Ago)")
    end_date_week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{BACKEND_URL}/api/v1/routines/week-summary?endDate={end_date_week_ago}"
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        print_success(f"Weekly summary for {end_date_week_ago} retrieved")
        print(f"   Week: {data.get('weekStart')} to {data.get('weekEnd')}")
        print(f"   Trends: {len(data.get('trends', []))}, Insights: {len(data.get('insights', []))}, Goals: {len(data.get('microGoals', []))}")
    except Exception as e:
        print_error(f"Weekly summary for past week failed: {e}")

def test_daily_analysis_features(token):
    """Test daily analysis features"""
    print_header("Feature 3: Daily Analysis (with Bug Fixes)")
    
    # Test 1: Good day scenario
    print_subheader("Test 3.1: Good Day Scenario")
    good_day_payload = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "sleepHours": 8.0,
        "bedtime": "22:00",
        "wakeTime": "06:30",
        "steps": 10000,
        "workoutMinutes": 60,
        "screenTimeMinutes": 150,
        "meals": {"breakfast": True, "lunch": True, "dinner": True},
        "mood": 5,
        "stressLevel": 2,
        "goalContext": {
            "sleepTargetHours": 8.0,
            "dailyStepTarget": 8000,
            "maxScreenTimeMinutes": 180
        },
        "historyWindowDays": 14
    }
    
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/v1/routines/analyze-day",
            headers=headers,
            json=good_day_payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        print_success("Daily analysis completed")
        print(f"   Date: {data.get('date')}")
        print(f"   Daily Score: {data.get('dailyScore', 0):.1f}/100")
        print(f"   Anomalies detected: {len(data.get('anomalies', []))}")
        print(f"   Recommendations: {len(data.get('recommendations', []))}")
        
        if data.get('recommendations'):
            print(f"\n   💡 Recommendations:")
            for rec in data.get('recommendations', [])[:2]:
                print(f"      • {rec.get('title', 'Unknown')}")
                print(f"        {rec.get('suggestedAction', '')}")
        
    except Exception as e:
        print_error(f"Daily analysis failed: {e}")
    
    # Test 2: Challenging day scenario
    print_subheader("Test 3.2: Challenging Day Scenario (Low Sleep, High Stress)")
    challenging_day_payload = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "sleepHours": 5.5,
        "bedtime": "01:30",
        "wakeTime": "07:00",
        "steps": 4000,
        "workoutMinutes": 0,
        "screenTimeMinutes": 420,
        "meals": {"breakfast": False, "lunch": True, "dinner": True},
        "mood": 2,
        "stressLevel": 8,
        "goalContext": {
            "sleepTargetHours": 7.5,
            "dailyStepTarget": 8000,
            "maxScreenTimeMinutes": 180
        },
        "historyWindowDays": 14
    }
    
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/v1/routines/analyze-day",
            headers=headers,
            json=challenging_day_payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        print_success("Daily analysis for challenging day completed")
        print(f"   Daily Score: {data.get('dailyScore', 0):.1f}/100")
        print(f"   Anomalies detected: {len(data.get('anomalies', []))}")
        print(f"   Recommendations: {len(data.get('recommendations', []))}")
        
        anomalies = data.get('anomalies', [])
        if anomalies:
            print(f"\n   ⚠️  Anomalies Detected:")
            for anomaly in anomalies:
                severity_emoji = {
                    "high": "🔴",
                    "medium": "🟡",
                    "low": "🟢"
                }.get(anomaly.get('severity', '').lower(), "❓")
                print(f"      {severity_emoji} {anomaly.get('code', 'Unknown')}: {anomaly.get('description', '')}")
        
        recommendations = data.get('recommendations', [])
        if recommendations:
            print(f"\n   💡 Recommendations:")
            for rec in recommendations[:3]:
                print(f"      • {rec.get('title', 'Unknown')}")
                print(f"        {rec.get('reason', '')}")
                print(f"        Action: {rec.get('suggestedAction', '')}")
        
    except Exception as e:
        print_error(f"Daily analysis for challenging day failed: {e}")

def test_error_handling(token):
    """Test error handling scenarios"""
    print_header("Feature 4: Error Handling & Edge Cases")
    
    # Test 1: Invalid date format
    print_subheader("Test 4.1: Invalid Date Format")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{BACKEND_URL}/api/v1/routines/week-summary?endDate=invalid-date"
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 400:
            print_success("Correctly rejected invalid date format")
        else:
            print_error(f"Expected 400, got {response.status_code}")
    except Exception as e:
        print_info(f"Request failed (expected): {e}")
    
    # Test 2: Missing required fields in daily analysis
    print_subheader("Test 4.2: Missing Required Fields")
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        incomplete_payload = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "sleepHours": 7.5
            # Missing other required fields
        }
        response = requests.post(
            f"{BACKEND_URL}/api/v1/routines/analyze-day",
            headers=headers,
            json=incomplete_payload,
            timeout=10
        )
        if response.status_code == 400:
            print_success("Correctly rejected incomplete payload")
        else:
            print_error(f"Expected 400, got {response.status_code}")
    except Exception as e:
        print_info(f"Request failed (expected): {e}")

def main():
    """Run all feature tests"""
    print("\n" + "="*70)
    print("  🧪 LifePattern AI - New Features Comprehensive Testing")
    print("="*70)
    
    # Login
    token = login()
    if not token:
        print("\n❌ Cannot continue without authentication token")
        return
    
    # Test all features
    test_heartbeat_features(token)
    test_weekly_summary_features(token)
    test_daily_analysis_features(token)
    test_error_handling(token)
    
    # Summary
    print_header("Test Summary")
    print_success("All feature tests completed!")
    print("\nFeatures tested:")
    print("  ✅ Heartbeat + Greeting Flow")
    print("  ✅ Weekly Pattern Coach (trends, insights, micro-goals)")
    print("  ✅ Daily Analysis (with bug fixes)")
    print("  ✅ Error Handling & Edge Cases")
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    main()

