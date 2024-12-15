import * as signalR from '@microsoft/signalr';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoxtaWebSocketClient {
    constructor(connectionConfig) {
        this.baseUrl = connectionConfig.getBaseUrl();
        this.headers = connectionConfig.getHeaders();
        this.connection = null;
        this.sessionId = null;
        this.authenticated = false;
        eventBus.on('cleanup', () => this.cleanup());
    }

    setupSignalRConnection(wsUrl) {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(wsUrl, { headers: this.headers })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        connection.on("ReceiveMessage", this.handleReceiveMessage.bind(this));
        return connection;
    }

    async connect() {
        if (this.connection) {
            return;
        }

        const wsUrl = `${this.baseUrl}/hub`;
        this.connection = this.setupSignalRConnection(wsUrl);

        try {
            await this.connection.start();
            logger.info('Connected to Voxta WebSocket');
            await this.authenticate();
        } catch (error) {
            logger.error('Error connecting to Voxta WebSocket:', error);
            this.connection = null;
            throw error;
        }
    }

    async authenticate() {
        if (this.authenticated) return;
        
        await this.connect();

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
        
        this.authenticated = true;
    }

    async sendWebSocketMessage(type, payload = {}) {
        if (!this.connection || !this.sessionId) {
            logger.error('Cannot send message: no connection or session');
            return;
        }

        const message = {
            $type: type,
            sessionId: this.sessionId,
            ...payload
        };

        try {
            await this.connection.invoke('SendMessage', message);
        } catch (error) {
            logger.error('Error sending message to Voxta:', error);
            throw error;
        }
    }

    async sendMessage(text) {
        await this.sendWebSocketMessage('send', {
            text: text,
            doReply: true,
            doCharacterActionInference: true
        });
    }

    async resumeChat(chatId) {
        await this.connection.invoke('SendMessage', {
            "$type": "resumeChat",
            "chatId": chatId
        });
        logger.info('Resumed chat with ID:', chatId);
    }

    async handleChatStarted(message) {
        if (message.context?.sessionId) {
            this.sessionId = message.context.sessionId;
            logger.info('Chat session started with ID:', this.sessionId);
        }
    }

    async handleReceiveMessage(message) {
        logger.info('Received message from Voxta:', message);
        
        eventBus.emit('voxtaMessage', message);
        
        // Handle specific message types
        if (message.$type === 'chatStarted') {
            await this.handleChatStarted(message);
        }
    }

    async cleanup() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}

export default VoxtaWebSocketClient;
