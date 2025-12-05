"""
Unit tests for DailyAnalyzer
Tests the core analysis logic for daily routine scoring, anomaly detection, and recommendations.
"""

import pytest
from models.daily_analyzer import DailyAnalyzer, AnomalyCode, Severity


class TestDailyAnalyzer:
    """Test suite for DailyAnalyzer"""

    def setup_method(self):
        """Set up test fixtures"""
        self.analyzer = DailyAnalyzer()
        self.default_goals = {
            "sleep_target_hours": 7.5,
            "daily_step_target": 8000,
            "max_screen_time_minutes": 180
        }

    def test_compute_daily_score_ideal_day(self):
        """Test score calculation for an ideal day"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:30",
            wake_time="06:00",
            steps=8000,
            workout_minutes=30,
            screen_time_minutes=120,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=5,
            stress_level=3,
            goal_context=self.default_goals
        )
        
        # Ideal day should score high (80+)
        assert result["daily_score"] >= 80
        assert len(result["anomalies"]) == 0

    def test_compute_daily_score_poor_sleep(self):
        """Test score calculation with insufficient sleep"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=5.0,  # Below target
            bedtime="23:45",
            wake_time="05:00",
            steps=5000,
            workout_minutes=0,
            screen_time_minutes=300,  # Over limit
            meals={"breakfast": False, "lunch": True, "dinner": True},
            mood=2,
            stress_level=8,
            goal_context=self.default_goals
        )
        
        # Should have lower score due to multiple issues
        assert result["daily_score"] < 60
        assert len(result["anomalies"]) > 0

    def test_detect_anomalies_insufficient_sleep(self):
        """Test detection of insufficient sleep anomaly"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=5.0,  # 2.5 hours below target
            bedtime="23:30",
            wake_time="05:00",
            steps=6000,
            workout_minutes=20,
            screen_time_minutes=150,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=3,
            stress_level=5,
            goal_context=self.default_goals
        )
        
        # Should detect insufficient sleep
        sleep_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.INSUFFICIENT_SLEEP.value]
        assert len(sleep_anomalies) > 0
        assert sleep_anomalies[0]["severity"] in [Severity.MEDIUM.value, Severity.HIGH.value]

    def test_detect_anomalies_late_sleep(self):
        """Test detection of late bedtime"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.0,
            bedtime="23:30",  # Late bedtime
            wake_time="06:30",
            steps=7000,
            workout_minutes=30,
            screen_time_minutes=150,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=4,
            stress_level=4,
            goal_context=self.default_goals
        )
        
        # Should detect late sleep
        late_sleep_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.LATE_SLEEP.value]
        assert len(late_sleep_anomalies) > 0

    def test_detect_anomalies_low_steps(self):
        """Test detection of low step count"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:30",
            wake_time="06:00",
            steps=3000,  # Well below target
            workout_minutes=0,
            screen_time_minutes=150,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=3,
            stress_level=5,
            goal_context=self.default_goals
        )
        
        # Should detect low steps
        step_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.LOW_STEPS.value]
        assert len(step_anomalies) > 0

    def test_detect_anomalies_high_screen_time(self):
        """Test detection of excessive screen time"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:30",
            wake_time="06:00",
            steps=8000,
            workout_minutes=30,
            screen_time_minutes=300,  # Over limit
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=3,
            stress_level=5,
            goal_context=self.default_goals
        )
        
        # Should detect high screen time
        screen_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.HIGH_SCREEN_TIME.value]
        assert len(screen_anomalies) > 0

    def test_detect_anomalies_no_workout(self):
        """Test detection of no workout"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:30",
            wake_time="06:00",
            steps=8000,
            workout_minutes=0,  # No workout
            screen_time_minutes=150,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=4,
            stress_level=4,
            goal_context=self.default_goals
        )
        
        # Should detect no workout
        workout_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.NO_WORKOUT.value]
        assert len(workout_anomalies) > 0

    def test_detect_anomalies_missed_meals(self):
        """Test detection of missed meals"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:30",
            wake_time="06:00",
            steps=8000,
            workout_minutes=30,
            screen_time_minutes=150,
            meals={"breakfast": False, "lunch": True, "dinner": False},  # Only 1 meal
            mood=3,
            stress_level=5,
            goal_context=self.default_goals
        )
        
        # Should detect missed meals
        meal_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.MISSED_MEALS.value]
        assert len(meal_anomalies) > 0

    def test_detect_anomalies_high_stress(self):
        """Test detection of high stress"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:30",
            wake_time="06:00",
            steps=8000,
            workout_minutes=30,
            screen_time_minutes=150,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=3,
            stress_level=8,  # High stress
            goal_context=self.default_goals
        )
        
        # Should detect high stress
        stress_anomalies = [a for a in result["anomalies"] if a["code"] == AnomalyCode.HIGH_STRESS.value]
        assert len(stress_anomalies) > 0

    def test_generate_recommendations(self):
        """Test recommendation generation"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=5.0,  # Low sleep
            bedtime="23:45",  # Late
            wake_time="05:00",
            steps=4000,  # Low steps
            workout_minutes=0,  # No workout
            screen_time_minutes=250,  # High screen time
            meals={"breakfast": False, "lunch": True, "dinner": True},
            mood=2,
            stress_level=7,
            goal_context=self.default_goals
        )
        
        # Should generate recommendations
        assert len(result["recommendations"]) > 0
        assert len(result["recommendations"]) <= 5  # Max 5 recommendations
        
        # Check recommendation structure
        for rec in result["recommendations"]:
            assert "title" in rec
            assert "reason" in rec
            assert "suggested_action" in rec
            assert len(rec["title"]) > 0
            assert len(rec["suggested_action"]) > 0

    def test_generate_recommendations_no_anomalies(self):
        """Test recommendations when there are no anomalies"""
        result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:00",
            wake_time="06:00",
            steps=8500,
            workout_minutes=45,
            screen_time_minutes=120,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=5,
            stress_level=2,
            goal_context=self.default_goals
        )
        
        # Should still have at least one encouraging recommendation
        assert len(result["recommendations"]) > 0

    def test_score_boundaries(self):
        """Test that scores are within 0-100 range"""
        # Test very poor day
        poor_result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=4.0,
            bedtime="01:00",
            wake_time="05:00",
            steps=1000,
            workout_minutes=0,
            screen_time_minutes=600,
            meals={"breakfast": False, "lunch": False, "dinner": False},
            mood=1,
            stress_level=10,
            goal_context=self.default_goals
        )
        
        assert 0 <= poor_result["daily_score"] <= 100
        
        # Test perfect day
        perfect_result = self.analyzer.analyze_day(
            user_id="test_user",
            date="2025-06-01",
            sleep_hours=7.5,
            bedtime="22:00",
            wake_time="06:00",
            steps=10000,
            workout_minutes=60,
            screen_time_minutes=90,
            meals={"breakfast": True, "lunch": True, "dinner": True},
            mood=5,
            stress_level=1,
            goal_context=self.default_goals
        )
        
        assert 0 <= perfect_result["daily_score"] <= 100
        assert perfect_result["daily_score"] > poor_result["daily_score"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

