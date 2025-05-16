import io
from minio import Minio
from minio.error import S3Error
from fastapi import HTTPException
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )

        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(settings.MINIO_BUCKET):
                self.client.make_bucket(settings.MINIO_BUCKET)
        except S3Error as e:
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при создании бакета: {str(e)}"
            )

    def save_model(self, model_data: bytes, user_id: int, model_name: str, version: str) -> str:
        try:
            object_name = f"models/{user_id}/{model_name}_{version}.joblib"

            self.client.put_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name,
                data=io.BytesIO(model_data),
                length=len(model_data),
                content_type='application/octet-stream'
            )

            return object_name
        except S3Error as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при сохранении модели: {str(e)}"
            )

    def load_model(self, object_name: str) -> bytes:
        try:
            try:
                self.client.stat_object(settings.MINIO_BUCKET, object_name)
            except S3Error as e:
                raise HTTPException(
                    status_code=404,
                    detail=f"Модель не найдена: {str(e)}"
                )

            response = self.client.get_object(settings.MINIO_BUCKET, object_name)

            return response.read()
        except S3Error as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при загрузке модели: {str(e)}"
            )

    def delete_model(self, object_name: str) -> None:
        try:
            self.client.remove_object(settings.MINIO_BUCKET, object_name)
        except S3Error as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при удалении модели: {str(e)}"
            )

    def get_model_url(self, object_name: str, expires: int = 3600) -> str:
        try:
            return self.client.presigned_get_object(
                settings.MINIO_BUCKET,
                object_name,
                expires=expires
            )
        except S3Error as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при генерации ссылки: {str(e)}"
            )

storage_service = StorageService()
