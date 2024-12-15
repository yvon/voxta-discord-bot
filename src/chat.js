import logger from './utils/logger.js';

process.on('message', (message) => {
    const { channelId } = message;
    logger.info(`Chat process started for channel ${channelId}`);
    
    // TODO: Implement chat logic
});
