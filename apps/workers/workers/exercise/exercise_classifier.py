"""Exercise classification and rep counting logic."""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ExerciseType(Enum):
    """Supported exercise types."""
    PUSHUP = "push-up"
    SQUAT = "squat"
    LUNGE = "lunge"
    PLANK = "plank"
    JUMPING_JACK = "jumping-jack"
    UNKNOWN = "unknown"


class RepPhase(Enum):
    """Rep phases for finite state machine."""
    REST = "rest"
    STARTING = "starting"
    ECCENTRIC = "eccentric"  # Lowering phase
    BOTTOM = "bottom"
    CONCENTRIC = "concentric"  # Lifting phase
    TOP = "top"
    COMPLETED = "completed"


@dataclass
class PoseKeypoint:
    """3D pose keypoint."""
    x: float
    y: float
    z: float
    visibility: float = 1.0


@dataclass
class PoseData:
    """Complete pose data structure."""
    keypoints: Dict[str, PoseKeypoint]
    confidence: float
    timestamp: float


@dataclass
class RepMetrics:
    """Metrics for a single rep."""
    rep_number: int
    duration: float
    form_score: float
    tempo_score: float
    rom_score: float
    phase_durations: Dict[RepPhase, float]
    peak_angles: Dict[str, float]
    issues: List[str]


class ExerciseClassifier:
    """Classifies exercises and counts reps using pose data."""
    
    def __init__(self):
        self.current_exercise: Optional[ExerciseType] = None
        self.current_phase = RepPhase.REST
        self.rep_count = 0
        self.rep_history: List[RepMetrics] = []
        self.pose_history: List[PoseData] = []
        self.phase_start_time: Optional[float] = None
        self.rep_start_time: Optional[float] = None
        
        # Thresholds and parameters
        self.confidence_threshold = 0.7
        self.min_rep_duration = 1.0  # seconds
        self.max_rep_duration = 10.0  # seconds
        self.phase_stability_frames = 5
        self.history_length = 100
        
        # Exercise-specific parameters
        self.exercise_params = {
            ExerciseType.PUSHUP: {
                'key_joints': ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'],
                'angle_thresholds': {'elbow_min': 70, 'elbow_max': 160},
                'rom_joints': ['left_elbow', 'right_elbow'],
            },
            ExerciseType.SQUAT: {
                'key_joints': ['left_hip', 'right_hip', 'left_knee', 'right_knee'],
                'angle_thresholds': {'knee_min': 70, 'knee_max': 160},
                'rom_joints': ['left_knee', 'right_knee'],
            },
            ExerciseType.LUNGE: {
                'key_joints': ['left_hip', 'right_hip', 'left_knee', 'right_knee'],
                'angle_thresholds': {'knee_min': 70, 'knee_max': 160},
                'rom_joints': ['left_knee', 'right_knee'],
            },
        }

    async def process_pose(self, pose_data: PoseData) -> Dict[str, Any]:
        """Process new pose data and update exercise state."""
        try:
            # Add to history
            self.pose_history.append(pose_data)
            if len(self.pose_history) > self.history_length:
                self.pose_history.pop(0)
            
            # Classify exercise if not set
            if self.current_exercise is None:
                self.current_exercise = await self._classify_exercise(pose_data)
            
            # Update rep counting FSM
            previous_phase = self.current_phase
            await self._update_rep_fsm(pose_data)
            
            # Check for rep completion
            rep_completed = False
            if previous_phase != RepPhase.COMPLETED and self.current_phase == RepPhase.COMPLETED:
                rep_completed = True
                await self._complete_rep(pose_data)
            
            # Calculate current metrics
            current_metrics = await self._calculate_current_metrics(pose_data)
            
            return {
                'exercise_type': self.current_exercise.value if self.current_exercise else None,
                'rep_count': self.rep_count,
                'current_phase': self.current_phase.value,
                'rep_completed': rep_completed,
                'metrics': current_metrics,
                'form_feedback': await self._get_form_feedback(pose_data),
                'timestamp': pose_data.timestamp,
            }
            
        except Exception as e:
            logger.error(f"Error processing pose data: {e}")
            return {
                'error': str(e),
                'timestamp': pose_data.timestamp,
            }

    async def _classify_exercise(self, pose_data: PoseData) -> ExerciseType:
        """Classify the current exercise based on pose data."""
        if len(self.pose_history) < 10:  # Need some history
            return ExerciseType.UNKNOWN
        
        # Simple heuristic-based classification
        # In a real implementation, this would use ML models
        
        keypoints = pose_data.keypoints
        
        # Check for push-up indicators
        if await self._is_pushup_position(keypoints):
            return ExerciseType.PUSHUP
        
        # Check for squat indicators
        if await self._is_squat_position(keypoints):
            return ExerciseType.SQUAT
        
        # Check for lunge indicators
        if await self._is_lunge_position(keypoints):
            return ExerciseType.LUNGE
        
        return ExerciseType.UNKNOWN

    async def _is_pushup_position(self, keypoints: Dict[str, PoseKeypoint]) -> bool:
        """Check if pose indicates push-up position."""
        try:
            # Check if person is in horizontal position
            left_shoulder = keypoints.get('left_shoulder')
            right_shoulder = keypoints.get('right_shoulder')
            left_wrist = keypoints.get('left_wrist')
            right_wrist = keypoints.get('right_wrist')
            
            if not all([left_shoulder, right_shoulder, left_wrist, right_wrist]):
                return False
            
            # Check if hands are below shoulders (supporting body weight)
            hands_below_shoulders = (
                left_wrist.y > left_shoulder.y and 
                right_wrist.y > right_shoulder.y
            )
            
            # Check if body is roughly horizontal
            shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
            hip_left = keypoints.get('left_hip')
            hip_right = keypoints.get('right_hip')
            
            if hip_left and hip_right:
                hip_y = (hip_left.y + hip_right.y) / 2
                body_horizontal = abs(shoulder_y - hip_y) < 0.2
                return hands_below_shoulders and body_horizontal
            
            return hands_below_shoulders
            
        except Exception as e:
            logger.error(f"Error checking push-up position: {e}")
            return False

    async def _is_squat_position(self, keypoints: Dict[str, PoseKeypoint]) -> bool:
        """Check if pose indicates squat position."""
        try:
            # Check if person is in standing/squatting position
            left_hip = keypoints.get('left_hip')
            right_hip = keypoints.get('right_hip')
            left_knee = keypoints.get('left_knee')
            right_knee = keypoints.get('right_knee')
            left_ankle = keypoints.get('left_ankle')
            right_ankle = keypoints.get('right_ankle')
            
            if not all([left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle]):
                return False
            
            # Check if feet are roughly shoulder-width apart
            foot_distance = abs(left_ankle.x - right_ankle.x)
            shoulder_left = keypoints.get('left_shoulder')
            shoulder_right = keypoints.get('right_shoulder')
            
            if shoulder_left and shoulder_right:
                shoulder_distance = abs(shoulder_left.x - shoulder_right.x)
                feet_positioned = 0.8 < foot_distance / shoulder_distance < 1.5
                
                # Check if knees are bending (squat motion)
                knee_bend = left_knee.y > left_hip.y or right_knee.y > right_hip.y
                
                return feet_positioned and knee_bend
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking squat position: {e}")
            return False

    async def _is_lunge_position(self, keypoints: Dict[str, PoseKeypoint]) -> bool:
        """Check if pose indicates lunge position."""
        try:
            # Check for asymmetric leg position typical of lunges
            left_knee = keypoints.get('left_knee')
            right_knee = keypoints.get('right_knee')
            left_ankle = keypoints.get('left_ankle')
            right_ankle = keypoints.get('right_ankle')
            
            if not all([left_knee, right_knee, left_ankle, right_ankle]):
                return False
            
            # Check for front/back leg positioning
            ankle_distance = abs(left_ankle.z - right_ankle.z)  # Depth difference
            knee_height_diff = abs(left_knee.y - right_knee.y)
            
            # Lunges have significant front-back positioning and knee height difference
            return ankle_distance > 0.3 and knee_height_diff > 0.1
            
        except Exception as e:
            logger.error(f"Error checking lunge position: {e}")
            return False

    async def _update_rep_fsm(self, pose_data: PoseData) -> None:
        """Update the rep counting finite state machine."""
        if self.current_exercise == ExerciseType.UNKNOWN:
            return
        
        current_time = pose_data.timestamp
        
        # Initialize phase timing
        if self.phase_start_time is None:
            self.phase_start_time = current_time
        
        # Get exercise-specific angles
        angles = await self._calculate_key_angles(pose_data)
        if not angles:
            return
        
        # State transitions based on exercise type
        if self.current_exercise == ExerciseType.PUSHUP:
            await self._update_pushup_fsm(angles, current_time)
        elif self.current_exercise == ExerciseType.SQUAT:
            await self._update_squat_fsm(angles, current_time)
        elif self.current_exercise == ExerciseType.LUNGE:
            await self._update_lunge_fsm(angles, current_time)

    async def _update_pushup_fsm(self, angles: Dict[str, float], current_time: float) -> None:
        """Update FSM for push-up exercise."""
        avg_elbow_angle = (angles.get('left_elbow', 180) + angles.get('right_elbow', 180)) / 2
        
        if self.current_phase == RepPhase.REST:
            if avg_elbow_angle < 150:  # Starting to bend elbows
                await self._transition_phase(RepPhase.STARTING, current_time)
        
        elif self.current_phase == RepPhase.STARTING:
            if avg_elbow_angle < 120:  # Clear downward motion
                await self._transition_phase(RepPhase.ECCENTRIC, current_time)
        
        elif self.current_phase == RepPhase.ECCENTRIC:
            if avg_elbow_angle < 90:  # Bottom position
                await self._transition_phase(RepPhase.BOTTOM, current_time)
        
        elif self.current_phase == RepPhase.BOTTOM:
            if avg_elbow_angle > 100:  # Starting to push up
                await self._transition_phase(RepPhase.CONCENTRIC, current_time)
        
        elif self.current_phase == RepPhase.CONCENTRIC:
            if avg_elbow_angle > 150:  # Near top
                await self._transition_phase(RepPhase.TOP, current_time)
        
        elif self.current_phase == RepPhase.TOP:
            if avg_elbow_angle > 160:  # Full extension
                await self._transition_phase(RepPhase.COMPLETED, current_time)

    async def _update_squat_fsm(self, angles: Dict[str, float], current_time: float) -> None:
        """Update FSM for squat exercise."""
        avg_knee_angle = (angles.get('left_knee', 180) + angles.get('right_knee', 180)) / 2
        
        if self.current_phase == RepPhase.REST:
            if avg_knee_angle < 160:  # Starting to bend knees
                await self._transition_phase(RepPhase.STARTING, current_time)
        
        elif self.current_phase == RepPhase.STARTING:
            if avg_knee_angle < 130:  # Clear downward motion
                await self._transition_phase(RepPhase.ECCENTRIC, current_time)
        
        elif self.current_phase == RepPhase.ECCENTRIC:
            if avg_knee_angle < 100:  # Bottom position
                await self._transition_phase(RepPhase.BOTTOM, current_time)
        
        elif self.current_phase == RepPhase.BOTTOM:
            if avg_knee_angle > 110:  # Starting to stand up
                await self._transition_phase(RepPhase.CONCENTRIC, current_time)
        
        elif self.current_phase == RepPhase.CONCENTRIC:
            if avg_knee_angle > 150:  # Near top
                await self._transition_phase(RepPhase.TOP, current_time)
        
        elif self.current_phase == RepPhase.TOP:
            if avg_knee_angle > 170:  # Full extension
                await self._transition_phase(RepPhase.COMPLETED, current_time)

    async def _update_lunge_fsm(self, angles: Dict[str, float], current_time: float) -> None:
        """Update FSM for lunge exercise."""
        # Use front leg knee angle (assume left leg is front for simplicity)
        front_knee_angle = angles.get('left_knee', 180)
        
        if self.current_phase == RepPhase.REST:
            if front_knee_angle < 160:
                await self._transition_phase(RepPhase.STARTING, current_time)
        
        elif self.current_phase == RepPhase.STARTING:
            if front_knee_angle < 130:
                await self._transition_phase(RepPhase.ECCENTRIC, current_time)
        
        elif self.current_phase == RepPhase.ECCENTRIC:
            if front_knee_angle < 100:
                await self._transition_phase(RepPhase.BOTTOM, current_time)
        
        elif self.current_phase == RepPhase.BOTTOM:
            if front_knee_angle > 110:
                await self._transition_phase(RepPhase.CONCENTRIC, current_time)
        
        elif self.current_phase == RepPhase.CONCENTRIC:
            if front_knee_angle > 150:
                await self._transition_phase(RepPhase.TOP, current_time)
        
        elif self.current_phase == RepPhase.TOP:
            if front_knee_angle > 170:
                await self._transition_phase(RepPhase.COMPLETED, current_time)

    async def _transition_phase(self, new_phase: RepPhase, current_time: float) -> None:
        """Transition to a new rep phase."""
        self.current_phase = new_phase
        self.phase_start_time = current_time
        
        if new_phase == RepPhase.STARTING:
            self.rep_start_time = current_time

    async def _calculate_key_angles(self, pose_data: PoseData) -> Dict[str, float]:
        """Calculate key joint angles for the current exercise."""
        keypoints = pose_data.keypoints
        angles = {}
        
        try:
            # Calculate elbow angles
            angles['left_elbow'] = await self._calculate_angle(
                keypoints.get('left_shoulder'),
                keypoints.get('left_elbow'),
                keypoints.get('left_wrist')
            )
            angles['right_elbow'] = await self._calculate_angle(
                keypoints.get('right_shoulder'),
                keypoints.get('right_elbow'),
                keypoints.get('right_wrist')
            )
            
            # Calculate knee angles
            angles['left_knee'] = await self._calculate_angle(
                keypoints.get('left_hip'),
                keypoints.get('left_knee'),
                keypoints.get('left_ankle')
            )
            angles['right_knee'] = await self._calculate_angle(
                keypoints.get('right_hip'),
                keypoints.get('right_knee'),
                keypoints.get('right_ankle')
            )
            
            # Calculate hip angles
            angles['left_hip'] = await self._calculate_angle(
                keypoints.get('left_shoulder'),
                keypoints.get('left_hip'),
                keypoints.get('left_knee')
            )
            angles['right_hip'] = await self._calculate_angle(
                keypoints.get('right_shoulder'),
                keypoints.get('right_hip'),
                keypoints.get('right_knee')
            )
            
        except Exception as e:
            logger.error(f"Error calculating angles: {e}")
        
        return angles

    async def _calculate_angle(self, p1: Optional[PoseKeypoint], 
                             p2: Optional[PoseKeypoint], 
                             p3: Optional[PoseKeypoint]) -> float:
        """Calculate angle between three points (p1-p2-p3)."""
        if not all([p1, p2, p3]):
            return 180.0  # Default to straight angle
        
        try:
            # Convert to numpy arrays
            a = np.array([p1.x, p1.y])
            b = np.array([p2.x, p2.y])
            c = np.array([p3.x, p3.y])
            
            # Calculate vectors
            ba = a - b
            bc = c - b
            
            # Calculate angle
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            cosine_angle = np.clip(cosine_angle, -1.0, 1.0)  # Handle numerical errors
            angle = np.arccos(cosine_angle)
            
            return np.degrees(angle)
            
        except Exception as e:
            logger.error(f"Error calculating angle: {e}")
            return 180.0

    async def _complete_rep(self, pose_data: PoseData) -> None:
        """Complete the current rep and calculate metrics."""
        if self.rep_start_time is None:
            return
        
        self.rep_count += 1
        rep_duration = pose_data.timestamp - self.rep_start_time
        
        # Calculate rep metrics
        metrics = RepMetrics(
            rep_number=self.rep_count,
            duration=rep_duration,
            form_score=await self._calculate_form_score(),
            tempo_score=await self._calculate_tempo_score(rep_duration),
            rom_score=await self._calculate_rom_score(),
            phase_durations={},  # TODO: Track phase durations
            peak_angles={},  # TODO: Track peak angles
            issues=await self._identify_form_issues(),
        )
        
        self.rep_history.append(metrics)
        
        # Reset for next rep
        self.current_phase = RepPhase.REST
        self.rep_start_time = None
        self.phase_start_time = None

    async def _calculate_form_score(self) -> float:
        """Calculate form score for the current rep."""
        # Simplified form scoring - in reality this would be much more sophisticated
        base_score = 85.0
        
        # Deduct points for form issues
        issues = await self._identify_form_issues()
        deduction = len(issues) * 5.0
        
        return max(0.0, min(100.0, base_score - deduction))

    async def _calculate_tempo_score(self, rep_duration: float) -> float:
        """Calculate tempo score based on rep duration."""
        # Ideal rep duration varies by exercise
        ideal_duration = 3.0  # seconds
        tolerance = 1.0
        
        if abs(rep_duration - ideal_duration) <= tolerance:
            return 100.0
        else:
            deviation = abs(rep_duration - ideal_duration) - tolerance
            return max(0.0, 100.0 - (deviation * 20.0))

    async def _calculate_rom_score(self) -> float:
        """Calculate range of motion score."""
        # Simplified ROM scoring
        return 90.0  # Placeholder

    async def _identify_form_issues(self) -> List[str]:
        """Identify form issues in the current rep."""
        issues = []
        
        # Placeholder form checks
        if len(self.pose_history) > 10:
            recent_poses = self.pose_history[-10:]
            
            # Check for consistent visibility
            low_confidence_frames = sum(1 for pose in recent_poses if pose.confidence < 0.8)
            if low_confidence_frames > 5:
                issues.append("Poor pose detection quality")
        
        return issues

    async def _calculate_current_metrics(self, pose_data: PoseData) -> Dict[str, Any]:
        """Calculate current real-time metrics."""
        angles = await self._calculate_key_angles(pose_data)
        
        return {
            'angles': angles,
            'phase_duration': pose_data.timestamp - (self.phase_start_time or pose_data.timestamp),
            'rep_duration': pose_data.timestamp - (self.rep_start_time or pose_data.timestamp) if self.rep_start_time else 0,
            'confidence': pose_data.confidence,
        }

    async def _get_form_feedback(self, pose_data: PoseData) -> List[str]:
        """Get real-time form feedback."""
        feedback = []
        
        if self.current_exercise == ExerciseType.UNKNOWN:
            return feedback
        
        angles = await self._calculate_key_angles(pose_data)
        
        # Exercise-specific feedback
        if self.current_exercise == ExerciseType.PUSHUP:
            avg_elbow = (angles.get('left_elbow', 180) + angles.get('right_elbow', 180)) / 2
            if self.current_phase in [RepPhase.ECCENTRIC, RepPhase.BOTTOM] and avg_elbow > 120:
                feedback.append("Go lower for better range of motion")
        
        elif self.current_exercise == ExerciseType.SQUAT:
            avg_knee = (angles.get('left_knee', 180) + angles.get('right_knee', 180)) / 2
            if self.current_phase in [RepPhase.ECCENTRIC, RepPhase.BOTTOM] and avg_knee > 120:
                feedback.append("Squat deeper for full range of motion")
        
        return feedback

    def reset(self) -> None:
        """Reset the classifier state."""
        self.current_exercise = None
        self.current_phase = RepPhase.REST
        self.rep_count = 0
        self.rep_history.clear()
        self.pose_history.clear()
        self.phase_start_time = None
        self.rep_start_time = None
