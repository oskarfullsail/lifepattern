#!/usr/bin/env python3
"""
Test script for the AI Service
Tests both normal and anomalous daily routines
"""

import requests
import json
import time
from utils.data_generator import create_sample_data

BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    """Test the health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   Model accuracy: {data['model_accuracy']:.3f}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to service. Make sure it's running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_prediction_endpoint(data, expected_anomaly=False):
    """Test the prediction endpoint with given data"""
    print(f"\nTesting prediction endpoint with {'anomalous' if expected_anomaly else 'normal'} routine...")
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Prediction successful")
            print(f"   Is anomaly: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Anomaly type: {result['anomaly_type']}")
            print(f"   Recommendations: {result['recommendations']}")
            
            # Check if prediction matches expectation
            if result['is_anomaly'] == expected_anomaly:
                print(f"✅ Prediction matches expectation")
                return True
            else:
                print(f"⚠️  Prediction doesn't match expectation (expected: {expected_anomaly})")
                return False
        else:
            print(f"❌ Prediction failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return False

def test_invalid_data():
    """Test the prediction endpoint with invalid data"""
    print("\nTesting prediction endpoint with invalid data...")
    
    # Test with invalid meal time format
    invalid_data = {
        "sleep_hours": 8.0,
        "meal_times": ["7:30", "12:00", "18:30"],  # Invalid format
        "screen_time": 4.5,
        "exercise_duration": 1.0,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.5,
        "stress_level": 4
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            json=invalid_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            print("✅ Invalid data correctly rejected")
            print(f"   Error: {response.json()['detail']}")
            return True
        else:
            print(f"❌ Invalid data not properly validated (status: {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Invalid data test error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting AI Service Tests")
    print("=" * 50)
    
    # Wait for service to be ready
    print("Waiting for service to be ready...")
    time.sleep(5)
    
    # Test health endpoint
    if not test_health_endpoint():
        print("❌ Service is not healthy. Exiting tests.")
        return
    
    # Get sample data
    sample_data = create_sample_data()
    
    # Test normal routine
    normal_success = test_prediction_endpoint(
        sample_data["normal_routine"], 
        expected_anomaly=False
    )
    
    # Test anomalous routine
    anomalous_success = test_prediction_endpoint(
        sample_data["anomalous_routine"], 
        expected_anomaly=True
    )
    
    # Test invalid data
    invalid_success = test_invalid_data()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    print(f"Health Check: {'✅ PASS' if normal_success else '❌ FAIL'}")
    print(f"Normal Routine: {'✅ PASS' if normal_success else '❌ FAIL'}")
    print(f"Anomalous Routine: {'✅ PASS' if anomalous_success else '❌ FAIL'}")
    print(f"Invalid Data Validation: {'✅ PASS' if invalid_success else '❌ FAIL'}")
    
    all_passed = normal_success and anomalous_success and invalid_success
    if all_passed:
        print("\n🎉 All tests passed! The AI service is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the service configuration.")

if __name__ == "__main__":
    main() 