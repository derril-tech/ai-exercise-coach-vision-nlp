"""Face blur service for privacy protection."""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
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
    logger.warning("MediaPipe not available, using mock face detection")


class FaceBlurService:
    """Service for detecting and blurring faces in video frames."""
    
    def __init__(self):
        self.is_initialized = False
        self.mp_face_detection = None
        self.face_detection = None
        
        # Privacy settings
        self.blur_strength = 51  # Gaussian blur kernel size (must be odd)
        self.detection_confidence = 0.7
        self.face_padding = 0.2  # Extra padding around detected face
        
        # Performance settings
        self.max_faces = 5
        self.process_scale = 0.5  # Scale down for faster processing
        
    async def initialize(self) -> None:
        """Initialize the face detection model."""
        try:
            if MEDIAPIPE_AVAILABLE:
                self.mp_face_detection = mp.solutions.face_detection
                self.face_detection = self.mp_face_detection.FaceDetection(
                    model_selection=0,  # 0 for short-range (< 2m), 1 for full-range
                    min_detection_confidence=self.detection_confidence
                )
                logger.info("MediaPipe face detection initialized")
            else:
                logger.info("Using mock face detection")
            
            self.is_initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize face detection: {e}")
            raise

    async def blur_faces_in_frame(self, frame_data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect and blur faces in a video frame."""
        if not self.is_initialized:
            await self.initialize()
        
        try:
            # Decode frame
            image = await self._decode_frame(frame_data)
            if image is None:
                return {
                    'success': False,
                    'error': 'Failed to decode frame'
                }
            
            # Detect faces
            faces = await self._detect_faces(image)
            
            # Blur faces
            blurred_image = await self._blur_faces(image, faces)
            
            # Encode result
            result_data = await self._encode_frame(blurred_image)
            
            return {
                'success': True,
                'blurred_frame': result_data,
                'faces_detected': len(faces),
                'faces_blurred': len(faces),
                'privacy_level': 'high' if len(faces) > 0 else 'none_needed'
            }
            
        except Exception as e:
            logger.error(f"Error blurring faces: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def _decode_frame(self, frame_data: Dict[str, Any]) -> Optional[np.ndarray]:
        """Decode frame data to numpy array."""
        try:
            if "image_data" in frame_data:
                # Base64 encoded image
                image_b64 = frame_data["image_data"]
                if isinstance(image_b64, str):
                    if image_b64.startswith("data:image"):
                        image_b64 = image_b64.split(",")[1]
                    
                    image_bytes = base64.b64decode(image_b64)
                    image = Image.open(BytesIO(image_bytes))
                    image_rgb = np.array(image.convert("RGB"))
                    return image_rgb
            
            elif "width" in frame_data and "height" in frame_data and "data" in frame_data:
                # Raw pixel data
                width = frame_data["width"]
                height = frame_data["height"]
                data = frame_data["data"]
                
                if isinstance(data, list):
                    data = np.array(data, dtype=np.uint8)
                
                if len(data) == width * height * 4:  # RGBA
                    image = data.reshape((height, width, 4))
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
                elif len(data) == width * height * 3:  # RGB
                    image_rgb = data.reshape((height, width, 3))
                else:
                    logger.error(f"Unexpected data length: {len(data)} for {width}x{height}")
                    return None
                
                return image_rgb
            
            return None
            
        except Exception as e:
            logger.error(f"Error decoding frame: {e}")
            return None

    async def _detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect faces in the image."""
        try:
            if MEDIAPIPE_AVAILABLE and self.face_detection:
                return await self._detect_faces_mediapipe(image)
            else:
                return await self._detect_faces_mock(image)
                
        except Exception as e:
            logger.error(f"Error detecting faces: {e}")
            return []

    async def _detect_faces_mediapipe(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect faces using MediaPipe."""
        try:
            # Scale down for faster processing
            height, width = image.shape[:2]
            scaled_width = int(width * self.process_scale)
            scaled_height = int(height * self.process_scale)
            scaled_image = cv2.resize(image, (scaled_width, scaled_height))
            
            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(scaled_image, cv2.COLOR_BGR2RGB)
            
            # Process image
            results = self.face_detection.process(rgb_image)
            
            faces = []
            if results.detections:
                for detection in results.detections[:self.max_faces]:
                    # Get bounding box
                    bbox = detection.location_data.relative_bounding_box
                    
                    # Scale back to original size
                    x = int(bbox.xmin * width)
                    y = int(bbox.ymin * height)
                    w = int(bbox.width * width)
                    h = int(bbox.height * height)
                    
                    # Add padding
                    padding_x = int(w * self.face_padding)
                    padding_y = int(h * self.face_padding)
                    
                    x = max(0, x - padding_x)
                    y = max(0, y - padding_y)
                    w = min(width - x, w + 2 * padding_x)
                    h = min(height - y, h + 2 * padding_y)
                    
                    faces.append({
                        'x': x,
                        'y': y,
                        'width': w,
                        'height': h,
                        'confidence': detection.score[0]
                    })
            
            return faces
            
        except Exception as e:
            logger.error(f"Error in MediaPipe face detection: {e}")
            return []

    async def _detect_faces_mock(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Mock face detection for testing."""
        try:
            # Generate mock face detection in center area
            height, width = image.shape[:2]
            
            # Assume face is in upper center portion (typical webcam position)
            face_width = int(width * 0.15)  # 15% of image width
            face_height = int(height * 0.2)  # 20% of image height
            
            face_x = int(width * 0.425)  # Center horizontally
            face_y = int(height * 0.15)   # Upper portion
            
            # Only return mock face 50% of the time to simulate detection variability
            import random
            if random.random() < 0.5:
                return [{
                    'x': face_x,
                    'y': face_y,
                    'width': face_width,
                    'height': face_height,
                    'confidence': 0.85
                }]
            
            return []
            
        except Exception as e:
            logger.error(f"Error in mock face detection: {e}")
            return []

    async def _blur_faces(self, image: np.ndarray, faces: List[Dict[str, Any]]) -> np.ndarray:
        """Apply blur to detected faces."""
        try:
            blurred_image = image.copy()
            
            for face in faces:
                x, y, w, h = face['x'], face['y'], face['width'], face['height']
                
                # Extract face region
                face_region = blurred_image[y:y+h, x:x+w]
                
                if face_region.size > 0:
                    # Apply Gaussian blur
                    blurred_face = cv2.GaussianBlur(face_region, (self.blur_strength, self.blur_strength), 0)
                    
                    # Replace face region with blurred version
                    blurred_image[y:y+h, x:x+w] = blurred_face
            
            return blurred_image
            
        except Exception as e:
            logger.error(f"Error blurring faces: {e}")
            return image

    async def _encode_frame(self, image: np.ndarray) -> str:
        """Encode processed image back to base64."""
        try:
            # Convert to PIL Image
            pil_image = Image.fromarray(image)
            
            # Encode to base64
            buffer = BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()
            
            # Convert to base64 string
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            
            return f"data:image/jpeg;base64,{image_b64}"
            
        except Exception as e:
            logger.error(f"Error encoding frame: {e}")
            return ""

    async def process_video_stream(self, frames: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple frames for privacy protection."""
        results = []
        
        for i, frame in enumerate(frames):
            try:
                result = await self.blur_faces_in_frame(frame)
                result['frame_index'] = i
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error processing frame {i}: {e}")
                results.append({
                    'success': False,
                    'frame_index': i,
                    'error': str(e)
                })
        
        return results

    async def get_privacy_settings(self) -> Dict[str, Any]:
        """Get current privacy settings."""
        return {
            'face_blur_enabled': True,
            'blur_strength': self.blur_strength,
            'detection_confidence': self.detection_confidence,
            'face_padding': self.face_padding,
            'max_faces': self.max_faces,
            'process_scale': self.process_scale,
            'mediapipe_available': MEDIAPIPE_AVAILABLE
        }

    async def update_privacy_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update privacy settings."""
        try:
            if 'blur_strength' in settings:
                # Ensure odd number for Gaussian blur
                blur_strength = int(settings['blur_strength'])
                self.blur_strength = blur_strength if blur_strength % 2 == 1 else blur_strength + 1
            
            if 'detection_confidence' in settings:
                self.detection_confidence = max(0.1, min(1.0, float(settings['detection_confidence'])))
            
            if 'face_padding' in settings:
                self.face_padding = max(0.0, min(1.0, float(settings['face_padding'])))
            
            if 'max_faces' in settings:
                self.max_faces = max(1, min(10, int(settings['max_faces'])))
            
            if 'process_scale' in settings:
                self.process_scale = max(0.1, min(1.0, float(settings['process_scale'])))
            
            # Reinitialize if detection confidence changed
            if 'detection_confidence' in settings and MEDIAPIPE_AVAILABLE:
                await self.initialize()
            
            return {
                'success': True,
                'updated_settings': await self.get_privacy_settings()
            }
            
        except Exception as e:
            logger.error(f"Error updating privacy settings: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def cleanup(self) -> None:
        """Cleanup resources."""
        try:
            if self.face_detection:
                self.face_detection.close()
            self.is_initialized = False
            logger.info("Face blur service cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up face blur service: {e}")

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        return {
            'is_initialized': self.is_initialized,
            'mediapipe_available': MEDIAPIPE_AVAILABLE,
            'current_settings': {
                'blur_strength': self.blur_strength,
                'detection_confidence': self.detection_confidence,
                'process_scale': self.process_scale,
                'max_faces': self.max_faces
            }
        }
