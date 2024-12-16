import { Client, GatewayIntentBits } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import VoxtaService from './services/voxtaService.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const voxtaService = new VoxtaService(CONFIG.voxta.baseUrl);

process.on('message', (message) => {
    const { channelId } = message;
    logger.info(`Chat process started for channel ${channelId}`);

    client.login(CONFIG.discord.token)
        .then(() => { onDiscordReady(channelId); })
        .catch(error => {
            logger.error('Discord connection error:', error);
            process.exit(1);
        });
    
    voxtaService.joinLastChat();
});

function onDiscordReady(channelId) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        logger.error('Channel not found');
        process.exit(1);
    }

    const connection = getVoiceConnection(channel.guild.id);
        
    const audioStream = connection.receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.Manual }
    });

    audioStream.on('data', (chunk) => {
        logger.info('Received audio data');
    });
}
