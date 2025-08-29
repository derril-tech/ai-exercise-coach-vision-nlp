"""Pose detection worker main entry point."""

import asyncio
import logging
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ..shared.config import get_settings
from ..shared.nats_client import NATSClient
from .pose_detector import PoseDetector

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pose Detection Worker",
    description="Real-time pose detection and analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
pose_detector: PoseDetector = None
nats_client: NATSClient = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global pose_detector, nats_client
    
    settings = get_settings()
    
    # Initialize pose detector
    pose_detector = PoseDetector()
    await pose_detector.initialize()
    
    # Initialize NATS client
    nats_client = NATSClient(settings.nats_url)
    await nats_client.connect()
    
    # Subscribe to pose detection requests
    await nats_client.subscribe("pose.detect", handle_pose_detection)
    
    logger.info("Pose detection worker started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global pose_detector, nats_client
    
    if pose_detector:
        await pose_detector.cleanup()
    
    if nats_client:
        await nats_client.disconnect()
    
    logger.info("Pose detection worker stopped")


async def handle_pose_detection(msg: Dict[str, Any]) -> None:
    """Handle pose detection requests from NATS."""
    try:
        # Extract frame data from message
        frame_data = msg.get("frame_data")
        session_id = msg.get("session_id")
        timestamp = msg.get("timestamp")
        
        if not frame_data:
            logger.warning("No frame data in pose detection request")
            return
        
        # Process pose detection
        result = await pose_detector.detect_pose(frame_data)
        
        # Publish results
        response = {
            "session_id": session_id,
            "timestamp": timestamp,
            "pose_data": result,
            "worker": "pose-detector"
        }
        
        await nats_client.publish("pose.result", response)
        
    except Exception as e:
        logger.error(f"Error processing pose detection: {e}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "pose-detection-worker",
        "version": "1.0.0"
    }


@app.post("/detect")
async def detect_pose_endpoint(frame_data: Dict[str, Any]):
    """HTTP endpoint for pose detection (for testing)."""
    try:
        result = await pose_detector.detect_pose(frame_data)
        return {"success": True, "pose_data": result}
    except Exception as e:
        logger.error(f"Error in pose detection endpoint: {e}")
        return {"success": False, "error": str(e)}


def main():
    """Main entry point."""
    settings = get_settings()
    uvicorn.run(
        "workers.pose.main:app",
        host="0.0.0.0",
        port=settings.pose_worker_port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )


if __name__ == "__main__":
    main()
