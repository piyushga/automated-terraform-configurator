# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory inside container. will create /app folder inside container
WORKDIR /app

# Copy only requirements first (for better caching)
COPY requirements.txt .

# Install Terraform
RUN apt-get update && apt-get install -y unzip curl && \
    curl -o terraform.zip https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip && \
    unzip terraform.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform.zip

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI using uvicorn. 8000 is the container port on which fastapi runs
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]