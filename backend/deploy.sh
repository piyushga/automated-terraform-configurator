#!/bin/bash

set -e

ECR_REGISTRY=264119764851.dkr.ecr.us-east-1.amazonaws.com
IMAGE_NAME=fastapi-backend
CONTAINER_NAME=fastapi-container

echo "Stopping any container using port 8000..."
docker ps --filter "publish=8000" -q | xargs -r docker stop
docker ps -a --filter "publish=8000" -q | xargs -r docker rm

echo "Removing old container (if exists)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Pulling latest image..."
docker pull $ECR_REGISTRY/$IMAGE_NAME:latest

echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 8000:8000 \
  --env-file /home/ec2-user/.env \
  --restart always \
  $ECR_REGISTRY/$IMAGE_NAME:latest

echo "Deployment complete."