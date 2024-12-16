import * as signalR from '@microsoft/signalr';
import logger from '../../utils/logger.js';

class VoxtaWebSocketClient {
    constructor(connectionConfig) {
        const baseUrl = connectionConfig.getBaseUrl();
        const headers = connectionConfig.getHeaders();

        this.connection = this.setupSignalRConnection(baseUrl, headers);
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

    setupSignalRConnection(baseUrl, headers) {
        const wsUrl = `${baseUrl}/hub`;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(wsUrl, { headers: headers })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        return connection;
    }
}

export default VoxtaWebSocketClient;
