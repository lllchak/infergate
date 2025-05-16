import os
import sys
import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db.base import Base
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="session")
def mock_storage_service():
    mock = MagicMock()
    mock.load_model.return_value = b"mock_model_data"
    return mock

@pytest.fixture(scope="session")
def mock_model_service():
    mock = MagicMock()
    mock.load_model.return_value = (MagicMock(), 0.1)
    return mock

@pytest.fixture(autouse=True)
def setup_mocks(monkeypatch, mock_storage_service, mock_model_service):
    monkeypatch.setattr("app.services.storage_service.storage_service", mock_storage_service)
    monkeypatch.setattr("app.services.model_service.load_model", mock_model_service.load_model)
