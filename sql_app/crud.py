from typing import List

from sqlalchemy.orm import Session

from . import models, schemas

def get_record(db: Session, record_id: int):
    return db.query(models.Record).filter(models.Record == record_id).first()

def get_metadata(db: Session, medatadata_id: int):
    return db.query(models.RecordMetadata).filter(models.RecordMetadata == medatadata_id).first()

def get_variable(db: Session, var_id: int):
    return db.query(models.Variable).filter(models.Variable == var_id).first()

def create_variable(db: Session, var: schemas.VariableCreate):
    db_var = models.Variable(name = var.name)
    db.add(db_var)
    db.commit()
    db.refresh(db_var)
    return db_var

def create_metadata(db: Session, md: schemas.RecordMetadataCreate):
    db_md = models.RecordMetadata(**md.dict())
    db.add(db_md)
    db.commit()
    db.refresh(db_md)
    return  db_md

def create_records(db: Session, recs: List[schemas.RecordCreate], metadata_id: int, observation_id: str):
    created = list()
    for rec in recs:
        db_rec = models.Record(**rec.dict(),
                               metadata_id= metadata_id,
                               observation_id = observation_id)
        db.add(db_rec)
        created.append(rec)
    db.commit()
    for r in created:
        db.refresh(r)
    return created
