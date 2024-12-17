import { HubConnectionState } from '@microsoft/signalr';
import WebSocketClient from './web-socket-client.js';
import logger from '../../utils/logger.js';
import eventBus from '../../utils/event-bus.js';

class HubClient extends WebSocketClient {
    constructor(connectionConfig) {
        super(connectionConfig);
        this.connection.on("ReceiveMessage", this.handleReceiveMessage.bind(this));
        eventBus.on('voiceChannelLeft', this.stop.bind(this));
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

export default HubClient;
