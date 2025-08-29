"""Unit tests for exercise classifier and rep FSM."""

import pytest
import asyncio
from unittest.mock import Mock, patch
import numpy as np
from datetime import datetime

from workers.exercise.exercise_classifier import (
    ExerciseClassifier,
    ExerciseType,
    RepPhase,
    PoseData,
    PoseKeypoint,
    RepMetrics
)


class TestExerciseClassifier:
    """Test suite for ExerciseClassifier."""
    
    @pytest.fixture
    def classifier(self):
        """Create a fresh classifier instance for each test."""
        return ExerciseClassifier()
    
    @pytest.fixture
    def mock_pose_data(self):
        """Create mock pose data for testing."""
        keypoints = {
            'left_shoulder': PoseKeypoint(x=0.4, y=0.45, z=0.0, visibility=0.9),
            'right_shoulder': PoseKeypoint(x=0.6, y=0.45, z=0.0, visibility=0.9),
            'left_elbow': PoseKeypoint(x=0.35, y=0.6, z=0.0, visibility=0.8),
            'right_elbow': PoseKeypoint(x=0.65, y=0.6, z=0.0, visibility=0.8),
            'left_wrist': PoseKeypoint(x=0.3, y=0.75, z=0.0, visibility=0.7),
            'right_wrist': PoseKeypoint(x=0.7, y=0.75, z=0.0, visibility=0.7),
            'left_hip': PoseKeypoint(x=0.42, y=0.8, z=0.0, visibility=0.9),
            'right_hip': PoseKeypoint(x=0.58, y=0.8, z=0.0, visibility=0.9),
            'left_knee': PoseKeypoint(x=0.4, y=1.1, z=0.0, visibility=0.8),
            'right_knee': PoseKeypoint(x=0.6, y=1.1, z=0.0, visibility=0.8),
            'left_ankle': PoseKeypoint(x=0.38, y=1.4, z=0.0, visibility=0.7),
            'right_ankle': PoseKeypoint(x=0.62, y=1.4, z=0.0, visibility=0.7),
        }
        
        return PoseData(
            keypoints=keypoints,
            confidence=0.85,
            timestamp=datetime.now().timestamp()
        )

    @pytest.mark.asyncio
    async def test_initialization(self, classifier):
        """Test classifier initialization."""
        assert classifier.current_exercise is None
        assert classifier.current_phase == RepPhase.REST
        assert classifier.rep_count == 0
        assert len(classifier.rep_history) == 0
        assert len(classifier.pose_history) == 0

    @pytest.mark.asyncio
    async def test_angle_calculation(self, classifier):
        """Test joint angle calculation."""
        # Create three points forming a 90-degree angle
        p1 = PoseKeypoint(x=0.0, y=0.0, z=0.0)  # Origin
        p2 = PoseKeypoint(x=1.0, y=0.0, z=0.0)  # Joint
        p3 = PoseKeypoint(x=1.0, y=1.0, z=0.0)  # End point
        
        angle = await classifier._calculate_angle(p1, p2, p3)
        assert abs(angle - 90.0) < 1.0  # Should be approximately 90 degrees

    @pytest.mark.asyncio
    async def test_angle_calculation_straight_line(self, classifier):
        """Test angle calculation for straight line (180 degrees)."""
        p1 = PoseKeypoint(x=0.0, y=0.0, z=0.0)
        p2 = PoseKeypoint(x=1.0, y=0.0, z=0.0)
        p3 = PoseKeypoint(x=2.0, y=0.0, z=0.0)
        
        angle = await classifier._calculate_angle(p1, p2, p3)
        assert abs(angle - 180.0) < 1.0

    @pytest.mark.asyncio
    async def test_pushup_position_detection(self, classifier, mock_pose_data):
        """Test push-up position detection."""
        # Modify pose data to simulate push-up position
        mock_pose_data.keypoints['left_wrist'].y = 0.5  # Hands below shoulders
        mock_pose_data.keypoints['right_wrist'].y = 0.5
        
        is_pushup = await classifier._is_pushup_position(mock_pose_data.keypoints)
        assert is_pushup is True

    @pytest.mark.asyncio
    async def test_squat_position_detection(self, classifier, mock_pose_data):
        """Test squat position detection."""
        # Modify pose data to simulate squat position
        mock_pose_data.keypoints['left_knee'].y = 0.9  # Knees bent
        mock_pose_data.keypoints['right_knee'].y = 0.9
        
        is_squat = await classifier._is_squat_position(mock_pose_data.keypoints)
        assert is_squat is True

    @pytest.mark.asyncio
    async def test_exercise_classification(self, classifier, mock_pose_data):
        """Test exercise classification."""
        # Add multiple frames to history for classification
        for _ in range(15):
            classifier.pose_history.append(mock_pose_data)
        
        # Mock push-up position
        with patch.object(classifier, '_is_pushup_position', return_value=True):
            exercise_type = await classifier._classify_exercise(mock_pose_data)
            assert exercise_type == ExerciseType.PUSHUP

    @pytest.mark.asyncio
    async def test_rep_fsm_transitions(self, classifier, mock_pose_data):
        """Test rep counting FSM state transitions."""
        classifier.current_exercise = ExerciseType.PUSHUP
        
        # Mock angle calculation to simulate push-up motion
        angles = {
            'left_elbow': 160,
            'right_elbow': 160,
            'left_knee': 180,
            'right_knee': 180,
        }
        
        with patch.object(classifier, '_calculate_key_angles', return_value=angles):
            await classifier._update_rep_fsm(mock_pose_data)
            assert classifier.current_phase == RepPhase.REST
            
            # Simulate starting motion
            angles['left_elbow'] = 140
            angles['right_elbow'] = 140
            await classifier._update_rep_fsm(mock_pose_data)
            assert classifier.current_phase == RepPhase.STARTING

    @pytest.mark.asyncio
    async def test_complete_rep_cycle(self, classifier, mock_pose_data):
        """Test complete rep cycle from start to finish."""
        classifier.current_exercise = ExerciseType.PUSHUP
        initial_rep_count = classifier.rep_count
        
        # Simulate complete push-up cycle
        angle_sequence = [
            {'left_elbow': 160, 'right_elbow': 160},  # Rest
            {'left_elbow': 140, 'right_elbow': 140},  # Starting
            {'left_elbow': 110, 'right_elbow': 110},  # Eccentric
            {'left_elbow': 80, 'right_elbow': 80},    # Bottom
            {'left_elbow': 110, 'right_elbow': 110},  # Concentric
            {'left_elbow': 150, 'right_elbow': 150},  # Top
            {'left_elbow': 170, 'right_elbow': 170},  # Completed
        ]
        
        for angles in angle_sequence:
            with patch.object(classifier, '_calculate_key_angles', return_value=angles):
                await classifier._update_rep_fsm(mock_pose_data)
        
        assert classifier.rep_count == initial_rep_count + 1
        assert len(classifier.rep_history) == 1

    @pytest.mark.asyncio
    async def test_form_scoring(self, classifier):
        """Test form score calculation."""
        # Mock form issues
        with patch.object(classifier, '_identify_form_issues', return_value=[]):
            score = await classifier._calculate_form_score()
            assert score >= 80.0  # Should be high with no issues
        
        with patch.object(classifier, '_identify_form_issues', return_value=['issue1', 'issue2']):
            score = await classifier._calculate_form_score()
            assert score <= 75.0  # Should be lower with issues

    @pytest.mark.asyncio
    async def test_tempo_scoring(self, classifier):
        """Test tempo score calculation."""
        # Test ideal tempo
        score = await classifier._calculate_tempo_score(3.0)
        assert score == 100.0
        
        # Test too fast
        score = await classifier._calculate_tempo_score(1.0)
        assert score < 100.0
        
        # Test too slow
        score = await classifier._calculate_tempo_score(8.0)
        assert score < 100.0

    @pytest.mark.asyncio
    async def test_process_pose_complete_flow(self, classifier, mock_pose_data):
        """Test complete pose processing flow."""
        result = await classifier.process_pose(mock_pose_data)
        
        assert 'exercise_type' in result
        assert 'rep_count' in result
        assert 'current_phase' in result
        assert 'metrics' in result
        assert 'form_feedback' in result
        assert 'timestamp' in result

    @pytest.mark.asyncio
    async def test_error_handling(self, classifier):
        """Test error handling in pose processing."""
        # Test with invalid pose data
        invalid_pose = PoseData(
            keypoints={},  # Empty keypoints
            confidence=0.0,
            timestamp=0
        )
        
        result = await classifier.process_pose(invalid_pose)
        assert 'error' not in result  # Should handle gracefully

    @pytest.mark.asyncio
    async def test_reset_functionality(self, classifier, mock_pose_data):
        """Test classifier reset functionality."""
        # Add some data
        await classifier.process_pose(mock_pose_data)
        classifier.rep_count = 5
        classifier.current_exercise = ExerciseType.PUSHUP
        
        # Reset
        classifier.reset()
        
        assert classifier.current_exercise is None
        assert classifier.current_phase == RepPhase.REST
        assert classifier.rep_count == 0
        assert len(classifier.rep_history) == 0
        assert len(classifier.pose_history) == 0

    @pytest.mark.asyncio
    async def test_pose_history_management(self, classifier, mock_pose_data):
        """Test pose history length management."""
        # Add more poses than history limit
        for i in range(classifier.history_length + 10):
            pose_data = PoseData(
                keypoints=mock_pose_data.keypoints,
                confidence=0.8,
                timestamp=i
            )
            await classifier.process_pose(pose_data)
        
        # Should not exceed history length
        assert len(classifier.pose_history) <= classifier.history_length

    @pytest.mark.asyncio
    async def test_confidence_threshold(self, classifier, mock_pose_data):
        """Test confidence threshold handling."""
        # Low confidence pose
        low_confidence_pose = PoseData(
            keypoints=mock_pose_data.keypoints,
            confidence=0.3,  # Below threshold
            timestamp=datetime.now().timestamp()
        )
        
        result = await classifier.process_pose(low_confidence_pose)
        
        # Should still process but may affect form feedback
        assert 'form_feedback' in result

    @pytest.mark.asyncio
    async def test_multiple_exercise_types(self, classifier, mock_pose_data):
        """Test handling multiple exercise types."""
        # Test push-up
        with patch.object(classifier, '_is_pushup_position', return_value=True):
            classifier.pose_history = [mock_pose_data] * 15
            exercise_type = await classifier._classify_exercise(mock_pose_data)
            assert exercise_type == ExerciseType.PUSHUP
        
        # Reset and test squat
        classifier.reset()
        with patch.object(classifier, '_is_squat_position', return_value=True):
            classifier.pose_history = [mock_pose_data] * 15
            exercise_type = await classifier._classify_exercise(mock_pose_data)
            assert exercise_type == ExerciseType.SQUAT

    @pytest.mark.asyncio
    async def test_rep_metrics_generation(self, classifier, mock_pose_data):
        """Test rep metrics generation."""
        classifier.current_exercise = ExerciseType.PUSHUP
        classifier.rep_start_time = datetime.now().timestamp() - 3.0  # 3 seconds ago
        
        # Complete a rep
        await classifier._complete_rep(mock_pose_data)
        
        assert len(classifier.rep_history) == 1
        rep_metrics = classifier.rep_history[0]
        
        assert isinstance(rep_metrics, RepMetrics)
        assert rep_metrics.rep_number == 1
        assert rep_metrics.duration > 0
        assert 0 <= rep_metrics.form_score <= 100
        assert 0 <= rep_metrics.tempo_score <= 100
        assert 0 <= rep_metrics.rom_score <= 100


class TestRepMetrics:
    """Test suite for RepMetrics data structure."""
    
    def test_rep_metrics_creation(self):
        """Test RepMetrics creation and validation."""
        metrics = RepMetrics(
            rep_number=1,
            duration=3.5,
            form_score=85.0,
            tempo_score=90.0,
            rom_score=88.0,
            phase_durations={RepPhase.ECCENTRIC: 1.5, RepPhase.CONCENTRIC: 2.0},
            peak_angles={'elbow': 80.0},
            issues=['minor_form_issue']
        )
        
        assert metrics.rep_number == 1
        assert metrics.duration == 3.5
        assert metrics.form_score == 85.0
        assert len(metrics.issues) == 1


class TestPoseData:
    """Test suite for PoseData structure."""
    
    def test_pose_data_creation(self):
        """Test PoseData creation."""
        keypoints = {
            'nose': PoseKeypoint(x=0.5, y=0.3, z=0.0, visibility=0.9)
        }
        
        pose_data = PoseData(
            keypoints=keypoints,
            confidence=0.85,
            timestamp=123456789.0
        )
        
        assert len(pose_data.keypoints) == 1
        assert pose_data.confidence == 0.85
        assert pose_data.timestamp == 123456789.0

    def test_pose_keypoint_validation(self):
        """Test PoseKeypoint validation."""
        keypoint = PoseKeypoint(x=0.5, y=0.3, z=0.1, visibility=0.9)
        
        assert 0 <= keypoint.x <= 1
        assert 0 <= keypoint.y <= 1
        assert keypoint.z == 0.1
        assert 0 <= keypoint.visibility <= 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
