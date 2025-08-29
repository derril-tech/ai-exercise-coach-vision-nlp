"""NATS client for inter-service communication."""

import asyncio
import json
import logging
from typing import Any, Callable, Dict, Optional

import nats
from nats.aio.client import Client as NATS

logger = logging.getLogger(__name__)


class NATSClient:
    """NATS client wrapper for pub/sub messaging."""
    
    def __init__(self, nats_url: str):
        self.nats_url = nats_url
        self.nc: Optional[NATS] = None
        self.subscriptions: Dict[str, Any] = {}
    
    async def connect(self) -> None:
        """Connect to NATS server."""
        try:
            self.nc = await nats.connect(self.nats_url)
            logger.info(f"Connected to NATS at {self.nats_url}")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from NATS server."""
        if self.nc:
            await self.nc.close()
            logger.info("Disconnected from NATS")
    
    async def publish(self, subject: str, data: Dict[str, Any]) -> None:
        """Publish message to a subject."""
        if not self.nc:
            raise RuntimeError("NATS client not connected")
        
        try:
            message = json.dumps(data).encode()
            await self.nc.publish(subject, message)
            logger.debug(f"Published message to {subject}")
        except Exception as e:
            logger.error(f"Failed to publish to {subject}: {e}")
            raise
    
    async def subscribe(self, subject: str, handler: Callable) -> None:
        """Subscribe to a subject with a handler function."""
        if not self.nc:
            raise RuntimeError("NATS client not connected")
        
        async def message_handler(msg):
            try:
                data = json.loads(msg.data.decode())
                await handler(data)
            except Exception as e:
                logger.error(f"Error handling message from {subject}: {e}")
        
        try:
            sub = await self.nc.subscribe(subject, cb=message_handler)
            self.subscriptions[subject] = sub
            logger.info(f"Subscribed to {subject}")
        except Exception as e:
            logger.error(f"Failed to subscribe to {subject}: {e}")
            raise
    
    async def request(self, subject: str, data: Dict[str, Any], timeout: float = 5.0) -> Dict[str, Any]:
        """Send a request and wait for response."""
        if not self.nc:
            raise RuntimeError("NATS client not connected")
        
        try:
            message = json.dumps(data).encode()
            response = await self.nc.request(subject, message, timeout=timeout)
            return json.loads(response.data.decode())
        except Exception as e:
            logger.error(f"Request to {subject} failed: {e}")
            raise
    
    async def unsubscribe(self, subject: str) -> None:
        """Unsubscribe from a subject."""
        if subject in self.subscriptions:
            await self.subscriptions[subject].unsubscribe()
            del self.subscriptions[subject]
            logger.info(f"Unsubscribed from {subject}")
    
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self.nc is not None and self.nc.is_connected
