from pathlib import Path

from sql_app import crud, models, schemas
from sql_app.database import construct_engine

# def create_database(db_path: str):
#     # Initialize database engine
#     path = Path(db_path)
#     engine = construct_engine(path)
