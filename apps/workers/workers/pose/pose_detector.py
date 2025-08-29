"""Pose detection implementation using MediaPipe."""

import asyncio
import logging
from typing import Dict, Any, Optional, List
import numpy as np
import cv2
import base64
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logger.warning("MediaPipe not available, using mock pose detector")


class PoseDetector:
    """Pose detection using MediaPipe or mock implementation."""
    
    def __init__(self):
        self.is_initialized = False
        self.mp_pose = None
        self.pose = None
        self.mp_drawing = None
        self.mp_drawing_styles = None
        
        # Performance settings
        self.min_detection_confidence = 0.7
        self.min_tracking_confidence = 0.5
        self.model_complexity = 1  # 0, 1, or 2
        
        # Frame processing
        self.frame_count = 0
        self.skip_frames = 1  # Process every N frames for performance

    async def initialize(self) -> None:
        """Initialize the pose detector."""
        try:
            if MEDIAPIPE_AVAILABLE:
                self.mp_pose = mp.solutions.pose
                self.mp_drawing = mp.solutions.drawing_utils
                self.mp_drawing_styles = mp.solutions.drawing_styles
                
                self.pose = self.mp_pose.Pose(
                    static_image_mode=False,
                    model_complexity=self.model_complexity,
                    enable_segmentation=False,
                    min_detection_confidence=self.min_detection_confidence,
                    min_tracking_confidence=self.min_tracking_confidence
                )
                
                logger.info("MediaPipe pose detector initialized")
            else:
                logger.info("Using mock pose detector")
            
            self.is_initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize pose detector: {e}")
            raise

    async def detect_pose(self, frame_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Detect pose in frame data."""
        if not self.is_initialized:
            await self.initialize()
        
        try:
            # Skip frames for performance
            self.frame_count += 1
            if self.frame_count % (self.skip_frames + 1) != 0:
                return None
            
            # Decode frame data
            image = await self._decode_frame(frame_data)
            if image is None:
                return None
            
            # Detect pose
            if MEDIAPIPE_AVAILABLE and self.pose:
                return await self._detect_with_mediapipe(image)
            else:
                return await self._detect_with_mock(image)
                
        except Exception as e:
            logger.error(f"Error detecting pose: {e}")
            return None

    async def _decode_frame(self, frame_data: Dict[str, Any]) -> Optional[np.ndarray]:
        """Decode frame data to numpy array."""
        try:
            # Handle different frame data formats
            if "image_data" in frame_data:
                # Base64 encoded image
                image_b64 = frame_data["image_data"]
                if isinstance(image_b64, str):
                    # Remove data URL prefix if present
                    if image_b64.startswith("data:image"):
                        image_b64 = image_b64.split(",")[1]
                    
                    # Decode base64
                    image_bytes = base64.b64decode(image_b64)
                    image = Image.open(BytesIO(image_bytes))
                    
                    # Convert to RGB numpy array
                    image_rgb = np.array(image.convert("RGB"))
                    return image_rgb
            
            elif "width" in frame_data and "height" in frame_data and "data" in frame_data:
                # Raw pixel data
                width = frame_data["width"]
                height = frame_data["height"]
                data = frame_data["data"]
                
                if isinstance(data, list):
                    data = np.array(data, dtype=np.uint8)
                
                # Reshape to image
                if len(data) == width * height * 4:  # RGBA
                    image = data.reshape((height, width, 4))
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
                elif len(data) == width * height * 3:  # RGB
                    image_rgb = data.reshape((height, width, 3))
                else:
                    logger.error(f"Unexpected data length: {len(data)} for {width}x{height}")
                    return None
                
                return image_rgb
            
            else:
                logger.error("Unsupported frame data format")
                return None
                
        except Exception as e:
            logger.error(f"Error decoding frame: {e}")
            return None

    async def _detect_with_mediapipe(self, image: np.ndarray) -> Dict[str, Any]:
        """Detect pose using MediaPipe."""
        try:
            # Convert BGR to RGB (MediaPipe expects RGB)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if len(image.shape) == 3 else image
            
            # Process image
            results = self.pose.process(image_rgb)
            
            if not results.pose_landmarks:
                return {
                    "keypoints": {},
                    "confidence": 0.0,
                    "landmarks_detected": False
                }
            
            # Extract keypoints
            keypoints = {}
            landmarks = results.pose_landmarks.landmark
            
            # MediaPipe pose landmark indices
            landmark_names = [
                "nose", "left_eye_inner", "left_eye", "left_eye_outer",
                "right_eye_inner", "right_eye", "right_eye_outer",
                "left_ear", "right_ear", "mouth_left", "mouth_right",
                "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
                "left_wrist", "right_wrist", "left_pinky", "right_pinky",
                "left_index", "right_index", "left_thumb", "right_thumb",
                "left_hip", "right_hip", "left_knee", "right_knee",
                "left_ankle", "right_ankle", "left_heel", "right_heel",
                "left_foot_index", "right_foot_index"
            ]
            
            # Convert landmarks to keypoints
            for i, name in enumerate(landmark_names):
                if i < len(landmarks):
                    landmark = landmarks[i]
                    keypoints[name] = {
                        "x": landmark.x,
                        "y": landmark.y,
                        "z": landmark.z,
                        "visibility": landmark.visibility
                    }
            
            # Calculate overall confidence
            confidence = np.mean([lm.visibility for lm in landmarks])
            
            return {
                "keypoints": keypoints,
                "confidence": float(confidence),
                "landmarks_detected": True,
                "num_landmarks": len(landmarks)
            }
            
        except Exception as e:
            logger.error(f"Error in MediaPipe detection: {e}")
            return {
                "keypoints": {},
                "confidence": 0.0,
                "landmarks_detected": False,
                "error": str(e)
            }

    async def _detect_with_mock(self, image: np.ndarray) -> Dict[str, Any]:
        """Mock pose detection for testing."""
        try:
            # Generate mock keypoints with some variation
            height, width = image.shape[:2]
            
            # Base positions (normalized coordinates)
            base_keypoints = {
                "nose": {"x": 0.5, "y": 0.3, "z": 0.0},
                "left_eye_inner": {"x": 0.48, "y": 0.28, "z": 0.0},
                "left_eye": {"x": 0.47, "y": 0.28, "z": 0.0},
                "left_eye_outer": {"x": 0.46, "y": 0.28, "z": 0.0},
                "right_eye_inner": {"x": 0.52, "y": 0.28, "z": 0.0},
                "right_eye": {"x": 0.53, "y": 0.28, "z": 0.0},
                "right_eye_outer": {"x": 0.54, "y": 0.28, "z": 0.0},
                "left_ear": {"x": 0.44, "y": 0.3, "z": 0.0},
                "right_ear": {"x": 0.56, "y": 0.3, "z": 0.0},
                "mouth_left": {"x": 0.48, "y": 0.32, "z": 0.0},
                "mouth_right": {"x": 0.52, "y": 0.32, "z": 0.0},
                "left_shoulder": {"x": 0.4, "y": 0.45, "z": 0.0},
                "right_shoulder": {"x": 0.6, "y": 0.45, "z": 0.0},
                "left_elbow": {"x": 0.35, "y": 0.6, "z": 0.0},
                "right_elbow": {"x": 0.65, "y": 0.6, "z": 0.0},
                "left_wrist": {"x": 0.3, "y": 0.75, "z": 0.0},
                "right_wrist": {"x": 0.7, "y": 0.75, "z": 0.0},
                "left_pinky": {"x": 0.28, "y": 0.77, "z": 0.0},
                "right_pinky": {"x": 0.72, "y": 0.77, "z": 0.0},
                "left_index": {"x": 0.29, "y": 0.78, "z": 0.0},
                "right_index": {"x": 0.71, "y": 0.78, "z": 0.0},
                "left_thumb": {"x": 0.31, "y": 0.76, "z": 0.0},
                "right_thumb": {"x": 0.69, "y": 0.76, "z": 0.0},
                "left_hip": {"x": 0.42, "y": 0.8, "z": 0.0},
                "right_hip": {"x": 0.58, "y": 0.8, "z": 0.0},
                "left_knee": {"x": 0.4, "y": 1.1, "z": 0.0},
                "right_knee": {"x": 0.6, "y": 1.1, "z": 0.0},
                "left_ankle": {"x": 0.38, "y": 1.4, "z": 0.0},
                "right_ankle": {"x": 0.62, "y": 1.4, "z": 0.0},
                "left_heel": {"x": 0.36, "y": 1.42, "z": 0.0},
                "right_heel": {"x": 0.64, "y": 1.42, "z": 0.0},
                "left_foot_index": {"x": 0.39, "y": 1.45, "z": 0.0},
                "right_foot_index": {"x": 0.61, "y": 1.45, "z": 0.0},
            }
            
            # Add some random variation
            keypoints = {}
            for name, point in base_keypoints.items():
                variation = 0.02  # 2% variation
                keypoints[name] = {
                    "x": point["x"] + np.random.uniform(-variation, variation),
                    "y": point["y"] + np.random.uniform(-variation, variation),
                    "z": point["z"] + np.random.uniform(-variation/2, variation/2),
                    "visibility": np.random.uniform(0.8, 1.0)
                }
            
            confidence = np.random.uniform(0.85, 0.95)
            
            return {
                "keypoints": keypoints,
                "confidence": float(confidence),
                "landmarks_detected": True,
                "mock": True
            }
            
        except Exception as e:
            logger.error(f"Error in mock detection: {e}")
            return {
                "keypoints": {},
                "confidence": 0.0,
                "landmarks_detected": False,
                "error": str(e)
            }

    async def cleanup(self) -> None:
        """Cleanup resources."""
        try:
            if self.pose:
                self.pose.close()
            self.is_initialized = False
            logger.info("Pose detector cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up pose detector: {e}")

    def get_landmark_connections(self) -> List[tuple]:
        """Get pose landmark connections for drawing."""
        if MEDIAPIPE_AVAILABLE and self.mp_pose:
            return self.mp_pose.POSE_CONNECTIONS
        else:
            # Mock connections for basic skeleton
            return [
                (0, 1), (1, 2), (2, 3),  # Face
                (11, 12),  # Shoulders
                (11, 13), (13, 15),  # Left arm
                (12, 14), (14, 16),  # Right arm
                (11, 23), (12, 24),  # Torso
                (23, 24),  # Hips
                (23, 25), (25, 27),  # Left leg
                (24, 26), (26, 28),  # Right leg
            ]
