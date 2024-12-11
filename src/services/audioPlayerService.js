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

        if (this.audioBuffer.length === 0) {
            logger.debug('No audio in buffer');
            return;
        }

        logger.info('Starting playBuffer');
        this.isPlaying = true;
        
        const audioUrl = this.audioBuffer.shift();
        logger.info('Processing audio URL:', audioUrl);
        
        const stream = await this.voxtaService.getAudioStream(audioUrl);
        if (!stream) {
            logger.error('Failed to get audio stream');
            return;
        }
        
        logger.debug('Successfully retrieved audio stream');
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
