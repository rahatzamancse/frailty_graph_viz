FROM python:3.9
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONBUFFERED 1
COPY . /code/backend/
RUN cp /code/backend/.env /code/
RUN mv /code/backend/data /code/
RUN pip install --no-cache-dir --upgrade -r backend/requirements.txt
EXPOSE 8000
ENV PYTHONPATH /code/
CMD ["uvicorn", "backend.start:app", "--host", "0.0.0.0", "--port", "1601"]
