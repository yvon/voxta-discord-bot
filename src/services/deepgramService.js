import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import logger from '#/utils/logger.js';
import CONFIG from '#/config/config.js';

class DeepgramService {
    constructor(apiKey) {
        this.deepgram = createClient(apiKey);
        this.audioBuffer = [];  // New buffer to store audio chunks
        this.isConnecting = false;  // Flag to prevent simultaneous connection attempts
        this.setupConnection();
    }

    setupConnection() {
        // Check if connection attempt is already in progress
        if (this.isConnecting) {
            logger.info("Connection attempt already in progress, skipping setup");
            return this.connection;
        }

        logger.info("Setting up new Deepgram connection...");
        this.isConnecting = true;  // Start connection attempt

        this.connection = this.deepgram.listen.live({
            model: CONFIG.deepgram.model,
            language: CONFIG.deepgram.language,
            encoding: CONFIG.deepgram.encoding,
            sample_rate: CONFIG.deepgram.sampleRate,
        });

        this.connection.on(LiveTranscriptionEvents.Open, () => {
            logger.info("Deepgram connection opened");
            this.isConnecting = false;  // Connection attempt completed
            this.processAudioBuffer();
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
            logger.info("Deepgram connection closed.");
            this.isConnecting = false;  // Reset connection attempt flag
        });

        this.connection.on(LiveTranscriptionEvents.Error, (error) => {
            logger.error('Deepgram error:', error);
            this.isConnecting = false;  // Reset flag on error
        });

        this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
            if (data.channel?.alternatives?.[0]?.transcript) {
                logger.info('Transcription:', data.channel.alternatives[0].transcript);
            }
        });

        return this.connection;
    }

    closeConnection() {
        if (!this.connection) return;

        this.connection.finish();
        this.connection = null;
        this.isConnecting = false;
    }

    processAudioBuffer() {
        while (this.audioBuffer.length > 0) {
            const audioChunk = this.audioBuffer.shift();
            try {
                this.connection.send(audioChunk);
            } catch (error) {
                logger.error('Error sending audio to Deepgram:', error);
                // In case of error, put the chunk back in buffer and reinitialize connection
                this.audioBuffer.unshift(audioChunk);
                this.setupConnection();
                break;
            }
        }
    }

    async reopenConnection() {
        if (this.isConnecting) {
            return;
        }

        logger.info("Reopening Deepgram connection...");
        this.closeConnection();
        this.setupConnection();
    }

    sendAudio(chunk) {
        this.audioBuffer.push(chunk);
        
        if (this.connection.isConnected()) {
            this.processAudioBuffer();
        } else {
            this.reopenConnection();
        }
    }
}

export default DeepgramService;
