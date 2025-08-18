"""
Content Manager for AI Service Recommendations
Provides curated content for behavioral recommendations
"""

import random
from typing import Dict, List, Optional
from datetime import datetime

class ContentManager:
    """
    Manages content for AI recommendations (quotes, videos, etc.)
    Stateless - no database dependencies
    """
    
    def __init__(self):
        self._quotes = self._load_quotes()
        self._workout_videos = self._load_workout_videos()
        self._social_suggestions = self._load_social_suggestions()
        self._last_quote_index = 0
        self._last_video_index = 0
    
    def _load_quotes(self) -> List[Dict[str, str]]:
        """Load inspirational quotes database"""
        return [
            {
                "id": "q001",
                "text": "The only bad workout is the one that didn't happen.",
                "category": "motivation",
                "context": ["low_exercise", "procrastination"],
                "author": "Unknown"
            },
            {
                "id": "q002",
                "text": "Sleep is the best meditation.",
                "category": "sleep",
                "context": ["poor_sleep", "stress"],
                "author": "Dalai Lama"
            },
            {
                "id": "q003",
                "text": "Take care of your body. It's the only place you have to live.",
                "category": "health",
                "context": ["general_health", "wellness"],
                "author": "Jim Rohn"
            },
            {
                "id": "q004",
                "text": "The greatest wealth is health.",
                "category": "health",
                "context": ["general_health", "motivation"],
                "author": "Ralph Waldo Emerson"
            },
            {
                "id": "q005",
                "text": "Water is the driving force of all nature.",
                "category": "hydration",
                "context": ["low_water_intake", "health"],
                "author": "Leonardo da Vinci"
            },
            {
                "id": "q006",
                "text": "Stress is not what happens to us. It's our response to what happens.",
                "category": "stress_relief",
                "context": ["high_stress", "mindfulness"],
                "author": "Maureen Killoran"
            },
            {
                "id": "q007",
                "text": "Friendship is the only cement that will ever hold the world together.",
                "category": "social",
                "context": ["social_isolation", "connection"],
                "author": "Woodrow Wilson"
            },
            {
                "id": "q008",
                "text": "The best time to plant a tree was 20 years ago. The second best time is now.",
                "category": "motivation",
                "context": ["procrastination", "action"],
                "author": "Chinese Proverb"
            },
            {
                "id": "q009",
                "text": "Your body hears everything your mind says.",
                "category": "mindfulness",
                "context": ["stress", "mental_health"],
                "author": "Naomi Judd"
            },
            {
                "id": "q010",
                "text": "The future depends on what you do today.",
                "category": "motivation",
                "context": ["action", "planning"],
                "author": "Mahatma Gandhi"
            }
        ]
    
    def _load_workout_videos(self) -> List[Dict[str, str]]:
        """Load curated workout video recommendations"""
        return [
            {
                "id": "wv001",
                "title": "5-Minute Morning Stretch",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "duration": 300,
                "intensity": "beginner",
                "category": "stretching",
                "equipment": "none",
                "context": ["low_exercise", "morning_routine"]
            },
            {
                "id": "wv002",
                "title": "10-Minute Cardio Workout",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "duration": 600,
                "intensity": "beginner",
                "category": "cardio",
                "equipment": "none",
                "context": ["low_exercise", "cardio"]
            },
            {
                "id": "wv003",
                "title": "15-Minute Yoga Flow",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "duration": 900,
                "intensity": "beginner",
                "category": "yoga",
                "equipment": "yoga_mat",
                "context": ["stress_relief", "flexibility"]
            },
            {
                "id": "wv004",
                "title": "Quick HIIT Workout",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "duration": 1200,
                "intensity": "intermediate",
                "category": "hiit",
                "equipment": "none",
                "context": ["high_intensity", "time_efficient"]
            },
            {
                "id": "wv005",
                "title": "Evening Relaxation Stretches",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "duration": 600,
                "intensity": "beginner",
                "category": "stretching",
                "equipment": "none",
                "context": ["evening_routine", "relaxation"]
            }
        ]
    
    def _load_social_suggestions(self) -> List[Dict[str, str]]:
        """Load social connection suggestions"""
        return [
            {
                "id": "sc001",
                "suggestion": "Call Mom",
                "context": "social_support",
                "reason": "Social support can help reduce stress and improve mood"
            },
            {
                "id": "sc002",
                "suggestion": "Text your best friend",
                "context": "connection",
                "reason": "Reaching out to close friends can boost your mood"
            },
            {
                "id": "sc003",
                "suggestion": "Plan a coffee with a colleague",
                "context": "social_interaction",
                "reason": "Social interactions can help break up screen time"
            },
            {
                "id": "sc004",
                "suggestion": "Call your sibling",
                "context": "family_connection",
                "reason": "Family connections provide emotional support"
            },
            {
                "id": "sc005",
                "suggestion": "Message an old friend",
                "context": "reconnection",
                "reason": "Reconnecting with old friends can be uplifting"
            }
        ]
    
    def get_contextual_quote(self, contexts: List[str]) -> Dict[str, str]:
        """Get a contextual quote based on behavioral patterns"""
        # Filter quotes that match the contexts
        matching_quotes = []
        for quote in self._quotes:
            if any(context in quote.get('context', []) for context in contexts):
                matching_quotes.append(quote)
        
        # If no matching quotes, get a general motivational quote
        if not matching_quotes:
            matching_quotes = [q for q in self._quotes if 'motivation' in q.get('category', '')]
        
        # Rotate through quotes to avoid repetition
        if matching_quotes:
            quote = matching_quotes[self._last_quote_index % len(matching_quotes)]
            self._last_quote_index += 1
            return quote
        
        # Fallback quote
        return {
            "id": "fallback",
            "text": "Every day is a new beginning.",
            "category": "motivation",
            "context": ["general"],
            "author": "Unknown"
        }
    
    def get_workout_video(self, duration: Optional[int] = None, 
                         intensity: Optional[str] = None,
                         contexts: Optional[List[str]] = None) -> Dict[str, str]:
        """Get a workout video recommendation"""
        # Filter videos based on criteria
        matching_videos = []
        for video in self._workout_videos:
            matches = True
            
            if duration and video.get('duration', 0) > duration:
                matches = False
            
            if intensity and video.get('intensity', '') != intensity:
                matches = False
            
            if contexts and not any(context in video.get('context', []) for context in contexts):
                matches = False
            
            if matches:
                matching_videos.append(video)
        
        # If no matching videos, get a beginner-friendly short workout
        if not matching_videos:
            matching_videos = [v for v in self._workout_videos if v.get('intensity') == 'beginner']
        
        # Rotate through videos
        if matching_videos:
            video = matching_videos[self._last_video_index % len(matching_videos)]
            self._last_video_index += 1
            return video
        
        # Fallback video
        return {
            "id": "fallback",
            "title": "Quick Morning Stretch",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "duration": 300,
            "intensity": "beginner",
            "category": "stretching",
            "equipment": "none",
            "context": ["general"]
        }
    
    def get_social_suggestion(self, contexts: Optional[List[str]] = None) -> Dict[str, str]:
        """Get a social connection suggestion"""
        # Filter suggestions based on contexts
        matching_suggestions = []
        for suggestion in self._social_suggestions:
            if not contexts or suggestion.get('context') in contexts:
                matching_suggestions.append(suggestion)
        
        # If no matching suggestions, get a general one
        if not matching_suggestions:
            matching_suggestions = self._social_suggestions
        
        # Return random suggestion
        return random.choice(matching_suggestions)
    
    def get_dnd_suggestion(self, contexts: List[str]) -> Dict[str, str]:
        """Get Do-Not-Disturb suggestion"""
        if "late_night_usage" in contexts:
            return {
                "suggestion": "Enable Do-Not-Disturb mode",
                "reason": "You're active late at night - consider resting to improve sleep quality",
                "duration": "2 hours",
                "priority": "high"
            }
        elif "high_stress" in contexts:
            return {
                "suggestion": "Enable Focus Mode",
                "reason": "High stress detected - focus mode can help reduce distractions",
                "duration": "1 hour",
                "priority": "medium"
            }
        else:
            return {
                "suggestion": "Consider Do-Not-Disturb mode",
                "reason": "Reducing notifications can help improve focus and reduce stress",
                "duration": "30 minutes",
                "priority": "low"
            }
    
    def get_sleep_reminder(self, contexts: List[str]) -> Dict[str, str]:
        """Get sleep reminder suggestion"""
        if "poor_sleep" in contexts:
            return {
                "suggestion": "Prepare for better sleep",
                "reason": "You've been sleeping less than 7 hours - consider an earlier bedtime",
                "actions": ["Dim lights", "Avoid screens", "Read a book"],
                "priority": "high"
            }
        else:
            return {
                "suggestion": "Maintain good sleep habits",
                "reason": "Consistent sleep schedule helps maintain energy and mood",
                "actions": ["Stick to bedtime", "Create routine", "Avoid late meals"],
                "priority": "medium"
            } 