import logger from '../utils/logger.js';
import axios from 'axios';
import { Readable, PassThrough } from 'stream';

class VoxtaApiClient {
    constructor(connectionConfig) {
        this.baseUrl = connectionConfig.getBaseUrl();
        this.headers = connectionConfig.getHeaders();
    }

    async retryRequest(requestFn, maxRetries = 2, retryDelay = 2000) {
        let retryCount = 0;
        
        while (true) {
            try {
                return await requestFn();
            } catch (error) {
                if (error.response?.status === 502 && retryCount < maxRetries) {
                    const attemptMsg = `attempt ${retryCount + 1}/${maxRetries}`;
                    logger.info(`Got 502 error, retrying in ${retryDelay}ms... (${attemptMsg})`);
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

    getAudioResponse(endpoint) {
        return this.makeRequest(endpoint, {
            responseType: 'arraybuffer'
        });
    }
}

export default VoxtaApiClient;
