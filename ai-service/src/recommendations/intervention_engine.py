#!/usr/bin/env python3
"""
Data-Driven Intervention Engine

Generates personalized recommendations based on:
1. Detected anomaly types
2. User's historical patterns
3. Evidence-based interventions loaded from JSON dataset

The interventions are loaded dynamically from:
  data/recommendations/interventions.json

This allows easy updates without code changes.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict, field
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InterventionCategory(Enum):
    """Categories of wellness interventions"""
    SLEEP = "sleep"
    STRESS = "stress"
    EXERCISE = "exercise"
    HYDRATION = "hydration"
    NUTRITION = "nutrition"
    SCREEN_TIME = "screen_time"
    SOCIAL = "social"
    MINDFULNESS = "mindfulness"
    COMBINED = "combined"
    HEART_HEALTH = "heart_health"


class Priority(Enum):
    """Intervention priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Intervention:
    """A single intervention recommendation"""
    id: str
    title: str
    description: str
    category: str
    priority: str
    actions: List[str]
    expected_impact: str
    time_to_implement: str
    evidence_source: str
    effectiveness_score: float  # 0-1 based on research
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Intervention':
        """Create Intervention from dictionary."""
        return cls(
            id=data.get('id', ''),
            title=data.get('title', ''),
            description=data.get('description', ''),
            category=data.get('category', ''),
            priority=data.get('priority', 'medium'),
            actions=data.get('actions', []),
            expected_impact=data.get('expected_impact', ''),
            time_to_implement=data.get('time_to_implement', ''),
            evidence_source=data.get('evidence_source', ''),
            effectiveness_score=float(data.get('effectiveness_score', 0.5))
        )


class InterventionEngine:
    """
    Data-driven intervention recommendation engine.
    
    Loads recommendations dynamically from JSON file, making it easy
    to update interventions without code changes.
    
    Provides personalized recommendations based on:
    - Anomaly type detected
    - Severity/risk level
    - User's specific metrics
    - Evidence-based interventions
    """
    
    def __init__(self, interventions_path: Optional[str] = None):
        self.interventions: Dict[str, List[Intervention]] = {}
        self.metadata: Dict[str, Any] = {}
        
        # Find interventions JSON file
        if interventions_path is None:
            base_path = Path(__file__).parent.parent.parent
            interventions_path = base_path / 'data' / 'recommendations' / 'interventions.json'
        else:
            interventions_path = Path(interventions_path)
        
        self.interventions_path = interventions_path
        
        # Load interventions
        self._load_interventions()
        logger.info(f"InterventionEngine initialized with {self._count_interventions()} interventions from {self.interventions_path}")
    
    def _count_interventions(self) -> int:
        return sum(len(v) for v in self.interventions.values())
    
    def _load_interventions(self):
        """Load evidence-based interventions from JSON file."""
        
        if self.interventions_path.exists():
            try:
                with open(self.interventions_path, 'r') as f:
                    data = json.load(f)
                
                self.metadata = {
                    'version': data.get('version', '1.0.0'),
                    'last_updated': data.get('last_updated', ''),
                    'source': data.get('source', '')
                }
                
                categories = data.get('categories', {})
                
                for category_key, category_data in categories.items():
                    interventions_data = category_data.get('interventions', [])
                    self.interventions[category_key] = [
                        Intervention.from_dict(i) for i in interventions_data
                    ]
                    
                logger.info(f"Loaded {len(categories)} categories from JSON")
                return
                
            except Exception as e:
                logger.warning(f"Failed to load interventions from JSON: {e}")
        
        # Fallback to hardcoded interventions if JSON not found
        logger.warning("Using fallback hardcoded interventions")
        self._load_fallback_interventions()
    
    def _load_fallback_interventions(self):
        """Fallback hardcoded interventions if JSON fails to load."""
        
        # Basic fallback interventions
        self.interventions['low_sleep'] = [
            Intervention(
                id="sleep_001",
                title="Sleep Schedule Optimization",
                description="Establish a consistent sleep-wake schedule.",
                category="sleep",
                priority="high",
                actions=["Set fixed bedtime", "Create wind-down routine", "Avoid screens before bed"],
                expected_impact="Improved sleep quality within 2-4 weeks",
                time_to_implement="Immediate",
                evidence_source="Sleep Foundation",
                effectiveness_score=0.85
            )
        ]
        
        self.interventions['high_stress'] = [
            Intervention(
                id="stress_001",
                title="Immediate Stress Relief",
                description="Quick techniques to reduce stress.",
                category="stress",
                priority="critical",
                actions=["4-7-8 breathing", "Take a short walk", "Progressive relaxation"],
                expected_impact="Cortisol reduction within 20 minutes",
                time_to_implement="Immediate",
                evidence_source="APA",
                effectiveness_score=0.90
            )
        ]
        
        self.interventions['high_heart_rate'] = [
            Intervention(
                id="heart_001",
                title="Heart Rate Management",
                description="Lower elevated resting heart rate.",
                category="heart_health",
                priority="high",
                actions=["Deep breathing", "Reduce caffeine", "Regular cardio exercise"],
                expected_impact="5-10 bpm reduction",
                time_to_implement="4-6 weeks",
                evidence_source="AHA",
                effectiveness_score=0.82
            )
        ]
        
        self.interventions['high_sugar_intake'] = [
            Intervention(
                id="sugar_001",
                title="Sugar Reduction Protocol",
                description="Gradually reduce sugar intake.",
                category="nutrition",
                priority="high",
                actions=["Track sugar intake", "Replace sugary drinks", "Read nutrition labels"],
                expected_impact="Reduced energy crashes, improved mood",
                time_to_implement="2-4 weeks",
                evidence_source="WHO, AHA",
                effectiveness_score=0.80
            )
        ]
        
        self.interventions['combined_risk'] = [
            Intervention(
                id="combined_001",
                title="Wellness Reset Protocol",
                description="Comprehensive approach for multiple risk factors.",
                category="combined",
                priority="critical",
                actions=["Fix sleep first", "Add stress relief", "Increase movement", "Improve nutrition"],
                expected_impact="Holistic health improvement",
                time_to_implement="4-8 weeks",
                evidence_source="Lifestyle Medicine",
                effectiveness_score=0.85
            )
        ]
    
    def reload_interventions(self):
        """Reload interventions from JSON file (hot reload)."""
        self.interventions.clear()
        self._load_interventions()
        logger.info(f"Reloaded {self._count_interventions()} interventions")
    
    def get_recommendations(
        self,
        anomaly_type: str,
        risk_level: str,
        routine_data: Dict[str, Any],
        max_recommendations: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations based on detected anomaly.
        
        Args:
            anomaly_type: Type of anomaly detected (low_sleep, high_stress, etc.)
            risk_level: Risk level (LOW, MEDIUM, HIGH, CRITICAL)
            routine_data: User's routine data for personalization
            max_recommendations: Maximum number of recommendations
            
        Returns:
            List of recommendation dictionaries
        """
        recommendations = []
        
        # Get primary interventions for the anomaly type
        primary_interventions = self.interventions.get(anomaly_type, [])
        
        # Add interventions based on risk level
        if risk_level in ['CRITICAL', 'HIGH']:
            priority_order = [Priority.CRITICAL.value, Priority.HIGH.value, Priority.MEDIUM.value]
        else:
            priority_order = [Priority.HIGH.value, Priority.MEDIUM.value, Priority.LOW.value]
        
        # Sort by priority and effectiveness
        sorted_interventions = sorted(
            primary_interventions,
            key=lambda x: (
                priority_order.index(x.priority) if x.priority in priority_order else 99,
                -x.effectiveness_score
            )
        )
        
        for intervention in sorted_interventions[:max_recommendations]:
            rec = intervention.to_dict()
            rec['data_driven'] = True
            rec['personalized'] = True
            recommendations.append(rec)
        
        # Add specific interventions based on routine data
        if len(recommendations) < max_recommendations:
            self._add_data_specific_recommendations(routine_data, recommendations, max_recommendations)
        
        return recommendations[:max_recommendations]
    
    def _add_data_specific_recommendations(
        self, 
        routine_data: Dict[str, Any], 
        recommendations: List[Dict], 
        max_recs: int
    ):
        """Add recommendations based on specific routine data values."""
        existing_ids = [r['id'] for r in recommendations]
        
        # Check sleep
        if routine_data.get('sleep_hours', 7) < 6:
            for intervention in self.interventions.get('low_sleep', [])[:1]:
                if intervention.id not in existing_ids:
                    rec = intervention.to_dict()
                    rec['data_driven'] = True
                    recommendations.append(rec)
        
        # Check stress
        if routine_data.get('stress_level', 5) > 7:
            for intervention in self.interventions.get('high_stress', [])[:1]:
                if intervention.id not in existing_ids:
                    rec = intervention.to_dict()
                    rec['data_driven'] = True
                    recommendations.append(rec)
        
        # Check heart rate
        if routine_data.get('heart_rate', 72) > 100:
            for intervention in self.interventions.get('high_heart_rate', [])[:1]:
                if intervention.id not in existing_ids:
                    rec = intervention.to_dict()
                    rec['data_driven'] = True
                    recommendations.append(rec)
        
        # Check sugar intake
        if routine_data.get('sugar_intake', 25) > 50:
            for intervention in self.interventions.get('high_sugar_intake', [])[:1]:
                if intervention.id not in existing_ids:
                    rec = intervention.to_dict()
                    rec['data_driven'] = True
                    recommendations.append(rec)
    
    def get_immediate_relief(self, anomaly_type: str) -> Optional[Dict[str, Any]]:
        """Get the most effective immediate relief intervention."""
        interventions = self.interventions.get(anomaly_type, [])
        
        # Find critical or high priority interventions
        for intervention in interventions:
            if intervention.priority in [Priority.CRITICAL.value, Priority.HIGH.value]:
                return intervention.to_dict()
        
        return interventions[0].to_dict() if interventions else None
    
    def get_all_categories(self) -> List[str]:
        """Get all intervention categories."""
        return list(self.interventions.keys())
    
    def get_interventions_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get all interventions for a specific category."""
        return [i.to_dict() for i in self.interventions.get(category, [])]
    
    def get_status(self) -> Dict[str, Any]:
        """Get intervention engine status."""
        return {
            'total_interventions': self._count_interventions(),
            'categories': list(self.interventions.keys()),
            'interventions_per_category': {
                k: len(v) for k, v in self.interventions.items()
            },
            'metadata': self.metadata,
            'source_file': str(self.interventions_path),
            'file_exists': self.interventions_path.exists()
        }


# Singleton instance
_intervention_engine: Optional[InterventionEngine] = None


def get_intervention_engine() -> InterventionEngine:
    """Get or create the intervention engine singleton."""
    global _intervention_engine
    if _intervention_engine is None:
        _intervention_engine = InterventionEngine()
    return _intervention_engine
