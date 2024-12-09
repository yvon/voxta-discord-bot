import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';
import * as signalR from '@microsoft/signalr';
import eventBus from '../utils/eventBus.js';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        eventBus.on('cleanup', () => this.cleanup());
        // Extract and decode credentials from URL if present
        const credentials = url.username && url.password 
            ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
            : null;
        this.authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;
            
        // WebSocket connection properties
        this.connection = null;
        this.wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        this.sessionId = null; // Store the session ID for active chats
    }

    async connectWebSocket() {
        if (this.connection) {
            return;
        }

        const wsUrl = `${this.baseUrl}/hub`;
        
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(wsUrl, {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {}
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        //AI! met tout ce bloc une methode a part
        this.connection.on("ReceiveMessage", async (message) => {
            logger.info('Received message from Voxta:', message);
            
            // Handle chat session started message
            if (message.$type === 'chatStarted' && message.context?.sessionId) {
                this.sessionId = message.context.sessionId;
                logger.info('Chat session started with ID:', this.sessionId);
            }
        });

        try {
            await this.connection.start();
            logger.info('Connected to Voxta WebSocket');

            await this.connection.invoke('SendMessage', {
                "$type": "authenticate",
                "client": "SimpleClient",
                "clientVersion": "1.0",
                "scope": ["role:app"],
                "capabilities": {
                    "audioInput": "None", 
                    "audioOutput": "Url",
                    "acceptedAudioContentTypes": ["audio/x-wav", "audio/mpeg"]
                }
            });

        } catch (error) {
            logger.error('Error connecting to Voxta WebSocket:', error);
            this.connection = null;
            throw error;
        }
    }


    async getChats() {
        const url = `${this.baseUrl}/api/chats`;
        
        try {
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
        if (!this.connection || !this.sessionId) {
            throw new Error('No active connection or session');
        }

        await this.connection.invoke('SendMessage', {
            $type: 'send',
            sessionId: this.sessionId,
            text: text,
            doReply: true,
            doCharacterActionInference: true
        });
    }

    async joinLastChat() {
        await this.connectWebSocket();
        const chatId = await this.getLastChatId();
        if (!chatId) return;
        await this.connection.invoke('SendMessage', {
            "$type": "resumeChat",
            "chatId": chatId
        });
        logger.info('Resumed chat with ID:', chatId);
    }

    async cleanup() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}

export default VoxtaService;
