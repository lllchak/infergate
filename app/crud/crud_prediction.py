from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.crud.base import CRUDBase
from app.models.models import Prediction, User, MLModel
from app.schemas.schemas import PredictionCreate, PredictionUpdate

class CRUDPrediction(CRUDBase[Prediction, PredictionCreate, PredictionUpdate]):
    def create(
        self,
        db: Session,
        *,
        obj_in: PredictionCreate,
        obj_out: PredictionUpdate,
        user: User,
        model: MLModel,
        input_file_path: Optional[str] = None,
        result_file_path: Optional[str] = None
    ) -> Prediction:
        try:
            input_data = obj_in.input_data

            prediction_result = obj_out.prediction_result
            if not isinstance(prediction_result, list):
                prediction_result = [prediction_result]

            prediction = Prediction(
                user_id=user.id,
                model_id=model.id,
                input_data=input_data,
                prediction_result=prediction_result,
                cost=model.cost_per_prediction,
                input_file_path=input_file_path,
                result_file_path=result_file_path
            )

            db.add(prediction)
            db.commit()
            db.refresh(prediction)

            return prediction
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при создании предсказания: {str(e)}"
            )

    def get_multi_by_user(
        self,
        db: Session,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Prediction]:
        return (
            db.query(Prediction)
            .filter(Prediction.user_id == user_id)
            .order_by(Prediction.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

crud_prediction = CRUDPrediction(Prediction)

def create_prediction(
    db: Session,
    *,
    obj_in: PredictionCreate,
    obj_out: PredictionUpdate,
    user: User,
    model: MLModel
) -> Prediction:
    try:
        input_data = obj_in.input_data

        prediction_result = obj_out.prediction_result
        if not isinstance(prediction_result, list):
            prediction_result = [prediction_result]

        prediction = Prediction(
            user_id=user.id,
            model_id=model.id,
            input_data=input_data,
            prediction_result=prediction_result,
            cost=model.cost_per_prediction
        )

        db.add(prediction)
        db.commit()
        db.refresh(prediction)

        return prediction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при создании предсказания: {str(e)}"
        )

def get_prediction(
    db: Session,
    prediction_id: int
) -> Optional[Prediction]:
    return db.query(Prediction).filter(Prediction.id == prediction_id).first()

def get_user_predictions(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Prediction]:
    return (
        db.query(Prediction)
        .filter(Prediction.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_multi_by_user(
    db: Session,
    *,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Prediction]:
    return (
        db.query(Prediction)
        .filter(Prediction.user_id == user_id)
        .order_by(Prediction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
