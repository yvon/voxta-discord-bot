# Makefile for Discord Transcription Bot

# Variables
IMAGE_NAME = discord-transcription-bot

.PHONY: build run dev test-voxta

# Build the Docker image
build:
	docker build -t $(IMAGE_NAME) .

# Run the container
run:
	docker run --rm --name $(IMAGE_NAME) --env-file .env $(IMAGE_NAME)

# Run the container in daemon mode
run-daemon:
	docker run -d --name $(IMAGE_NAME) --env-file .env $(IMAGE_NAME)

# Build and run in one command
dev: build run
