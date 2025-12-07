#!/usr/bin/env python3
"""
Test script for LifePattern API endpoints
Tests the new heartbeat and weekly summary endpoints
"""

import requests
import json
from datetime import datetime

# Configuration
BACKEND_URL = "https://lifepattern-backend.onrender.com"
AI_SERVICE_URL = "https://lifepattern-ai-service.onrender.com"
USERNAME = "oskartest"
PASSWORD = "Yathzee"

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_response(title, response, is_json=True):
    """Print a formatted response"""
    print(f"📋 {title}:")
    if is_json:
        try:
            print(json.dumps(response, indent=2))
        except:
            print(response)
    else:
        print(response)
    print()

def test_login():
    """Test login and get JWT token"""
    print_section("Step 1: Login")
    
    url = f"{BACKEND_URL}/auth/login"
    payload = {
        "username": USERNAME,
        "passphrase": PASSWORD
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Try different possible token field names
        access_token = (
            data.get("access_token") or 
            data.get("accessToken") or 
            data.get("token") or
            data.get("jwt")
        )
        
        if not access_token:
            print("❌ No access token found in response")
            print_response("Login Response", data)
            return None
        
        print(f"✅ Login successful!")
        print(f"Token: {access_token[:50]}...")
        return access_token
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Login failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_response("Error Response", e.response.text, is_json=False)
        return None

def test_ai_heartbeat_direct():
    """Test AI service heartbeat directly"""
    print_section("Step 2: AI Service Heartbeat (Direct)")
    
    url = f"{AI_SERVICE_URL}/status/heartbeat"
    
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        print("✅ AI Service heartbeat successful!")
        print_response("Heartbeat Response", data)
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ AI Service heartbeat failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_response("Error Response", e.response.text, is_json=False)
        return False

def test_backend_heartbeat(token):
    """Test backend heartbeat endpoint"""
    print_section("Step 3: Backend Heartbeat Endpoint")
    
    url = f"{BACKEND_URL}/api/v1/ai/heartbeat"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        print("✅ Backend heartbeat successful!")
        print_response("Heartbeat Response", data)
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend heartbeat failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_response("Error Response", e.response.text, is_json=False)
        return False

def test_weekly_summary(token):
    """Test weekly summary endpoint"""
    print_section("Step 4: Weekly Summary Endpoint")
    
    end_date = datetime.now().strftime("%Y-%m-%d")
    url = f"{BACKEND_URL}/api/v1/routines/week-summary?endDate={end_date}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        print("✅ Weekly summary successful!")
        print_response("Weekly Summary Response", data)
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Weekly summary failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_response("Error Response", e.response.text, is_json=False)
        return False

def test_daily_analysis(token):
    """Test daily analysis endpoint"""
    print_section("Step 5: Daily Analysis Endpoint")
    
    url = f"{BACKEND_URL}/api/v1/routines/analyze-day"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    end_date = datetime.now().strftime("%Y-%m-%d")
    payload = {
        "date": end_date,
        "sleepHours": 7.5,
        "bedtime": "22:30",
        "wakeTime": "06:30",
        "steps": 8500,
        "workoutMinutes": 45,
        "screenTimeMinutes": 180,
        "meals": {
            "breakfast": True,
            "lunch": True,
            "dinner": True
        },
        "mood": 4,
        "stressLevel": 3,
        "goalContext": {
            "sleepTargetHours": 7.5,
            "dailyStepTarget": 8000,
            "maxScreenTimeMinutes": 180
        },
        "historyWindowDays": 14
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        print("✅ Daily analysis successful!")
        print_response("Daily Analysis Response", data)
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Daily analysis failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print_response("Error Response", e.response.text, is_json=False)
        return False

def main():
    """Run all tests"""
    print("\n🧪 LifePattern API Endpoint Testing")
    print("=" * 60)
    
    # Step 1: Login
    token = test_login()
    if not token:
        print("\n❌ Cannot continue without authentication token")
        return
    
    # Step 2: Test AI service heartbeat (direct)
    test_ai_heartbeat_direct()
    
    # Step 3: Test backend heartbeat
    test_backend_heartbeat(token)
    
    # Step 4: Test weekly summary
    test_weekly_summary(token)
    
    # Step 5: Test daily analysis
    test_daily_analysis(token)
    
    print("\n" + "=" * 60)
    print("✅ Testing complete!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()

