"""Export worker main entry point."""

import asyncio
import logging
from typing import Dict, Any
import base64

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn

from ..shared.config import get_settings
from ..shared.nats_client import NATSClient
from .export_service import ExportService, ExportRequest

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Export Worker",
    description="Workout data export service for PDF, CSV, and JSON formats",
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
export_service: ExportService = None
nats_client: NATSClient = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global export_service, nats_client
    
    settings = get_settings()
    
    # Initialize export service
    export_service = ExportService()
    
    # Initialize NATS client
    nats_client = NATSClient(settings.nats_url)
    await nats_client.connect()
    
    # Subscribe to export requests
    await nats_client.subscribe("export.request", handle_export_request)
    
    logger.info("Export worker started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global nats_client
    
    if nats_client:
        await nats_client.disconnect()
    
    logger.info("Export worker stopped")


async def handle_export_request(msg: Dict[str, Any]) -> None:
    """Handle export requests from NATS."""
    try:
        # Extract request data
        user_id = msg.get("user_id")
        session_ids = msg.get("session_ids", [])
        format_type = msg.get("format", "json")
        template = msg.get("template", "standard")
        request_id = msg.get("request_id")
        
        if not user_id or not session_ids:
            logger.error("Invalid export request: missing user_id or session_ids")
            return
        
        logger.info(f"Processing export request {request_id} for user {user_id}")
        
        # Create export request
        export_request = ExportRequest(
            user_id=user_id,
            session_ids=session_ids,
            format=format_type,
            template=template,
            include_charts=msg.get("include_charts", True),
            include_pose_data=msg.get("include_pose_data", False),
            custom_fields=msg.get("custom_fields", [])
        )
        
        # Validate request
        validation = await export_service.validate_export_request(export_request)
        if not validation['valid']:
            error_response = {
                "request_id": request_id,
                "user_id": user_id,
                "success": False,
                "errors": validation['errors'],
                "worker": "export-service"
            }
            await nats_client.publish("export.response", error_response)
            return
        
        # Generate export
        result = await export_service.generate_export(export_request)
        
        # Prepare response
        response = {
            "request_id": request_id,
            "user_id": user_id,
            "worker": "export-service",
            **result
        }
        
        # Encode binary data for NATS transmission
        if result.get('success') and 'data' in result:
            response['data_base64'] = base64.b64encode(result['data']).decode('utf-8')
            del response['data']  # Remove binary data
        
        # Publish response
        await nats_client.publish("export.response", response)
        
        logger.info(f"Export request {request_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Error handling export request: {e}")
        
        # Send error response
        error_response = {
            "request_id": msg.get("request_id"),
            "user_id": msg.get("user_id"),
            "success": False,
            "error": str(e),
            "worker": "export-service"
        }
        
        try:
            await nats_client.publish("export.response", error_response)
        except Exception as publish_error:
            logger.error(f"Failed to publish error response: {publish_error}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "export-worker",
        "version": "1.0.0",
        "supported_formats": ["pdf", "csv", "json"],
        "templates": list((await export_service.get_export_templates())["templates"].keys()) if export_service else []
    }


@app.post("/export")
async def create_export_endpoint(request_data: Dict[str, Any]):
    """HTTP endpoint for creating exports (for testing)."""
    try:
        # Create export request from HTTP data
        export_request = ExportRequest(
            user_id=request_data.get("user_id"),
            session_ids=request_data.get("session_ids", []),
            format=request_data.get("format", "json"),
            template=request_data.get("template", "standard"),
            include_charts=request_data.get("include_charts", True),
            include_pose_data=request_data.get("include_pose_data", False),
            custom_fields=request_data.get("custom_fields", [])
        )
        
        # Validate request
        validation = await export_service.validate_export_request(export_request)
        if not validation['valid']:
            raise HTTPException(status_code=400, detail=validation['errors'])
        
        # Generate export
        result = await export_service.generate_export(export_request)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error', 'Export failed'))
        
        # Return file as response
        return Response(
            content=result['data'],
            media_type=result['mime_type'],
            headers={
                "Content-Disposition": f"attachment; filename={result['filename']}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in export endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/templates")
async def get_templates_endpoint():
    """Get available export templates."""
    try:
        templates = await export_service.get_export_templates()
        return {"success": True, "templates": templates}
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/validate")
async def validate_request_endpoint(request_data: Dict[str, Any]):
    """Validate export request parameters."""
    try:
        export_request = ExportRequest(
            user_id=request_data.get("user_id"),
            session_ids=request_data.get("session_ids", []),
            format=request_data.get("format", "json"),
            template=request_data.get("template", "standard"),
            include_charts=request_data.get("include_charts", True),
            include_pose_data=request_data.get("include_pose_data", False),
            custom_fields=request_data.get("custom_fields", [])
        )
        
        validation = await export_service.validate_export_request(export_request)
        return {"success": True, "validation": validation}
        
    except Exception as e:
        logger.error(f"Error validating request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/formats")
async def get_supported_formats():
    """Get supported export formats."""
    return {
        "success": True,
        "formats": [
            {
                "name": "pdf",
                "description": "PDF report with charts and formatting",
                "mime_type": "application/pdf",
                "supports_charts": True
            },
            {
                "name": "csv",
                "description": "Comma-separated values for data analysis",
                "mime_type": "text/csv",
                "supports_charts": False
            },
            {
                "name": "json",
                "description": "JSON format for programmatic access",
                "mime_type": "application/json",
                "supports_charts": False
            }
        ]
    }


def main():
    """Main entry point."""
    settings = get_settings()
    uvicorn.run(
        "workers.export.main:app",
        host="0.0.0.0",
        port=settings.export_worker_port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )


if __name__ == "__main__":
    main()
