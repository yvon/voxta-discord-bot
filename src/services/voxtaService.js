import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        // Extraire user:password de l'URL si présent
        const credentials = url.username && url.password 
            ? `${url.username}:${url.password}`
            : null;
        this.authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;
    }

    async getChats() {
        const url = `${this.baseUrl}/api/chats`;
        
        try {
            const headers = this.authHeader 
                ? { 'Authorization': this.authHeader }
                : {};
            
            const response = await fetch(url, { headers });
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
