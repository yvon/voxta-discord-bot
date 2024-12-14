# Use Node.js x64 image
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    ffmpeg \
    libsodium-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Set memory limits and install dependencies
ENV NODE_OPTIONS="--max_old_space_size=8192" \
    SODIUM_INSTALL=system

# Install dependencies with system libsodium
RUN npm install --unsafe-perm

# Copy app source
COPY . .

# Create and set environment variables file
RUN touch .env

# Start the bot with the daemon
CMD [ "node", "src/daemon.js" ]
