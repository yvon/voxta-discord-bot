require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const DeepgramService = require('./deepgramService');
const VoiceService = require('./voiceService');
const logger = require('./logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const deepgramService = new DeepgramService(process.env.DEEPGRAM_API_KEY);
const voiceService = new VoiceService(client, deepgramService);

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    voiceService.handleVoiceStateUpdate(oldState, newState);
});

process.on('SIGINT', async () => {
    logger.info('\nClosing connections...');
    deepgramService.closeConnection();
    voiceService.cleanup();
    await client.destroy();
    logger.info('Program stopped.');
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.error('Discord connection error:', error);
    process.exit(1);
});
