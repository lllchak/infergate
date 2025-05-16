from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.crud.base import CRUDBase
from app.models.models import User
from app.schemas.schemas import UserCreate, UserUpdate
from app.core.security import get_password_hash

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        try:
            db_obj = User(
                email=obj_in.email,
                hashed_password=get_password_hash(obj_in.password),
                full_name=obj_in.full_name,
                credits=0,
            )

            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)

            return db_obj
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при создании пользователя: {str(e)}"
            )

    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def update_credits(
        self,
        db: Session,
        *,
        db_obj: User,
        credits: float
    ) -> User:
        try:
            if credits < 0 and abs(credits) > db_obj.credits:
                raise HTTPException(
                    status_code=400,
                    detail="Недостаточно кредитов для выполнения операции"
                )

            db_obj.credits = round(db_obj.credits + credits, 1)

            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)

            return db_obj
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при обновлении кредитов: {str(e)}"
            )

crud_user = CRUDUser(User)

def create_user(db: Session, user: UserCreate) -> User:
    try:
        db_user = User(
            email=user.email,
            hashed_password=get_password_hash(user.password),
            full_name=user.full_name,
            credits=0,
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при создании пользователя: {str(e)}"
        )

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def update_user_credits(
    db: Session,
    *,
    db_obj: User,
    credits: float
) -> User:
    try:
        if credits < 0 and abs(credits) > db_obj.credits:
            raise HTTPException(
                status_code=400,
                detail="Недостаточно кредитов для выполнения операции"
            )

        db_obj.credits = round(db_obj.credits + credits, 1)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при обновлении кредитов: {str(e)}"
        )
