#!/usr/bin/env python3
"""
Simple AI Service Test Script
Tests the AI service with mock data without requiring pytest
"""

import requests
import json
import time
import random
from datetime import datetime

# Configuration
AI_SERVICE_URL = "http://localhost:8000"

def test_health_check():
    """Test AI service health endpoint"""
    print("🏥 Testing AI service health...")
    
    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health check passed - Status: {health_data['status']}")
            print(f"   Model loaded: {health_data['model_loaded']}")
            print(f"   Model accuracy: {health_data['model_accuracy']:.3f}")
            return True
        else:
            print(f"❌ Health check failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_healthy_routine():
    """Test prediction with healthy routine data"""
    print("\n🌿 Testing healthy routine prediction...")
    
    healthy_data = {
        "sleep_hours": 8.0,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 4.0,
        "exercise_duration": 1.0,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 4
    }
    
    try:
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=healthy_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Healthy routine test successful")
            print(f"   Anomaly detected: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Anomaly type: {result['anomaly_type']}")
            print(f"   Recommendations: {len(result['recommendations'])} provided")
            return True
        else:
            print(f"❌ Healthy routine test failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Healthy routine test error: {str(e)}")
        return False

def test_unhealthy_routine():
    """Test prediction with unhealthy routine data"""
    print("\n🚨 Testing unhealthy routine prediction...")
    
    unhealthy_data = {
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
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=unhealthy_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Unhealthy routine test successful")
            print(f"   Anomaly detected: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Anomaly type: {result['anomaly_type']}")
            print(f"   Recommendations: {len(result['recommendations'])} provided")
            return True
        else:
            print(f"❌ Unhealthy routine test failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Unhealthy routine test error: {str(e)}")
        return False

def test_extreme_routine():
    """Test prediction with extreme unhealthy routine data"""
    print("\n💀 Testing extreme unhealthy routine prediction...")
    
    extreme_data = {
        "sleep_hours": 3.0,
        "meal_times": ["10:00", "16:00"],
        "screen_time": 16.0,
        "exercise_duration": 0.0,
        "wake_up_time": "10:00",
        "bed_time": "03:00",
        "water_intake": 0.5,
        "stress_level": 10
    }
    
    try:
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=extreme_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Extreme routine test successful")
            print(f"   Anomaly detected: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Anomaly type: {result['anomaly_type']}")
            print(f"   Recommendations: {len(result['recommendations'])} provided")
            return True
        else:
            print(f"❌ Extreme routine test failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Extreme routine test error: {str(e)}")
        return False

def test_invalid_inputs():
    """Test prediction with invalid inputs"""
    print("\n🚫 Testing invalid input handling...")
    
    # Test invalid time format
    invalid_time_data = {
        "sleep_hours": 8.0,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 4.0,
        "exercise_duration": 1.0,
        "wake_up_time": "7:00",  # Invalid format
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 4
    }
    
    try:
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=invalid_time_data, timeout=30)
        if response.status_code == 400:
            print("✅ Invalid time format test passed")
        else:
            print(f"❌ Invalid time format test failed - Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Invalid time format test error: {str(e)}")
        return False
    
    # Test invalid meal time format
    invalid_meal_data = {
        "sleep_hours": 8.0,
        "meal_times": ["7:30", "12:00", "18:30"],  # Invalid format
        "screen_time": 4.0,
        "exercise_duration": 1.0,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 4
    }
    
    try:
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=invalid_meal_data, timeout=30)
        if response.status_code == 400:
            print("✅ Invalid meal time format test passed")
            return True
        else:
            print(f"❌ Invalid meal time format test failed - Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Invalid meal time format test error: {str(e)}")
        return False

def test_random_routines():
    """Test prediction with randomly generated routine data"""
    print("\n🎲 Testing random routine generation...")
    
    success_count = 0
    for i in range(5):
        random_data = {
            "sleep_hours": random.uniform(4.0, 12.0),
            "meal_times": [
                f"{random.randint(6, 10):02d}:{random.randint(0, 59):02d}",
                f"{random.randint(11, 14):02d}:{random.randint(0, 59):02d}",
                f"{random.randint(17, 20):02d}:{random.randint(0, 59):02d}"
            ],
            "screen_time": random.uniform(1.0, 16.0),
            "exercise_duration": random.uniform(0.0, 3.0),
            "wake_up_time": f"{random.randint(5, 10):02d}:{random.randint(0, 59):02d}",
            "bed_time": f"{random.randint(21, 24):02d}:{random.randint(0, 59):02d}",
            "water_intake": random.uniform(0.5, 4.0),
            "stress_level": random.randint(1, 10)
        }
        
        try:
            response = requests.post(f"{AI_SERVICE_URL}/predict", json=random_data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Random routine {i+1} - Anomaly: {result['is_anomaly']}, Confidence: {result['confidence_score']:.3f}")
                success_count += 1
            else:
                print(f"❌ Random routine {i+1} failed - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ Random routine {i+1} error: {str(e)}")
    
    print(f"📊 Random routine test results: {success_count}/5 successful")
    return success_count >= 3

def test_recommendations():
    """Test that recommendations are generated appropriately"""
    print("\n💡 Testing recommendation generation...")
    
    test_cases = [
        {
            "name": "Low Sleep",
            "data": {
                "sleep_hours": 5.0,
                "meal_times": ["07:30", "12:00", "18:30"],
                "screen_time": 4.0,
                "exercise_duration": 1.0,
                "wake_up_time": "07:00",
                "bed_time": "23:00",
                "water_intake": 2.5,
                "stress_level": 4
            }
        },
        {
            "name": "High Screen Time",
            "data": {
                "sleep_hours": 8.0,
                "meal_times": ["07:30", "12:00", "18:30"],
                "screen_time": 12.0,
                "exercise_duration": 1.0,
                "wake_up_time": "07:00",
                "bed_time": "23:00",
                "water_intake": 2.5,
                "stress_level": 4
            }
        },
        {
            "name": "Low Exercise",
            "data": {
                "sleep_hours": 8.0,
                "meal_times": ["07:30", "12:00", "18:30"],
                "screen_time": 4.0,
                "exercise_duration": 0.1,
                "wake_up_time": "07:00",
                "bed_time": "23:00",
                "water_intake": 2.5,
                "stress_level": 4
            }
        }
    ]
    
    success_count = 0
    for test_case in test_cases:
        try:
            response = requests.post(f"{AI_SERVICE_URL}/predict", json=test_case["data"], timeout=30)
            if response.status_code == 200:
                result = response.json()
                if "recommendations" in result and isinstance(result["recommendations"], list) and len(result["recommendations"]) > 0:
                    print(f"✅ {test_case['name']} - {len(result['recommendations'])} recommendations generated")
                    success_count += 1
                else:
                    print(f"❌ {test_case['name']} - No recommendations generated")
            else:
                print(f"❌ {test_case['name']} - Request failed with status {response.status_code}")
        except Exception as e:
            print(f"❌ {test_case['name']} - Error: {str(e)}")
    
    print(f"📊 Recommendation test results: {success_count}/3 successful")
    return success_count >= 2

def test_response_time():
    """Test that response time is reasonable"""
    print("\n⏱️ Testing response time...")
    
    test_data = {
        "sleep_hours": 8.0,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 4.0,
        "exercise_duration": 1.0,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 4
    }
    
    try:
        start_time = time.time()
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=test_data, timeout=30)
        end_time = time.time()
        
        response_time = end_time - start_time
        
        if response.status_code == 200 and response_time < 5.0:
            print(f"✅ Response time test passed - {response_time:.3f} seconds")
            return True
        else:
            print(f"❌ Response time test failed - {response_time:.3f} seconds (too slow)")
            return False
    except Exception as e:
        print(f"❌ Response time test error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting AI Service Comprehensive Test Suite")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Healthy Routine", test_healthy_routine),
        ("Unhealthy Routine", test_unhealthy_routine),
        ("Extreme Routine", test_extreme_routine),
        ("Invalid Inputs", test_invalid_inputs),
        ("Random Routines", test_random_routines),
        ("Recommendations", test_recommendations),
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
    print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! AI Service is working correctly.")
    elif passed >= total * 0.8:
        print("✅ MOST TESTS PASSED! AI Service is working well.")
    else:
        print("⚠️ MANY TESTS FAILED! AI Service needs attention.")
    
    return passed == total

if __name__ == "__main__":
    main() 