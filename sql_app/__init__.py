from sql_app import crud, models, schemas
from sql_app.database import SessionLocal, engine

def create_database():
    # Initialize database engine
    models.Base.metadata.create_all(bind=engine)