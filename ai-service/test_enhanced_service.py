#!/usr/bin/env python3
"""
Enhanced AI Service Test Suite
Tests the new drift detection and advanced anomaly detection features
"""

import requests
import json
import time
from datetime import datetime, timedelta
import random

# Configuration
AI_SERVICE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:8080"

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

def generate_test_data(days_back=30):
    """Generate realistic test data for drift detection"""
    test_data = []
    
    # Generate baseline data (first 20 days - healthy routine)
    for i in range(20):
        date = datetime.now() - timedelta(days=days_back-i)
        data = {
            "sleep_hours": random.uniform(7.5, 8.5),
            "meal_times": ["07:30", "12:00", "18:30"],
            "screen_time": random.uniform(4.0, 6.0),
            "exercise_duration": random.uniform(0.5, 1.0),
            "wake_up_time": "07:00",
            "bed_time": "23:00",
            "water_intake": random.uniform(2.0, 2.5),
            "stress_level": random.randint(3, 6)
        }
        test_data.append(data)
    
    # Generate drift data (last 10 days - unhealthy routine)
    for i in range(10):
        date = datetime.now() - timedelta(days=9-i)
        data = {
            "sleep_hours": random.uniform(5.0, 6.5),  # Less sleep
            "meal_times": ["08:30", "14:00", "20:30"],  # Irregular meals
            "screen_time": random.uniform(8.0, 12.0),  # More screen time
            "exercise_duration": random.uniform(0.0, 0.3),  # Less exercise
            "wake_up_time": "08:30",
            "bed_time": "01:00",
            "water_intake": random.uniform(1.0, 1.5),  # Less water
            "stress_level": random.randint(7, 9)  # Higher stress
        }
        test_data.append(data)
    
    return test_data

def test_basic_prediction():
    """Test basic anomaly prediction"""
    print("\n🔍 Testing basic anomaly prediction...")
    
    test_data = {
        "sleep_hours": 6.0,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 8.0,
        "exercise_duration": 0.2,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 1.5,
        "stress_level": 7
    }
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/predict",
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Basic prediction successful")
            print(f"   Anomaly detected: {result['is_anomaly']}")
            print(f"   Confidence: {result['confidence_score']:.3f}")
            print(f"   Anomaly type: {result['anomaly_type']}")
            print(f"   Recommendations: {len(result['recommendations'])} provided")
            
            # Check for drift analysis
            if 'drift_analysis' in result:
                print(f"   Drift analysis: Available")
                drift = result['drift_analysis']
                print(f"     Drift detected: {drift.get('drift_detected', False)}")
                print(f"     Drift type: {drift.get('drift_type', 'unknown')}")
                print(f"     Confidence: {drift.get('confidence', 0.0):.3f}")
            
            return True
        else:
            print(f"❌ Basic prediction failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Basic prediction error: {str(e)}")
        return False

def test_drift_detection():
    """Test drift detection with historical data"""
    print("\n📈 Testing drift detection...")
    
    # Generate test data with clear drift pattern
    historical_data = generate_test_data()
    
    # Test current data (should show drift)
    current_data = {
        "sleep_hours": 5.5,
        "meal_times": ["09:00", "15:00", "21:00"],
        "screen_time": 10.0,
        "exercise_duration": 0.1,
        "wake_up_time": "09:00",
        "bed_time": "02:00",
        "water_intake": 1.0,
        "stress_level": 8
    }
    
    # Enhanced request with historical context
    enhanced_request = {
        "current_data": current_data,
        "historical_data": historical_data,
        "user_id": "test_user_drift"
    }
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/predict",
            json=enhanced_request,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Drift detection test successful")
            
            # Check drift analysis
            if 'drift_analysis' in result:
                drift = result['drift_analysis']
                print(f"   Drift detected: {drift.get('drift_detected', False)}")
                print(f"   Drift type: {drift.get('drift_type', 'unknown')}")
                print(f"   Confidence: {drift.get('confidence', 0.0):.3f}")
                
                # Check PADWIN analysis
                if 'padwin_analysis' in drift:
                    padwin = drift['padwin_analysis']
                    print(f"   PADWIN drift: {padwin.get('drift_detected', False)}")
                    print(f"   PADWIN confidence: {padwin.get('confidence', 0.0):.3f}")
                
                # Check Isolation Forest analysis
                if 'isolation_analysis' in drift:
                    isolation = drift['isolation_analysis']
                    print(f"   Isolation Forest anomaly: {isolation.get('anomaly_detected', False)}")
                    print(f"   Isolation confidence: {isolation.get('confidence', 0.0):.3f}")
                
                # Check baseline comparison
                if 'baseline_comparison' in result:
                    baseline = result['baseline_comparison']
                    print(f"   Baseline comparison: {len(baseline)} metrics compared")
                    
                    for metric, comparison in baseline.items():
                        if isinstance(comparison, dict):
                            deviation = comparison.get('deviation', 'unknown')
                            percent_change = comparison.get('percent_change', 0.0)
                            print(f"     {metric}: {deviation} ({percent_change:+.1f}%)")
            
            return True
        else:
            print(f"❌ Drift detection failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Drift detection error: {str(e)}")
        return False

def test_backend_integration():
    """Test backend integration with enhanced AI service"""
    print("\n🔗 Testing backend integration...")
    
    # Test backend health
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        if response.status_code != 200:
            print(f"❌ Backend health check failed - Status: {response.status_code}")
            return False
        print("✅ Backend is healthy")
    except Exception as e:
        print(f"❌ Backend health check error: {str(e)}")
        return False
    
    # Test routine log creation
    routine_data = {
        "user_id": "test_user_123",
        "sleep_hours": 7.5,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 5.0,
        "exercise_duration": 0.8,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.2,
        "stress_level": 4,
        "log_date": datetime.now().strftime("%Y-%m-%d")
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/routine-logs",
            json=routine_data,
            timeout=30
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Routine log created successfully")
            print(f"   Log ID: {result.get('id', 'unknown')}")
            
            # Test insights retrieval
            user_id = routine_data["user_id"]
            insights_response = requests.get(
                f"{BACKEND_URL}/api/insights/{user_id}",
                timeout=30
            )
            
            if insights_response.status_code == 200:
                insights = insights_response.json()
                print(f"✅ Insights retrieved successfully")
                print(f"   Insights count: {len(insights)}")
                
                # Check for AI analysis in insights
                for insight in insights:
                    if 'ai_report' in insight:
                        ai_report = insight['ai_report']
                        print(f"   AI Report found - Anomaly: {ai_report.get('is_anomaly', False)}")
                        print(f"   Confidence: {ai_report.get('confidence_score', 0.0):.3f}")
                        break
                
                return True
            else:
                print(f"❌ Insights retrieval failed - Status: {insights_response.status_code}")
                return False
        else:
            print(f"❌ Routine log creation failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Backend integration error: {str(e)}")
        return False

def test_performance():
    """Test AI service performance under load"""
    print("\n⚡ Testing performance...")
    
    test_data = {
        "sleep_hours": 7.0,
        "meal_times": ["07:30", "12:00", "18:30"],
        "screen_time": 6.0,
        "exercise_duration": 0.5,
        "wake_up_time": "07:00",
        "bed_time": "23:00",
        "water_intake": 2.0,
        "stress_level": 5
    }
    
    start_time = time.time()
    successful_requests = 0
    total_requests = 10
    
    for i in range(total_requests):
        try:
            response = requests.post(
                f"{AI_SERVICE_URL}/predict",
                json=test_data,
                timeout=30
            )
            
            if response.status_code == 200:
                successful_requests += 1
            else:
                print(f"   Request {i+1} failed - Status: {response.status_code}")
                
        except Exception as e:
            print(f"   Request {i+1} error: {str(e)}")
    
    end_time = time.time()
    total_time = end_time - start_time
    avg_time = total_time / total_requests
    
    print(f"✅ Performance test completed")
    print(f"   Successful requests: {successful_requests}/{total_requests}")
    print(f"   Total time: {total_time:.2f}s")
    print(f"   Average response time: {avg_time:.2f}s")
    print(f"   Requests per second: {total_requests/total_time:.2f}")
    
    return successful_requests == total_requests

def main():
    """Run all tests"""
    print("🚀 Starting Enhanced AI Service Test Suite")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_check),
        ("Basic Prediction", test_basic_prediction),
        ("Drift Detection", test_drift_detection),
        ("Backend Integration", test_backend_integration),
        ("Performance", test_performance)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Enhanced AI service is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the service configuration.")
    
    return passed == len(results)

if __name__ == "__main__":
    main() 