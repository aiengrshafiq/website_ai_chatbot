# /backend/Dockerfile

# 1. Use an official Python runtime
FROM python:3.11-slim

# 2. Set the working directory
WORKDIR /app

# 3. Copy backend requirements and install dependencies
#    Path is now relative to the root context
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy the entire backend directory into the container
#    Path is now relative to the root context
COPY backend/ /app/

# 5. Copy the frontend files into a 'static' directory inside the container
#    Path is now relative to the root context
COPY frontend/ /app/static/

# 6. Expose the port that Gunicorn will run on
EXPOSE 8080

# 7. Define the command to run the application using Gunicorn
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080", "main:app"]