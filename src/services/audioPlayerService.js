import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService, voiceService) {
        this.voxtaService = voxtaService;
        this.voiceService = voiceService;
        this.audioBuffers = {};  // { messageId: { streams: [], isComplete: false, sessionId: string, isPlaying: false } }
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
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
                await this.voiceService.playStream(stream);
            } catch (error) {
                logger.error('Error playing audio:', error);
                messageBuffer.isPlaying = false;
                return;
            }
        }
        
        // Check completion after playing all streams
        if (messageBuffer.isComplete) {
            await this.sendPlaybackComplete(messageId);
            delete this.audioBuffers[messageId];
            logger.debug(`Cleaned up buffer for message ${messageId}`);
        }

        messageBuffer.isPlaying = false;
    }

    handleReplyStart(message) {
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
            const stream = await this.voxtaService.getAudioStream(message.audioUrl);
            if (stream) {
                this.audioBuffers[messageId].streams.push(stream);
                this.playBuffer(messageId);
            } else {
                logger.error('Failed to get audio stream');
            }
        } catch (error) {
            logger.error('Error getting audio stream:', error);
        }
    }

    handleReplyEnd(message) {
        const messageId = message.messageId;
        logger.info(`Marking message ${messageId} as complete`);
        if (this.audioBuffers[messageId]) {
            this.audioBuffers[messageId].isComplete = true;
        }
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        switch (message.$type) {
            case 'replyStart':
                this.handleReplyStart(message);
                break;
            case 'replyChunk':
                this.handleReplyChunk(message);
                break;
            case 'replyEnd':
                this.handleReplyEnd(message);
                break;
        }
    }

    cleanup() {
        this.audioBuffers = {};
    }
}

export default AudioPlayerService;
