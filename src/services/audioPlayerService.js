import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService, voiceService) {
        this.voxtaService = voxtaService;
        this.voiceService = voiceService;
        this.audioBuffers = {};  // { messageId: { streams: [], isComplete: false, sessionId: string } }
        this.isPlaying = false;
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    async playBuffer(messageId) {
        if (this.isPlaying) {
            logger.debug('Already playing, skipping');
            return;
        }

        const messageBuffer = this.audioBuffers[messageId];
        if (!messageBuffer || messageBuffer.streams.length === 0) {
            logger.debug(`No audio in buffer for message ${messageId}`);
            
            // Check if we've finished playing all chunks and the message is complete
            if (messageBuffer?.isComplete) {
                await this.sendPlaybackComplete(messageId);
            }
            return;
        }

        this.isPlaying = true;
        
        // Play all available streams sequentially
        while (messageBuffer.streams.length > 0) {
            const stream = messageBuffer.streams.shift();
            logger.debug('Playing next stream from buffer');
            
            try {
                await this.voiceService.playStream(stream);
            } catch (error) {
                logger.error('Error playing audio:', error);
                this.isPlaying = false;
                return;
            }
        }

        this.isPlaying = false;
        
        // Check completion after playing all streams
        if (messageBuffer.isComplete) {
            await this.sendPlaybackComplete(messageId);
        }
    }

    handleReplyStart(message) {
        const messageId = message.messageId;
        const sessionId = message.sessionId;
        logger.info(`Initializing buffer for message ${messageId}`);
        this.audioBuffers[messageId] = {
            streams: [],
            isComplete: false,
            sessionId: sessionId
        };
    }

    async sendPlaybackComplete(messageId) {
        const buffer = this.audioBuffers[messageId];
        if (!buffer) return;

        const message = {
            $type: "speechPlaybackComplete",
            sessionId: buffer.sessionId,
            messageId: messageId
        };

        await this.voxtaService.sendMessage(message);
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
        this.isPlaying = false;
    }
}

export default AudioPlayerService;
