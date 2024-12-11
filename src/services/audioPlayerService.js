import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        this.audioBuffer = [];
        this.isPlaying = false;
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    async playBuffer() {
        if (this.isPlaying) {
            logger.debug('Already playing, skipping');
            return;
        }

        logger.info(`Starting playBuffer with ${this.audioBuffer.length} files in queue`);
        
        try {
            this.isPlaying = true;
            while (this.audioBuffer.length > 0) {
                const audioUrl = this.audioBuffer.shift();
                logger.info('Processing next audio URL in queue:', audioUrl);
                
                const stream = await this.voxtaService.getAudioStream(audioUrl);
                if (!stream) {
                    throw new Error('Failed to get audio stream');
                }
                
                logger.debug('Successfully retrieved audio stream');
            }
        } catch (error) {
            logger.error('Failed to process audio buffer:', error);
        } finally {
            this.isPlaying = false;
            logger.info('Finished processing audio buffer');
        }
    }


    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        if (message.$type === 'replyChunk' && message.audioUrl) {
            logger.info('Audio URL:', message.audioUrl);
            this.audioBuffer.push(message.audioUrl);
            this.playBuffer();
        }
    }

    cleanup() {
        // Cleanup resources if needed
    }
}

export default AudioPlayerService;
