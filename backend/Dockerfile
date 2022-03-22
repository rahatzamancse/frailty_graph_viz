FROM python:3.9
WORKDIR /code/backend
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONBUFFERED 1
COPY . .
RUN pip install --no-cache-dir --upgrade -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "start:app", "--host", "0.0.0.0", "--port", "8000"]
