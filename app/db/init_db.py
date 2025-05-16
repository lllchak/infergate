import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from app.core.config import settings

def wait_for_db(max_retries=5, retry_interval=5):
    db_url = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}/{settings.POSTGRES_DB}"
    engine = create_engine(db_url)

    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                conn.commit()

            return True
        except OperationalError as e:
            if i < max_retries - 1:
                time.sleep(retry_interval)
            else:
                raise e

    return False
