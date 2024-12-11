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


    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        if (message.$type === 'replyChunk' && message.audioUrl) {
            const messageId = message.messageId;
            logger.info(`Audio URL for message ${messageId}:`, message.audioUrl);
            
            // Initialize buffer array for this messageId if it doesn't exist
            if (!this.audioBuffers[messageId]) {
                this.audioBuffers[messageId] = [];
            }

            this.voxtaService.getAudioStream(message.audioUrl)
                .then(stream => {
                    if (stream) {
                        this.audioBuffers[messageId].push(stream);
                        this.playBuffer(messageId);
                    } else {
                        logger.error('Failed to get audio stream');
                    }
                })
                .catch(error => {
                    logger.error('Error getting audio stream:', error);
                });
        }
    }

    cleanup() {
        this.audioBuffers = {};
        this.isPlaying = false;
    }
}

export default AudioPlayerService;
