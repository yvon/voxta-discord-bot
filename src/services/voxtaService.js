import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';
import VoxtaWebSocketClient from './voxtaWebSocketClient.js';
import axios from 'axios';
import { Readable, PassThrough } from 'stream';

class VoxtaService {
    constructor(baseUrl) {
        const url = new URL(baseUrl);

        this.baseUrl = `${url.protocol}//${url.host}`;
        this.url = url;
        this.headers = this.buildHeaders();
        this.wsClient = new VoxtaWebSocketClient(this.baseUrl, this.headers);
        
        eventBus.on('voiceChannelJoined', () => this.joinLastChat());
        eventBus.on('transcription', (text) => this.sendMessage(text));
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

    async retryRequest(requestFn, maxRetries = 2, retryDelay = 2000) {
        let retryCount = 0;
        
        while (true) {
            try {
                return await requestFn();
            } catch (error) {
                if (error.response?.status === 502 && retryCount < maxRetries) {
                    logger.info(`Got 502 error, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    retryCount++;
                    continue;
                }
                throw error;
            }
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await this.retryRequest(async () => {
                return await axios({
                    url,
                    method: options.method || 'GET',
                    headers: this.headers,
                    responseType: options.responseType || 'json',
                    ...options
                });
            });
            return response.data;
        } catch (error) {
            logger.error(`Network error calling Voxta API ${endpoint}:`, error);
            return null;
        }
    }

    async getChats() {
        const data = await this.makeRequest('/api/chats');
        return data?.chats || [];
    }

    async getLastChatId() {
        const chats = await this.getChats();
        return chats.length > 0 ? chats[0].id : null;
    }

    async getAudioResponse(endpoint) {
        return await this.makeRequest(endpoint, {
            responseType: 'arraybuffer'
        });
    }

    async sendWebSocketMessage(type, payload = {}) {
        logger.info(`Sending WebSocket message to Voxta type=${type}:`, payload);
        await this.wsClient.sendWebSocketMessage(type, payload);
    }

    async sendMessage(text) {
        logger.info('Sending text message to Voxta:', text);
        await this.wsClient.sendMessage(text);
    }

    async joinLastChat() {
        const chatId = await this.getLastChatId();
        if (!chatId) return;
        await this.wsClient.authenticate();
        await this.wsClient.resumeChat(chatId);
        logger.info('Joining chat:', chatId);
    }
}

export default VoxtaService;
