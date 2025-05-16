import os
import io
import joblib
from typing import Tuple, Any, List

import numpy as np

from fastapi import HTTPException

from app.core.config import settings
from app.models.models import User
from app.services.storage_service import storage_service

MODELS_DIR = os.path.join(settings.BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def save_model(model_data: bytes, user: User, model_name: str, version: str) -> str:
    try:
        object_name = f"models/{user.id}/{model_name}_{version}.joblib"

        storage_service.save_model(
            model_data=model_data,
            user_id=user.id,
            model_name=model_name,
            version=version
        )

        return object_name
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при сохранении модели: {str(e)}"
        )

def load_model(model_data: bytes) -> Tuple[Any, float]:
    try:
        model = joblib.load(io.BytesIO(model_data))

        if not hasattr(model, 'predict'):
            raise HTTPException(
                status_code=400,
                detail="Неподдерживаемый тип модели. Модель должна иметь метод predict"
            )

        model_size = len(model_data)
        cost = max(0.1, model_size / (1024 * 1024))

        return model, cost
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при загрузке модели: {str(e)}"
        )

def make_prediction(model: Any, input_data: List[float]) -> dict:
    try:
        X = np.array(input_data).reshape(1, -1)
        prediction = model.predict(X)[0]

        result = {"prediction": float(prediction)}
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(X)[0]
            result["probabilities"] = probabilities.tolist()
            
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при выполнении предсказания: {str(e)}"
        )
