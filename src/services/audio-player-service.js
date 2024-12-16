import logger from '../utils/logger.js';
import eventBus from '../utils/event-bus.js';

class AudioPlayerService {
    constructor(voxtaApiClient) {
        this.voxtaApiClient = voxtaApiClient;
        // Audio buffers structure:
        // {
        //   messageId: {
        //     audioUrls: [],         // Array of audio URLs to fetch
        //     isComplete: false,     // Whether the message is complete
        //     sessionId: string,     // Session ID for the message
        //     isPlaying: false       // Whether currently playing
        //   }
        // }
        this.audioBuffers = {};
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
    }

    async checkAndSendPlaybackComplete(messageId) {
        const buffer = this.audioBuffers[messageId];
        if (!buffer) return;

        // If buffer is marked as complete and there are no pending audio chunks
        if (buffer.isComplete && buffer.audioUrls.length === 0) {
            await this.sendPlaybackComplete(messageId);
            delete this.audioBuffers[messageId];
            logger.debug(`Cleaned up buffer for message ${messageId}`);
        }
    }

    async playBuffer(messageId) {
        const messageBuffer = this.audioBuffers[messageId];
        if (!messageBuffer) {
            logger.debug(`No buffer found for message ${messageId}`);
            return;
        }

        if (messageBuffer.isPlaying) {
            logger.debug('Already playing, skipping');
            return;
        }

        messageBuffer.isPlaying = true;
        const url = messageBuffer.audioUrls.shift();

        if (url) {
            let promise = this.voxtaApiClient.getAudioResponse(url);

            while (promise) {
                const chunk = await promise;

                // Download next audio chunk while we play it
                const nextUrl = messageBuffer.audioUrls.shift();
                const nextPromise = nextUrl ? this.voxtaApiClient.getAudioResponse(nextUrl) : null;

                try {
                    const playbackPromise = new Promise((resolve, reject) => {
                        eventBus.once('audioPlaybackComplete', resolve);
                        eventBus.once('audioPlaybackError', reject);
                    });

                    eventBus.emit('playAudio', chunk);
                    await playbackPromise;
                } catch (error) {
                    logger.error('Error playing audio:', error);
                    messageBuffer.isPlaying = false;
                    return;
                }

                promise = nextPromise;
            }
        }

        await this.checkAndSendPlaybackComplete(messageId);
        messageBuffer.isPlaying = false;
    }

    handleReplyGenerating(message) {
        const messageId = message.messageId;
        const sessionId = message.sessionId;
        logger.info(`Initializing buffer for message ${messageId}`);
        this.audioBuffers[messageId] = {
            audioUrls: [],
            isComplete: false,
            sessionId: sessionId,
            isPlaying: false
        };
    }

    async sendPlaybackComplete(messageId) {
        const buffer = this.audioBuffers[messageId];
        if (!buffer) return;

        eventBus.emit('speechPlaybackComplete', messageId);
    }

    async handleReplyChunk(message) {
        if (!message.audioUrl) return;

        const messageId = message.messageId;
        logger.info(`Audio URL for message ${messageId}:`, message.audioUrl);
        
        try {
            this.audioBuffers[messageId].audioUrls.push(message.audioUrl);
            this.playBuffer(messageId);
        } catch (error) {
            logger.error('Error getting audio stream:', error);
        }
    }

    async handleReplyEnd(message) {
        const messageId = message.messageId;
        logger.info(`Marking message ${messageId} as complete`);
        if (this.audioBuffers[messageId]) {
            this.audioBuffers[messageId].isComplete = true;
            await this.checkAndSendPlaybackComplete(messageId);
        }
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        switch (message.$type) {
            case 'replyGenerating':
                this.handleReplyGenerating(message);
                break;
            case 'replyChunk':
                this.handleReplyChunk(message);
                break;
            case 'replyEnd':
                this.handleReplyEnd(message);
                break;
        }
    }
}

export default AudioPlayerService;
