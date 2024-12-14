import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        // Audio buffers structure:
        // {
        //   messageId: {
        //     streams: [],           // Array of audio streams
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

        // If buffer is marked as complete and there are no pending streams
        if (buffer.isComplete && buffer.streams.length === 0) {
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
        
        // Play all available streams sequentially
        while (messageBuffer.streams.length > 0) {
            const stream = messageBuffer.streams.shift();
            logger.debug('Playing next stream from buffer');
            
            try {
                const playbackPromise = new Promise((resolve, reject) => {
                    eventBus.once('audioPlaybackComplete', resolve);
                    eventBus.once('audioPlaybackError', reject);
                });
                
                eventBus.emit('playAudioStream', stream);
                await playbackPromise;
            } catch (error) {
                logger.error('Error playing audio:', error);
                messageBuffer.isPlaying = false;
                return;
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
            streams: [],
            isComplete: false,
            sessionId: sessionId,
            isPlaying: false
        };
    }

    async sendPlaybackComplete(messageId) {
        const buffer = this.audioBuffers[messageId];
        if (!buffer) return;

        await this.voxtaService.sendWebSocketMessage("speechPlaybackComplete", {
            sessionId: buffer.sessionId,
            messageId: messageId
        });
        logger.info(`Sent playback complete for message ${messageId}`);
    }

    async handleReplyChunk(message) {
        if (!message.audioUrl) return;

        const messageId = message.messageId;
        logger.info(`Audio URL for message ${messageId}:`, message.audioUrl);
        
        try {
            const audioData = await this.voxtaService.getAudioResponse(message.audioUrl);
            if (audioData) {
                this.audioBuffers[messageId].streams.push(audioData);
                this.playBuffer(messageId);
            } else {
                logger.error('Failed to get audio stream');
            }
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
