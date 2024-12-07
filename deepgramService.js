const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const logger = require('./logger');
const CONFIG = require('./config');

class DeepgramService {
    constructor(apiKey) {
        this.deepgram = createClient(apiKey);
        this.audioBuffer = [];  // New buffer to store audio chunks
        this.setupConnection();
    }

    setupConnection() {
        logger.info("Setting up new Deepgram connection...");
        this.connection = this.deepgram.listen.live({
            model: CONFIG.deepgram.model,
            language: CONFIG.deepgram.language,
            encoding: CONFIG.deepgram.encoding,
            sample_rate: CONFIG.deepgram.sampleRate,
        });

        this.connection.on(LiveTranscriptionEvents.Open, () => {
            logger.info("Deepgram connection opened");
            // Process any pending audio chunks in the send buffer
            while (this.connection.sendBuffer && this.connection.sendBuffer.length > 0) {
                const callback = this.connection.sendBuffer.shift();
                logger.info(`Processing callback, ${this.connection.sendBuffer.length} remaining`);
                callback();
            }
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
            logger.info("Deepgram connection closed.");
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
    }

    isConnected() {
        return this.connection?.isConnected?.() || false;
    }

    reopenConnection() {
        if (this.isConnected()) {
            logger.info("Deepgram connection already active, skipping reopen");
            return;
        }

        logger.info("Reopening Deepgram connection...");
        this.setupConnection();
    }

    sendAudio(chunk) {
        // Add the new chunk to buffer
        this.audioBuffer.push(chunk);
        
        // Check connection state
        if (this.isConnected()) {
            // If connected, send all pending chunks
            while (this.audioBuffer.length > 0) {
                const audioChunk = this.audioBuffer.shift();
                try {
                    this.connection.send(audioChunk);
                } catch (error) {
                    logger.error('Error sending audio to Deepgram:', error);
                    // On error, put chunk back in buffer and reset connection
                    this.audioBuffer.unshift(audioChunk);
                    this.setupConnection();
                    break;
                }
            }
        } else {
            logger.info("Connection not active, reopening before sending audio");
            this.reopenConnection();
        }
    }
}

module.exports = DeepgramService;
