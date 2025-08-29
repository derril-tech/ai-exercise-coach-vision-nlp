"""Unit tests for coaching cue prioritization engine."""

import pytest
import asyncio
from unittest.mock import Mock, patch
import time
from datetime import datetime

from workers.coach.cue_engine import (
    CueEngine,
    CueType,
    CuePriority,
    CoachingCue,
    SessionContext
)


class TestCueEngine:
    """Test suite for CueEngine."""
    
    @pytest.fixture
    def cue_engine(self):
        """Create a fresh cue engine for each test."""
        return CueEngine()
    
    @pytest.fixture
    def session_context(self):
        """Create mock session context."""
        return SessionContext(
            session_id="test_session_123",
            user_id="test_user_456",
            current_exercise="push-ups",
            exercise_phase="eccentric",
            rep_count=5,
            target_reps=10,
            form_scores={"overall": 85.0, "elbow": 80.0},
            recent_issues=["shallow_range"],
            user_preferences={"feedback_level": "normal"},
            session_duration=300.0,  # 5 minutes
            fatigue_level=0.3
        )
    
    @pytest.fixture
    def mock_analysis_data(self):
        """Create mock exercise analysis data."""
        return {
            "exercise_type": "push-ups",
            "current_phase": "eccentric",
            "metrics": {
                "angles": {
                    "left_elbow": 110,
                    "right_elbow": 115,
                    "left_knee": 180,
                    "right_knee": 180
                },
                "rep_duration": 2.5,
                "confidence": 0.9
            },
            "form_feedback": ["Go lower for better range of motion"]
        }

    @pytest.mark.asyncio
    async def test_initialization(self, cue_engine):
        """Test cue engine initialization."""
        assert len(cue_engine.active_cues) == 0
        assert len(cue_engine.cue_history) == 0
        assert len(cue_engine.cue_templates) > 0
        assert len(cue_engine.throttle_rules) > 0

    @pytest.mark.asyncio
    async def test_cue_template_loading(self, cue_engine):
        """Test cue template loading and structure."""
        templates = cue_engine.cue_templates
        
        # Check that safety templates exist and have high priority
        assert "knee_valgus" in templates
        assert templates["knee_valgus"]["priority"] == CuePriority.CRITICAL.value
        assert templates["knee_valgus"]["type"] == CueType.SAFETY
        
        # Check form templates
        assert "shallow_squat" in templates
        assert templates["shallow_squat"]["type"] == CueType.FORM
        
        # Check motivation templates
        assert "good_form" in templates
        assert templates["good_form"]["type"] == CueType.MOTIVATION

    @pytest.mark.asyncio
    async def test_safety_cue_generation(self, cue_engine, session_context):
        """Test safety cue generation."""
        # Mock dangerous knee angles
        angles = {
            "left_knee": 45,   # Very bent, potential valgus
            "right_knee": 60,  # Asymmetric
        }
        
        safety_cues = await cue_engine._check_safety_issues(
            angles, "squats", session_context
        )
        
        assert len(safety_cues) > 0
        assert all(cue.type == CueType.SAFETY for cue in safety_cues)
        assert all(cue.priority >= CuePriority.HIGH.value for cue in safety_cues)

    @pytest.mark.asyncio
    async def test_form_cue_generation(self, cue_engine, session_context):
        """Test form cue generation."""
        angles = {"left_elbow": 130, "right_elbow": 125}  # Shallow push-up
        form_feedback = ["Go lower for better range of motion"]
        
        form_cues = await cue_engine._analyze_form_issues(
            angles, form_feedback, "push-ups", session_context
        )
        
        assert len(form_cues) > 0
        assert all(cue.type == CueType.FORM for cue in form_cues)

    @pytest.mark.asyncio
    async def test_tempo_cue_generation(self, cue_engine, session_context):
        """Test tempo cue generation."""
        # Test fast tempo
        analysis_data = {
            "metrics": {"rep_duration": 1.0}  # Too fast
        }
        
        tempo_cues = await cue_engine._analyze_tempo(analysis_data, session_context)
        
        assert len(tempo_cues) > 0
        assert all(cue.type == CueType.TEMPO for cue in tempo_cues)
        
        # Test slow tempo
        analysis_data["metrics"]["rep_duration"] = 8.0  # Too slow
        tempo_cues = await cue_engine._analyze_tempo(analysis_data, session_context)
        
        assert len(tempo_cues) > 0

    @pytest.mark.asyncio
    async def test_motivation_cue_generation(self, cue_engine, session_context):
        """Test motivational cue generation."""
        # Test halfway encouragement
        session_context.rep_count = 5
        session_context.target_reps = 10
        
        motivation_cues = await cue_engine._generate_motivation(
            session_context, "eccentric"
        )
        
        # Should generate halfway encouragement
        assert any("halfway" in cue.message.lower() for cue in motivation_cues)

    @pytest.mark.asyncio
    async def test_cue_prioritization(self, cue_engine, session_context):
        """Test cue prioritization logic."""
        # Create cues with different priorities
        safety_cue = CoachingCue(
            id="safety_1",
            type=CueType.SAFETY,
            priority=CuePriority.CRITICAL.value,
            message="Safety warning",
            tts_text="Safety warning",
            timestamp=time.time()
        )
        
        form_cue = CoachingCue(
            id="form_1",
            type=CueType.FORM,
            priority=CuePriority.HIGH.value,
            message="Form correction",
            tts_text="Form correction",
            timestamp=time.time()
        )
        
        motivation_cue = CoachingCue(
            id="motivation_1",
            type=CueType.MOTIVATION,
            priority=CuePriority.LOW.value,
            message="Keep going",
            tts_text="Keep going",
            timestamp=time.time()
        )
        
        cues = [motivation_cue, form_cue, safety_cue]  # Intentionally unordered
        
        filtered_cues = await cue_engine._filter_and_prioritize(cues, session_context)
        
        # Should be ordered by priority (highest first)
        assert filtered_cues[0].type == CueType.SAFETY
        assert filtered_cues[1].type == CueType.FORM
        assert filtered_cues[2].type == CueType.MOTIVATION

    @pytest.mark.asyncio
    async def test_cue_throttling(self, cue_engine):
        """Test cue throttling to prevent spam."""
        # Create multiple safety cues
        safety_cues = []
        for i in range(5):
            cue = CoachingCue(
                id=f"safety_{i}",
                type=CueType.SAFETY,
                priority=CuePriority.CRITICAL.value,
                message=f"Safety warning {i}",
                tts_text=f"Safety warning {i}",
                timestamp=time.time()
            )
            safety_cues.append(cue)
        
        # Apply throttling
        throttled_cues = await cue_engine._apply_throttling(safety_cues)
        
        # Should throttle based on min_interval
        assert len(throttled_cues) <= len(safety_cues)

    @pytest.mark.asyncio
    async def test_cue_expiration(self, cue_engine):
        """Test cue expiration cleanup."""
        # Add expired cue
        expired_cue = CoachingCue(
            id="expired_1",
            type=CueType.FORM,
            priority=CuePriority.MEDIUM.value,
            message="Expired cue",
            tts_text="Expired cue",
            timestamp=time.time(),
            expires_at=time.time() - 1  # Already expired
        )
        
        cue_engine.active_cues.append(expired_cue)
        
        # Cleanup should remove expired cue
        await cue_engine._cleanup_expired_cues()
        
        assert len(cue_engine.active_cues) == 0

    @pytest.mark.asyncio
    async def test_complete_processing_flow(self, cue_engine, mock_analysis_data, session_context):
        """Test complete cue processing flow."""
        generated_cues = await cue_engine.process_analysis_data(
            mock_analysis_data, session_context
        )
        
        # Should generate some cues
        assert isinstance(generated_cues, list)
        
        # All cues should have required fields
        for cue in generated_cues:
            assert hasattr(cue, 'id')
            assert hasattr(cue, 'type')
            assert hasattr(cue, 'priority')
            assert hasattr(cue, 'message')
            assert hasattr(cue, 'tts_text')

    @pytest.mark.asyncio
    async def test_context_based_filtering(self, cue_engine, session_context):
        """Test context-based cue filtering."""
        # Test minimal feedback preference
        session_context.user_preferences["feedback_level"] = "minimal"
        
        motivation_cue = CoachingCue(
            id="motivation_1",
            type=CueType.MOTIVATION,
            priority=CuePriority.LOW.value,
            message="Keep going",
            tts_text="Keep going",
            timestamp=time.time()
        )
        
        should_include = await cue_engine._should_include_cue(motivation_cue, session_context)
        assert should_include is False  # Should skip motivation with minimal feedback

    @pytest.mark.asyncio
    async def test_fatigue_level_consideration(self, cue_engine, session_context):
        """Test fatigue level consideration in cue generation."""
        # High fatigue level
        session_context.fatigue_level = 0.9
        
        tempo_cue = CoachingCue(
            id="tempo_1",
            type=CueType.TEMPO,
            priority=CuePriority.MEDIUM.value,
            message="Speed up",
            tts_text="Speed up",
            timestamp=time.time()
        )
        
        should_include = await cue_engine._should_include_cue(tempo_cue, session_context)
        assert should_include is False  # Should skip tempo cues when fatigued

    @pytest.mark.asyncio
    async def test_cue_creation_from_template(self, cue_engine, session_context):
        """Test cue creation from templates."""
        current_time = time.time()
        
        cue = await cue_engine._create_cue_from_template(
            "shallow_squat", current_time, session_context
        )
        
        assert cue.type == CueType.FORM
        assert cue.priority == CuePriority.HIGH.value
        assert "deeper" in cue.message.lower()
        assert cue.timestamp == current_time
        assert cue.metadata["exercise"] == session_context.current_exercise

    @pytest.mark.asyncio
    async def test_active_cue_management(self, cue_engine):
        """Test active cue list management."""
        # Add cues beyond max limit
        for i in range(cue_engine.max_active_cues + 2):
            cue = CoachingCue(
                id=f"cue_{i}",
                type=CueType.FORM,
                priority=i,  # Different priorities
                message=f"Cue {i}",
                tts_text=f"Cue {i}",
                timestamp=time.time()
            )
            await cue_engine._add_cue(cue)
        
        # Should not exceed max active cues
        assert len(cue_engine.active_cues) <= cue_engine.max_active_cues
        
        # Should keep highest priority cues
        active_cues = cue_engine.get_active_cues()
        assert all(cue.priority >= active_cues[-1].priority for cue in active_cues[:-1])

    @pytest.mark.asyncio
    async def test_cue_dismissal(self, cue_engine):
        """Test cue dismissal functionality."""
        cue = CoachingCue(
            id="dismissible_cue",
            type=CueType.FORM,
            priority=CuePriority.MEDIUM.value,
            message="Test cue",
            tts_text="Test cue",
            timestamp=time.time()
        )
        
        await cue_engine._add_cue(cue)
        assert len(cue_engine.active_cues) == 1
        
        # Dismiss cue
        dismissed = cue_engine.dismiss_cue("dismissible_cue")
        assert dismissed is True
        assert len(cue_engine.active_cues) == 0

    @pytest.mark.asyncio
    async def test_cue_statistics(self, cue_engine, session_context):
        """Test cue statistics generation."""
        # Generate some cues
        for i in range(5):
            cue = CoachingCue(
                id=f"stat_cue_{i}",
                type=CueType.FORM,
                priority=CuePriority.MEDIUM.value,
                message=f"Stat cue {i}",
                tts_text=f"Stat cue {i}",
                timestamp=time.time()
            )
            cue_engine.cue_history.append(cue)
        
        stats = cue_engine.get_cue_stats()
        
        assert stats["total_cues"] == 5
        assert "cues_by_type" in stats
        assert "avg_priority" in stats

    @pytest.mark.asyncio
    async def test_instruction_cue_timing(self, cue_engine, session_context):
        """Test instruction cue timing logic."""
        # Mock time to control timing
        with patch('time.time', return_value=1000.0):
            # First call should generate breathing reminder
            instruction_cues = await cue_engine._generate_instructions(
                session_context, "eccentric"
            )
            
            # Should generate breathing reminder for long session
            breathing_cues = [cue for cue in instruction_cues 
                            if "breath" in cue.message.lower()]
            assert len(breathing_cues) > 0

    @pytest.mark.asyncio
    async def test_error_handling(self, cue_engine, session_context):
        """Test error handling in cue processing."""
        # Test with invalid analysis data
        invalid_data = {"invalid": "data"}
        
        # Should handle gracefully without crashing
        result = await cue_engine.process_analysis_data(invalid_data, session_context)
        assert isinstance(result, list)

    def test_cue_data_structure(self):
        """Test CoachingCue data structure."""
        cue = CoachingCue(
            id="test_cue",
            type=CueType.SAFETY,
            priority=CuePriority.CRITICAL.value,
            message="Test message",
            tts_text="Test TTS",
            timestamp=time.time(),
            exercise_phase="eccentric",
            body_part="elbow",
            source="test",
            expires_at=time.time() + 10,
            conditions={"angle": "> 90"},
            metadata={"test": "data"}
        )
        
        assert cue.type == CueType.SAFETY
        assert cue.priority == CuePriority.CRITICAL.value
        assert cue.body_part == "elbow"
        assert "angle" in cue.conditions


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
