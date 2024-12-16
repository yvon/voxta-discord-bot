import WebSocket from 'ws';
import logger from '../utils/logger.js';

class AudioWebSocketClient {
    constructor(connectionConfig, sessionId) {
        this.baseUrl = connectionConfig.getBaseUrl().replace('http', 'ws');
        this.headers = connectionConfig.getHeaders();
        this.sessionId = sessionId;
        this.ws = null;
    }

    connect() {
        const url = `${this.baseUrl}/ws/audio/input/stream?sessionId=${this.sessionId}`;
        
        this.ws = new WebSocket(url, {
            headers: this.headers
        });

        this.ws.on('open', () => {
            logger.info('Audio input WebSocket connection established');
        });

        this.ws.on('error', (error) => {
            logger.error('Audio input WebSocket error:', error);
        });

        this.ws.on('close', () => {
            logger.info('Audio input WebSocket connection closed');
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            logger.error('Audio input WebSocket is not connected');
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export default VoxtaWebSocketClient;
