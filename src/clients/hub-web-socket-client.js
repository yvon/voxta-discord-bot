import { HubConnectionState } from '@microsoft/signalr';
import * as signalR from '@microsoft/signalr';
import logger from '../utils/logger.js';
import eventBus from '../utils/event-bus.js';

class HubWebSocketClient {
    constructor(connectionConfig) {
        const baseUrl = connectionConfig.getBaseUrl();
        const headers = connectionConfig.getHeaders();
        this.connection = this.setupSignalRConnection(baseUrl, headers);
        this.connection.on("ReceiveMessage", this.handleReceiveMessage.bind(this));
        eventBus.on('voiceChannelLeft', this.stop.bind(this));
    }

    setupSignalRConnection(baseUrl, headers) {
        const wsUrl = `${baseUrl}/hub`;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(wsUrl, { headers: headers })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        return connection;
    }

    async start() {
        try {
            await this.connection.start();
            logger.info('Connected to Voxta WebSocket');
        } catch (error) {
            logger.error('Error initializing Voxta WebSocket:', error);
            throw error;
        }
    }

    async stop() {
        await this.connection.stop();
        logger.info('Disconnected from Voxta WebSocket');
    }

    async sendMessage(type, payload = {}) {
        logger.info('Sending message to Voxta:', type, payload);

        if (this.connection.state !== HubConnectionState.Connected) {
            logger.error('Cannot send message: not connected to Voxta');
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

    async handleReceiveMessage(message) {
        logger.info('Received message from Voxta:', message);
        eventBus.emit('voxtaMessage', message);
    }
}

export default HubWebSocketClient;
