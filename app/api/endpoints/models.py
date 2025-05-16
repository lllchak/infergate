import logging
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.schemas.schemas import MLModel, MLModelCreate, Prediction, PredictionInput, ModelCostEstimate
from app.services.model_service import load_model

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/estimate-cost", response_model=ModelCostEstimate)
async def estimate_model_cost(
    *,
    model_file: UploadFile = File(...),
) -> Any:
    try:
        if not model_file.filename.endswith(('.joblib', '.pkl')):
            raise HTTPException(
                status_code=400,
                detail="Поддерживаются только файлы .joblib или .pkl"
            )

        contents = await model_file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Файл пуст"
            )

        try:
            _, cost = load_model(contents)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )

        return {"cost_per_prediction": round(cost, 3)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error estimating model cost: {str(e)}")

        raise HTTPException(
            status_code=400,
            detail="Не удалось оценить стоимость модели"
        )

@router.post("/", response_model=MLModel)
async def create_model(
    *,
    db: Session = Depends(deps.get_db),
    name: str = Form(...),
    description: str = Form(...),
    version: str = Form(...),
    model_file: UploadFile = File(...),
    model_type: str = Form(...),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if current_user.credits < 1:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно кредитов для публикации модели"
        )

    try:
        contents = await model_file.read()
        _, cost = load_model(contents)
        
        model_in = MLModelCreate(
            name=name,
            description=description,
            version=version,
            model_file=contents,
            model_type=model_type,
            cost_per_prediction=cost,
            owner_id=current_user.id
        )

        return crud.create_model(
            db=db,
            obj_in=model_in,
            user=current_user
        )
    except Exception as e:
        logger.error(f"Error creating model: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail="Не удалось создать модель"
        )

@router.get("/", response_model=List[MLModel])
def read_models(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return crud.get_multi(db, skip=skip, limit=limit)

@router.get("/{model_id}", response_model=MLModel)
def read_model(
    *,
    db: Session = Depends(deps.get_db),
    model_id: int,
) -> Any:
    model = crud.get_model(db=db, model_id=model_id)

    if not model:
        raise HTTPException(
            status_code=404,
            detail="Модель не найдена"
        )

    return model

@router.post("/{model_id}/predict", response_model=Prediction)
def make_prediction(
    *,
    db: Session = Depends(deps.get_db),
    model_id: int,
    input_data: PredictionInput,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    model = crud.get_model(db=db, model_id=model_id)

    if not model:
        raise HTTPException(
            status_code=404,
            detail="Модель не найдена"
        )

    if model.is_deleted:
        raise HTTPException(
            status_code=400,
            detail="Модель была удалена"
        )

    if current_user.credits < model.cost_per_prediction:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно кредитов для предсказания"
        )

    try:
        prediction = crud.make_prediction(
            db=db,
            model_id=model_id,
            input_data=input_data.input_data,
            user_id=current_user.id
        )

        return prediction
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")

        raise HTTPException(
            status_code=400,
            detail="Не удалось сделать предсказание"
        )

@router.delete("/{model_id}", response_model=MLModel)
def delete_model(
    *,
    db: Session = Depends(deps.get_db),
    model_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    model = crud.get_model(db=db, model_id=model_id, include_deleted=True)

    if not model:
        raise HTTPException(
            status_code=404,
            detail="Модель не найдена"
        )

    if model.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для удаления этой модели"
        )

    if model.is_deleted:
        raise HTTPException(
            status_code=400,
            detail="Модель уже удалена"
        )

    try:
        model.is_deleted = True
        model.is_active = False

        db.add(model)
        db.commit()
        db.refresh(model)

        return model
    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Не удалось удалить модель: {str(e)}"
        )
