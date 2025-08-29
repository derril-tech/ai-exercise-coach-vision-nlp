"""Configuration management for workers."""

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Environment
    debug: bool = False
    environment: str = "development"
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/ai_exercise_coach"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # NATS
    nats_url: str = "nats://localhost:4222"
    
    # Worker Ports
    pose_worker_port: int = 8001
    exercise_worker_port: int = 8002
    coach_worker_port: int = 8003
    nlp_worker_port: int = 8004
    program_worker_port: int = 8005
    metrics_worker_port: int = 8006
    export_worker_port: int = 8007
    
    # External APIs
    openai_api_key: Optional[str] = None
    google_cloud_project_id: Optional[str] = None
    
    # Model Paths
    pose_model_path: str = "models/pose_detection"
    exercise_model_path: str = "models/exercise_classification"
    
    # Performance
    max_concurrent_requests: int = 10
    request_timeout: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
