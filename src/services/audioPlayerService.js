import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService, voiceService) {
        this.voxtaService = voxtaService;
        this.voiceService = voiceService;
        this.audioBuffers = {};  // { messageId: [streams] }
        this.isPlaying = false;
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    async playBuffer(messageId) {
        if (this.isPlaying) {
            logger.debug('Already playing, skipping');
            return;
        }

        if (!this.audioBuffers[messageId] || this.audioBuffers[messageId].length === 0) {
            logger.debug(`No audio in buffer for message ${messageId}`);
            return;
        }

        logger.info(`Starting playBuffer for message ${messageId}`);
        this.isPlaying = true;
        
        const stream = this.audioBuffers[messageId].shift();
        logger.debug('Retrieved stream from buffer');
        
        try {
            await this.voiceService.playStream(stream);
            this.isPlaying = false;
            this.playBuffer(messageId); // Try to play next item in buffer
        } catch (error) {
            logger.error('Error playing audio:', error);
            this.isPlaying = false;
        }
    }


    handleReplyStart(message) {
        const messageId = message.messageId;
        logger.info(`Initializing buffer for message ${messageId}`);
        this.audioBuffers[messageId] = [];
    }

    async handleReplyChunk(message) {
        if (!message.audioUrl) return;

        const messageId = message.messageId;
        logger.info(`Audio URL for message ${messageId}:`, message.audioUrl);
        
        try {
            const stream = await this.voxtaService.getAudioStream(message.audioUrl);
            if (stream) {
                this.audioBuffers[messageId].push(stream);
                this.playBuffer(messageId);
            } else {
                logger.error('Failed to get audio stream');
            }
        } catch (error) {
            logger.error('Error getting audio stream:', error);
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
        }
    }

    cleanup() {
        this.audioBuffers = {};
        this.isPlaying = false;
    }
}

export default AudioPlayerService;
