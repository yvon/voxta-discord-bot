import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import eventBus from './utils/eventBus.js';
import DeepgramService from './services/deepgramService.js';
import VoiceService from './services/voiceService.js';
import logger from './utils/logger.js';

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
    eventBus.emit('voiceStateUpdate', oldState, newState);
});

process.on('SIGINT', () => {
    logger.info('\nClosing connections...');
    eventBus.emit('cleanup');
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.error('Discord connection error:', error);
    process.exit(1);
});
