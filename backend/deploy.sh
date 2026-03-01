#!/bin/bash

ECR_REGISTRY=264119764851.dkr.ecr.us-east-1.amazonaws.com
IMAGE_NAME=fastapi-backend
CONTAINER_NAME=fastapi-container

echo "Pulling latest image..."
docker pull $ECR_REGISTRY/$IMAGE_NAME:latest

echo "Stopping old container..."
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 8000:8000 \
  --env-file /home/ec2-user/.env \
  $ECR_REGISTRY/$IMAGE_NAME:latest

echo "Deployment complete."