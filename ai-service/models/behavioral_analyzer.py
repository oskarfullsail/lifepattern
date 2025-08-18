"""
Behavioral Analyzer for Enhanced AI Recommendations
Analyzes user behavior patterns and generates contextual recommendations
"""

import logging
from datetime import datetime, time
from typing import Dict, List, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class RecommendationType(Enum):
    """Types of recommendations the AI can generate"""
    WORKOUT_VIDEO = "workout_video"
    INSPIRATIONAL_QUOTE = "inspirational_quote"
    DND_SUGGESTION = "dnd_suggestion"
    SOCIAL_CONNECTION = "social_connection"
    SLEEP_REMINDER = "sleep_reminder"
    FOCUS_MODE = "focus_mode"
    WATER_REMINDER = "water_reminder"
    STRESS_RELIEF = "stress_relief"

class BehavioralContext(Enum):
    """Contexts for behavioral analysis"""
    LOW_EXERCISE = "low_exercise"
    HIGH_SCREEN_TIME = "high_screen_time"
    LATE_NIGHT_USAGE = "late_night_usage"
    POOR_SLEEP = "poor_sleep"
    HIGH_STRESS = "high_stress"
    LOW_WATER_INTAKE = "low_water_intake"
    IRREGULAR_MEALS = "irregular_meals"
    SOCIAL_ISOLATION = "social_isolation"

class BehavioralAnalyzer:
    """
    Analyzes user behavior patterns and generates contextual recommendations
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_behavioral_patterns(self, routine_data: Dict[str, Any]) -> List[BehavioralContext]:
        """
        Analyze routine data and identify behavioral patterns
        """
        contexts = []
        
        # Check for low exercise
        if routine_data.get('exercise_duration', 0) < 0.5:
            contexts.append(BehavioralContext.LOW_EXERCISE)
        
        # Check for high screen time
        if routine_data.get('screen_time', 0) > 8:
            contexts.append(BehavioralContext.HIGH_SCREEN_TIME)
        
        # Check for late night usage
        if self._is_late_night_usage(routine_data):
            contexts.append(BehavioralContext.LATE_NIGHT_USAGE)
        
        # Check for poor sleep
        if routine_data.get('sleep_hours', 0) < 7:
            contexts.append(BehavioralContext.POOR_SLEEP)
        
        # Check for high stress
        if routine_data.get('stress_level', 0) > 7:
            contexts.append(BehavioralContext.HIGH_STRESS)
        
        # Check for low water intake
        if routine_data.get('water_intake', 0) < 2:
            contexts.append(BehavioralContext.LOW_WATER_INTAKE)
        
        # Check for irregular meals
        if len(routine_data.get('meal_times', [])) < 3:
            contexts.append(BehavioralContext.IRREGULAR_MEALS)
        
        # Check for social isolation (based on activity patterns)
        if self._detect_social_isolation(routine_data):
            contexts.append(BehavioralContext.SOCIAL_ISOLATION)
        
        return contexts
    
    def _is_late_night_usage(self, routine_data: Dict[str, Any]) -> bool:
        """Check if user is active late at night"""
        try:
            bed_time = routine_data.get('bed_time', '23:00')
            bed_hour = int(bed_time.split(':')[0])
            
            # Consider late night if bed time is after 11 PM
            return bed_hour >= 23 or bed_hour <= 2
        except:
            return False
    
    def _detect_social_isolation(self, routine_data: Dict[str, Any]) -> bool:
        """Detect potential social isolation based on patterns"""
        # High screen time + high stress + irregular patterns might indicate isolation
        screen_time = routine_data.get('screen_time', 0)
        stress_level = routine_data.get('stress_level', 0)
        meal_count = len(routine_data.get('meal_times', []))
        
        return (screen_time > 10 and stress_level > 6 and meal_count < 3)
    
    def get_recommendation_priorities(self, contexts: List[BehavioralContext]) -> Dict[RecommendationType, int]:
        """
        Determine recommendation priorities based on behavioral contexts
        """
        priorities = {}
        
        # High priority recommendations
        if BehavioralContext.POOR_SLEEP in contexts:
            priorities[RecommendationType.SLEEP_REMINDER] = 5
            priorities[RecommendationType.DND_SUGGESTION] = 4
        
        if BehavioralContext.LATE_NIGHT_USAGE in contexts:
            priorities[RecommendationType.DND_SUGGESTION] = 5
            priorities[RecommendationType.FOCUS_MODE] = 4
        
        if BehavioralContext.HIGH_STRESS in contexts:
            priorities[RecommendationType.STRESS_RELIEF] = 5
            priorities[RecommendationType.SOCIAL_CONNECTION] = 4
            priorities[RecommendationType.INSPIRATIONAL_QUOTE] = 3
        
        # Medium priority recommendations
        if BehavioralContext.LOW_EXERCISE in contexts:
            priorities[RecommendationType.WORKOUT_VIDEO] = 4
        
        if BehavioralContext.HIGH_SCREEN_TIME in contexts:
            priorities[RecommendationType.FOCUS_MODE] = 4
            priorities[RecommendationType.WORKOUT_VIDEO] = 3
        
        if BehavioralContext.LOW_WATER_INTAKE in contexts:
            priorities[RecommendationType.WATER_REMINDER] = 3
        
        if BehavioralContext.SOCIAL_ISOLATION in contexts:
            priorities[RecommendationType.SOCIAL_CONNECTION] = 4
            priorities[RecommendationType.INSPIRATIONAL_QUOTE] = 3
        
        # Default recommendations
        if not priorities:
            priorities[RecommendationType.INSPIRATIONAL_QUOTE] = 2
        
        return priorities
    
    def get_contextual_explanation(self, contexts: List[BehavioralContext]) -> str:
        """
        Generate contextual explanation for recommendations
        """
        explanations = []
        
        for context in contexts:
            if context == BehavioralContext.POOR_SLEEP:
                explanations.append("You've slept less than 7 hours")
            elif context == BehavioralContext.LATE_NIGHT_USAGE:
                explanations.append("You're active late at night")
            elif context == BehavioralContext.HIGH_STRESS:
                explanations.append("Your stress level is elevated")
            elif context == BehavioralContext.LOW_EXERCISE:
                explanations.append("You've had minimal physical activity")
            elif context == BehavioralContext.HIGH_SCREEN_TIME:
                explanations.append("You've spent significant time on screens")
            elif context == BehavioralContext.LOW_WATER_INTAKE:
                explanations.append("Your water intake is below recommended levels")
            elif context == BehavioralContext.SOCIAL_ISOLATION:
                explanations.append("You might benefit from social connection")
        
        if explanations:
            return f"Based on: {', '.join(explanations)}"
        else:
            return "Based on your current routine patterns" 