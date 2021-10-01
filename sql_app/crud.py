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
    return db_var

def create_metadata(db: Session, md: schemas.RecordMetadataCreate):
    db_md = models.RecordMetadata(**md.dict())
    db.add(db_md)
    db.commit()
    return  db_md

def create_records(db: Session, recs: List[schemas.RecordCreate], metadata: schemas.RecordMetadataCreate):
    db_md = models.RecordMetadata(**metadata.dict())
    created = list()
    for rec in recs:

        # Fetch or create the variable
        var = db.query(models.Variable).filter_by(name=rec.variable).first()

        # If there is no result, then create it
        if not var:
            var = models.Variable(name=rec.variable)

        db_rec = models.Record(value=rec.value)

        db_rec.variable = var
        db_rec.meta_data = db_md
        db.add(db_rec)
        created.append(db_rec)
    db.commit()

    return created