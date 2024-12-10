import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor() {
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);
    }

    cleanup() {
        // Nettoyage des ressources si nécessaire
    }
}

export default AudioPlayerService;
