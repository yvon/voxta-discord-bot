import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';
import eventBus from '../utils/eventBus.js';

class DeepgramService {
    constructor(apiKey) {
        this.deepgram = createClient(apiKey);
        this.audioBuffer = [];  // Buffer to store audio chunks
        this.connection = null;
        eventBus.on('cleanup', () => this.closeConnection());
        eventBus.on('audioData', (chunk) => {
            logger.info('Received audio chunk of size:', chunk.length);
        });
    }

    setupConnection() {
        if (this.connection) {
            return this.connection;
        }

        logger.info("Setting up new Deepgram connection...");
        
        this.connection = this.deepgram.listen.live({
            model: CONFIG.deepgram.model,
            language: CONFIG.deepgram.language,
            encoding: CONFIG.deepgram.encoding,
            sample_rate: CONFIG.deepgram.sampleRate,
        });

        this.connection.on(LiveTranscriptionEvents.Open, () => {
            logger.info("Deepgram connection opened");
            this.processAudioBuffer();
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
            logger.info("Deepgram connection closed");
            this.connection = null;
        });

        this.connection.on(LiveTranscriptionEvents.Error, (error) => {
            logger.error('Deepgram error:', error);
            this.connection = null;
        });

        this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
            if (data.channel?.alternatives?.[0]?.transcript) {
                logger.info('Transcription:', data.channel.alternatives[0].transcript);
            }
        });

        return this.connection;
    }

    closeConnection() {
        if (this.connection) {
            this.connection.finish();
            this.connection = null;
        }
    }

    processAudioBuffer() {
        if (!this.connection) return;

        while (this.audioBuffer.length > 0) {
            const audioChunk = this.audioBuffer.shift();
            try {
                this.connection.send(audioChunk);
            } catch (error) {
                logger.error('Error sending audio to Deepgram:', error);
                this.audioBuffer.unshift(audioChunk);
                this.closeConnection();
                break;
            }
        }
    }

    sendAudio(chunk) {
        this.audioBuffer.push(chunk);
        
        if (!this.connection) {
            this.setupConnection();
        } else {
            this.processAudioBuffer();
        }
    }

    isConnected() {
        return this.connection?.isConnected() ?? false;
    }
}

export default DeepgramService;
