"""NLP worker main entry point."""

import asyncio
import logging
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ..shared.config import get_settings
from ..shared.nats_client import NATSClient
from .intent_parser import IntentParser

logger = logging.getLogger(__name__)

app = FastAPI(
    title="NLP Worker",
    description="Natural language processing for voice commands and intent parsing",
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
intent_parser: IntentParser = None
nats_client: NATSClient = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global intent_parser, nats_client
    
    settings = get_settings()
    
    # Initialize intent parser
    intent_parser = IntentParser()
    
    # Initialize NATS client
    nats_client = NATSClient(settings.nats_url)
    await nats_client.connect()
    
    # Subscribe to voice command events
    await nats_client.subscribe("voice.command", handle_voice_command)
    
    # Subscribe to NLP processing requests
    await nats_client.subscribe("nlp.process", handle_nlp_request)
    
    logger.info("NLP worker started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global nats_client
    
    if nats_client:
        await nats_client.disconnect()
    
    logger.info("NLP worker stopped")


async def handle_voice_command(msg: Dict[str, Any]) -> None:
    """Handle voice command processing."""
    try:
        # Extract command data
        command_text = msg.get("command", "")
        session_id = msg.get("session_id")
        timestamp = msg.get("timestamp", 0)
        confidence = msg.get("confidence", 0.0)
        
        if not command_text:
            logger.warning("No command text in voice command message")
            return
        
        logger.info(f"Processing voice command: '{command_text}' (confidence: {confidence})")
        
        # Parse intent
        intent = await intent_parser.parse_intent(command_text, timestamp)
        
        # Get session context (mock for now)
        context = {
            "session_id": session_id,
            "rep_count": msg.get("rep_count", 0),
            "current_exercise": msg.get("current_exercise"),
            "is_paused": msg.get("is_paused", False),
        }
        
        # Generate response
        response = await intent_parser.generate_response(intent, context)
        
        # Add metadata
        response.update({
            "session_id": session_id,
            "original_command": command_text,
            "original_confidence": confidence,
            "worker": "nlp-processor"
        })
        
        # Publish intent result
        await nats_client.publish("nlp.intent", response)
        
        # Publish specific action if needed
        action = response.get("action")
        if action and action != "unknown_command":
            action_msg = {
                "session_id": session_id,
                "action": action,
                "intent": intent.type.value,
                "confidence": intent.confidence,
                "entities": intent.entities,
                "timestamp": timestamp,
                "worker": "nlp-processor"
            }
            await nats_client.publish(f"action.{action}", action_msg)
        
        # Generate coaching cue if appropriate
        if response.get("tts"):
            cue_msg = {
                "session_id": session_id,
                "type": "instruction",
                "priority": 6,
                "message": response.get("message", ""),
                "tts_text": response.get("tts", ""),
                "timestamp": timestamp,
                "source": "voice_command",
                "worker": "nlp-processor"
            }
            await nats_client.publish("coaching.cue", cue_msg)
        
    except Exception as e:
        logger.error(f"Error processing voice command: {e}")


async def handle_nlp_request(msg: Dict[str, Any]) -> None:
    """Handle general NLP processing requests."""
    try:
        request_type = msg.get("type", "intent_parsing")
        text = msg.get("text", "")
        session_id = msg.get("session_id")
        
        if request_type == "intent_parsing":
            intent = await intent_parser.parse_intent(text, msg.get("timestamp", 0))
            
            response = {
                "session_id": session_id,
                "request_type": request_type,
                "intent": {
                    "type": intent.type.value,
                    "confidence": intent.confidence,
                    "entities": intent.entities,
                },
                "original_text": text,
                "worker": "nlp-processor"
            }
            
            await nats_client.publish("nlp.response", response)
        
        elif request_type == "text_substitution":
            # Handle text substitution/correction
            corrected_text = await correct_exercise_terms(text)
            
            response = {
                "session_id": session_id,
                "request_type": request_type,
                "original_text": text,
                "corrected_text": corrected_text,
                "worker": "nlp-processor"
            }
            
            await nats_client.publish("nlp.response", response)
        
    except Exception as e:
        logger.error(f"Error processing NLP request: {e}")


async def correct_exercise_terms(text: str) -> str:
    """Correct common exercise term mistakes."""
    corrections = {
        # Common mispronunciations/misspellings
        "pushup": "push-up",
        "pushups": "push-ups",
        "press up": "push-up",
        "press ups": "push-ups",
        "squat": "squats",
        "lunge": "lunges",
        "plank": "planks",
        "jumping jack": "jumping-jacks",
        "star jump": "jumping-jacks",
        "star jumps": "jumping-jacks",
        
        # Form cues
        "strait": "straight",
        "aline": "align",
        "bended": "bent",
        "lowwer": "lower",
    }
    
    corrected = text.lower()
    for mistake, correction in corrections.items():
        corrected = corrected.replace(mistake, correction)
    
    return corrected


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "nlp-worker",
        "version": "1.0.0",
        "supported_commands": intent_parser.get_supported_commands() if intent_parser else []
    }


@app.post("/parse")
async def parse_intent_endpoint(data: Dict[str, Any]):
    """HTTP endpoint for intent parsing (for testing)."""
    try:
        text = data.get("text", "")
        timestamp = data.get("timestamp", 0)
        
        intent = await intent_parser.parse_intent(text, timestamp)
        
        return {
            "success": True,
            "intent": {
                "type": intent.type.value,
                "confidence": intent.confidence,
                "entities": intent.entities,
                "original_text": intent.original_text,
                "timestamp": intent.timestamp,
            }
        }
    except Exception as e:
        logger.error(f"Error in parse endpoint: {e}")
        return {"success": False, "error": str(e)}


@app.post("/respond")
async def generate_response_endpoint(data: Dict[str, Any]):
    """HTTP endpoint for response generation (for testing)."""
    try:
        text = data.get("text", "")
        context = data.get("context", {})
        
        intent = await intent_parser.parse_intent(text)
        response = await intent_parser.generate_response(intent, context)
        
        return {"success": True, "response": response}
    except Exception as e:
        logger.error(f"Error in respond endpoint: {e}")
        return {"success": False, "error": str(e)}


@app.get("/commands")
async def get_commands_endpoint():
    """Get supported voice commands."""
    try:
        return {
            "success": True,
            "commands": intent_parser.get_supported_commands()
        }
    except Exception as e:
        logger.error(f"Error getting commands: {e}")
        return {"success": False, "error": str(e)}


def main():
    """Main entry point."""
    settings = get_settings()
    uvicorn.run(
        "workers.nlp.main:app",
        host="0.0.0.0",
        port=settings.nlp_worker_port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )


if __name__ == "__main__":
    main()
