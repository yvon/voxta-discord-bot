import * as signalR from '@microsoft/signalr';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoxtaWebSocketClient {
    constructor(baseUrl, authHeader) {
        this.baseUrl = baseUrl;
        this.authHeader = authHeader;
        this.connection = null;
        this.sessionId = null;
        eventBus.on('cleanup', () => this.cleanup());
    }

    setupSignalRConnection(wsUrl) {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(wsUrl, {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {}
            })
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

    async resumeChat(chatId) {
        await this.connection.invoke('SendMessage', {
            "$type": "resumeChat",
            "chatId": chatId
        });
        logger.info('Resumed chat with ID:', chatId);
    }

    handleReceiveMessage(message) {
        logger.info('Received message from Voxta:', message);
        
        // Handle chat session started message
        if (message.$type === 'chatStarted' && message.context?.sessionId) {
            this.sessionId = message.context.sessionId;
            logger.info('Chat session started with ID:', this.sessionId);
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