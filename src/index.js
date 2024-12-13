import { Client, GatewayIntentBits } from 'discord.js';
import eventBus from './utils/eventBus.js';
import DeepgramService from './services/deepgramService.js';
import VoiceService from './services/voiceService.js';
import VoxtaService from './services/voxtaService.js';
import AudioPlayerService from './services/audioPlayerService.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const deepgramService = new DeepgramService(CONFIG.deepgram.apiKey);
const voxtaService = new VoxtaService(CONFIG.voxta.baseUrl);
let voiceService;
const audioPlayerService = new AudioPlayerService(voxtaService, voiceService);

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    // Ignore bot's own voice state updates
    if (newState.member.user.bot) return;

    // User joined a voice channel or switched channels
    if (newState.channelId) {
        if (voiceService) {
            voiceService.cleanup();
        }
        voiceService = VoiceService.create(client, newState);
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
