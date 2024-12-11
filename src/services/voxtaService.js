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

    async retryWithDelay(fn, retryCount = 0) {
        const MAX_RETRIES = 2;
        const RETRY_DELAY = 2000; // 2 seconds

        try {
            const response = await fn();
            return response;
        } catch (error) {
            if (error.response?.status === 502 && retryCount < MAX_RETRIES) {
                logger.info(`Got 502 error, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return this.retryWithDelay(fn, retryCount + 1);
            }
            throw error;
        }
    }

    async callApi(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await this.retryWithDelay(() => 
                axios.get(url, { headers: this.headers })
            );
            return response.data;
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

    async getAudioStream(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        const passThrough = new PassThrough();
        
        this.retryWithDelay(() => 
            axios.get(url, { 
                headers: this.headers,
                responseType: 'stream'
            })
        ).then(response => {
            response.data.pipe(passThrough);
        }).catch(error => {
            logger.error(`Network error getting audio stream from ${endpoint}:`, error);
            passThrough.end();
        });

        return passThrough;
    }

    async sendWebSocketMessage(message) {
        logger.info('Sending WebSocket message to Voxta:', message);
        await this.wsClient.sendWebSocketMessage(message);
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
