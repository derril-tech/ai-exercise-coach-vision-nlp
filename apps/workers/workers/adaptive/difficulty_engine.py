"""Adaptive difficulty engine for dynamic workout adjustments."""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics for a single exercise set."""
    exercise_name: str
    actual_reps: int
    target_reps: int
    form_score: float  # 0-100
    tempo_score: float  # 0-100
    rom_score: float   # 0-100
    completion_rate: float  # actual_reps / target_reps
    effort_level: int  # 1-10 RPE
    duration: float  # seconds
    timestamp: datetime


@dataclass
class UserCapabilities:
    """User's current capabilities and fitness level."""
    user_id: str
    fitness_level: str  # beginner, intermediate, advanced
    exercise_history: Dict[str, List[PerformanceMetrics]]
    current_strength: Dict[str, float]  # exercise -> strength score (0-100)
    fatigue_level: float  # 0-1
    injury_status: List[str]
    preferences: Dict[str, Any]
    last_updated: datetime


@dataclass
class DifficultyAdjustment:
    """Recommended difficulty adjustment."""
    exercise_name: str
    adjustment_type: str  # 'progression', 'regression', 'maintain'
    new_reps: Optional[int] = None
    new_sets: Optional[int] = None
    new_duration: Optional[float] = None
    modification: Optional[str] = None  # easier/harder variation
    reasoning: str = ""
    confidence: float = 0.0  # 0-1


class AdaptiveDifficultyEngine:
    """Engine for dynamically adjusting workout difficulty based on performance."""
    
    def __init__(self):
        self.progression_rules = self._load_progression_rules()
        self.regression_rules = self._load_regression_rules()
        self.exercise_progressions = self._load_exercise_progressions()
        
        # Performance thresholds
        self.progression_threshold = 0.85  # Complete 85%+ reps with good form
        self.regression_threshold = 0.60   # Complete <60% reps or poor form
        self.form_threshold = 75.0         # Minimum form score
        self.tempo_threshold = 70.0        # Minimum tempo score
        
        # Adaptation parameters
        self.min_sessions_before_progression = 2
        self.max_progression_per_session = 0.20  # Max 20% increase
        self.fatigue_adjustment_factor = 0.15
        
    def _load_progression_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load exercise-specific progression rules."""
        return {
            'push-ups': {
                'rep_increment': 2,
                'max_reps_per_set': 25,
                'form_weight': 0.4,
                'completion_weight': 0.6,
                'progressions': ['standard', 'diamond', 'archer', 'one-arm']
            },
            'squats': {
                'rep_increment': 3,
                'max_reps_per_set': 30,
                'form_weight': 0.5,
                'completion_weight': 0.5,
                'progressions': ['bodyweight', 'jump', 'pistol', 'weighted']
            },
            'plank': {
                'duration_increment': 10,  # seconds
                'max_duration': 300,
                'form_weight': 0.6,
                'completion_weight': 0.4,
                'progressions': ['standard', 'side', 'single-arm', 'weighted']
            },
            'lunges': {
                'rep_increment': 2,
                'max_reps_per_set': 20,
                'form_weight': 0.5,
                'completion_weight': 0.5,
                'progressions': ['static', 'walking', 'jumping', 'weighted']
            }
        }
    
    def _load_regression_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load exercise-specific regression rules."""
        return {
            'push-ups': {
                'rep_decrement': 2,
                'min_reps_per_set': 3,
                'regressions': ['wall', 'incline', 'knee', 'standard']
            },
            'squats': {
                'rep_decrement': 3,
                'min_reps_per_set': 5,
                'regressions': ['chair-assisted', 'partial', 'standard']
            },
            'plank': {
                'duration_decrement': 10,
                'min_duration': 15,
                'regressions': ['wall', 'incline', 'knee', 'standard']
            },
            'lunges': {
                'rep_decrement': 2,
                'min_reps_per_set': 4,
                'regressions': ['assisted', 'stationary', 'standard']
            }
        }
    
    def _load_exercise_progressions(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load exercise progression hierarchies."""
        return {
            'push-ups': [
                {'name': 'wall', 'difficulty': 1, 'reps': [5, 15]},
                {'name': 'incline', 'difficulty': 2, 'reps': [5, 12]},
                {'name': 'knee', 'difficulty': 3, 'reps': [5, 15]},
                {'name': 'standard', 'difficulty': 4, 'reps': [5, 20]},
                {'name': 'diamond', 'difficulty': 6, 'reps': [3, 15]},
                {'name': 'archer', 'difficulty': 8, 'reps': [2, 10]},
                {'name': 'one-arm', 'difficulty': 10, 'reps': [1, 5]}
            ],
            'squats': [
                {'name': 'chair-assisted', 'difficulty': 1, 'reps': [5, 15]},
                {'name': 'partial', 'difficulty': 2, 'reps': [8, 20]},
                {'name': 'bodyweight', 'difficulty': 3, 'reps': [10, 25]},
                {'name': 'jump', 'difficulty': 5, 'reps': [5, 15]},
                {'name': 'single-leg', 'difficulty': 7, 'reps': [3, 12]},
                {'name': 'pistol', 'difficulty': 9, 'reps': [1, 8]}
            ],
            'plank': [
                {'name': 'wall', 'difficulty': 1, 'duration': [10, 60]},
                {'name': 'incline', 'difficulty': 2, 'duration': [15, 90]},
                {'name': 'knee', 'difficulty': 3, 'duration': [20, 120]},
                {'name': 'standard', 'difficulty': 4, 'duration': [30, 180]},
                {'name': 'side', 'difficulty': 6, 'duration': [15, 90]},
                {'name': 'single-arm', 'difficulty': 8, 'duration': [10, 60]}
            ]
        }
    
    async def analyze_performance(
        self, 
        performance_data: List[PerformanceMetrics],
        user_capabilities: UserCapabilities
    ) -> List[DifficultyAdjustment]:
        """Analyze performance and recommend difficulty adjustments."""
        adjustments = []
        
        # Group performance by exercise
        exercise_performance = {}
        for perf in performance_data:
            if perf.exercise_name not in exercise_performance:
                exercise_performance[perf.exercise_name] = []
            exercise_performance[perf.exercise_name].append(perf)
        
        # Analyze each exercise
        for exercise_name, performances in exercise_performance.items():
            adjustment = await self._analyze_exercise_performance(
                exercise_name, performances, user_capabilities
            )
            if adjustment:
                adjustments.append(adjustment)
        
        return adjustments
    
    async def _analyze_exercise_performance(
        self,
        exercise_name: str,
        performances: List[PerformanceMetrics],
        user_capabilities: UserCapabilities
    ) -> Optional[DifficultyAdjustment]:
        """Analyze performance for a specific exercise."""
        if not performances:
            return None
        
        # Calculate performance metrics
        recent_performance = performances[-3:]  # Last 3 sets
        avg_completion_rate = np.mean([p.completion_rate for p in recent_performance])
        avg_form_score = np.mean([p.form_score for p in recent_performance])
        avg_tempo_score = np.mean([p.tempo_score for p in recent_performance])
        avg_effort = np.mean([p.effort_level for p in recent_performance])
        
        # Get exercise rules
        progression_rules = self.progression_rules.get(exercise_name, {})
        regression_rules = self.regression_rules.get(exercise_name, {})
        
        # Determine if progression or regression is needed
        needs_progression = self._should_progress(
            avg_completion_rate, avg_form_score, avg_tempo_score, avg_effort
        )
        needs_regression = self._should_regress(
            avg_completion_rate, avg_form_score, avg_tempo_score, avg_effort
        )
        
        # Check session history for consistency
        historical_performance = user_capabilities.exercise_history.get(exercise_name, [])
        sessions_since_change = self._count_sessions_since_last_change(historical_performance)
        
        if needs_progression and sessions_since_change >= self.min_sessions_before_progression:
            return await self._create_progression(
                exercise_name, performances[-1], progression_rules, user_capabilities
            )
        elif needs_regression:
            return await self._create_regression(
                exercise_name, performances[-1], regression_rules, user_capabilities
            )
        else:
            return DifficultyAdjustment(
                exercise_name=exercise_name,
                adjustment_type='maintain',
                reasoning=f"Performance stable (completion: {avg_completion_rate:.1%}, form: {avg_form_score:.1f})",
                confidence=0.8
            )
    
    def _should_progress(self, completion_rate: float, form_score: float, tempo_score: float, effort: float) -> bool:
        """Determine if user should progress to harder variation."""
        return (
            completion_rate >= self.progression_threshold and
            form_score >= self.form_threshold and
            tempo_score >= self.tempo_threshold and
            effort <= 7  # Not too strenuous
        )
    
    def _should_regress(self, completion_rate: float, form_score: float, tempo_score: float, effort: float) -> bool:
        """Determine if user should regress to easier variation."""
        return (
            completion_rate < self.regression_threshold or
            form_score < self.form_threshold or
            tempo_score < self.tempo_threshold or
            effort >= 9  # Too strenuous
        )
    
    def _count_sessions_since_last_change(self, history: List[PerformanceMetrics]) -> int:
        """Count sessions since last difficulty change."""
        # Simplified - in real implementation, would track actual changes
        return len(history) % 3  # Mock: assume change every 3 sessions
    
    async def _create_progression(
        self,
        exercise_name: str,
        latest_performance: PerformanceMetrics,
        rules: Dict[str, Any],
        user_capabilities: UserCapabilities
    ) -> DifficultyAdjustment:
        """Create a progression adjustment."""
        current_variation = self._get_current_variation(exercise_name, user_capabilities)
        progressions = self.exercise_progressions.get(exercise_name, [])
        
        # Find next progression level
        current_index = self._find_variation_index(current_variation, progressions)
        next_index = min(current_index + 1, len(progressions) - 1)
        
        if next_index > current_index:
            # Move to harder variation
            next_variation = progressions[next_index]
            return DifficultyAdjustment(
                exercise_name=exercise_name,
                adjustment_type='progression',
                modification=next_variation['name'],
                new_reps=next_variation.get('reps', [None])[0] if 'reps' in next_variation else None,
                new_duration=next_variation.get('duration', [None])[0] if 'duration' in next_variation else None,
                reasoning=f"Progressing to {next_variation['name']} variation due to consistent good performance",
                confidence=0.9
            )
        else:
            # Increase reps/duration in current variation
            if 'rep_increment' in rules:
                new_reps = latest_performance.target_reps + rules['rep_increment']
                new_reps = min(new_reps, rules.get('max_reps_per_set', 50))
                return DifficultyAdjustment(
                    exercise_name=exercise_name,
                    adjustment_type='progression',
                    new_reps=new_reps,
                    reasoning=f"Increasing reps from {latest_performance.target_reps} to {new_reps}",
                    confidence=0.8
                )
            elif 'duration_increment' in rules:
                new_duration = latest_performance.duration + rules['duration_increment']
                new_duration = min(new_duration, rules.get('max_duration', 600))
                return DifficultyAdjustment(
                    exercise_name=exercise_name,
                    adjustment_type='progression',
                    new_duration=new_duration,
                    reasoning=f"Increasing duration to {new_duration}s",
                    confidence=0.8
                )
        
        return DifficultyAdjustment(
            exercise_name=exercise_name,
            adjustment_type='maintain',
            reasoning="At maximum progression level",
            confidence=0.9
        )
    
    async def _create_regression(
        self,
        exercise_name: str,
        latest_performance: PerformanceMetrics,
        rules: Dict[str, Any],
        user_capabilities: UserCapabilities
    ) -> DifficultyAdjustment:
        """Create a regression adjustment."""
        current_variation = self._get_current_variation(exercise_name, user_capabilities)
        progressions = self.exercise_progressions.get(exercise_name, [])
        
        # Find previous (easier) progression level
        current_index = self._find_variation_index(current_variation, progressions)
        prev_index = max(current_index - 1, 0)
        
        if prev_index < current_index:
            # Move to easier variation
            prev_variation = progressions[prev_index]
            return DifficultyAdjustment(
                exercise_name=exercise_name,
                adjustment_type='regression',
                modification=prev_variation['name'],
                new_reps=prev_variation.get('reps', [None])[1] if 'reps' in prev_variation else None,  # Use upper range
                new_duration=prev_variation.get('duration', [None])[1] if 'duration' in prev_variation else None,
                reasoning=f"Regressing to {prev_variation['name']} variation due to performance issues",
                confidence=0.9
            )
        else:
            # Decrease reps/duration in current variation
            if 'rep_decrement' in rules:
                new_reps = max(
                    latest_performance.target_reps - rules['rep_decrement'],
                    rules.get('min_reps_per_set', 1)
                )
                return DifficultyAdjustment(
                    exercise_name=exercise_name,
                    adjustment_type='regression',
                    new_reps=new_reps,
                    reasoning=f"Decreasing reps from {latest_performance.target_reps} to {new_reps}",
                    confidence=0.8
                )
            elif 'duration_decrement' in rules:
                new_duration = max(
                    latest_performance.duration - rules['duration_decrement'],
                    rules.get('min_duration', 10)
                )
                return DifficultyAdjustment(
                    exercise_name=exercise_name,
                    adjustment_type='regression',
                    new_duration=new_duration,
                    reasoning=f"Decreasing duration to {new_duration}s",
                    confidence=0.8
                )
        
        return DifficultyAdjustment(
            exercise_name=exercise_name,
            adjustment_type='maintain',
            reasoning="At minimum difficulty level",
            confidence=0.9
        )
    
    def _get_current_variation(self, exercise_name: str, user_capabilities: UserCapabilities) -> str:
        """Get user's current exercise variation."""
        # Simplified - in real implementation, would track user's current variations
        fitness_level_mapping = {
            'beginner': 0,
            'intermediate': 2,
            'advanced': 4
        }
        
        progressions = self.exercise_progressions.get(exercise_name, [])
        if not progressions:
            return 'standard'
        
        default_index = fitness_level_mapping.get(user_capabilities.fitness_level, 2)
        default_index = min(default_index, len(progressions) - 1)
        
        return progressions[default_index]['name']
    
    def _find_variation_index(self, variation_name: str, progressions: List[Dict[str, Any]]) -> int:
        """Find index of variation in progression list."""
        for i, prog in enumerate(progressions):
            if prog['name'] == variation_name:
                return i
        return 0  # Default to first (easiest) variation
    
    async def apply_fatigue_adjustment(
        self,
        adjustments: List[DifficultyAdjustment],
        fatigue_level: float
    ) -> List[DifficultyAdjustment]:
        """Apply fatigue-based modifications to adjustments."""
        if fatigue_level <= 0.3:
            return adjustments  # Low fatigue, no adjustment needed
        
        adjusted = []
        for adj in adjustments:
            if adj.adjustment_type == 'progression' and fatigue_level > 0.6:
                # High fatigue - cancel progressions
                adj.adjustment_type = 'maintain'
                adj.reasoning += f" (progression cancelled due to high fatigue: {fatigue_level:.1f})"
            elif adj.adjustment_type == 'maintain' and fatigue_level > 0.7:
                # Very high fatigue - force regression
                adj.adjustment_type = 'regression'
                if adj.new_reps:
                    adj.new_reps = max(1, int(adj.new_reps * (1 - self.fatigue_adjustment_factor)))
                if adj.new_duration:
                    adj.new_duration = max(10, adj.new_duration * (1 - self.fatigue_adjustment_factor))
                adj.reasoning = f"Fatigue-adjusted regression (fatigue: {fatigue_level:.1f})"
            
            adjusted.append(adj)
        
        return adjusted
    
    async def get_personalized_recommendations(
        self,
        user_capabilities: UserCapabilities,
        session_context: Dict[str, Any]
    ) -> List[str]:
        """Get personalized recommendations based on user capabilities."""
        recommendations = []
        
        # Fitness level recommendations
        if user_capabilities.fitness_level == 'beginner':
            recommendations.append("Focus on form over speed - quality reps build strength safely")
            recommendations.append("Rest 60-90 seconds between sets to maintain good form")
        elif user_capabilities.fitness_level == 'advanced':
            recommendations.append("Challenge yourself with advanced variations when ready")
            recommendations.append("Consider shorter rest periods to increase intensity")
        
        # Fatigue-based recommendations
        if user_capabilities.fatigue_level > 0.7:
            recommendations.append("High fatigue detected - consider active recovery or lighter exercises")
        elif user_capabilities.fatigue_level < 0.3:
            recommendations.append("Low fatigue - great day to push your limits!")
        
        # Injury considerations
        if user_capabilities.injury_status:
            recommendations.append(f"Modified exercises recommended due to: {', '.join(user_capabilities.injury_status)}")
        
        return recommendations
