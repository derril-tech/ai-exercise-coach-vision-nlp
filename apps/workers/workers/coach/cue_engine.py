"""Coaching cue prioritization and generation engine."""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CueType(Enum):
    """Types of coaching cues in priority order."""
    SAFETY = "safety"          # Priority 10 - Immediate safety concerns
    FORM = "form"             # Priority 7-9 - Form corrections
    TEMPO = "tempo"           # Priority 4-6 - Tempo and rhythm
    MOTIVATION = "motivation"  # Priority 1-3 - Encouragement
    INSTRUCTION = "instruction" # Priority 5-8 - General instructions


class CuePriority(Enum):
    """Cue priority levels."""
    CRITICAL = 10    # Immediate safety
    HIGH = 8         # Important form issues
    MEDIUM = 5       # Tempo, general form
    LOW = 3          # Motivation, encouragement
    INFO = 1         # General information


@dataclass
class CoachingCue:
    """A coaching cue with metadata."""
    id: str
    type: CueType
    priority: int
    message: str
    tts_text: str
    timestamp: float
    exercise_phase: Optional[str] = None
    body_part: Optional[str] = None
    source: str = "coach"
    expires_at: Optional[float] = None
    conditions: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SessionContext:
    """Current session context for cue generation."""
    session_id: str
    user_id: str
    current_exercise: Optional[str] = None
    exercise_phase: str = "rest"
    rep_count: int = 0
    target_reps: Optional[int] = None
    form_scores: Dict[str, float] = field(default_factory=dict)
    recent_issues: List[str] = field(default_factory=list)
    user_preferences: Dict[str, Any] = field(default_factory=dict)
    session_duration: float = 0
    fatigue_level: float = 0.0  # 0-1 scale


class CueEngine:
    """Coaching cue prioritization and generation engine."""
    
    def __init__(self):
        self.active_cues: List[CoachingCue] = []
        self.cue_history: List[CoachingCue] = []
        self.cue_templates = self._load_cue_templates()
        self.throttle_rules = self._load_throttle_rules()
        self.last_cue_times: Dict[str, float] = {}
        
        # Configuration
        self.max_active_cues = 3
        self.cue_expiry_time = 10.0  # seconds
        self.history_length = 50
        
    def _load_cue_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load cue templates for different scenarios."""
        return {
            # Safety cues (highest priority)
            "knee_valgus": {
                "type": CueType.SAFETY,
                "priority": CuePriority.CRITICAL.value,
                "message": "Keep your knees aligned over your toes",
                "tts": "Keep knees over toes for safety",
                "body_part": "knees",
                "conditions": {"knee_angle_deviation": "> 15"},
            },
            "excessive_forward_lean": {
                "type": CueType.SAFETY,
                "priority": CuePriority.CRITICAL.value,
                "message": "Avoid leaning too far forward",
                "tts": "Don't lean forward too much",
                "body_part": "torso",
                "conditions": {"torso_angle": "> 45"},
            },
            "hyperextension": {
                "type": CueType.SAFETY,
                "priority": CuePriority.CRITICAL.value,
                "message": "Don't lock your joints completely",
                "tts": "Avoid locking your joints",
                "body_part": "joints",
            },
            
            # Form cues (high priority)
            "shallow_squat": {
                "type": CueType.FORM,
                "priority": CuePriority.HIGH.value,
                "message": "Go deeper for full range of motion",
                "tts": "Squat deeper for better results",
                "body_part": "legs",
                "conditions": {"knee_angle": "> 120"},
            },
            "incomplete_pushup": {
                "type": CueType.FORM,
                "priority": CuePriority.HIGH.value,
                "message": "Lower your chest closer to the ground",
                "tts": "Go lower for full range",
                "body_part": "chest",
                "conditions": {"elbow_angle": "> 120"},
            },
            "rounded_back": {
                "type": CueType.FORM,
                "priority": CuePriority.HIGH.value,
                "message": "Keep your back straight and core engaged",
                "tts": "Straighten your back and engage core",
                "body_part": "back",
            },
            "dropped_shoulders": {
                "type": CueType.FORM,
                "priority": CuePriority.MEDIUM.value,
                "message": "Keep your shoulders down and back",
                "tts": "Shoulders down and back",
                "body_part": "shoulders",
            },
            
            # Tempo cues (medium priority)
            "too_fast": {
                "type": CueType.TEMPO,
                "priority": CuePriority.MEDIUM.value,
                "message": "Slow down and control the movement",
                "tts": "Slow down for better control",
                "conditions": {"rep_duration": "< 2"},
            },
            "too_slow": {
                "type": CueType.TEMPO,
                "priority": CuePriority.MEDIUM.value,
                "message": "Pick up the pace slightly",
                "tts": "Speed up a little",
                "conditions": {"rep_duration": "> 6"},
            },
            "inconsistent_tempo": {
                "type": CueType.TEMPO,
                "priority": CuePriority.MEDIUM.value,
                "message": "Try to maintain consistent timing",
                "tts": "Keep consistent timing",
            },
            
            # Motivational cues (low priority)
            "good_form": {
                "type": CueType.MOTIVATION,
                "priority": CuePriority.LOW.value,
                "message": "Excellent form! Keep it up!",
                "tts": "Great form! Keep going!",
            },
            "halfway_encouragement": {
                "type": CueType.MOTIVATION,
                "priority": CuePriority.LOW.value,
                "message": "You're halfway there! Push through!",
                "tts": "Halfway done! You got this!",
            },
            "final_push": {
                "type": CueType.MOTIVATION,
                "priority": CuePriority.LOW.value,
                "message": "Last few reps! Give it your all!",
                "tts": "Final reps! Push through!",
            },
            "set_complete": {
                "type": CueType.MOTIVATION,
                "priority": CuePriority.LOW.value,
                "message": "Great set! Take a moment to rest.",
                "tts": "Awesome set! Rest up.",
            },
            
            # Instructional cues (medium priority)
            "breathing_reminder": {
                "type": CueType.INSTRUCTION,
                "priority": CuePriority.MEDIUM.value,
                "message": "Remember to breathe steadily",
                "tts": "Don't forget to breathe",
            },
            "core_engagement": {
                "type": CueType.INSTRUCTION,
                "priority": CuePriority.MEDIUM.value,
                "message": "Engage your core throughout the movement",
                "tts": "Keep your core tight",
                "body_part": "core",
            },
        }
    
    def _load_throttle_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load throttling rules to prevent cue spam."""
        return {
            CueType.SAFETY.value: {
                "min_interval": 2.0,  # seconds
                "max_per_minute": 10,
            },
            CueType.FORM.value: {
                "min_interval": 5.0,
                "max_per_minute": 6,
            },
            CueType.TEMPO.value: {
                "min_interval": 8.0,
                "max_per_minute": 4,
            },
            CueType.MOTIVATION.value: {
                "min_interval": 15.0,
                "max_per_minute": 2,
            },
            CueType.INSTRUCTION.value: {
                "min_interval": 10.0,
                "max_per_minute": 3,
            },
        }

    async def process_analysis_data(self, 
                                   analysis_data: Dict[str, Any], 
                                   context: SessionContext) -> List[CoachingCue]:
        """Process exercise analysis data and generate appropriate cues."""
        try:
            # Clean up expired cues
            await self._cleanup_expired_cues()
            
            # Generate potential cues based on analysis
            potential_cues = await self._generate_cues(analysis_data, context)
            
            # Filter and prioritize cues
            filtered_cues = await self._filter_and_prioritize(potential_cues, context)
            
            # Apply throttling rules
            final_cues = await self._apply_throttling(filtered_cues)
            
            # Add to active cues
            for cue in final_cues:
                await self._add_cue(cue)
            
            return final_cues
            
        except Exception as e:
            logger.error(f"Error processing analysis data: {e}")
            return []

    async def _generate_cues(self, 
                            analysis_data: Dict[str, Any], 
                            context: SessionContext) -> List[CoachingCue]:
        """Generate potential cues based on analysis data."""
        potential_cues = []
        current_time = time.time()
        
        # Extract relevant metrics
        angles = analysis_data.get("metrics", {}).get("angles", {})
        form_feedback = analysis_data.get("form_feedback", [])
        exercise_type = analysis_data.get("exercise_type")
        current_phase = analysis_data.get("current_phase", "rest")
        
        # Safety checks (highest priority)
        safety_cues = await self._check_safety_issues(angles, exercise_type, context)
        potential_cues.extend(safety_cues)
        
        # Form analysis
        form_cues = await self._analyze_form_issues(angles, form_feedback, exercise_type, context)
        potential_cues.extend(form_cues)
        
        # Tempo analysis
        tempo_cues = await self._analyze_tempo(analysis_data, context)
        potential_cues.extend(tempo_cues)
        
        # Motivational cues based on progress
        motivation_cues = await self._generate_motivation(context, current_phase)
        potential_cues.extend(motivation_cues)
        
        # Instructional cues
        instruction_cues = await self._generate_instructions(context, current_phase)
        potential_cues.extend(instruction_cues)
        
        return potential_cues

    async def _check_safety_issues(self, 
                                  angles: Dict[str, float], 
                                  exercise_type: str, 
                                  context: SessionContext) -> List[CoachingCue]:
        """Check for safety issues and generate critical cues."""
        safety_cues = []
        current_time = time.time()
        
        if exercise_type == "squats":
            # Check knee alignment
            left_knee = angles.get("left_knee", 180)
            right_knee = angles.get("right_knee", 180)
            
            if abs(left_knee - right_knee) > 15:  # Significant asymmetry
                cue = await self._create_cue_from_template(
                    "knee_valgus", current_time, context
                )
                safety_cues.append(cue)
        
        elif exercise_type == "push-ups":
            # Check for hyperextension
            left_elbow = angles.get("left_elbow", 180)
            right_elbow = angles.get("right_elbow", 180)
            
            if left_elbow > 175 or right_elbow > 175:
                cue = await self._create_cue_from_template(
                    "hyperextension", current_time, context
                )
                safety_cues.append(cue)
        
        return safety_cues

    async def _analyze_form_issues(self, 
                                  angles: Dict[str, float], 
                                  form_feedback: List[str], 
                                  exercise_type: str, 
                                  context: SessionContext) -> List[CoachingCue]:
        """Analyze form and generate correction cues."""
        form_cues = []
        current_time = time.time()
        
        if exercise_type == "squats":
            avg_knee = (angles.get("left_knee", 180) + angles.get("right_knee", 180)) / 2
            if avg_knee > 120 and context.exercise_phase in ["eccentric", "bottom"]:
                cue = await self._create_cue_from_template(
                    "shallow_squat", current_time, context
                )
                form_cues.append(cue)
        
        elif exercise_type == "push-ups":
            avg_elbow = (angles.get("left_elbow", 180) + angles.get("right_elbow", 180)) / 2
            if avg_elbow > 120 and context.exercise_phase in ["eccentric", "bottom"]:
                cue = await self._create_cue_from_template(
                    "incomplete_pushup", current_time, context
                )
                form_cues.append(cue)
        
        # Process existing form feedback
        for feedback in form_feedback:
            if "lower" in feedback.lower():
                template = "shallow_squat" if exercise_type == "squats" else "incomplete_pushup"
                cue = await self._create_cue_from_template(template, current_time, context)
                form_cues.append(cue)
        
        return form_cues

    async def _analyze_tempo(self, 
                            analysis_data: Dict[str, Any], 
                            context: SessionContext) -> List[CoachingCue]:
        """Analyze tempo and generate timing cues."""
        tempo_cues = []
        current_time = time.time()
        
        rep_duration = analysis_data.get("metrics", {}).get("rep_duration", 0)
        
        if rep_duration > 0:
            if rep_duration < 2:  # Too fast
                cue = await self._create_cue_from_template(
                    "too_fast", current_time, context
                )
                tempo_cues.append(cue)
            elif rep_duration > 6:  # Too slow
                cue = await self._create_cue_from_template(
                    "too_slow", current_time, context
                )
                tempo_cues.append(cue)
        
        return tempo_cues

    async def _generate_motivation(self, 
                                  context: SessionContext, 
                                  current_phase: str) -> List[CoachingCue]:
        """Generate motivational cues based on progress."""
        motivation_cues = []
        current_time = time.time()
        
        # Encourage at milestones
        if context.target_reps and context.rep_count > 0:
            progress = context.rep_count / context.target_reps
            
            if 0.4 <= progress <= 0.6:  # Halfway point
                cue = await self._create_cue_from_template(
                    "halfway_encouragement", current_time, context
                )
                motivation_cues.append(cue)
            
            elif progress >= 0.8:  # Final push
                cue = await self._create_cue_from_template(
                    "final_push", current_time, context
                )
                motivation_cues.append(cue)
        
        # Good form encouragement
        avg_form_score = sum(context.form_scores.values()) / len(context.form_scores) if context.form_scores else 0
        if avg_form_score > 85:
            cue = await self._create_cue_from_template(
                "good_form", current_time, context
            )
            motivation_cues.append(cue)
        
        return motivation_cues

    async def _generate_instructions(self, 
                                    context: SessionContext, 
                                    current_phase: str) -> List[CoachingCue]:
        """Generate instructional cues."""
        instruction_cues = []
        current_time = time.time()
        
        # Breathing reminders during exercise
        if current_phase in ["eccentric", "concentric"] and context.session_duration > 60:
            if current_time - self.last_cue_times.get("breathing", 0) > 30:
                cue = await self._create_cue_from_template(
                    "breathing_reminder", current_time, context
                )
                instruction_cues.append(cue)
        
        # Core engagement reminders
        if context.current_exercise in ["squats", "lunges", "push-ups"]:
            if current_time - self.last_cue_times.get("core", 0) > 45:
                cue = await self._create_cue_from_template(
                    "core_engagement", current_time, context
                )
                instruction_cues.append(cue)
        
        return instruction_cues

    async def _create_cue_from_template(self, 
                                       template_name: str, 
                                       timestamp: float, 
                                       context: SessionContext) -> CoachingCue:
        """Create a cue from a template."""
        template = self.cue_templates[template_name]
        
        cue_id = f"{template_name}_{int(timestamp)}_{context.session_id}"
        
        return CoachingCue(
            id=cue_id,
            type=CueType(template["type"]),
            priority=template["priority"],
            message=template["message"],
            tts_text=template["tts"],
            timestamp=timestamp,
            exercise_phase=context.exercise_phase,
            body_part=template.get("body_part"),
            source="coach_engine",
            expires_at=timestamp + self.cue_expiry_time,
            conditions=template.get("conditions", {}),
            metadata={
                "template": template_name,
                "exercise": context.current_exercise,
                "rep_count": context.rep_count,
            }
        )

    async def _filter_and_prioritize(self, 
                                    cues: List[CoachingCue], 
                                    context: SessionContext) -> List[CoachingCue]:
        """Filter and prioritize cues based on context and rules."""
        # Remove duplicates
        unique_cues = {}
        for cue in cues:
            key = f"{cue.type.value}_{cue.body_part}_{cue.message[:20]}"
            if key not in unique_cues or cue.priority > unique_cues[key].priority:
                unique_cues[key] = cue
        
        # Sort by priority (highest first)
        sorted_cues = sorted(unique_cues.values(), key=lambda c: c.priority, reverse=True)
        
        # Apply context-based filtering
        filtered_cues = []
        for cue in sorted_cues:
            if await self._should_include_cue(cue, context):
                filtered_cues.append(cue)
        
        return filtered_cues

    async def _should_include_cue(self, cue: CoachingCue, context: SessionContext) -> bool:
        """Determine if a cue should be included based on context."""
        # Always include safety cues
        if cue.type == CueType.SAFETY:
            return True
        
        # Skip motivation if user prefers minimal feedback
        if (cue.type == CueType.MOTIVATION and 
            context.user_preferences.get("feedback_level") == "minimal"):
            return False
        
        # Skip form cues if form is already good
        if (cue.type == CueType.FORM and 
            context.form_scores.get("overall", 0) > 90):
            return False
        
        # Consider fatigue level
        if context.fatigue_level > 0.8 and cue.type == CueType.TEMPO:
            return False  # Don't pressure tempo when fatigued
        
        return True

    async def _apply_throttling(self, cues: List[CoachingCue]) -> List[CoachingCue]:
        """Apply throttling rules to prevent cue spam."""
        throttled_cues = []
        current_time = time.time()
        
        for cue in cues:
            cue_type = cue.type.value
            rules = self.throttle_rules.get(cue_type, {})
            
            min_interval = rules.get("min_interval", 5.0)
            last_time = self.last_cue_times.get(cue_type, 0)
            
            if current_time - last_time >= min_interval:
                throttled_cues.append(cue)
                self.last_cue_times[cue_type] = current_time
        
        return throttled_cues

    async def _add_cue(self, cue: CoachingCue) -> None:
        """Add a cue to the active list."""
        self.active_cues.append(cue)
        self.cue_history.append(cue)
        
        # Maintain limits
        if len(self.active_cues) > self.max_active_cues:
            # Remove lowest priority cue
            self.active_cues.sort(key=lambda c: c.priority, reverse=True)
            self.active_cues = self.active_cues[:self.max_active_cues]
        
        if len(self.cue_history) > self.history_length:
            self.cue_history = self.cue_history[-self.history_length:]

    async def _cleanup_expired_cues(self) -> None:
        """Remove expired cues from active list."""
        current_time = time.time()
        self.active_cues = [
            cue for cue in self.active_cues 
            if not cue.expires_at or cue.expires_at > current_time
        ]

    def get_active_cues(self) -> List[CoachingCue]:
        """Get currently active cues."""
        return sorted(self.active_cues, key=lambda c: c.priority, reverse=True)

    def dismiss_cue(self, cue_id: str) -> bool:
        """Dismiss a specific cue."""
        for i, cue in enumerate(self.active_cues):
            if cue.id == cue_id:
                self.active_cues.pop(i)
                return True
        return False

    def clear_all_cues(self) -> None:
        """Clear all active cues."""
        self.active_cues.clear()

    def get_cue_stats(self) -> Dict[str, Any]:
        """Get statistics about cue generation."""
        total_cues = len(self.cue_history)
        if total_cues == 0:
            return {"total_cues": 0}
        
        type_counts = {}
        for cue in self.cue_history:
            type_counts[cue.type.value] = type_counts.get(cue.type.value, 0) + 1
        
        return {
            "total_cues": total_cues,
            "active_cues": len(self.active_cues),
            "cues_by_type": type_counts,
            "avg_priority": sum(c.priority for c in self.cue_history) / total_cues,
        }
