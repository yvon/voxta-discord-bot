# Voxta Discord Bot

Un bot Discord qui permet d'interagir vocalement avec Voxta directement depuis les salons vocaux Discord. Cette intégration offre une grande flexibilité d'utilisation, permettant notamment d'accéder à Voxta depuis n'importe où via l'application mobile Discord.

> Note : Ce projet est indépendant et n'est pas affilié ou approuvé par Voxta.

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
