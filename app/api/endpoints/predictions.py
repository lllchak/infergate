import os
import io
import time
import joblib
from typing import Any, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

import pandas as pd
import numpy as np

from app.api import deps
from app.models.models import User
from app.schemas.schemas import (
    Prediction as PredictionSchema,
    PredictionCreate,
    PredictionUpdate,
    FilePredictionResult
)
from app.crud import crud_prediction, crud_model, crud_user
from app.services.storage_service import storage_service
from app.core.metrics import (
    PREDICTION_COUNTER,
    PREDICTION_LATENCY,
    MODEL_USAGE,
    PREDICTION_COST,
    USER_CREDITS,
    USER_CREDITS_HISTORY,
    MODEL_SUCCESS_RATE,
    SYSTEM_ERRORS,
    MODEL_LOAD_TIME
)

router = APIRouter()

@router.post("/", response_model=PredictionSchema)
def create_prediction(
    *,
    db: Session = Depends(deps.get_db),
    prediction_in: PredictionCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    model = crud_model.get(db, id=prediction_in.model_id)

    if not model:
        raise HTTPException(
            status_code=404,
            detail="Модель не найдена",
        )

    if current_user.credits < model.cost_per_prediction:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно кредитов для выполнения предсказания",
        )

    try:
        crud_user.update_credits(
            db=db,
            db_obj=current_user,
            credits=-model.cost_per_prediction,
        )

        model_load_start = time.time()

        try:
            model_data = storage_service.load_model(model.model_path)
            ml_model = joblib.load(io.BytesIO(model_data))
            model_load_time = time.time() - model_load_start

            MODEL_LOAD_TIME.labels(model_name=model.name).observe(model_load_time)
        except Exception as e:
            crud_user.update_credits(
                db=db,
                db_obj=current_user,
                credits=model.cost_per_prediction,
            )

            SYSTEM_ERRORS.labels(error_type="model_load_error").inc()

            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при загрузке модели: {str(e)}",
            )

        start_time = time.time()

        try:
            prediction_result = ml_model.predict(np.array(prediction_in.input_data).reshape(1, -1))

            prediction_update = PredictionUpdate(
                model_id=prediction_in.model_id,
                input_data=prediction_in.input_data,
                cost=model.cost_per_prediction,
                prediction_result=float(prediction_result[0])
            )

            prediction = crud_prediction.create(
                db=db,
                obj_in=prediction_in,
                obj_out=prediction_update,
                user=current_user,
                model=model,
            )

            latency = time.time() - start_time

            PREDICTION_LATENCY.labels(model_name=model.name).observe(latency)
            PREDICTION_COUNTER.labels(
                model_name=model.name,
                status="success",
                user_email=current_user.email
            ).inc()
            MODEL_USAGE.labels(model_name=model.name).inc()
            PREDICTION_COST.labels(
                model_name=model.name,
                user_email=current_user.email
            ).inc(model.cost_per_prediction)
            USER_CREDITS.labels(user_email=current_user.email).set(current_user.credits)
            USER_CREDITS_HISTORY.labels(
                user_email=current_user.email,
                operation="subtract"
            ).inc(model.cost_per_prediction)

            total_predictions = PREDICTION_COUNTER.labels(
                model_name=model.name,
                status="success",
                user_email=current_user.email
            )._value.get()

            total_errors = PREDICTION_COUNTER.labels(
                model_name=model.name,
                status="error",
                user_email=current_user.email
            )._value.get()

            if total_predictions + total_errors > 0:
                success_rate = total_predictions / (total_predictions + total_errors)
                MODEL_SUCCESS_RATE.labels(model_name=model.name).set(success_rate)

            return prediction

        except Exception as e:
            crud_user.update_credits(
                db=db,
                db_obj=current_user,
                credits=model.cost_per_prediction,
            )

            PREDICTION_COUNTER.labels(
                model_name=model.name,
                status="error",
                user_email=current_user.email
            ).inc()
            SYSTEM_ERRORS.labels(error_type="prediction_error").inc()

            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при выполнении предсказания: {str(e)}",
            )
    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при выполнении предсказания: {str(e)}",
        )

@router.get("/", response_model=List[PredictionSchema])
def read_predictions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    predictions = crud_prediction.get_multi_by_user(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )

    return predictions

@router.get("/{prediction_id}", response_model=PredictionSchema)
def read_prediction(
    *,
    db: Session = Depends(deps.get_db),
    prediction_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    prediction = crud_prediction.get(db=db, id=prediction_id)

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Предсказание не найдено",
        )

    if prediction.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для доступа к предсказанию",
        )

    return prediction

@router.post("/file", response_model=FilePredictionResult)
async def create_prediction_from_file(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    model_id: int = Form(...),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    model = crud_model.get(db, id=model_id)

    if not model:
        raise HTTPException(
            status_code=404,
            detail="Модель не найдена",
        )

    if current_user.credits < model.cost_per_prediction:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно кредитов для выполнения предсказания",
        )

    try:
        df = pd.read_csv(file.file)

        model_load_start = time.time()

        try:
            model_data = storage_service.load_model(model.model_path)
            ml_model = joblib.load(io.BytesIO(model_data))
            model_load_time = time.time() - model_load_start

            MODEL_LOAD_TIME.labels(model_name=model.name).observe(model_load_time)
        except Exception as e:
            SYSTEM_ERRORS.labels(error_type="model_load_error").inc()

            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при загрузке модели: {str(e)}",
            )

        start_time = time.time()

        try:
            predictions = ml_model.predict(df.values)

            predictions_list = predictions.tolist()

            df['prediction'] = predictions_list

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            result_filename = f"predictions_{timestamp}.csv"
            result_path = os.path.join("results", result_filename)

            input_filename = f"input_{timestamp}.csv"
            input_path = os.path.join("results", input_filename)

            os.makedirs("results", exist_ok=True)

            df.drop('prediction', axis=1).to_csv(input_path, index=False)

            df.to_csv(result_path, index=False)

            prediction_in = PredictionCreate(
                model_id=model_id,
                input_data=df.drop('prediction', axis=1).values.flatten().tolist(),
                cost=model.cost_per_prediction * len(predictions_list),
                user_id=current_user.id
            )

            prediction_update = PredictionUpdate(
                model_id=model_id,
                input_data=df.drop('prediction', axis=1).values.flatten().tolist(),
                cost=model.cost_per_prediction * len(predictions_list),
                prediction_result=predictions_list
            )

            _ = crud_prediction.create(
                db=db,
                obj_in=prediction_in,
                obj_out=prediction_update,
                user=current_user,
                model=model,
                input_file_path=input_path,
                result_file_path=result_path
            )

            crud_user.update_credits(
                db=db,
                db_obj=current_user,
                credits=-(model.cost_per_prediction * len(predictions_list)),
            )

            latency = time.time() - start_time

            PREDICTION_LATENCY.labels(model_name=model.name).observe(latency)
            PREDICTION_COUNTER.labels(
                model_name=model.name,
                status="success",
                user_email=current_user.email
            ).inc(len(predictions_list))
            MODEL_USAGE.labels(model_name=model.name).inc(len(predictions_list))
            PREDICTION_COST.labels(
                model_name=model.name,
                user_email=current_user.email
            ).inc(model.cost_per_prediction * len(predictions_list))
            USER_CREDITS.labels(user_email=current_user.email).set(current_user.credits)
            USER_CREDITS_HISTORY.labels(
                user_email=current_user.email,
                operation="subtract"
            ).inc(model.cost_per_prediction * len(predictions_list))

            return FilePredictionResult(
                predictions=predictions_list,
                file_path=result_path
            )

        except Exception as e:
            PREDICTION_COUNTER.labels(
                model_name=model.name,
                status="error",
                user_email=current_user.email
            ).inc()
            SYSTEM_ERRORS.labels(error_type="prediction_error").inc()

            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при выполнении предсказания: {str(e)}",
            )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при обработке файла: {str(e)}",
        )

@router.get("/file/{filename}")
async def download_prediction_file(filename: str) -> Any:
    file_path = os.path.join("results", filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Файл не найден",
        )

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/csv"
    )
