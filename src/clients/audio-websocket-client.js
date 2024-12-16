import WebSocket from 'ws';
import logger from '../utils/logger.js';

class AudioWebSocketClient {
    constructor(connectionConfig) {
        this.baseUrl = connectionConfig.getBaseUrl().replace('http', 'ws');
        this.headers = connectionConfig.getHeaders();
        this.ws = null;
    }

    async connect(sessionId) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}/ws/audio/input/stream?sessionId=${sessionId}`;
            
            this.ws = new WebSocket(url, {
                headers: this.headers
            });

            this.ws.on('open', () => {
                logger.info('Audio input WebSocket connection established');
                
                // Send audio configuration message
                const audioConfig = {
                    contentType: "audio/wav",
                    sampleRate: 48000,
                    channels: 2,
                    bitsPerSample: 16,
                    bufferMilliseconds: 30
                };
                this.ws.send(JSON.stringify(audioConfig), false);
                resolve();
            });

            this.ws.on('error', (error) => {
                reject(error);
            });

        this.ws.on('error', (error) => {
            logger.error('Audio input WebSocket error:', error);
        });

        this.ws.on('close', () => {
            logger.info('Audio input WebSocket connection closed');
        });
    }

    send(data, binary = true) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            logger.debug(`Sending ${binary ? 'binary' : 'text'} data`);
            this.ws.send(data, { binary });
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

export default AudioWebSocketClient;
