# Use Node.js x64 image
FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .
RUN touch .env

CMD [ "node", "src/index.js" ]
