from pathlib import Path
from typing import Any, Dict, Optional

from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, validator

import secrets

class Settings(BaseSettings):
    PROJECT_NAME: str = "ML Billing Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    MODEL_TYPE_CLASSIFICATION: str = "classification"
    MODEL_TYPE_REGRESSION: str = "regression"
    MODEL_TYPES: list = [MODEL_TYPE_CLASSIFICATION, MODEL_TYPE_REGRESSION]

    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v

        return f"postgresql://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}/{values.get('POSTGRES_DB')}"

    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "ml-models"

    BASE_DIR: Path = Path(__file__).resolve().parent.parent

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
