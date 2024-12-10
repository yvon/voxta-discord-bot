import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        this.audioBuffer = [];
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

  //AI! joue effectivement le fichier audio au lieu d'afficher sa taille
    async playBuffer() {
        while (this.audioBuffer.length > 0) {
            const audioUrl = this.audioBuffer.shift();
            try {
                const response = await this.voxtaService.fetchResource(audioUrl);
                const contentLength = response.headers.get('content-length');
                logger.info('Playing audio file:', 
                    contentLength ? `${(contentLength / 1024).toFixed(2)} KB` : 'unknown');
            } catch (error) {
                logger.error('Failed to fetch audio file:', error);
            }
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
