IMAGE_NAME = voxta-discord-bot

.PHONY: build run dev

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run --rm --name $(IMAGE_NAME) --env-file .env $(IMAGE_NAME)

dev: build run
