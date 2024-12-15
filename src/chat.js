import VoxtaService from './services/voxtaService.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

process.on('message', (message) => {
    const { channelId } = message;
    logger.info(`Chat process started for channel ${channelId}`);
    
    const voxtaService = new VoxtaService(CONFIG.voxta.baseUrl);
    voxtaService.joinLastChat();
});
