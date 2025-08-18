#!/usr/bin/env python3
"""
Comprehensive AI Service Test Suite
Tests the AI service with mock data and various scenarios
"""

import pytest
import httpx
import json
import time
from datetime import datetime, timedelta
import random
import numpy as np
from typing import Dict, List, Any

# Configuration
AI_SERVICE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:8080"

class TestAIService:
    """Comprehensive test suite for AI service"""
    
    @pytest.fixture
    def client(self):
        """HTTP client for testing"""
        with httpx.Client(timeout=30.0) as client:
            yield client
    
    @pytest.fixture
    def healthy_routine_data(self):
        """Mock data for a healthy daily routine"""
        return {
            "sleep_hours": 8.0,
            "meal_times": ["07:30", "12:00", "18:30"],
            "screen_time": 4.0,
            "exercise_duration": 1.0,
            "wake_up_time": "07:00",
            "bed_time": "23:00",
            "water_intake": 2.5,
            "stress_level": 4
        }
    
    @pytest.fixture
    def unhealthy_routine_data(self):
        """Mock data for an unhealthy daily routine"""
        return {
            "sleep_hours": 5.0,
            "meal_times": ["09:00", "15:00", "21:00"],
            "screen_time": 10.0,
            "exercise_duration": 0.2,
            "wake_up_time": "08:30",
            "bed_time": "01:00",
            "water_intake": 1.0,
            "stress_level": 8
        }
    
    @pytest.fixture
    def extreme_routine_data(self):
        """Mock data for an extreme unhealthy routine"""
        return {
            "sleep_hours": 3.0,
            "meal_times": ["10:00", "16:00"],
            "screen_time": 16.0,
            "exercise_duration": 0.0,
            "wake_up_time": "10:00",
            "bed_time": "03:00",
            "water_intake": 0.5,
            "stress_level": 10
        }

    def test_health_check(self, client):
        """Test AI service health endpoint"""
        response = client.get(f"{AI_SERVICE_URL}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["model_loaded"] == True
        assert "model_accuracy" in data
        assert "timestamp" in data
        
        print(f"✅ Health check passed - Model accuracy: {data['model_accuracy']:.3f}")

    def test_healthy_routine_prediction(self, client, healthy_routine_data):
        """Test prediction with healthy routine data"""
        response = client.post(f"{AI_SERVICE_URL}/predict", json=healthy_routine_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_anomaly" in data
        assert "confidence_score" in data
        assert "anomaly_type" in data
        assert "recommendations" in data
        assert "timestamp" in data
        
        print(f"✅ Healthy routine test - Anomaly: {data['is_anomaly']}, Confidence: {data['confidence_score']:.3f}")

    def test_unhealthy_routine_prediction(self, client, unhealthy_routine_data):
        """Test prediction with unhealthy routine data"""
        response = client.post(f"{AI_SERVICE_URL}/predict", json=unhealthy_routine_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_anomaly" in data
        assert "confidence_score" in data
        assert "anomaly_type" in data
        assert "recommendations" in data
        
        print(f"✅ Unhealthy routine test - Anomaly: {data['is_anomaly']}, Confidence: {data['confidence_score']:.3f}")

    def test_extreme_routine_prediction(self, client, extreme_routine_data):
        """Test prediction with extreme unhealthy routine data"""
        response = client.post(f"{AI_SERVICE_URL}/predict", json=extreme_routine_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_anomaly" in data
        assert "confidence_score" in data
        assert "anomaly_type" in data
        assert "recommendations" in data
        
        print(f"✅ Extreme routine test - Anomaly: {data['is_anomaly']}, Confidence: {data['confidence_score']:.3f}")

    def test_invalid_time_format(self, client):
        """Test prediction with invalid time format"""
        invalid_data = {
            "sleep_hours": 8.0,
            "meal_times": ["07:30", "12:00", "18:30"],
            "screen_time": 4.0,
            "exercise_duration": 1.0,
            "wake_up_time": "7:00",  # Invalid format
            "bed_time": "23:00",
            "water_intake": 2.5,
            "stress_level": 4
        }
        
        response = client.post(f"{AI_SERVICE_URL}/predict", json=invalid_data)
        assert response.status_code == 400
        
        print("✅ Invalid time format test passed")

    def test_invalid_meal_time_format(self, client):
        """Test prediction with invalid meal time format"""
        invalid_data = {
            "sleep_hours": 8.0,
            "meal_times": ["7:30", "12:00", "18:30"],  # Invalid format
            "screen_time": 4.0,
            "exercise_duration": 1.0,
            "wake_up_time": "07:00",
            "bed_time": "23:00",
            "water_intake": 2.5,
            "stress_level": 4
        }
        
        response = client.post(f"{AI_SERVICE_URL}/predict", json=invalid_data)
        assert response.status_code == 400
        
        print("✅ Invalid meal time format test passed")

    def test_boundary_values(self, client):
        """Test prediction with boundary values"""
        boundary_data = {
            "sleep_hours": 0.0,  # Minimum
            "meal_times": ["00:00", "12:00", "23:59"],
            "screen_time": 24.0,  # Maximum
            "exercise_duration": 24.0,  # Maximum
            "wake_up_time": "00:00",
            "bed_time": "23:59",
            "water_intake": 0.0,  # Minimum
            "stress_level": 1  # Minimum
        }
        
        response = client.post(f"{AI_SERVICE_URL}/predict", json=boundary_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_anomaly" in data
        assert "confidence_score" in data
        
        print(f"✅ Boundary values test - Anomaly: {data['is_anomaly']}, Confidence: {data['confidence_score']:.3f}")

    def test_random_routine_generation(self, client):
        """Test prediction with randomly generated routine data"""
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
            
            response = client.post(f"{AI_SERVICE_URL}/predict", json=random_data)
            assert response.status_code == 200
            
            data = response.json()
            assert "is_anomaly" in data
            assert "confidence_score" in data
            
            print(f"✅ Random routine {i+1} - Anomaly: {data['is_anomaly']}, Confidence: {data['confidence_score']:.3f}")

    def test_recommendations_quality(self, client):
        """Test that recommendations are generated appropriately"""
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
        
        for test_case in test_cases:
            response = client.post(f"{AI_SERVICE_URL}/predict", json=test_case["data"])
            assert response.status_code == 200
            
            data = response.json()
            assert "recommendations" in data
            assert isinstance(data["recommendations"], list)
            assert len(data["recommendations"]) > 0
            
            print(f"✅ {test_case['name']} - {len(data['recommendations'])} recommendations generated")

    def test_confidence_score_range(self, client):
        """Test that confidence scores are within valid range [0, 1]"""
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
        
        response = client.post(f"{AI_SERVICE_URL}/predict", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        confidence = data["confidence_score"]
        assert 0.0 <= confidence <= 1.0
        
        print(f"✅ Confidence score test - Score: {confidence:.3f} (valid range)")

    def test_response_time(self, client, healthy_routine_data):
        """Test that response time is reasonable"""
        start_time = time.time()
        response = client.post(f"{AI_SERVICE_URL}/predict", json=healthy_routine_data)
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response.status_code == 200
        assert response_time < 5.0  # Should respond within 5 seconds
        
        print(f"✅ Response time test - {response_time:.3f} seconds")

    def test_concurrent_requests(self, client, healthy_routine_data):
        """Test handling of concurrent requests"""
        import asyncio
        import httpx
        
        async def make_request():
            async with httpx.AsyncClient(timeout=30.0) as ac:
                response = await ac.post(f"{AI_SERVICE_URL}/predict", json=healthy_routine_data)
                return response.status_code
        
        async def run_concurrent_requests():
            tasks = [make_request() for _ in range(5)]
            results = await asyncio.gather(*tasks)
            return results
        
        results = asyncio.run(run_concurrent_requests())
        
        for i, status_code in enumerate(results):
            assert status_code == 200
            print(f"✅ Concurrent request {i+1} - Status: {status_code}")

def generate_mock_dataset_for_testing():
    """Generate mock dataset for testing purposes"""
    np.random.seed(42)
    n_samples = 1000
    
    # Generate healthy routine data (70% of samples)
    n_healthy = int(0.7 * n_samples)
    healthy_data = {
        'sleep_hours': np.random.normal(8.0, 1.0, n_healthy),
        'screen_time': np.random.normal(5.0, 2.0, n_healthy),
        'exercise_duration': np.random.normal(1.0, 0.5, n_healthy),
        'water_intake': np.random.normal(2.5, 0.5, n_healthy),
        'stress_level': np.random.randint(3, 7, n_healthy),
        'meal_count': np.random.randint(2, 4, n_healthy),
        'wake_up_hour': np.random.randint(6, 9, n_healthy),
        'bed_time_hour': np.random.randint(21, 24, n_healthy),
        'sleep_consistency': np.random.uniform(0.7, 1.0, n_healthy),
        'activity_balance': np.random.uniform(0.3, 0.7, n_healthy),
        'health_score': np.random.uniform(0.6, 1.0, n_healthy)
    }
    
    # Generate unhealthy routine data (30% of samples)
    n_unhealthy = n_samples - n_healthy
    unhealthy_data = {
        'sleep_hours': np.random.normal(5.0, 1.5, n_unhealthy),
        'screen_time': np.random.normal(10.0, 3.0, n_unhealthy),
        'exercise_duration': np.random.normal(0.2, 0.3, n_unhealthy),
        'water_intake': np.random.normal(1.0, 0.5, n_unhealthy),
        'stress_level': np.random.randint(7, 11, n_unhealthy),
        'meal_count': np.random.randint(1, 3, n_unhealthy),
        'wake_up_hour': np.random.randint(8, 12, n_unhealthy),
        'bed_time_hour': np.random.randint(0, 4, n_unhealthy),
        'sleep_consistency': np.random.uniform(0.0, 0.5, n_unhealthy),
        'activity_balance': np.random.uniform(0.0, 0.3, n_unhealthy),
        'health_score': np.random.uniform(0.0, 0.5, n_unhealthy)
    }
    
    # Combine data
    combined_data = {}
    for key in healthy_data.keys():
        combined_data[key] = np.concatenate([healthy_data[key], unhealthy_data[key]])
    
    # Create labels (0 for healthy, 1 for unhealthy)
    labels = np.concatenate([np.zeros(n_healthy), np.ones(n_unhealthy)])
    
    # Shuffle data
    indices = np.random.permutation(n_samples)
    X = np.column_stack([combined_data[key][indices] for key in combined_data.keys()])
    y = labels[indices]
    
    # Split into train/test
    split_idx = int(0.8 * n_samples)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "-s"]) 