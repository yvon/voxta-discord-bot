import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';
import VoxtaWebSocketClient from './voxtaWebSocketClient.js';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        
        // Extract and decode credentials from URL if present
        const credentials = url.username && url.password 
            ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
            : null;
        this.authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;
            
        this.wsClient = new VoxtaWebSocketClient(this.baseUrl, this.authHeader);
    }

    async connectWebSocket() {
        await this.wsClient.connect();
    }

    async getChats() {
        const url = `${this.baseUrl}/api/chats`;
        
        try {
          //AI! isole cette partie dans une function on veut pouvoir appeller n'importe quelle url facilement
            const headers = this.authHeader 
                ? { 'Authorization': this.authHeader }
                : {};
            
            const response = await fetch(url, { headers });
            if (!response.ok) {
                logger.error('Voxta API error:', response.status);
                return [];
            }
            
            const data = await response.json();
            return data.chats || [];
            return [];
        } catch (error) {
            logger.error('Network error fetching chats from Voxta:', error);
            return [];
        }
    }

    async getLastChatId() {
        const chats = await this.getChats();
        return chats.length > 0 ? chats[0].id : null;
    }

    async sendMessage(text) {
        await this.wsClient.sendMessage(text);
    }

    async joinLastChat() {
        await this.connectWebSocket();
        const chatId = await this.getLastChatId();
        if (!chatId) return;
        await this.wsClient.resumeChat(chatId);
    }
}

export default VoxtaService;
