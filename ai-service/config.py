"""
Configuration management for AI Service
"""

import os
from typing import Optional

class Config:
    """Configuration class for AI Service"""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"
    
    # Server configuration
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Model configuration
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/anomaly_model.joblib")
    
    # Drift detection configuration
    DRIFT_WINDOW_SIZE: int = int(os.getenv("DRIFT_WINDOW_SIZE", "30"))
    DRIFT_THRESHOLD: float = float(os.getenv("DRIFT_THRESHOLD", "0.05"))
    
    # CORS configuration
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # Health check configuration
    HEALTH_CHECK_INTERVAL: int = int(os.getenv("HEALTH_CHECK_INTERVAL", "30"))
    HEALTH_CHECK_TIMEOUT: int = int(os.getenv("HEALTH_CHECK_TIMEOUT", "10"))
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production environment"""
        return cls.ENVIRONMENT == "production"
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development environment"""
        return cls.ENVIRONMENT == "development"
    
    @classmethod
    def get_cors_origins(cls) -> list:
        """Get CORS origins based on environment"""
        if cls.is_development():
            return ["*"]
        return cls.CORS_ORIGINS

# Global config instance
config = Config() 