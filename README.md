# Voxta Discord Bot

A Discord bot to interact with Voxta through voice channels. Using Discord as a client gives you two main benefits:
- Access from anywhere using the Discord mobile app
- Built-in noise reduction with Discord's Krisp integration

> Note: This project is independent and not affiliated with or endorsed by Voxta.

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
4. Wait for the initialization "ding" sound
5. You can now start talking with Voxta!
