import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';
import VoxtaWebSocketClient from './voxtaWebSocketClient.js';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        this.url = url;
        
        this.headers = this.buildHeaders();
        this.wsClient = new VoxtaWebSocketClient(this.baseUrl, this.headers.Authorization);
    }

    async connectWebSocket() {
        await this.wsClient.connect();
    }

    buildHeaders() {
        // Extract and decode credentials from URL if present
        const credentials = this.url.username && this.url.password 
            ? `${decodeURIComponent(this.url.username)}:${decodeURIComponent(this.url.password)}`
            : null;
            
        const authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;

        return authHeader 
            ? { 'Authorization': authHeader }
            : {};
    }

    async callApi(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const response = await fetch(url, { headers: this.headers });
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
