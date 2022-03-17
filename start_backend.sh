#!/bin/bash
PYTHONPATH=. python -m uvicorn "backend.start:app" --port  1601