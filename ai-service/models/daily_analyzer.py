"""
Daily Routine Analyzer
Computes daily scores, detects anomalies, and generates recommendations
"""

import logging
from datetime import datetime, time
from typing import List, Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class AnomalyCode(Enum):
    """Anomaly codes for detected issues"""
    LATE_SLEEP = "LATE_SLEEP"
    INSUFFICIENT_SLEEP = "INSUFFICIENT_SLEEP"
    EXCESSIVE_SLEEP = "EXCESSIVE_SLEEP"
    LOW_STEPS = "LOW_STEPS"
    NO_WORKOUT = "NO_WORKOUT"
    HIGH_SCREEN_TIME = "HIGH_SCREEN_TIME"
    MISSED_MEALS = "MISSED_MEALS"
    HIGH_STRESS = "HIGH_STRESS"
    LOW_MOOD = "LOW_MOOD"
    IRREGULAR_SCHEDULE = "IRREGULAR_SCHEDULE"


class Severity(Enum):
    """Severity levels for anomalies"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DailyAnalyzer:
    """
    Analyzes daily routine data and computes scores, anomalies, and recommendations.
    Uses rule-based analysis (can be replaced with ML model later).
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def analyze_day(
        self,
        user_id: str,
        date: str,
        sleep_hours: float,
        bedtime: str,
        wake_time: str,
        steps: int,
        workout_minutes: int,
        screen_time_minutes: int,
        meals: Dict[str, bool],
        mood: int,
        stress_level: int,
        goal_context: Dict[str, Any],
        history_window_days: int = 14
    ) -> Dict[str, Any]:
        """
        Main analysis function that computes daily score, detects anomalies, and generates recommendations.
        
        Args:
            user_id: User identifier
            date: Date in YYYY-MM-DD format
            sleep_hours: Hours of sleep
            bedtime: Bedtime in HH:MM format
            wake_time: Wake time in HH:MM format
            steps: Daily step count
            workout_minutes: Minutes of exercise
            screen_time_minutes: Minutes of screen time
            meals: Dict with breakfast, lunch, dinner (boolean)
            mood: Mood score (1-5, higher is better)
            stress_level: Stress level (1-10, lower is better)
            goal_context: User's goals (sleep_target_hours, daily_step_target, max_screen_time_minutes)
            history_window_days: Number of days to consider for historical comparison (not used in initial version)
        
        Returns:
            Dict with daily_score, anomalies, and recommendations
        """
        self.logger.info(f"Analyzing day {date} for user {user_id}")

        # Extract goal targets (with defaults)
        sleep_target = goal_context.get("sleep_target_hours", 7.5)
        step_target = goal_context.get("daily_step_target", 8000)
        screen_time_limit = goal_context.get("max_screen_time_minutes", 180)

        # Compute daily score (0-100)
        daily_score = self._compute_daily_score(
            sleep_hours=sleep_hours,
            sleep_target=sleep_target,
            steps=steps,
            step_target=step_target,
            workout_minutes=workout_minutes,
            screen_time_minutes=screen_time_minutes,
            screen_time_limit=screen_time_limit,
            meals=meals,
            mood=mood,
            stress_level=stress_level
        )

        # Detect anomalies
        anomalies = self._detect_anomalies(
            sleep_hours=sleep_hours,
            sleep_target=sleep_target,
            bedtime=bedtime,
            wake_time=wake_time,
            steps=steps,
            step_target=step_target,
            workout_minutes=workout_minutes,
            screen_time_minutes=screen_time_minutes,
            screen_time_limit=screen_time_limit,
            meals=meals,
            stress_level=stress_level,
            mood=mood
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            sleep_hours=sleep_hours,
            sleep_target=sleep_target,
            bedtime=bedtime,
            wake_time=wake_time,
            steps=steps,
            step_target=step_target,
            workout_minutes=workout_minutes,
            screen_time_minutes=screen_time_minutes,
            screen_time_limit=screen_time_limit,
            meals=meals,
            stress_level=stress_level,
            mood=mood,
            anomalies=anomalies
        )

        return {
            "user_id": user_id,
            "date": date,
            "daily_score": round(daily_score, 1),
            "anomalies": anomalies,
            "recommendations": recommendations
        }

    def _compute_daily_score(
        self,
        sleep_hours: float,
        sleep_target: float,
        steps: int,
        step_target: int,
        workout_minutes: int,
        screen_time_minutes: int,
        screen_time_limit: int,
        meals: Dict[str, bool],
        mood: int,
        stress_level: int
    ) -> float:
        """
        Compute daily routine score (0-100).
        Higher is better.
        
        Scoring breakdown:
        - Sleep: 30 points (based on target achievement)
        - Steps: 20 points
        - Workout: 15 points
        - Screen time: 15 points (inverse - less is better)
        - Meals: 10 points (3 meals = full points)
        - Mood: 5 points
        - Stress: 5 points (inverse - less is better)
        """
        score = 0.0

        # Sleep score (0-30 points)
        sleep_ratio = min(sleep_hours / sleep_target, 1.0) if sleep_target > 0 else 0.0
        # Bonus for being close to target (within 0.5 hours)
        if abs(sleep_hours - sleep_target) <= 0.5:
            sleep_ratio = 1.0
        score += sleep_ratio * 30

        # Steps score (0-20 points)
        steps_ratio = min(steps / step_target, 1.0) if step_target > 0 else 0.0
        score += steps_ratio * 20

        # Workout score (0-15 points)
        # 30+ minutes = full points, 15-30 = partial, <15 = minimal
        if workout_minutes >= 30:
            workout_ratio = 1.0
        elif workout_minutes >= 15:
            workout_ratio = 0.6
        elif workout_minutes > 0:
            workout_ratio = 0.3
        else:
            workout_ratio = 0.0
        score += workout_ratio * 15

        # Screen time score (0-15 points, inverse)
        # Under limit = full points, over limit = reduced
        if screen_time_minutes <= screen_time_limit:
            screen_ratio = 1.0
        else:
            # Penalty increases with excess
            excess = screen_time_minutes - screen_time_limit
            screen_ratio = max(0.0, 1.0 - (excess / screen_time_limit))
        score += screen_ratio * 15

        # Meals score (0-10 points)
        meal_count = sum(1 for v in meals.values() if v)
        meal_ratio = min(meal_count / 3.0, 1.0)
        score += meal_ratio * 10

        # Mood score (0-5 points, assuming 1-5 scale)
        mood_ratio = (mood - 1) / 4.0 if mood >= 1 else 0.0
        score += mood_ratio * 5

        # Stress score (0-5 points, inverse)
        # Lower stress = higher score
        stress_ratio = max(0.0, 1.0 - (stress_level - 1) / 9.0) if stress_level >= 1 else 0.0
        score += stress_ratio * 5

        return min(score, 100.0)

    def _detect_anomalies(
        self,
        sleep_hours: float,
        sleep_target: float,
        bedtime: str,
        wake_time: str,
        steps: int,
        step_target: int,
        workout_minutes: int,
        screen_time_minutes: int,
        screen_time_limit: int,
        meals: Dict[str, bool],
        stress_level: int,
        mood: int
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalies in daily routine.
        Returns list of anomaly dicts with code, description, and severity.
        """
        anomalies = []

        # Sleep anomalies
        sleep_deficit = sleep_target - sleep_hours
        if sleep_hours < sleep_target - 1.0:  # More than 1 hour below target
            severity = Severity.HIGH if sleep_deficit > 2.0 else Severity.MEDIUM
            anomalies.append({
                "code": AnomalyCode.INSUFFICIENT_SLEEP.value,
                "description": f"You slept {sleep_hours:.1f} hours, which is {sleep_deficit:.1f} hours below your target of {sleep_target} hours.",
                "severity": severity.value
            })
        elif sleep_hours > sleep_target + 2.0:  # More than 2 hours above target
            anomalies.append({
                "code": AnomalyCode.EXCESSIVE_SLEEP.value,
                "description": f"You slept {sleep_hours:.1f} hours, which is significantly above your target of {sleep_target} hours.",
                "severity": Severity.MEDIUM.value
            })

        # Late bedtime (after 11 PM)
        try:
            bed_hour = int(bedtime.split(':')[0])
            if bed_hour >= 23 or bed_hour < 6:  # After 11 PM or before 6 AM
                anomalies.append({
                    "code": AnomalyCode.LATE_SLEEP.value,
                    "description": f"You went to bed at {bedtime}, which is later than recommended for optimal sleep.",
                    "severity": Severity.MEDIUM.value
                })
        except (ValueError, IndexError):
            pass  # Skip if time parsing fails

        # Steps anomalies
        if steps < step_target * 0.7:  # Less than 70% of target
            severity = Severity.HIGH if steps < step_target * 0.5 else Severity.MEDIUM
            anomalies.append({
                "code": AnomalyCode.LOW_STEPS.value,
                "description": f"You took {steps:,} steps today, which is below your target of {step_target:,} steps.",
                "severity": severity.value
            })

        # Workout anomalies
        if workout_minutes == 0:
            anomalies.append({
                "code": AnomalyCode.NO_WORKOUT.value,
                "description": "You didn't log any workout or exercise today.",
                "severity": Severity.MEDIUM.value
            })

        # Screen time anomalies
        if screen_time_minutes > screen_time_limit:
            excess = screen_time_minutes - screen_time_limit
            severity = Severity.HIGH if excess > screen_time_limit * 0.5 else Severity.MEDIUM
            anomalies.append({
                "code": AnomalyCode.HIGH_SCREEN_TIME.value,
                "description": f"You spent {screen_time_minutes} minutes on screens today, which exceeds your limit of {screen_time_limit} minutes by {excess} minutes.",
                "severity": severity.value
            })

        # Meal anomalies
        meal_count = sum(1 for v in meals.values() if v)
        if meal_count < 2:
            anomalies.append({
                "code": AnomalyCode.MISSED_MEALS.value,
                "description": f"You only had {meal_count} meal(s) today. Regular meals help maintain energy and metabolism.",
                "severity": Severity.MEDIUM.value
            })

        # Stress anomalies
        if stress_level >= 7:
            severity = Severity.HIGH if stress_level >= 9 else Severity.MEDIUM
            anomalies.append({
                "code": AnomalyCode.HIGH_STRESS.value,
                "description": f"Your stress level is {stress_level}/10, which is quite high.",
                "severity": severity.value
            })

        # Mood anomalies
        if mood <= 2:  # Assuming 1-5 scale
            anomalies.append({
                "code": AnomalyCode.LOW_MOOD.value,
                "description": f"Your mood today was {mood}/5, which is lower than usual.",
                "severity": Severity.MEDIUM.value
            })

        return anomalies

    def _generate_recommendations(
        self,
        sleep_hours: float,
        sleep_target: float,
        bedtime: str,
        wake_time: str,
        steps: int,
        step_target: int,
        workout_minutes: int,
        screen_time_minutes: int,
        screen_time_limit: int,
        meals: Dict[str, bool],
        stress_level: int,
        mood: int,
        anomalies: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate actionable recommendations based on detected anomalies and routine data.
        Returns 3-5 recommendations prioritized by severity.
        """
        recommendations = []
        anomaly_codes = {a["code"] for a in anomalies}

        # Sleep recommendations
        if AnomalyCode.INSUFFICIENT_SLEEP.value in anomaly_codes or AnomalyCode.LATE_SLEEP.value in anomaly_codes:
            sleep_deficit = sleep_target - sleep_hours
            if sleep_deficit > 0:
                wind_down_time = "30 minutes earlier" if sleep_deficit > 1.0 else "15 minutes earlier"
                recommendations.append({
                    "title": "Normalize your bedtime",
                    "reason": f"You slept {sleep_hours:.1f} hours, which is {sleep_deficit:.1f} hours less than your target.",
                    "suggested_action": f"Try starting your wind-down routine {wind_down_time} tonight (no screens after 10:30 PM).",
                    "time_horizon": "today"
                })

        # Steps recommendations
        if AnomalyCode.LOW_STEPS.value in anomaly_codes:
            steps_needed = step_target - steps
            if steps_needed > 0:
                recommendations.append({
                    "title": "Increase your daily activity",
                    "reason": f"You're {steps_needed:,} steps short of your {step_target:,} step goal.",
                    "suggested_action": f"Take a 10-15 minute walk, use stairs instead of elevators, or park further away to add {steps_needed//3:,} steps.",
                    "time_horizon": "today"
                })

        # Workout recommendations
        if AnomalyCode.NO_WORKOUT.value in anomaly_codes:
            recommendations.append({
                "title": "Add some movement to your day",
                "reason": "Regular exercise improves sleep quality, mood, and overall health.",
                "suggested_action": "Try a 20-minute walk, 10-minute home workout, or yoga session. Even short bursts of activity help.",
                "time_horizon": "today"
            })

        # Screen time recommendations
        if AnomalyCode.HIGH_SCREEN_TIME.value in anomaly_codes:
            excess = screen_time_minutes - screen_time_limit
            recommendations.append({
                "title": "Reduce screen time",
                "reason": f"You exceeded your screen time limit by {excess} minutes.",
                "suggested_action": "Set app timers, use Do Not Disturb mode during focused work, and take regular breaks away from screens.",
                "time_horizon": "this_week"
            })

        # Meal recommendations
        if AnomalyCode.MISSED_MEALS.value in anomaly_codes:
            recommendations.append({
                "title": "Maintain regular meal schedule",
                "reason": "Skipping meals can affect energy levels, metabolism, and sleep quality.",
                "suggested_action": "Plan your meals for tomorrow and set reminders. Even small, balanced meals are better than skipping.",
                "time_horizon": "this_week"
            })

        # Stress recommendations
        if AnomalyCode.HIGH_STRESS.value in anomaly_codes:
            recommendations.append({
                "title": "Manage your stress levels",
                "reason": f"Your stress level is {stress_level}/10, which can impact sleep and overall well-being.",
                "suggested_action": "Try 5 minutes of deep breathing, a short walk, or listen to calming music. Consider what's causing stress and address one small thing.",
                "time_horizon": "today"
            })

        # Mood recommendations
        if AnomalyCode.LOW_MOOD.value in anomaly_codes:
            recommendations.append({
                "title": "Boost your mood",
                "reason": "Low mood can be improved with small positive actions.",
                "suggested_action": "Spend 10 minutes doing something you enjoy, connect with a friend, or practice gratitude by writing down 3 good things from today.",
                "time_horizon": "today"
            })

        # If no specific anomalies, provide general encouragement
        if not recommendations:
            recommendations.append({
                "title": "Keep up the great work!",
                "reason": "Your routine looks balanced today.",
                "suggested_action": "Maintain these healthy habits and consider setting a small new goal for this week.",
                "time_horizon": "this_week"
            })

        # Limit to top 5 recommendations, prioritized by severity
        # Sort by severity (high > medium > low) and return top 5
        severity_order = {"high": 3, "medium": 2, "low": 1}
        recommendations_with_severity = []
        for rec in recommendations:
            # Find matching anomaly severity
            rec_severity = 0
            for anomaly in anomalies:
                if any(keyword in rec["reason"].lower() for keyword in anomaly["description"].lower().split()[:5]):
                    rec_severity = severity_order.get(anomaly["severity"], 0)
                    break
            recommendations_with_severity.append((rec_severity, rec))

        recommendations_with_severity.sort(key=lambda x: x[0], reverse=True)
        return [rec for _, rec in recommendations_with_severity[:5]]

