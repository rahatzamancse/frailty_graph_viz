FROM python:3.9
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONBUFFERED 1
COPY . /code/backend
RUN pip install --no-cache-dir --upgrade -r backend/requirements.txt
EXPOSE 1601
CMD ["uvicorn", "backend.start:app", "--host", "0.0.0.0", "--port", "1601"]
