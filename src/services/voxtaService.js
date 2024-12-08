import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        // Extract user:password from URL if present
        const credentials = url.username && url.password 
            ? `${url.username}:${url.password}`
            : null;
        this.authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;
            
        // Debug log auth details
        logger.debug('Voxta URL:', this.baseUrl);
        logger.debug('Auth credentials present:', !!credentials);
        logger.debug('Auth header present:', !!this.authHeader);
    }

    async getChats() {
        const url = `${this.baseUrl}/api/chats`;
        
        try {
            const headers = this.authHeader 
                ? { 'Authorization': this.authHeader }
                : {};
            
            const response = await fetch(url, { headers });
            const text = await response.text(); // Get raw response text first
            
            if (!response.ok) {
                logger.error('Voxta API error:', response.status, text);
                return [];
            }
            
            try {
                const data = JSON.parse(text);
                return data.chats || [];
            } catch (error) {
                logger.error('Invalid JSON response from Voxta:', text);
                logger.error('Parse error:', error);
            }
            return [];
        } catch (error) {
            logger.error('Network error fetching chats from Voxta:', error);
            return [];
        }
    }

    async getFirstChatId() {
        const chats = await this.getChats();
        return chats.length > 0 ? chats[0].id : null;
    }
}

export default VoxtaService;
