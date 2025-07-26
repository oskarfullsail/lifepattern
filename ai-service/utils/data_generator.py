import numpy as np
import pandas as pd
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

def generate_mock_dataset(n_samples: int = 1000, test_size: float = 0.2) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate a mock dataset for training the anomaly detection model
    
    Args:
        n_samples: Number of samples to generate
        test_size: Proportion of data to use for testing
    
    Returns:
        X_train, X_test, y_train, y_test: Training and testing data
    """
    
    np.random.seed(42)
    
    # Generate normal routine data (70% of samples)
    n_normal = int(n_samples * 0.7)
    normal_data = generate_normal_routines(n_normal)
    
    # Generate anomalous routine data (30% of samples)
    n_anomalous = n_samples - n_normal
    anomalous_data = generate_anomalous_routines(n_anomalous)
    
    # Combine data
    all_data = np.vstack([normal_data, anomalous_data])
    all_labels = np.hstack([np.zeros(n_normal), np.ones(n_anomalous)])
    
    # Shuffle data
    indices = np.random.permutation(n_samples)
    all_data = all_data[indices]
    all_labels = all_labels[indices]
    
    # Split into train/test
    split_idx = int(n_samples * (1 - test_size))
    X_train = all_data[:split_idx]
    y_train = all_labels[:split_idx]
    X_test = all_data[split_idx:]
    y_test = all_labels[split_idx:]
    
    logger.info(f"Generated dataset: {n_samples} samples")
    logger.info(f"Normal routines: {n_normal}, Anomalous routines: {n_anomalous}")
    logger.info(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")
    
    return X_train, X_test, y_train, y_test

def generate_normal_routines(n_samples: int) -> np.ndarray:
    """
    Generate normal daily routine data
    """
    data = []
    
    for _ in range(n_samples):
        # Sleep hours: 7-9 hours (normal range)
        sleep_hours = np.random.normal(8.0, 0.5)
        sleep_hours = np.clip(sleep_hours, 7.0, 9.0)
        
        # Screen time: 2-6 hours (reasonable range)
        screen_time = np.random.normal(4.0, 1.0)
        screen_time = np.clip(screen_time, 2.0, 6.0)
        
        # Exercise duration: 0.5-2 hours
        exercise_duration = np.random.normal(1.0, 0.3)
        exercise_duration = np.clip(exercise_duration, 0.5, 2.0)
        
        # Water intake: 2-3 liters
        water_intake = np.random.normal(2.5, 0.3)
        water_intake = np.clip(water_intake, 2.0, 3.0)
        
        # Stress level: 1-6 (low to moderate)
        stress_level = np.random.randint(1, 7)
        
        # Meal count: 2-4 meals
        meal_count = np.random.randint(2, 5)
        
        # Wake up time: 6-8 AM
        wake_up_hour = np.random.randint(6, 9)
        
        # Bed time: 10-12 PM
        bed_time_hour = np.random.randint(22, 25) % 24
        
        # Sleep consistency (close to 8 hours)
        sleep_consistency = 1.0 - abs(sleep_hours - 8.0) / 8.0
        
        # Activity balance (good exercise to screen time ratio)
        total_active_time = exercise_duration + screen_time
        activity_balance = exercise_duration / total_active_time if total_active_time > 0 else 0.0
        
        # Health score (high for normal routines)
        health_score = (
            (sleep_hours / 8.0) * 0.3 +
            (1.0 - screen_time / 12.0) * 0.2 +
            (exercise_duration / 1.0) * 0.2 +
            (water_intake / 2.5) * 0.1 +
            (1.0 - stress_level / 10.0) * 0.1 +
            (meal_count / 3.0) * 0.1
        )
        
        features = [
            sleep_hours, screen_time, exercise_duration, water_intake,
            stress_level, meal_count, wake_up_hour, bed_time_hour,
            sleep_consistency, activity_balance, health_score
        ]
        
        data.append(features)
    
    return np.array(data)

def generate_anomalous_routines(n_samples: int) -> np.ndarray:
    """
    Generate anomalous daily routine data
    """
    data = []
    
    # Define different types of anomalies
    anomaly_types = [
        'insufficient_sleep',
        'excessive_sleep', 
        'excessive_screen_time',
        'insufficient_exercise',
        'low_water_intake',
        'high_stress',
        'irregular_meals',
        'multiple_issues'
    ]
    
    for _ in range(n_samples):
        anomaly_type = np.random.choice(anomaly_types)
        
        if anomaly_type == 'insufficient_sleep':
            # Sleep hours: 4-6 hours (insufficient)
            sleep_hours = np.random.normal(5.0, 0.5)
            sleep_hours = np.clip(sleep_hours, 4.0, 6.0)
            screen_time = np.random.normal(4.0, 1.0)
            exercise_duration = np.random.normal(1.0, 0.3)
            water_intake = np.random.normal(2.5, 0.3)
            stress_level = np.random.randint(1, 7)
            meal_count = np.random.randint(2, 5)
            
        elif anomaly_type == 'excessive_sleep':
            # Sleep hours: 10-12 hours (excessive)
            sleep_hours = np.random.normal(11.0, 0.5)
            sleep_hours = np.clip(sleep_hours, 10.0, 12.0)
            screen_time = np.random.normal(4.0, 1.0)
            exercise_duration = np.random.normal(0.5, 0.3)
            water_intake = np.random.normal(2.5, 0.3)
            stress_level = np.random.randint(1, 7)
            meal_count = np.random.randint(2, 5)
            
        elif anomaly_type == 'excessive_screen_time':
            # Screen time: 8-12 hours (excessive)
            sleep_hours = np.random.normal(8.0, 0.5)
            screen_time = np.random.normal(10.0, 1.0)
            screen_time = np.clip(screen_time, 8.0, 12.0)
            exercise_duration = np.random.normal(0.2, 0.2)
            water_intake = np.random.normal(2.5, 0.3)
            stress_level = np.random.randint(1, 7)
            meal_count = np.random.randint(2, 5)
            
        elif anomaly_type == 'insufficient_exercise':
            # Exercise duration: 0-0.3 hours (insufficient)
            sleep_hours = np.random.normal(8.0, 0.5)
            screen_time = np.random.normal(4.0, 1.0)
            exercise_duration = np.random.normal(0.1, 0.1)
            exercise_duration = np.clip(exercise_duration, 0.0, 0.3)
            water_intake = np.random.normal(2.5, 0.3)
            stress_level = np.random.randint(1, 7)
            meal_count = np.random.randint(2, 5)
            
        elif anomaly_type == 'low_water_intake':
            # Water intake: 0.5-1.5 liters (low)
            sleep_hours = np.random.normal(8.0, 0.5)
            screen_time = np.random.normal(4.0, 1.0)
            exercise_duration = np.random.normal(1.0, 0.3)
            water_intake = np.random.normal(1.0, 0.3)
            water_intake = np.clip(water_intake, 0.5, 1.5)
            stress_level = np.random.randint(1, 7)
            meal_count = np.random.randint(2, 5)
            
        elif anomaly_type == 'high_stress':
            # Stress level: 8-10 (high)
            sleep_hours = np.random.normal(8.0, 0.5)
            screen_time = np.random.normal(4.0, 1.0)
            exercise_duration = np.random.normal(1.0, 0.3)
            water_intake = np.random.normal(2.5, 0.3)
            stress_level = np.random.randint(8, 11)
            meal_count = np.random.randint(2, 5)
            
        elif anomaly_type == 'irregular_meals':
            # Meal count: 0-1 meals (irregular)
            sleep_hours = np.random.normal(8.0, 0.5)
            screen_time = np.random.normal(4.0, 1.0)
            exercise_duration = np.random.normal(1.0, 0.3)
            water_intake = np.random.normal(2.5, 0.3)
            stress_level = np.random.randint(1, 7)
            meal_count = np.random.randint(0, 2)
            
        else:  # multiple_issues
            # Combine multiple issues
            sleep_hours = np.random.normal(5.5, 0.5)
            screen_time = np.random.normal(9.0, 1.0)
            exercise_duration = np.random.normal(0.2, 0.2)
            water_intake = np.random.normal(1.2, 0.3)
            stress_level = np.random.randint(8, 11)
            meal_count = np.random.randint(1, 3)
        
        # Wake up and bed times (can be irregular)
        if sleep_hours < 6:
            wake_up_hour = np.random.randint(4, 7)
            bed_time_hour = np.random.randint(22, 25) % 24
        elif sleep_hours > 10:
            wake_up_hour = np.random.randint(8, 11)
            bed_time_hour = np.random.randint(20, 23)
        else:
            wake_up_hour = np.random.randint(6, 9)
            bed_time_hour = np.random.randint(22, 25) % 24
        
        # Sleep consistency
        sleep_consistency = 1.0 - abs(sleep_hours - 8.0) / 8.0
        
        # Activity balance
        total_active_time = exercise_duration + screen_time
        activity_balance = exercise_duration / total_active_time if total_active_time > 0 else 0.0
        
        # Health score (lower for anomalous routines)
        health_score = (
            (sleep_hours / 8.0) * 0.3 +
            (1.0 - screen_time / 12.0) * 0.2 +
            (exercise_duration / 1.0) * 0.2 +
            (water_intake / 2.5) * 0.1 +
            (1.0 - stress_level / 10.0) * 0.1 +
            (meal_count / 3.0) * 0.1
        )
        
        features = [
            sleep_hours, screen_time, exercise_duration, water_intake,
            stress_level, meal_count, wake_up_hour, bed_time_hour,
            sleep_consistency, activity_balance, health_score
        ]
        
        data.append(features)
    
    return np.array(data)

def create_sample_data() -> dict:
    """
    Create sample data for testing the API
    """
    return {
        "normal_routine": {
            "sleep_hours": 8.0,
            "meal_times": ["07:30", "12:00", "18:30"],
            "screen_time": 4.5,
            "exercise_duration": 1.0,
            "wake_up_time": "07:00",
            "bed_time": "23:00",
            "water_intake": 2.5,
            "stress_level": 4
        },
        "anomalous_routine": {
            "sleep_hours": 5.0,
            "meal_times": ["10:00", "15:00"],
            "screen_time": 10.0,
            "exercise_duration": 0.2,
            "wake_up_time": "05:00",
            "bed_time": "22:00",
            "water_intake": 1.0,
            "stress_level": 8
        }
    } 