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

    getHeaders() {
        return this.authHeader 
            ? { 'Authorization': this.authHeader }
            : {};
    }

    async callApi(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const response = await fetch(url, { headers: this.getHeaders() });
            const response = await fetch(url, { headers });
            if (!response.ok) {
                logger.error('Voxta API error:', response.status);
                return null;
            }
            
            return await response.json();
        } catch (error) {
            logger.error(`Network error calling Voxta API ${endpoint}:`, error);
            return null;
        }
    }

    async getChats() {
        const data = await this.callApi('/api/chats');
        return data?.chats || [];
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
