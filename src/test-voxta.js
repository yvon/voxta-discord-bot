import 'dotenv/config';
import logger from './utils/logger.js';
import CONFIG from './config/config.js';

async function getFirstChatId() {
    const url = `${CONFIG.voxta.baseUrl}${CONFIG.voxta.endpoints.chats}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.chats && data.chats.length > 0) {
            const firstChat = data.chats[0];
            logger.info(`Found chat with ID: ${firstChat.id}`);
            return firstChat.id;
        } else {
            logger.error('No chats found in the response');
            return null;
        }
    } catch (error) {
        logger.error('Error fetching chats:', error);
        return null;
    }
}

// Test the function
getFirstChatId().then(chatId => {
    if (chatId) {
        logger.info('Successfully retrieved chat ID');
    } else {
        logger.error('Failed to retrieve chat ID');
    }
});
