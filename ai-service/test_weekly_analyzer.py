"""
Unit tests for WeeklyAnalyzer
Tests trend detection, insights generation, and micro-goal creation
"""

import pytest
from models.weekly_analyzer import WeeklyAnalyzer, TrendDirection


class TestWeeklyAnalyzer:
    """Test suite for WeeklyAnalyzer"""

    def setup_method(self):
        """Set up test fixtures"""
        self.analyzer = WeeklyAnalyzer()

    def test_analyze_week_improving_steps(self):
        """Test weekly analysis with improving step count trend"""
        # Create 7 days of data where steps are improving
        records = []
        for i in range(7):
            records.append({
                "date": f"2025-06-{i+1:02d}",
                "sleep_hours": 7.5,
                "steps": 7000 + (i * 300),  # Increasing steps
                "workout_minutes": 30,
                "screen_time_minutes": 200,
                "mood": 4,
                "stress_level": 3
            })
        
        result = self.analyzer.analyze_week(records)
        
        # Check summary
        assert "average_steps" in result["summary"]
        assert result["summary"]["average_steps"] > 7000
        
        # Check trends - steps should be improving
        steps_trend = next((t for t in result["trends"] if t["metric"] == "steps"), None)
        assert steps_trend is not None
        assert steps_trend["direction"] == TrendDirection.IMPROVING.value
        
        # Check insights
        assert len(result["insights"]) > 0
        assert len(result["insights"]) <= 3
        
        # Check micro-goals
        assert len(result["micro_goals"]) > 0
        assert len(result["micro_goals"]) <= 3

    def test_analyze_week_increasing_screen_time(self):
        """Test weekly analysis with increasing screen time trend"""
        # Create 7 days of data where screen time is increasing
        records = []
        for i in range(7):
            records.append({
                "date": f"2025-06-{i+1:02d}",
                "sleep_hours": 7.5,
                "steps": 8000,
                "workout_minutes": 30,
                "screen_time_minutes": 150 + (i * 30),  # Increasing screen time
                "mood": 4 - (i * 0.1),  # Slightly declining mood
                "stress_level": 3 + (i * 0.2)  # Slightly increasing stress
            })
        
        result = self.analyzer.analyze_week(records)
        
        # Check summary
        assert "average_screen_time_minutes" in result["summary"]
        assert result["summary"]["average_screen_time_minutes"] > 150
        
        # Check trends - screen time should be declining (increasing is bad)
        screen_trend = next((t for t in result["trends"] if t["metric"] == "screen_time_minutes"), None)
        assert screen_trend is not None
        assert screen_trend["direction"] == TrendDirection.DECLINING.value
        
        # Check that insights mention screen time
        screen_insights = [insight for insight in result["insights"] if "screen" in insight.lower()]
        assert len(screen_insights) > 0 or any("screen" in goal["reason"].lower() for goal in result["micro_goals"])

    def test_analyze_week_stable_patterns(self):
        """Test weekly analysis with stable patterns"""
        # Create 7 days of consistent data
        records = []
        for i in range(7):
            records.append({
                "date": f"2025-06-{i+1:02d}",
                "sleep_hours": 7.5,
                "steps": 8000,
                "workout_minutes": 30,
                "screen_time_minutes": 200,
                "mood": 4,
                "stress_level": 3
            })
        
        result = self.analyzer.analyze_week(records)
        
        # Most trends should be stable
        stable_trends = [t for t in result["trends"] if t["direction"] == TrendDirection.STABLE.value]
        assert len(stable_trends) > 0
        
        # Should still generate insights and goals
        assert len(result["insights"]) > 0
        assert len(result["micro_goals"]) > 0

    def test_analyze_week_insufficient_data(self):
        """Test that analyzer handles insufficient data gracefully"""
        # Only 1 day of data
        records = [{
            "date": "2025-06-01",
            "sleep_hours": 7.5,
            "steps": 8000,
            "workout_minutes": 30,
            "screen_time_minutes": 200,
            "mood": 4,
            "stress_level": 3
        }]
        
        with pytest.raises(ValueError, match="Need at least 2 days"):
            self.analyzer.analyze_week(records)

    def test_trend_detection_improving(self):
        """Test trend detection for improving metrics"""
        records = [
            {"sleep_hours": 6.5, "steps": 6000, "mood": 3, "stress_level": 5},
            {"sleep_hours": 7.0, "steps": 7000, "mood": 3.5, "stress_level": 4},
            {"sleep_hours": 7.5, "steps": 8000, "mood": 4, "stress_level": 3},
            {"sleep_hours": 8.0, "steps": 9000, "mood": 4.5, "stress_level": 2},
        ]
        
        # Add required fields
        for i, r in enumerate(records):
            r["date"] = f"2025-06-{i+1:02d}"
            r["workout_minutes"] = 30
            r["screen_time_minutes"] = 200
        
        result = self.analyzer.analyze_week(records)
        
        # Sleep should be improving
        sleep_trend = next((t for t in result["trends"] if t["metric"] == "sleep_hours"), None)
        assert sleep_trend is not None
        assert sleep_trend["direction"] == TrendDirection.IMPROVING.value

    def test_micro_goals_generation(self):
        """Test that micro-goals are generated appropriately"""
        # Create data with issues that should trigger goals
        records = []
        for i in range(7):
            records.append({
                "date": f"2025-06-{i+1:02d}",
                "sleep_hours": 6.0,  # Low sleep
                "steps": 5000 - (i * 100),  # Declining steps
                "workout_minutes": 0 if i < 3 else 20,  # Few workouts
                "screen_time_minutes": 400,  # High screen time
                "mood": 3,
                "stress_level": 7  # High stress
            })
        
        result = self.analyzer.analyze_week(records)
        
        # Should generate multiple micro-goals
        assert len(result["micro_goals"]) >= 1
        assert len(result["micro_goals"]) <= 3
        
        # Check goal structure
        for goal in result["micro_goals"]:
            assert "title" in goal
            assert "reason" in goal
            assert "suggested_action" in goal
            assert len(goal["title"]) > 0
            assert len(goal["suggested_action"]) > 0

    def test_insights_generation(self):
        """Test that insights are generated"""
        records = []
        for i in range(7):
            records.append({
                "date": f"2025-06-{i+1:02d}",
                "sleep_hours": 7.5,
                "steps": 8000,
                "workout_minutes": 30,
                "screen_time_minutes": 200,
                "mood": 4,
                "stress_level": 3
            })
        
        result = self.analyzer.analyze_week(records)
        
        # Should generate 3 insights
        assert len(result["insights"]) == 3
        
        # Check insight structure
        for insight in result["insights"]:
            assert isinstance(insight, str)
            assert len(insight) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

