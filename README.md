# Voxta Discord Bot

A Discord bot that transcribes voice to text and interacts via Voxta to generate voice responses.

> Note: This is an independent project and is not affiliated with or endorsed by Voxta.

## Prerequisites

- Node.js 20 or higher
- Voxta server

## Configuration

1. Copy the `.env.example` file to `.env`
2. Configure the environment variables:

   ```
   DISCORD_TOKEN=your_discord_token
   VOXTA_URL=your_voxta_server_url  # Optional, defaults to http://localhost:5384
   ```

## Installation

```bash
npm install
node src/index.js
```

## Usage

1. Make sure your Voxta server is running
2. Create at least one chat on Voxta (the bot will join the most recently created chat)
3. Invite the bot to your Discord server
2. Join a voice channel
3. The bot will automatically join the channel
-- AI! dire ici d'attendre le "ding" d'initialisation et échanger avec Voxta
