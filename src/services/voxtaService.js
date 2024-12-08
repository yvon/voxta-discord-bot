import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';

class VoxtaService {
    constructor() {
        this.baseUrl = CONFIG.voxta.baseUrl;
    }

    async getChats() {
        const url = `${this.baseUrl}/api/chats`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.chats || [];
        } catch (error) {
            logger.error('Error fetching chats from Voxta:', error);
            return [];
        }
    }

    async getFirstChatId() {
        const chats = await this.getChats();
        return chats.length > 0 ? chats[0].id : null;
    }
}

export default VoxtaService;
