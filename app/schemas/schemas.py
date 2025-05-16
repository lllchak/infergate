from typing import Optional, List, Union
from datetime import datetime

from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None
    exp: Optional[int] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    full_name: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str
    full_name: str

class UserUpdate(UserBase):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    credits: float

    class Config:
        orm_mode = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str

class CreditUpdate(BaseModel):
    amount: float

class MLModelBase(BaseModel):
    name: str
    description: str
    version: str

class MLModelCreate(MLModelBase):
    owner_id: int
    cost_per_prediction: float
    model_file: bytes
    model_type: str

class MLModelUpdate(MLModelBase):
    is_active: Optional[bool] = None

class MLModel(MLModelBase):
    id: int
    owner_id: int
    is_active: bool
    is_deleted: bool
    created_at: datetime
    cost_per_prediction: float
    model_type: str
    owner: User

    class Config:
        orm_mode = True

class PredictionInput(BaseModel):
    model_id: int
    input_data: List[float]

class PredictionBase(BaseModel):
    model_id: int
    input_data: List[float]
    cost: float

class PredictionCreate(PredictionBase):
    user_id: int

class PredictionUpdate(PredictionBase):
    prediction_result: Union[float, List[float]]

class Prediction(PredictionBase):
    id: int
    user_id: int
    created_at: datetime
    user: User
    model: MLModel
    prediction_result: Union[float, List[float]]
    input_file_path: Optional[str] = None
    result_file_path: Optional[str] = None

    class Config:
        orm_mode = True

class ModelCostEstimate(BaseModel):
    cost_per_prediction: float

class FilePredictionInput(BaseModel):
    model_id: int
    file_path: str

class FilePredictionResult(BaseModel):
    predictions: List[float]
    file_path: str
