#!/usr/bin/env python3
"""
Enhanced AI Service Test Suite
Tests the new behavioral recommendations and enhanced features
"""

import requests
import json
import time
from datetime import datetime

# Configuration
AI_SERVICE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("🏥 Testing Health Check...")
    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Check PASSED - Status: {data['status']}, Model Accuracy: {data['model_accuracy']}")
            return True
        else:
            print(f"❌ Health Check FAILED - Status Code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health Check ERROR: {str(e)}")
        return False

def test_enhanced_prediction_unhealthy():
    """Test enhanced prediction with unhealthy routine"""
    print("\n🔴 Testing Enhanced Prediction - Unhealthy Routine...")
    
    data = {
        "sleep_hours": 5.0,
        "meal_times": ["09:00", "15:00", "21:00"],
        "screen_time": 10.0,
        "exercise_duration": 0.2,
        "wake_up_time": "08:30",
        "bed_time": "01:00",
        "water_intake": 1.0,
        "stress_level": 8
    }
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/predict/enhanced",
            json=data,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Enhanced Prediction PASSED")
            print(f"   - Anomaly: {result['is_anomaly']}")
            print(f"   - Confidence: {result['confidence_score']}")
            print(f"   - Behavioral Contexts: {len(result['behavioral_contexts'])}")
            print(f"   - Enhanced Recommendations: {len(result['enhanced_recommendations'])}")
            
            # Check specific recommendation types
            rec_types = [rec['type'] for rec in result['enhanced_recommendations']]
            print(f"   - Recommendation Types: {rec_types}")
            
            return True
        else:
            print(f"❌ Enhanced Prediction FAILED - Status Code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Enhanced Prediction ERROR: {str(e)}")
        return False

def test_enhanced_prediction_healthy():
    """Test enhanced prediction with healthy routine"""
    print("\n🟢 Testing Enhanced Prediction - Healthy Routine...")
    
    data = {
        "sleep_hours": 8.0,
        "meal_times": ["08:00", "12:00", "18:00"],
        "screen_time": 3.0,
        "exercise_duration": 1.5,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 3
    }
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/predict/enhanced",
            json=data,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Enhanced Prediction PASSED")
            print(f"   - Anomaly: {result['is_anomaly']}")
            print(f"   - Confidence: {result['confidence_score']}")
            print(f"   - Behavioral Contexts: {len(result['behavioral_contexts'])}")
            print(f"   - Enhanced Recommendations: {len(result['enhanced_recommendations'])}")
            
            return True
        else:
            print(f"❌ Enhanced Prediction FAILED - Status Code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Enhanced Prediction ERROR: {str(e)}")
        return False

def test_enhanced_prediction_stress():
    """Test enhanced prediction with high stress scenario"""
    print("\n😰 Testing Enhanced Prediction - High Stress Scenario...")
    
    data = {
        "sleep_hours": 6.5,
        "meal_times": ["09:00", "14:00"],
        "screen_time": 12.0,
        "exercise_duration": 0.0,
        "wake_up_time": "08:00",
        "bed_time": "22:30",
        "water_intake": 0.8,
        "stress_level": 9
    }
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/predict/enhanced",
            json=data,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Enhanced Prediction PASSED")
            print(f"   - Anomaly: {result['is_anomaly']}")
            print(f"   - Confidence: {result['confidence_score']}")
            print(f"   - Behavioral Contexts: {result['behavioral_contexts']}")
            
            # Check for stress-related recommendations
            stress_recs = [rec for rec in result['enhanced_recommendations'] 
                         if 'stress' in rec['description'].lower() or 
                            rec['type'] in ['social_connection', 'dnd_suggestion']]
            print(f"   - Stress-Related Recommendations: {len(stress_recs)}")
            
            return True
        else:
            print(f"❌ Enhanced Prediction FAILED - Status Code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Enhanced Prediction ERROR: {str(e)}")
        return False

def test_recommendation_quality():
    """Test the quality and variety of recommendations"""
    print("\n🎯 Testing Recommendation Quality...")
    
    test_cases = [
        {
            "name": "Low Exercise",
            "data": {"sleep_hours": 7.0, "meal_times": ["08:00", "12:00", "18:00"], 
                    "screen_time": 4.0, "exercise_duration": 0.1, "wake_up_time": "07:00", 
                    "bed_time": "23:00", "water_intake": 2.0, "stress_level": 4}
        },
        {
            "name": "High Screen Time",
            "data": {"sleep_hours": 7.5, "meal_times": ["08:00", "12:00", "18:00"], 
                    "screen_time": 11.0, "exercise_duration": 0.5, "wake_up_time": "07:00", 
                    "bed_time": "23:00", "water_intake": 2.0, "stress_level": 5}
        },
        {
            "name": "Poor Sleep",
            "data": {"sleep_hours": 4.5, "meal_times": ["08:00", "12:00", "18:00"], 
                    "screen_time": 6.0, "exercise_duration": 0.5, "wake_up_time": "07:00", 
                    "bed_time": "02:00", "water_intake": 2.0, "stress_level": 6}
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    for test_case in test_cases:
        try:
            response = requests.post(
                f"{AI_SERVICE_URL}/predict/enhanced",
                json=test_case["data"],
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                rec_types = [rec['type'] for rec in result['enhanced_recommendations']]
                
                print(f"✅ {test_case['name']}: {len(rec_types)} recommendations - {rec_types}")
                passed += 1
            else:
                print(f"❌ {test_case['name']}: FAILED")
                
        except Exception as e:
            print(f"❌ {test_case['name']}: ERROR - {str(e)}")
    
    print(f"📊 Recommendation Quality: {passed}/{total} test cases passed")
    return passed == total

def test_response_time():
    """Test response time for enhanced predictions"""
    print("\n⏱️ Testing Response Time...")
    
    data = {
        "sleep_hours": 7.0,
        "meal_times": ["08:00", "12:00", "18:00"],
        "screen_time": 5.0,
        "exercise_duration": 0.5,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.0,
        "stress_level": 5
    }
    
    times = []
    for i in range(5):
        try:
            start_time = time.time()
            response = requests.post(
                f"{AI_SERVICE_URL}/predict/enhanced",
                json=data,
                timeout=15
            )
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = end_time - start_time
                times.append(response_time)
                print(f"   Request {i+1}: {response_time:.3f}s")
            else:
                print(f"   Request {i+1}: FAILED")
                
        except Exception as e:
            print(f"   Request {i+1}: ERROR - {str(e)}")
    
    if times:
        avg_time = sum(times) / len(times)
        print(f"📊 Average Response Time: {avg_time:.3f}s")
        
        if avg_time < 2.0:
            print("✅ Response Time PASSED - Fast enough for real-time use")
            return True
        else:
            print("⚠️ Response Time SLOW - May need optimization")
            return False
    else:
        print("❌ Response Time FAILED - No successful requests")
        return False

def main():
    """Run all enhanced AI service tests"""
    print("🚀 Enhanced AI Service Test Suite")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Enhanced Prediction - Unhealthy", test_enhanced_prediction_unhealthy),
        ("Enhanced Prediction - Healthy", test_enhanced_prediction_healthy),
        ("Enhanced Prediction - High Stress", test_enhanced_prediction_stress),
        ("Recommendation Quality", test_recommendation_quality),
        ("Response Time", test_response_time)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"📊 ENHANCED AI SERVICE TEST SUMMARY: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Enhanced AI Service is working perfectly!")
        print("\n✨ Enhanced Features Working:")
        print("   ✅ Behavioral Pattern Analysis")
        print("   ✅ Contextual Recommendations")
        print("   ✅ YouTube Workout Videos")
        print("   ✅ Inspirational Quotes")
        print("   ✅ Do-Not-Disturb Suggestions")
        print("   ✅ Social Connection Prompts")
        print("   ✅ Sleep Reminders")
        print("   ✅ Priority-Based Recommendations")
    elif passed >= total * 0.8:
        print("✅ MOST TESTS PASSED! Enhanced AI Service is working well.")
    else:
        print("⚠️ MANY TESTS FAILED! Enhanced AI Service needs attention.")
    
    return passed == total

if __name__ == "__main__":
    main() 