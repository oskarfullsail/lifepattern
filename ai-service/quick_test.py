#!/usr/bin/env python3
"""
Quick AI Service Test
Tests the current AI service functionality without rebuilding
"""

import requests
import json
import time

# Configuration
AI_SERVICE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   Model accuracy: {data['model_accuracy']:.3f}")
            return True
        else:
            print(f"❌ Health check failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_single_prediction():
    """Test single prediction endpoint"""
    print("\n🔍 Testing single prediction...")
    
    # Test healthy routine
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
            print(f"✅ Healthy routine test passed")
            print(f"   Anomaly: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Recommendations: {len(result['recommendations'])}")
            return True
        else:
            print(f"❌ Healthy routine test failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Healthy routine test error: {str(e)}")
        return False

def test_unhealthy_prediction():
    """Test unhealthy prediction"""
    print("\n🚨 Testing unhealthy prediction...")
    
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
            print(f"✅ Unhealthy routine test passed")
            print(f"   Anomaly: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Recommendations: {len(result['recommendations'])}")
            return True
        else:
            print(f"❌ Unhealthy routine test failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Unhealthy routine test error: {str(e)}")
        return False

def test_invalid_input():
    """Test invalid input handling"""
    print("\n🚫 Testing invalid input handling...")
    
    invalid_data = {
        "sleep_hours": 8.0,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 4.0,
        "exercise_duration": 1.0,
        "wake_up_time": "25:00",  # Invalid time
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 4
    }
    
    try:
        response = requests.post(f"{AI_SERVICE_URL}/predict", json=invalid_data, timeout=30)
        if response.status_code == 400:
            print("✅ Invalid input test passed - Correctly rejected invalid time")
            return True
        else:
            print(f"❌ Invalid input test failed - Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Invalid input test error: {str(e)}")
        return False

def test_response_time():
    """Test response time"""
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

def test_multiple_predictions():
    """Test multiple predictions to check consistency"""
    print("\n🔄 Testing multiple predictions...")
    
    test_data = {
        "sleep_hours": 7.5,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 5.0,
        "exercise_duration": 0.8,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.0,
        "stress_level": 5
    }
    
    results = []
    for i in range(3):
        try:
            response = requests.post(f"{AI_SERVICE_URL}/predict", json=test_data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                results.append(result['is_anomaly'])
                print(f"   Prediction {i+1}: Anomaly={result['is_anomaly']}, Confidence={result['confidence_score']:.3f}")
            else:
                print(f"❌ Prediction {i+1} failed - Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Prediction {i+1} error: {str(e)}")
            return False
    
    # Check if all predictions are consistent
    if len(set(results)) == 1:
        print("✅ Multiple predictions test passed - Consistent results")
        return True
    else:
        print("❌ Multiple predictions test failed - Inconsistent results")
        return False

def main():
    """Run all tests"""
    print("🚀 Quick AI Service Test Suite")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Single Prediction", test_single_prediction),
        ("Unhealthy Prediction", test_unhealthy_prediction),
        ("Invalid Input", test_invalid_input),
        ("Response Time", test_response_time),
        ("Multiple Predictions", test_multiple_predictions)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*15} {test_name} {'='*15}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {str(e)}")
    
    print("\n" + "=" * 50)
    print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! AI Service is working perfectly.")
    elif passed >= total * 0.8:
        print("✅ MOST TESTS PASSED! AI Service is working well.")
    else:
        print("⚠️ MANY TESTS FAILED! AI Service needs attention.")
    
    return passed == total

if __name__ == "__main__":
    main() 