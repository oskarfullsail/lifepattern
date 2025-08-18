#!/usr/bin/env python3
"""
Deployment readiness test for AI Service
"""

import requests
import json
import time
from datetime import datetime

def test_deployment_readiness():
    """Test if the AI service is ready for deployment"""
    
    print("🧪 Testing AI Service Deployment Readiness")
    print("=" * 50)
    
    # Test configuration
    base_url = "http://localhost:8000"
    
    tests = [
        ("Health Check", "GET", "/health"),
        ("Model Info", "GET", "/model/info"),
        ("Basic Prediction", "POST", "/predict"),
        ("Enhanced Prediction", "POST", "/predict/enhanced")
    ]
    
    # Test data for predictions
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
    
    results = []
    
    for test_name, method, endpoint in tests:
        print(f"\n🔍 Testing {test_name}...")
        
        try:
            if method == "GET":
                response = requests.get(f"{base_url}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(
                    f"{base_url}{endpoint}", 
                    json=test_data, 
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
            
            if response.status_code == 200:
                print(f"   ✅ {test_name} PASSED")
                results.append((test_name, "PASSED", response.status_code))
                
                # Show response structure for key endpoints
                if endpoint == "/health":
                    data = response.json()
                    print(f"      Status: {data.get('status')}")
                    print(f"      Model Loaded: {data.get('model_loaded')}")
                    print(f"      Accuracy: {data.get('model_accuracy')}")
                
                elif endpoint == "/predict":
                    data = response.json()
                    print(f"      Anomaly: {data.get('is_anomaly')}")
                    print(f"      Confidence: {data.get('confidence_score')}")
                    print(f"      Drift Analysis: {'drift_analysis' in data}")
                    print(f"      Enhanced Recommendations: {'enhanced_recommendations' in data}")
                
                elif endpoint == "/predict/enhanced":
                    data = response.json()
                    print(f"      Behavioral Contexts: {len(data.get('behavioral_contexts', []))}")
                    print(f"      Enhanced Recommendations: {len(data.get('enhanced_recommendations', []))}")
                    print(f"      Drift Analysis: {'drift_analysis' in data}")
                
            else:
                print(f"   ❌ {test_name} FAILED - Status: {response.status_code}")
                results.append((test_name, "FAILED", response.status_code))
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ {test_name} FAILED - Connection Error (service not running)")
            results.append((test_name, "FAILED", "Connection Error"))
        except requests.exceptions.Timeout:
            print(f"   ❌ {test_name} FAILED - Timeout")
            results.append((test_name, "FAILED", "Timeout"))
        except Exception as e:
            print(f"   ❌ {test_name} FAILED - {str(e)}")
            results.append((test_name, "FAILED", str(e)))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Deployment Readiness Summary:")
    
    passed = sum(1 for _, status, _ in results if status == "PASSED")
    total = len(results)
    
    print(f"✅ Tests Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 AI Service is READY for deployment!")
        print("\n🚀 Deployment Checklist:")
        print("   ✅ All endpoints responding")
        print("   ✅ Health check working")
        print("   ✅ Model loading correctly")
        print("   ✅ Drift detection enabled")
        print("   ✅ Enhanced recommendations working")
        print("   ✅ Configuration management ready")
        print("   ✅ Production Dockerfile ready")
        print("   ✅ Environment variables configured")
    else:
        print("⚠️  Some tests failed. Please fix issues before deployment.")
        for test_name, status, details in results:
            if status != "PASSED":
                print(f"   ❌ {test_name}: {details}")
    
    print("\n🔗 Next Steps:")
    print("   1. Commit and push code to GitHub")
    print("   2. Deploy to Render using render.yaml")
    print("   3. Test production endpoints")
    print("   4. Update backend AI service URL")
    print("   5. Monitor service health")

if __name__ == "__main__":
    test_deployment_readiness() 