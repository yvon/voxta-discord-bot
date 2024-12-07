const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const logger = require('./logger');
const CONFIG = require('./config');

class DeepgramService {
    constructor(apiKey) {
        this.deepgram = createClient(apiKey);
        this.audioBuffer = [];  // New buffer to store audio chunks
        this.isConnected = false;  // Global connection state flag
        this.setupConnection();
    }

    setupConnection() {
        // Check if already connected
        if (this.isConnected) {
            logger.info("Connection already active, skipping setup");
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
            this.isConnected = true;
            this.processAudioBuffer();
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
            logger.info("Deepgram connection closed.");
            this.isConnected = false;
        });

        this.connection.on(LiveTranscriptionEvents.Error, (error) => {
            logger.error('Deepgram error:', error);
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
        this.isConnected = false;
    }

    isConnectionActive() {
        return this.isConnected;
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
        if (this.isConnected) {
            logger.info("Connection already active, skipping reopen");
            return;
        }

        logger.info("Reopening Deepgram connection...");
        this.closeConnection();
        this.setupConnection();
    }

    sendAudio(chunk) {
        this.audioBuffer.push(chunk);
        
        if (this.isConnected) {
            this.processAudioBuffer();
        } else {
            logger.info("Connection not active, reopening before sending audio");
            this.reopenConnection();
        }
    }
}

module.exports = DeepgramService;
