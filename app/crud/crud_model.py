from typing import List, Optional

from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.models import MLModel, User
from app.schemas.schemas import MLModelCreate, MLModelUpdate
from app.services.model_service import save_model, load_model

class CRUDModel(CRUDBase[MLModel, MLModelCreate, MLModelUpdate]):
    def get(self, db: Session, id: int, include_deleted: bool = False) -> Optional[MLModel]:
        query = db.query(MLModel).filter(MLModel.id == id)

        if not include_deleted:
            query = query.filter(MLModel.is_deleted == False)

        return query.first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[MLModel]:
        return (
            db.query(MLModel)
            .filter(MLModel.is_deleted == False)
            .filter(MLModel.is_active == True)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, *, obj_in: MLModelCreate, user: User) -> MLModel:
        try:
            model_path = save_model(
                model_data=obj_in.model_file,
                user=user,
                model_name=obj_in.name,
                version=obj_in.version
            )

            _, cost = load_model(obj_in.model_file)

            db_obj = MLModel(
                name=obj_in.name,
                description=obj_in.description,
                version=obj_in.version,
                owner_id=user.id,
                model_path=model_path,
                model_type=obj_in.model_type,
                cost_per_prediction=cost,
                is_active=True,
                is_deleted=False,
            )

            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)

            return db_obj
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при создании модели: {str(e)}"
            )

    def update(
        self, db: Session, *, db_obj: MLModel, obj_in: MLModelUpdate
    ) -> MLModel:
        return super().update(db, db_obj=db_obj, obj_in=obj_in.dict(exclude_unset=True))

    def get_by_owner(
        self, db: Session, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[MLModel]:
        return (
            db.query(MLModel)
            .filter(MLModel.owner_id == owner_id)
            .filter(MLModel.is_deleted == False)
            .offset(skip)
            .limit(limit)
            .all()
        )

crud_model = CRUDModel(MLModel)

def create_model(
    db: Session,
    *,
    obj_in: MLModelCreate,
    user: User
) -> MLModel:
    try:
        model_path = save_model(
            model_data=obj_in.model_file,
            user=user,
            model_name=obj_in.name,
            version=obj_in.version
        )

        db_obj = MLModel(
            name=obj_in.name,
            description=obj_in.description,
            version=obj_in.version,
            owner_id=user.id,
            model_path=model_path,
            model_type=obj_in.model_type,
            cost_per_prediction=round(obj_in.cost_per_prediction, 3),
            is_active=True,
            is_deleted=False
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось создать модель: {str(e)}"
        )

def get_model(
    db: Session,
    model_id: int,
    include_deleted: bool = False
) -> Optional[MLModel]:
    query = db.query(MLModel).filter(MLModel.id == model_id)

    if not include_deleted:
        query = query.filter(MLModel.is_deleted == False)

    return query.first()

def get_multi(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100
) -> List[MLModel]:
    return (
        db.query(MLModel)
        .filter(MLModel.is_deleted == False)
        .filter(MLModel.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )

def update_model(
    db: Session,
    *,
    db_obj: MLModel,
    obj_in: MLModelUpdate
) -> MLModel:
    update_data = obj_in.dict(exclude_unset=True)

    for field in update_data:
        setattr(db_obj, field, update_data[field])

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return db_obj
