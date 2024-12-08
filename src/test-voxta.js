import 'dotenv/config';
import logger from './utils/logger.js';
import VoxtaService from './services/voxtaService.js';

const voxtaService = new VoxtaService();

// Test the service
voxtaService.getFirstChatId().then(chatId => {
    if (chatId) {
        logger.info(`Found chat with ID: ${chatId}`);
        logger.info('Successfully retrieved chat ID');
    } else {
        logger.error('Failed to retrieve chat ID');
    }
});
