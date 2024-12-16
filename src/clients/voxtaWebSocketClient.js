import * as signalR from '@microsoft/signalr';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoxtaWebSocketClient {
    constructor(connectionConfig) {
        this.baseUrl = connectionConfig.getBaseUrl();
        this.headers = connectionConfig.getHeaders();
        this.connection = null;
        this.authenticated = false;
        this.initPromise = this.initialize();
        eventBus.on('cleanup', () => this.cleanup());
    }

    async initialize() {
        if (this.connection) {
            return;
        }
        const wsUrl = `${this.baseUrl}/hub`;
        this.connection = this.setupSignalRConnection(wsUrl);

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
            
            this.authenticated = true;
            logger.info('Authenticated with Voxta WebSocket');
            return this.connection;
        } catch (error) {
            logger.error('Error initializing Voxta WebSocket:', error);
            this.connection = null;
            throw error;
        }
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


    async sendWebSocketMessage(type, payload = {}) {
        await this.initPromise;
        if (!this.connection || !this.authenticated) {
            logger.error('Cannot send message: no connection or not authenticated');
            return;
        }

        const message = {
            $type: type,
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

    async handleReceiveMessage(message) {
        logger.info('Received message from Voxta:', message);
        eventBus.emit('voxtaMessage', message);
    }
}

export default VoxtaWebSocketClient;
