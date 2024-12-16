import VoxtaWebSocketClient from './voxta-web-socket-client.js';
import logger from '../utils/logger.js';
import eventBus from '../utils/event-bus.js';

class VoxtaHubWebSocketClient extends VoxtaWebSocketClient {
    constructor(connectionConfig) {
        super(connectionConfig);
        this.connection.on("ReceiveMessage", this.handleReceiveMessage.bind(this));
    }

    async sendMessage(type, payload = {}) {
        if (this.connection.state !== signalR.HubConnectionState.Connected) {
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

export default VoxtaHubWebSocketClient;
