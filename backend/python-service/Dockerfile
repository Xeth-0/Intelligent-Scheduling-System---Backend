# Use the official Python 3.11 slim image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Command to start the Celery worker
# CMD ["celery", "-A", "app.celery_config", "worker", "--loglevel=info", "-Q", "csv_validation_request"]
CMD ["python", "main.py"]