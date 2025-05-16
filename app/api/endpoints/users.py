from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app import crud
from app.api import deps
from app.core.security import get_password_hash
from app.models.models import User
from app.schemas.schemas import User as UserSchema
from app.schemas.schemas import UserCreate, CreditUpdate, UserUpdate

router = APIRouter()

@router.post("/", response_model=UserSchema)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    user = db.query(User).filter(User.email == user_in.email).first()

    if user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже существует",
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Получение информации о текущем пользователе.
    """
    return current_user

@router.put("/me/credits", response_model=UserSchema)
def update_user_credits(
    *,
    db: Session = Depends(deps.get_db),
    credit_update: CreditUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if credit_update.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сумма пополнения должна быть положительной"
        )

    credit_update.amount = round(credit_update.amount, 1)

    user = crud.update_user_credits(
        db=db,
        db_obj=current_user,
        credits=credit_update.amount
    )

    return user

@router.put("/me", response_model=UserSchema)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Обновление информации о текущем пользователе.
    """
    if user_in.email and user_in.email != current_user.email:
        # Проверяем, не занят ли email другим пользователем
        user = db.query(User).filter(User.email == user_in.email).first()
        if user:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким email уже существует",
            )
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name

    if user_in.password:
        current_user.hashed_password = get_password_hash(user_in.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
