import { Client, GatewayIntentBits } from 'discord.js';
import eventBus from './utils/eventBus.js';
import DeepgramService from './services/deepgramService.js';
import VoiceService from './services/voiceService.js';
import VoxtaService from './services/voxtaService.js';
//AI! instancie le audio player
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const deepgramService = new DeepgramService(CONFIG.deepgram.apiKey);
const voiceService = new VoiceService(client);
const voxtaService = new VoxtaService(CONFIG.voxta.baseUrl);

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

client.login(CONFIG.discord.token).catch(error => {
    logger.error('Discord connection error:', error);
    process.exit(1);
});
