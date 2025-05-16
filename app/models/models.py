from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, DateTime, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean(), default=True)
    credits = Column(Float, default=0.0)
    
    predictions = relationship("Prediction", back_populates="user")
    models = relationship("MLModel", back_populates="owner")

class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    version = Column(String)
    model_path = Column(String)
    model_type = Column(String)
    cost_per_prediction = Column(Float)
    is_active = Column(Boolean(), default=True)
    is_deleted = Column(Boolean(), default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="models")
    predictions = relationship("Prediction", back_populates="model")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("ml_models.id"))
    input_data = Column(ARRAY(Float))
    prediction_result = Column(ARRAY(Float))
    cost = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    input_file_path = Column(String, nullable=True)
    result_file_path = Column(String, nullable=True)

    user = relationship("User", back_populates="predictions")
    model = relationship("MLModel", back_populates="predictions")
