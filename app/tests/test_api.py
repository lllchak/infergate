import io
import joblib

import pytest

from fastapi.testclient import TestClient

from sqlalchemy.orm import Session

import numpy as np

from app.main import app
from app.db.session import SessionLocal
from app.core.config import settings
from app.models.models import User
from app.core.security import get_password_hash

client = TestClient(app)

def get_test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def db():
    return next(get_test_db())

@pytest.fixture
def test_user(db: Session):
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
        full_name="Test User",
        credits=100.0
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@pytest.fixture
def test_user_token(test_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "testpassword"}
    )

    return response.json()["access_token"]

@pytest.fixture
def test_model_file():
    model = np.array([1.0, 2.0, 3.0])
    buffer = io.BytesIO()

    joblib.dump(model, buffer)

    buffer.seek(0)

    return buffer

def test_create_user():
    response = client.post(
        "/api/v1/users/",
        json={
            "email": "newuser@example.com",
            "password": "newpassword",
            "full_name": "New User"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data

def test_login():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "testpassword"}
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_read_user_me(test_user_token):
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == "test@example.com"

def test_update_user_credits(test_user_token):
    response = client.put(
        "/api/v1/users/me/credits",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"amount": 50.0}
    )

    assert response.status_code == 200

    data = response.json()

    assert data["credits"] == 150.0

def test_create_model(test_user_token, test_model_file):
    response = client.post(
        "/api/v1/models/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"model_file": ("model.joblib", test_model_file, "application/octet-stream")},
        data={
            "name": "Test Model",
            "description": "Test Description",
            "version": "1.0",
            "model_type": "regression"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "Test Model"
    assert data["description"] == "Test Description"
    assert data["version"] == "1.0"

def test_read_models(test_user_token):
    response = client.get(
        "/api/v1/models/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_make_prediction(test_user_token, test_model_file):
    model_response = client.post(
        "/api/v1/models/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"model_file": ("model.joblib", test_model_file, "application/octet-stream")},
        data={
            "name": "Test Model",
            "description": "Test Description",
            "version": "1.0",
            "model_type": "regression"
        }
    )

    model_id = model_response.json()["id"]

    response = client.post(
        f"/api/v1/models/{model_id}/predict",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"input_data": [1.0, 2.0, 3.0]}
    )

    assert response.status_code == 200

    data = response.json()

    assert "prediction_result" in data

def test_read_predictions(test_user_token):
    response = client.get(
        "/api/v1/predictions/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_prediction_from_file(test_user_token, test_model_file):
    model_response = client.post(
        "/api/v1/models/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"model_file": ("model.joblib", test_model_file, "application/octet-stream")},
        data={
            "name": "Test Model",
            "description": "Test Description",
            "version": "1.0",
            "model_type": "regression"
        }
    )

    model_id = model_response.json()["id"]

    csv_content = "feature1,feature2,feature3\n1.0,2.0,3.0\n4.0,5.0,6.0"
    csv_file = io.BytesIO(csv_content.encode())

    response = client.post(
        "/api/v1/predictions/file",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"file": ("test.csv", csv_file, "text/csv")},
        data={"model_id": model_id}
    )

    assert response.status_code == 200

    data = response.json()

    assert "predictions" in data
    assert "file_path" in data

def test_estimate_model_cost(test_user_token, test_model_file):
    response = client.post(
        "/api/v1/models/estimate-cost",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"model_file": ("model.joblib", test_model_file, "application/octet-stream")}
    )

    assert response.status_code == 200

    data = response.json()

    assert "cost_per_prediction" in data
    assert isinstance(data["cost_per_prediction"], float)

def test_delete_model(test_user_token, test_model_file):
    model_response = client.post(
        "/api/v1/models/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        files={"model_file": ("model.joblib", test_model_file, "application/octet-stream")},
        data={
            "name": "Test Model",
            "description": "Test Description",
            "version": "1.0",
            "model_type": "regression"
        }
    )

    model_id = model_response.json()["id"]

    response = client.delete(
        f"/api/v1/models/{model_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200

    data = response.json()

    assert data["is_deleted"] == True
    assert data["is_active"] == False
