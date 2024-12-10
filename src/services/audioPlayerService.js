import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        this.audioBuffer = [];
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    async playBuffer() {
        for (const response of this.audioBuffer) {
            const contentLength = response.headers.get('content-length');
            logger.info('Playing audio file:', 
                contentLength ? `${(contentLength / 1024).toFixed(2)} KB` : 'unknown');
        }
        this.audioBuffer = []; // Clear buffer after playing
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        if (message.$type === 'replyChunk' && message.audioUrl) {
            logger.info('Audio URL:', message.audioUrl);
            this.voxtaService.fetchResource(message.audioUrl)
                .then(response => {
                    this.audioBuffer.push(response);
                    this.playBuffer();
                })
                .catch(error => logger.error('Failed to fetch audio file:', error));
        }
    }

    cleanup() {
        // Cleanup resources if needed
    }
}

export default AudioPlayerService;
