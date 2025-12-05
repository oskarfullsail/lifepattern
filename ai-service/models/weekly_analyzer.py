"""
Weekly Pattern Analyzer
Analyzes 7 days of routine data to detect trends, generate insights, and propose micro-goals
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class TrendDirection(Enum):
    """Trend direction for metrics"""
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"


class WeeklyAnalyzer:
    """
    Analyzes weekly routine patterns and generates insights and micro-goals.
    Uses simple trend detection (can be replaced with ML models later).
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def analyze_week(self, daily_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze a week of daily routine data.
        
        Args:
            daily_records: List of daily records, each containing:
                - sleep_hours: float
                - steps: int
                - workout_minutes: int
                - screen_time_minutes: int
                - mood: int (1-5)
                - stress_level: int (1-10)
                - date: str (YYYY-MM-DD)
        
        Returns:
            Dict with summary, trends, insights, and micro_goals
        """
        if not daily_records or len(daily_records) < 2:
            raise ValueError("Need at least 2 days of data for trend analysis")

        self.logger.info(f"Analyzing {len(daily_records)} days of data")

        # Calculate summary statistics
        summary = self._calculate_summary(daily_records)

        # Detect trends (compare first half vs second half)
        trends = self._detect_trends(daily_records)

        # Generate insights
        insights = self._generate_insights(daily_records, summary, trends)

        # Generate micro-goals
        micro_goals = self._generate_micro_goals(daily_records, summary, trends)

        # Get date range
        dates = sorted([record.get('date', '') for record in daily_records if record.get('date')])
        week_start = dates[0] if dates else ""
        week_end = dates[-1] if dates else ""

        return {
            "week_start": week_start,
            "week_end": week_end,
            "summary": summary,
            "trends": trends,
            "insights": insights,
            "micro_goals": micro_goals
        }

    def _calculate_summary(self, records: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate average, min, max for key metrics"""
        metrics = {
            'sleep_hours': [],
            'steps': [],
            'workout_minutes': [],
            'screen_time_minutes': [],
            'mood': [],
            'stress_level': []
        }

        for record in records:
            for metric in metrics.keys():
                value = record.get(metric)
                if value is not None:
                    metrics[metric].append(float(value))

        summary = {}
        for metric, values in metrics.items():
            if values:
                summary[f"average_{metric}"] = sum(values) / len(values)
                summary[f"min_{metric}"] = min(values)
                summary[f"max_{metric}"] = max(values)
            else:
                summary[f"average_{metric}"] = 0.0
                summary[f"min_{metric}"] = 0.0
                summary[f"max_{metric}"] = 0.0

        return summary

    def _detect_trends(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect trends by comparing first half vs second half of the week.
        Returns list of trend objects with metric, direction, and comment.
        """
        if len(records) < 4:
            return []  # Need at least 4 days for meaningful trend

        # Split into first half and second half
        mid_point = len(records) // 2
        first_half = records[:mid_point]
        second_half = records[mid_point:]

        trends = []
        metrics_to_analyze = [
            ('sleep_hours', 'sleep hours', 'hours'),
            ('steps', 'steps', 'steps'),
            ('workout_minutes', 'workout minutes', 'minutes'),
            ('screen_time_minutes', 'screen time', 'minutes'),
            ('mood', 'mood', 'points'),
            ('stress_level', 'stress level', 'points')
        ]

        for metric_key, metric_name, unit in metrics_to_analyze:
            first_values = [float(r.get(metric_key, 0)) for r in first_half if r.get(metric_key) is not None]
            second_values = [float(r.get(metric_key, 0)) for r in second_half if r.get(metric_key) is not None]

            if not first_values or not second_values:
                continue

            first_avg = sum(first_values) / len(first_values)
            second_avg = sum(second_values) / len(second_values)
            diff = second_avg - first_avg
            percent_change = (diff / first_avg * 100) if first_avg > 0 else 0

            # Determine direction and threshold
            # For stress_level, lower is better (inverse)
            is_inverse = metric_key == 'stress_level'
            
            if is_inverse:
                # For stress, declining is good (improving), increasing is bad (declining)
                if abs(percent_change) < 5:
                    direction = TrendDirection.STABLE.value
                    comment = f"Your {metric_name} remained relatively stable throughout the week."
                elif diff < 0:  # Stress decreased
                    direction = TrendDirection.IMPROVING.value
                    change_abs = abs(diff)
                    comment = f"Your {metric_name} decreased by {change_abs:.1f} {unit} on average in the second half of the week. Great progress!"
                else:  # Stress increased
                    direction = TrendDirection.DECLINING.value
                    comment = f"Your {metric_name} increased by {diff:.1f} {unit} on average in the second half of the week."
            else:
                # For other metrics, higher is generally better
                if abs(percent_change) < 5:
                    direction = TrendDirection.STABLE.value
                    comment = f"Your {metric_name} remained relatively stable throughout the week."
                elif diff > 0:
                    direction = TrendDirection.IMPROVING.value
                    if metric_key == 'sleep_hours':
                        comment = f"You slept about {diff * 60:.0f} minutes more on average in the second half of the week."
                    elif metric_key == 'steps':
                        comment = f"Your step count increased by about {diff:.0f} steps on average in the second half of the week."
                    elif metric_key == 'workout_minutes':
                        comment = f"You exercised {diff:.0f} minutes more on average in the second half of the week."
                    elif metric_key == 'mood':
                        comment = f"Your mood improved by {diff:.1f} points on average in the second half of the week."
                    else:
                        comment = f"Your {metric_name} increased by {diff:.1f} {unit} on average in the second half of the week."
                else:
                    direction = TrendDirection.DECLINING.value
                    change_abs = abs(diff)
                    if metric_key == 'sleep_hours':
                        comment = f"Your sleep decreased by about {change_abs * 60:.0f} minutes on average in the second half of the week."
                    elif metric_key == 'steps':
                        comment = f"Your step count dropped by about {change_abs:.0f} steps on average in the second half of the week."
                    elif metric_key == 'workout_minutes':
                        comment = f"Your workout time decreased by {change_abs:.0f} minutes on average in the second half of the week."
                    elif metric_key == 'mood':
                        comment = f"Your mood decreased by {change_abs:.1f} points on average in the second half of the week."
                    else:
                        comment = f"Your {metric_name} decreased by {change_abs:.1f} {unit} on average in the second half of the week."

            trends.append({
                "metric": metric_key,
                "direction": direction,
                "comment": comment
            })

        return trends

    def _generate_insights(self, records: List[Dict[str, Any]], summary: Dict[str, float], trends: List[Dict[str, Any]]) -> List[str]:
        """
        Generate 3 key insights about the user's weekly patterns.
        """
        insights = []

        # Insight 1: Sleep patterns
        avg_sleep = summary.get('average_sleep_hours', 0)
        if avg_sleep < 7:
            insights.append(f"You averaged {avg_sleep:.1f} hours of sleep this week, which is below the recommended 7-9 hours.")
        elif avg_sleep > 9:
            insights.append(f"You averaged {avg_sleep:.1f} hours of sleep this week, which is above the typical range.")
        else:
            insights.append(f"Great job maintaining an average of {avg_sleep:.1f} hours of sleep this week!")

        # Insight 2: Activity correlation
        avg_steps = summary.get('average_steps', 0)
        avg_mood = summary.get('average_mood', 0)
        
        # Find correlation between steps and mood
        high_step_days = [r for r in records if r.get('steps', 0) >= avg_steps]
        low_step_days = [r for r in records if r.get('steps', 0) < avg_steps * 0.8]
        
        if high_step_days and low_step_days:
            high_mood_avg = sum([r.get('mood', 0) for r in high_step_days]) / len(high_step_days)
            low_mood_avg = sum([r.get('mood', 0) for r in low_step_days]) / len(low_step_days) if low_step_days else 0
            
            if high_mood_avg > low_mood_avg + 0.3:
                insights.append(f"Your mood tends to be higher on days when you walk more. On high-activity days, your mood averaged {high_mood_avg:.1f}/5 compared to {low_mood_avg:.1f}/5 on lower-activity days.")

        # Insight 3: Screen time impact
        avg_screen_time = summary.get('average_screen_time_minutes', 0)
        if avg_screen_time > 300:  # More than 5 hours
            insights.append(f"You spent an average of {avg_screen_time/60:.1f} hours on screens this week. Consider setting daily limits to improve sleep and mood.")
        elif avg_screen_time < 180:  # Less than 3 hours
            insights.append(f"You maintained good screen time habits this week, averaging {avg_screen_time/60:.1f} hours per day.")

        # Insight 4: Stress patterns
        avg_stress = summary.get('average_stress_level', 0)
        if avg_stress > 6:
            insights.append(f"Your stress levels averaged {avg_stress:.1f}/10 this week. Consider adding stress-reduction activities like short walks or meditation.")
        elif avg_stress < 4:
            insights.append(f"You maintained low stress levels this week, averaging {avg_stress:.1f}/10. Keep up the great work!")

        # Insight 5: Workout consistency
        workout_days = sum(1 for r in records if r.get('workout_minutes', 0) > 0)
        if workout_days >= 5:
            insights.append(f"You exercised {workout_days} out of {len(records)} days this week. Excellent consistency!")
        elif workout_days < 3:
            insights.append(f"You exercised {workout_days} out of {len(records)} days this week. Adding 2-3 more workout sessions could boost your energy and mood.")

        # Return top 3 insights
        return insights[:3]

    def _generate_micro_goals(self, records: List[Dict[str, Any]], summary: Dict[str, float], trends: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate 1-3 micro-goals based on patterns and trends.
        Micro-goals should be small, achievable actions for the upcoming week.
        """
        goals = []

        # Analyze trends to prioritize goals
        declining_metrics = [t for t in trends if t['direction'] == TrendDirection.DECLINING.value]
        improving_metrics = [t for t in trends if t['direction'] == TrendDirection.IMPROVING.value]

        # Goal 1: Address declining steps
        steps_trend = next((t for t in declining_metrics if t['metric'] == 'steps'), None)
        if steps_trend:
            avg_steps = summary.get('average_steps', 0)
            if avg_steps < 7000:
                goals.append({
                    "title": "Add two 10-minute walks daily",
                    "reason": "Your step count dropped in the second half of the week, which may be affecting your energy and mood.",
                    "suggested_action": "Schedule a 10-minute walk after lunch and another after dinner on weekdays. Even short walks add up!",
                    "time_horizon": "this_week"
                })

        # Goal 2: Address sleep issues
        sleep_trend = next((t for t in declining_metrics if t['metric'] == 'sleep_hours'), None)
        avg_sleep = summary.get('average_sleep_hours', 0)
        if sleep_trend or avg_sleep < 7:
            goals.append({
                "title": "Protect your bedtime on weeknights",
                "reason": f"Your average sleep is {avg_sleep:.1f} hours, and it decreased later in the week.",
                "suggested_action": "Set a 'wind-down' reminder 45 minutes before your target bedtime. Turn off screens 30 minutes before bed.",
                "time_horizon": "this_week"
            })

        # Goal 3: Address screen time
        screen_trend = next((t for t in trends if t['metric'] == 'screen_time_minutes'), None)
        avg_screen = summary.get('average_screen_time_minutes', 0)
        if screen_trend and screen_trend['direction'] == TrendDirection.DECLINING.value:
            # Screen time is improving, encourage continuation
            goals.append({
                "title": "Maintain your screen time improvements",
                "reason": "You've been reducing screen time, which is great for sleep and mood.",
                "suggested_action": "Keep using app timers and Do Not Disturb mode. Try replacing 15 minutes of screen time with a walk or reading.",
                "time_horizon": "this_week"
            })
        elif avg_screen > 300:  # More than 5 hours
            goals.append({
                "title": "Reduce evening screen time",
                "reason": f"You're averaging {avg_screen/60:.1f} hours of screen time per day, which can impact sleep quality.",
                "suggested_action": "Set a daily limit and stick to it. Try putting your phone in another room 1 hour before bedtime.",
                "time_horizon": "this_week"
            })

        # Goal 4: Address stress
        stress_trend = next((t for t in trends if t['metric'] == 'stress_level'), None)
        avg_stress = summary.get('average_stress_level', 0)
        if stress_trend and stress_trend['direction'] == TrendDirection.DECLINING.value:
            # Stress is improving
            goals.append({
                "title": "Continue your stress management",
                "reason": "Your stress levels have been decreasing. Keep up the great work!",
                "suggested_action": "Maintain your current stress-reduction activities. Consider adding 5 minutes of deep breathing or meditation daily.",
                "time_horizon": "this_week"
            })
        elif avg_stress > 6:
            goals.append({
                "title": "Add a daily stress-relief activity",
                "reason": f"Your stress levels averaged {avg_stress:.1f}/10 this week.",
                "suggested_action": "Try a 10-minute walk, 5 minutes of deep breathing, or listen to calming music. Even small breaks help.",
                "time_horizon": "this_week"
            })

        # Goal 5: Maintain workout consistency
        workout_days = sum(1 for r in records if r.get('workout_minutes', 0) >= 20)
        if workout_days < 3:
            goals.append({
                "title": "Add three 20-minute workout sessions",
                "reason": f"You exercised {workout_days} days this week. Regular movement boosts energy and mood.",
                "suggested_action": "Schedule three 20-minute workouts this week. They can be walks, home exercises, or any activity you enjoy.",
                "time_horizon": "this_week"
            })

        # If no specific goals generated, provide a general encouragement goal
        if not goals:
            goals.append({
                "title": "Maintain your healthy habits",
                "reason": "Your routine looks balanced this week. Keep up the great work!",
                "suggested_action": "Continue your current habits and consider setting one small new goal for next week.",
                "time_horizon": "this_week"
            })

        # Return 1-3 goals, prioritized by urgency
        return goals[:3]

