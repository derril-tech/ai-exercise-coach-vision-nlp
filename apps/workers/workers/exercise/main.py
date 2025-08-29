"""Exercise classification worker main entry point."""

import asyncio
import logging
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ..shared.config import get_settings
from ..shared.nats_client import NATSClient
from .exercise_classifier import ExerciseClassifier, PoseData, PoseKeypoint

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Exercise Classification Worker",
    description="Exercise detection, rep counting, and form analysis",
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
exercise_classifier: ExerciseClassifier = None
nats_client: NATSClient = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global exercise_classifier, nats_client
    
    settings = get_settings()
    
    # Initialize exercise classifier
    exercise_classifier = ExerciseClassifier()
    
    # Initialize NATS client
    nats_client = NATSClient(settings.nats_url)
    await nats_client.connect()
    
    # Subscribe to pose results from pose detection worker
    await nats_client.subscribe("pose.result", handle_pose_result)
    
    # Subscribe to exercise control commands
    await nats_client.subscribe("exercise.control", handle_exercise_control)
    
    logger.info("Exercise classification worker started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global nats_client
    
    if nats_client:
        await nats_client.disconnect()
    
    logger.info("Exercise classification worker stopped")


async def handle_pose_result(msg: Dict[str, Any]) -> None:
    """Handle pose detection results from pose worker."""
    try:
        # Extract pose data from message
        pose_data_dict = msg.get("pose_data")
        session_id = msg.get("session_id")
        timestamp = msg.get("timestamp", 0)
        
        if not pose_data_dict:
            logger.warning("No pose data in message")
            return
        
        # Convert to PoseData object
        pose_data = await convert_pose_data(pose_data_dict, timestamp)
        
        # Process with exercise classifier
        result = await exercise_classifier.process_pose(pose_data)
        
        # Add session context
        result["session_id"] = session_id
        result["worker"] = "exercise-classifier"
        
        # Publish exercise analysis results
        await nats_client.publish("exercise.analysis", result)
        
        # If rep completed, publish rep event
        if result.get("rep_completed"):
            rep_event = {
                "session_id": session_id,
                "exercise_type": result.get("exercise_type"),
                "rep_count": result.get("rep_count"),
                "metrics": result.get("metrics"),
                "timestamp": timestamp,
                "worker": "exercise-classifier"
            }
            await nats_client.publish("exercise.rep_completed", rep_event)
        
        # Publish form feedback if available
        form_feedback = result.get("form_feedback", [])
        if form_feedback:
            feedback_event = {
                "session_id": session_id,
                "exercise_type": result.get("exercise_type"),
                "feedback": form_feedback,
                "priority": "form",
                "timestamp": timestamp,
                "worker": "exercise-classifier"
            }
            await nats_client.publish("coaching.feedback", feedback_event)
        
    except Exception as e:
        logger.error(f"Error processing pose result: {e}")


async def handle_exercise_control(msg: Dict[str, Any]) -> None:
    """Handle exercise control commands."""
    try:
        command = msg.get("command")
        session_id = msg.get("session_id")
        
        if command == "reset":
            exercise_classifier.reset()
            logger.info(f"Reset exercise classifier for session {session_id}")
        
        elif command == "set_exercise":
            exercise_type = msg.get("exercise_type")
            # TODO: Implement manual exercise type setting
            logger.info(f"Set exercise type to {exercise_type} for session {session_id}")
        
        # Acknowledge command
        response = {
            "session_id": session_id,
            "command": command,
            "status": "completed",
            "timestamp": msg.get("timestamp"),
            "worker": "exercise-classifier"
        }
        await nats_client.publish("exercise.control_response", response)
        
    except Exception as e:
        logger.error(f"Error handling exercise control: {e}")


async def convert_pose_data(pose_data_dict: Dict[str, Any], timestamp: float) -> PoseData:
    """Convert pose data dictionary to PoseData object."""
    keypoints = {}
    
    # Convert keypoints
    keypoints_dict = pose_data_dict.get("keypoints", {})
    for name, point_data in keypoints_dict.items():
        keypoints[name] = PoseKeypoint(
            x=point_data.get("x", 0.0),
            y=point_data.get("y", 0.0),
            z=point_data.get("z", 0.0),
            visibility=point_data.get("visibility", 1.0)
        )
    
    return PoseData(
        keypoints=keypoints,
        confidence=pose_data_dict.get("confidence", 0.0),
        timestamp=timestamp
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "exercise-classification-worker",
        "version": "1.0.0",
        "classifier_state": {
            "current_exercise": exercise_classifier.current_exercise.value if exercise_classifier.current_exercise else None,
            "rep_count": exercise_classifier.rep_count,
            "current_phase": exercise_classifier.current_phase.value,
        } if exercise_classifier else None
    }


@app.post("/analyze")
async def analyze_pose_endpoint(pose_data: Dict[str, Any]):
    """HTTP endpoint for pose analysis (for testing)."""
    try:
        # Convert input to PoseData
        timestamp = pose_data.get("timestamp", 0)
        pose_obj = await convert_pose_data(pose_data, timestamp)
        
        # Process with classifier
        result = await exercise_classifier.process_pose(pose_obj)
        
        return {"success": True, "analysis": result}
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {e}")
        return {"success": False, "error": str(e)}


@app.post("/reset")
async def reset_classifier_endpoint():
    """HTTP endpoint to reset classifier state."""
    try:
        exercise_classifier.reset()
        return {"success": True, "message": "Classifier reset"}
    except Exception as e:
        logger.error(f"Error resetting classifier: {e}")
        return {"success": False, "error": str(e)}


@app.get("/stats")
async def get_stats_endpoint():
    """Get classifier statistics."""
    try:
        return {
            "success": True,
            "stats": {
                "current_exercise": exercise_classifier.current_exercise.value if exercise_classifier.current_exercise else None,
                "rep_count": exercise_classifier.rep_count,
                "current_phase": exercise_classifier.current_phase.value,
                "total_reps_history": len(exercise_classifier.rep_history),
                "pose_history_length": len(exercise_classifier.pose_history),
                "recent_rep_metrics": [
                    {
                        "rep_number": rep.rep_number,
                        "duration": rep.duration,
                        "form_score": rep.form_score,
                        "tempo_score": rep.tempo_score,
                        "rom_score": rep.rom_score,
                    }
                    for rep in exercise_classifier.rep_history[-5:]  # Last 5 reps
                ]
            }
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {"success": False, "error": str(e)}


def main():
    """Main entry point."""
    settings = get_settings()
    uvicorn.run(
        "workers.exercise.main:app",
        host="0.0.0.0",
        port=settings.exercise_worker_port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )


if __name__ == "__main__":
    main()
