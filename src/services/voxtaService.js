import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoxtaService {
    constructor(baseUrl) {
        const url = new URL(baseUrl);

        this.baseUrl = `${url.protocol}//${url.host}`;
        this.url = url;
        this.headers = this.buildHeaders();
        
        eventBus.on('voiceChannelJoined', () => this.joinLastChat());
    }

    buildHeaders() {
        if (!this.url.username || !this.url.password) {
            return {};
        }

        const decodedUsername = decodeURIComponent(this.url.username);
        const decodedPassword = decodeURIComponent(this.url.password);
        const basicAuthString = `${decodedUsername}:${decodedPassword}`;
        const base64Credentials = Buffer.from(basicAuthString).toString('base64');

        return {
            'Authorization': `Basic ${base64Credentials}`
        };
    }

    async callApi(endpoint, retryCount = 0) {
        const url = `${this.baseUrl}${endpoint}`;
        const MAX_RETRIES = 2;
        const RETRY_DELAY = 2000; // 2 seconds

        try {
            const response = await fetch(url, { headers: this.headers });
            
            if (response.status === 502 && retryCount < MAX_RETRIES) {
                logger.info(`Got 502 error, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return this.callApi(endpoint, retryCount + 1);
            }

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
        logger.info('Sending message to Voxta (not yet implemented):', text);
    }

    async joinLastChat() {
        const chatId = await this.getLastChatId();
        if (!chatId) return;
        logger.info('Joining chat (not yet implemented):', chatId);
    }
}

export default VoxtaService;
