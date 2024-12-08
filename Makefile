# Makefile for Discord Transcription Bot

# Variables
IMAGE_NAME = discord-transcription-bot

.PHONY: build run dev test-voxta

# Build the Docker image
build:
	docker build -t $(IMAGE_NAME) .

# Run the container
run:
	docker run --rm --env-file .env $(IMAGE_NAME)

# Build and run in one command
dev: build run

# Test Voxta API connection
test-voxta: build
	docker run --rm --env-file .env $(IMAGE_NAME) node src/test-voxta.js
