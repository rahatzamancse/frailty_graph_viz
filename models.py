""" PyDantic model for the weights observation record"""
from typing import List

from pydantic import BaseModel


class Coefficient(BaseModel):
    name: str
    value: float


class UserRecord(BaseModel):
    query_str: str
    coefficients: List[Coefficient]

