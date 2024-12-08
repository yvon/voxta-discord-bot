# Makefile for Discord Transcription Bot

# Variables
IMAGE_NAME = discord-transcription-bot

.PHONY: build run dev

# Build the Docker image
build:
	docker build -t $(IMAGE_NAME) .

# Run the container
run:
	docker run --rm --env-file .env $(IMAGE_NAME)

# Build and run in one command
dev: build run
