# Use Node.js x64 image
FROM node:20-bullseye

# Install dependencies for building native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    ffmpeg \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install libsodium system package first
RUN apt-get update && apt-get install -y \
    libsodium-dev

# Set npm to use more memory and install dependencies
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm install --build-from-source

# Copy app source
COPY . .

# Create and set environment variables file
RUN touch .env

# Start the bot with the daemon
CMD [ "node", "src/daemon.js" ]
