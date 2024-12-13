import { Client, GatewayIntentBits } from 'discord.js';
import eventBus from './utils/eventBus.js';
import DeepgramService from './services/deepgramService.js';
import VoiceService from './services/voiceService.js';
import VoxtaService from './services/voxtaService.js';
import AudioPlayerService from './services/audioPlayerService.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

let deepgramService;
let voxtaService;
let audioPlayerService;
let voiceService;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});


client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (oldState.channelId) {
        // AI! add log
        eventBus.emit('cleanup');
    }

    if (newState.channelId) {
        deepgramService = new DeepgramService(CONFIG.deepgram.apiKey);
        voxtaService = new VoxtaService(CONFIG.voxta.baseUrl);
        audioPlayerService = new AudioPlayerService(voxtaService);
        voiceService = new VoiceService(client, newState);
    }
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
