const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const logger = require('./logger');
const CONFIG = require('./config');

class DeepgramService {
    constructor(apiKey) {
        this.deepgram = createClient(apiKey);
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
        this.connection.finish();
        this.connection = null;
    }

    reopenConnection() {
        logger.info("Reopening Deepgram connection...");
    }

    sendAudio(chunk) {
        try {
            if (!this.connection || this.connection.getReadyState() === 3) { // 3 = CLOSED
                logger.info("Connection closed, setting up new connection...");
                this.setupConnection();
            }
            this.connection.send(chunk);
        } catch (error) {
            logger.error('Error sending audio to Deepgram:', error);
            // Try to recover by setting up a new connection
            this.setupConnection();
        }
    }
}

module.exports = DeepgramService;
